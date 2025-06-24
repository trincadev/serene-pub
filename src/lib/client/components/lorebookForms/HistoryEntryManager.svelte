<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import * as skio from "sveltekit-io"
	import { onDestroy, onMount, tick } from "svelte"
	import LoreContentField from "./LoreContentField.svelte"
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { v4 as uuid } from "uuid"
	import DeleteLorebookEntryConfirmModal from "../modals/DeleteLorebookEntryConfirmModal.svelte"

	interface Props {
		lorebookId: number
		hasUnsavedChanges: boolean
	}

	const socket = skio.get()

	let {
		lorebookId = $bindable(),
		hasUnsavedChanges = $bindable(false)
	}: Props = $props()

	const SORT_OPTIONS = [
		{ value: "entry-date-desc", label: "Entry Date ↑" },
		{ value: "entry-date-asc", label: "Entry Date ↓" },
		{ value: "created-desc", label: "Date Created ↑" },
		{ value: "created-asc", label: "Date Created ↓" },
		{ value: "updated-desc", label: "Date Updated ↑" },
		{ value: "updated-asc", label: "Date Updated ↓" }
	]

	const DefaultHistoryEntry: InsertHistoryEntry = {
		date: {
			year: 0,
			month: 0,
			day: 0
		},
		content: "",
		keys: [],
		useRegex: false,
		caseSensitive: false,
		constant: false,
		enabled: true,
		lorebookId
	}

	let historyEntryList: Sockets.HistoryEntryList.Response["historyEntryList"] =
		$state([])
	let lorebookBindingList: SelectLorebookBinding[] = $state([])
	let editEntriesData: Record<number, SelectHistoryEntry> = $state({})
	let newEntriesData: (InsertHistoryEntry & { _uuid: string })[] = $state([])

	let isReady = $state(false)
	let orderBy: string = $state("entry-date-desc")
	let search = $state("")
	let isReordering = $state(false)
	let deleteEntryId: number | null = $state(null)
	let showDeleteConfirmModal = $state(false)

	$effect(() => {
		let populatedNewEntries = false
		let modifiedEntries = false
		newEntriesData.forEach((entry) => {
			if (entry.content?.trim()) {
				populatedNewEntries = true
			}
		})
		Object.values(editEntriesData).forEach((entry) => {
			const originalEntry = historyEntryList.find(
				(e) => e.id === entry.id
			)
			if (JSON.stringify(originalEntry) !== JSON.stringify(entry)) {
				modifiedEntries = true
			}
		})
		hasUnsavedChanges = populatedNewEntries || modifiedEntries
	})

	function getEntryDateValue(entry) {
		const d = entry.date || { year: 0, month: 0, day: 0 }
		return d.year * 10000 + d.month * 100 + d.day
	}

	function getSortedEntries() {
		return historyEntryList.slice().sort((a, b) => {
			const getPinned = (e) => (e.constant ? 1 : 0)
			const getPriority = (e) => e.priority || 1
			const getCreated = (e) => new Date(e.createdAt || 0).getTime()
			const getUpdated = (e) => new Date(e.updatedAt || 0).getTime()
			switch (orderBy) {
				case "entry-date-desc":
					return getEntryDateValue(b) - getEntryDateValue(a)
				case "entry-date-asc":
					return getEntryDateValue(a) - getEntryDateValue(b)
				case "created-desc":
					return getCreated(b) - getCreated(a)
				case "created-asc":
					return getCreated(a) - getCreated(b)
				case "updated-desc":
					return getUpdated(b) - getUpdated(a)
				case "updated-asc":
					return getUpdated(a) - getUpdated(b)
				default:
					return 0
			}
		})
	}

	function getFilteredEntries() {
		const lower = search.trim().toLowerCase()
		if (!lower) return getSortedEntries()
		return getSortedEntries().filter((entry) => {
			const content = (entry.content || "").toLowerCase()
			const keys = Array.isArray(entry.keys)
				? entry.keys.join(", ")
				: entry.keys || ""
			return content.includes(lower) || keys.toLowerCase().includes(lower)
		})
	}

	function entryIsValid({
		entry,
		warn = false
	}: {
		entry: SelectHistoryEntry
		warn?: boolean
	}): boolean {
		if (!entry.content.trim()) {
			if (warn) {
				toaster.error({ title: "Content is required" })
			}
			return false
		}

		if (!!entry.date!.day && !entry.date!.month) {
			if (warn) {
				toaster.error({ title: "Month is required if day is set" })
			}
			return false
		}
		return true
	}

	function handleSave({
		entry
	}: {
		entry: SelectHistoryEntry | (InsertHistoryEntry & { _uuid: string })
	}) {
		if (!entryIsValid({ entry, warn: true })) {
			return
		}

		const data = {
			...entry,
			lorebookId,
			_uuid: undefined
		}

		if (data.date!.month === 0) {
			data.date!.month = null
		}
		if (data.date!.day === 0) {
			data.date!.day = null
		}

		if (entry._uuid) {
			// New entry, send create request
			const req: Sockets.CreateHistoryEntry.Call = {
				historyEntry: data
			}
			socket.emit("createHistoryEntry", req)
			newEntriesData = newEntriesData.filter(
				(e) => e._uuid !== entry._uuid
			)
		} else {
			// Existing entry, send update request
			const req: Sockets.UpdateHistoryEntry.Call = {
				historyEntry: data
			}
			socket.emit("updateHistoryEntry", req)
			delete editEntriesData[entry.id]
		}
	}

	function handleCancel({
		entry
	}: {
		entry: SelectHistoryEntry | (InsertHistoryEntry & { _uuid: string })
	}) {
		if (entry._uuid) {
			// If it's a new entry, just remove it from the newEntriesData
			newEntriesData = newEntriesData.filter(
				(e) => e._uuid !== entry._uuid
			)
		} else {
			// If it's an existing entry, remove it from editEntriesData
			delete editEntriesData[entry.id]
		}
	}

	function onClickCreateEntry() {
		const newEntry: InsertHistoryEntry & { _uuid: string } = {
			...DefaultHistoryEntry,
			_uuid: uuid()
		}
		newEntriesData.push(newEntry)
		tick().then(() => {
			const el = document.getElementById(`entry-${newEntry.id}`)
			if (el) {
				el.scrollIntoView({ behavior: "smooth" })
			}
		})
	}

	function onClickIterateNextEntry() {
		const req: Sockets.IterateNextHistoryEntry.Call = { lorebookId }
		socket.emit("iterateNextHistoryEntry", req)
	}

	function previewContent({ entry }: { entry: SelectHistoryEntry }): string {
		let content = entry.content || ""
		lorebookBindingList.forEach((binding) => {
			if (!binding.characterId && !binding.personaId) {
				return
			}
			if (binding.characterId) {
				content = content.replaceAll(
					binding.binding,
					binding.character!.nickname ||
						binding.character!.name ||
						binding.binding
				)
			} else if (binding.personaId) {
				content = content.replaceAll(
					binding.binding,
					binding.persona!.name || binding.binding
				)
			}
		})
		return content
	}

	function onDeleteClick(id: number) {
		deleteEntryId = id
		showDeleteConfirmModal = true
	}

	function onDeleteConfirm() {
		showDeleteConfirmModal = false
		socket.emit("deleteHistoryEntry", {
			id: deleteEntryId,
			lorebookId
		})
		deleteEntryId = null
	}

	function onDeleteCancel() {
		showDeleteConfirmModal = false
		deleteEntryId = null
	}

	onMount(() => {
		socket.on(
			"historyEntryList",
			async (msg: Sockets.HistoryEntryList.Response) => {
				if (
					msg.historyEntryList.length &&
					msg.historyEntryList[0].lorebookId === lorebookId
				) {
					historyEntryList = msg.historyEntryList
				}
				await tick() // Force state to update
			}
		)

		socket.on(
			"createHistoryEntry",
			(msg: Sockets.CreateHistoryEntry.Response) => {
				if (
					msg.historyEntry &&
					msg.historyEntry.lorebookId === lorebookId
				) {
					toaster.success({ title: "History Entry created" })
				}
			}
		)

		socket.on(
			"updateHistoryEntry",
			(msg: Sockets.UpdateHistoryEntry.Response) => {
				if (
					msg.historyEntry &&
					msg.historyEntry.lorebookId === lorebookId
				) {
					toaster.success({ title: "History Entry updated" })
				}
			}
		)
		socket.on(
			"deleteHistoryEntry",
			(msg: Sockets.DeleteHistoryEntry.Response) => {
				if (msg.id && historyEntryList.some((e) => e.id === msg.id)) {
					toaster.success({ title: "History Entry deleted" })
				}
			}
		)
		socket.on(
			"lorebookBindingList",
			async (msg: Sockets.LorebookBindingList.Response) => {
				if (msg.lorebookId === lorebookId) {
					lorebookBindingList = [...msg.lorebookBindingList]
				}
				await tick() // Force state to update
			}
		)
		socket.on(
			"iterateNextHistoryEntry",
			(msg: Sockets.IterateNextHistoryEntry.Response) => {
				toaster.success({
					title: "The story's date has moved forward"
				})
			}
		)
		const req: Sockets.HistoryEntryList.Call = { lorebookId: lorebookId }
		socket.emit("historyEntryList", req)
		const bindingReq: Sockets.LorebookBindingList.Call = {
			lorebookId: lorebookId
		}
		socket.emit("lorebookBindingList", bindingReq)
		isReady = true
	})

	onDestroy(() => {
		hasUnsavedChanges = false
		socket.off("historyEntryList")
		socket.off("createHistoryEntry")
		socket.off("updateHistoryEntry")
		socket.off("deleteHistoryEntry")
		socket.off("lorebookBindingList")
		socket.off("iterateNextHistoryEntry")
	})
</script>

{#if isReady}
	<div class="flex flex-col gap-4">
		{#if !isReordering}
			<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
				<input
					class="input input-sm w-full"
					placeholder="Search entries..."
					type="text"
					bind:value={search}
					disabled={newEntriesData.length > 0 ||
						Object.keys(editEntriesData).length > 0}
				/>
				<div class="flex w-full gap-2">
					<select
						id="orderBy"
						class="select compact text-sm"
						bind:value={orderBy}
						disabled={newEntriesData.length > 0 ||
							Object.keys(editEntriesData).length > 0}
					>
						{#each SORT_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
					<button
						class="btn btn-sm preset-filled-primary-500 w-full"
						onclick={onClickIterateNextEntry}
					>
						<Icons.CalendarPlus size={16} /> Next Date
					</button>
					<button
						class="btn btn-sm preset-filled-success-500 w-full"
						onclick={onClickCreateEntry}
					>
						<Icons.Plus size={16} /> Create Entry
					</button>
				</div>
			</div>
			{#each [...newEntriesData, ...getFilteredEntries()] as oe}
				{@const entry =
					!!oe._uuid ||
					!Object.values(editEntriesData).find((e) => e.id === oe.id)
						? oe
						: Object.values(editEntriesData).find(
								(e) => e.id === oe.id
							) || oe}
				{@const isEditing = entry.id in editEntriesData || !entry.id}
				{#key entry}
					{#if isEditing}
						<!-- Edit mode: show the form -->
						<div
							class="preset-filled-surface-100-900 border-success-500 flex flex-col gap-4 rounded-lg border-2 p-2"
							class:border-success-500={!entry.id}
						>
							<div class="flex gap-2">
								<div class="flex flex-col gap-2">
									<label
										class="flex items-center gap-1 font-semibold"
										for="entryYear"
									>
										<span>Year</span>
										<span
											class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
											title="This field will be visible in prompts"
										>
											<Icons.ScanEye
												size={16}
												class="relative top-[1px] inline"
											/>
										</span>
									</label>
									<input
										id="entryYear"
										class="input preset-filled-surface-200-800 w-full rounded-lg"
										type="number"
										bind:value={entry.date!.year}
										required
										placeholder="2055"
									/>
								</div>
								<div class="flex flex-col gap-2">
									<label
										class="flex items-center gap-1 font-semibold"
										for="entryMonth"
									>
										<span>Month</span>
										<span
											class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
											title="This field will be visible in prompts"
										>
											<Icons.ScanEye
												size={16}
												class="relative top-[1px] inline"
											/>
										</span>
									</label>
									<input
										id="entryMonth"
										class="input preset-filled-surface-200-800 w-full rounded-lg"
										type="number"
										bind:value={entry.date!.month}
										placeholder="3"
									/>
								</div>
								<div class="flex flex-col gap-2">
									<label
										class="flex items-center gap-1 font-semibold"
										for="entryDay"
									>
										<span>Day</span>
										<span
											class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
											title="This field will be visible in prompts"
										>
											<Icons.ScanEye
												size={16}
												class="relative top-[1px] inline"
											/>
										</span>
									</label>
									<input
										id="entryDay"
										class="input preset-filled-surface-200-800 w-full rounded-lg"
										type="number"
										bind:value={entry.date!.day}
										placeholder="1"
									/>
								</div>
							</div>
							<div>
								<label
									class="flex items-center gap-1 font-semibold"
									for="entryContent"
								>
									<span>Content</span>
									<span
										class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
										title="This field will be visible in prompts"
									>
										<Icons.ScanEye
											size={16}
											class="relative top-[1px] inline"
										/>
									</span>
								</label>
								<LoreContentField
									bind:content={entry.content}
									bind:lorebookBindingList
								/>
							</div>
							<div>
								<label
									class="flex items-center gap-1 font-semibold"
									for="entryKeys"
								>
									<span>Keywords (comma separated)</span>
									<span
										class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
										title="Words or phrases that will trigger this entry"
									>
										<Icons.MessageCircleQuestion
											size={16}
											class="relative top-[1px] inline"
										/>
									</span>
								</label>
								<input
									id="entryKeys"
									class="input preset-filled-surface-200-800 w-full rounded-lg"
									type="text"
									bind:value={entry.keys}
									placeholder="umber, umber city"
								/>
							</div>
							<details>
								<summary class="cursor-pointer font-semibold">
									Advanced Settings
								</summary>
								<div class="mt-2 flex flex-col gap-2">
									<div class="flex w-full justify-between">
										<span>Use Regex</span>
										<Switch
											name="useRegex"
											label="Use Regex"
											checked={entry.useRegex || false}
											onCheckedChange={(e) =>
												(entry.useRegex = e.checked)}
										/>
									</div>
									<div class="flex w-full justify-between">
										<span>Case Sensitive</span>
										<Switch
											name="caseSensitive"
											checked={entry.caseSensitive}
											onCheckedChange={(e) =>
												(entry.caseSensitive =
													e.checked)}
										/>
									</div>
									<div class="flex w-full justify-between">
										<span>Pinned</span>
										<Switch
											name="constant"
											checked={entry.constant}
											onCheckedChange={(e) =>
												(entry.constant = e.checked)}
										/>
									</div>
									<div class="flex w-full justify-between">
										<span>Enabled</span>
										<Switch
											name="enabled"
											checked={entry.enabled}
											onCheckedChange={(e) =>
												(entry.enabled = e.checked)}
										/>
									</div>
								</div>
							</details>

							<div class="flex gap-2">
								<button
									class="btn btn-sm preset-filled-surface-500 w-full"
									onclick={() => {
										handleCancel({ entry })
									}}
								>
									Cancel
								</button>
								<button
									class="btn btn-sm preset-filled-success-500 w-full"
									onclick={() => handleSave({ entry })}
									disabled={!entryIsValid({ entry })}
								>
									<Icons.Save size={16} />
									Save
								</button>
							</div>
						</div>
					{:else}
						<div
							class="preset-filled-surface-100-900 flex flex-col gap-4 rounded-lg p-2"
							class:opacity-50={!entry.enabled}
						>
							<div>
								<strong>Date:</strong>
								{entry.date?.year}{entry.date?.month
									? `-${entry.date?.month}`
									: ""}{entry.date?.day
									? `-${entry.date?.day}`
									: ""}
								{#if entry.date?.year === 0 && entry.date?.month === 0 && entry.date?.day === 0}
									<span
										class="text-tertiary-500 ml-2 text-sm"
									>
										<strong>(No Date)</strong>
									</span>
								{/if}
								{#if entry.date?.year === 0 && entry.date?.month === 0 && entry.date?.day === null}
									<span
										class="text-tertiary-500 ml-2 text-sm"
									>
										<strong>(No Date Set)</strong>
									</span>
								{/if}
								{#if getEntryDateValue(entry) === Math.max(...getFilteredEntries().map(getEntryDateValue))}
									<span
										class="text-tertiary-500 ml-2 text-sm"
									>
										<strong>(Current Date)</strong>
									</span>
								{/if}
							</div>
							<div>
								<strong>Content:</strong>
								<div class="line-clamp-3 whitespace-pre-line">
									{previewContent({ entry })}
								</div>
							</div>
							<div>
								<strong>Keys:</strong>
								{Array.isArray(entry.keys)
									? entry.keys.join(", ")
									: entry.keys}
							</div>
							<div class="flex gap-1">
								{#if !entry.enabled}
									<span
										class="preset-filled-error-500 rounded px-2 py-1"
										title="This entry is disabled and will not be used in prompts"
									>
										<Icons.Ghost size={16} class="inline" />
									</span>
								{/if}
								{#if entry.useRegex}
									<span
										class="preset-filled-primary-500 rounded px-2 py-1"
										title="This entry's keys use a regex pattern"
									>
										<Icons.Regex size={16} class="inline" />
									</span>
								{/if}
								{#if entry.constant}
									<span
										class="preset-filled-warning-500 rounded px-2 py-1"
										title="This entry is pinned and will always be included in prompts"
									>
										<Icons.Pin size={16} class="inline" />
									</span>
								{/if}
							</div>
							<div class="mt-2 flex gap-2">
								<button
									class="btn btn-sm preset-filled-primary-500"
									onclick={() => {
										editEntriesData[entry.id] = { ...entry }
									}}
								>
									<Icons.Edit size={16} /> Edit
								</button>
								<button
									class="btn btn-sm preset-filled-error-500"
									onclick={() => onDeleteClick(entry.id)}
									title="Delete Entry"
								>
									<Icons.Trash2 size={16} /> Delete
								</button>
							</div>
						</div>
					{/if}
				{/key}
			{/each}
		{:else}
			<!-- Reorder drag-and-drop list -->
			<div class="flex flex-col gap-2">
				<div class="mb-2 text-sm font-semibold">
					Drag to reorder entries
				</div>
				<div class="mb-4 flex gap-2">
					<button
						class="btn btn-sm preset-filled-success-500 w-full"
						onclick={() => (isReordering = false)}
					>
						<Icons.Check size={16} />
						Done
					</button>
				</div>
				<div
					use:dndzone={{
						items: historyEntryList
							.slice()
							.sort(
								(a, b) => (a.position ?? 0) - (b.position ?? 0)
							),
						flipDurationMs: 150,
						dragDisabled: false,
						dropFromOthersDisabled: true
					}}
					onconsider={(e) => {
						historyEntryList = e.detail.items.map((item, idx) => ({
							...item,
							position: idx + 1
						}))
					}}
					onfinalize={async (e) => {
						historyEntryList = e.detail.items.map((item, idx) => ({
							...item,
							position: idx + 1
						}))
						await handleUpdateReorder({
							entries: historyEntryList
						})
					}}
					class="flex flex-col gap-1"
				>
					{#each historyEntryList
						.slice()
						.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) as entry (entry.id)}
						<div
							class="bg-surface-500 hover:bg-surface-300-700 flex cursor-grab items-center gap-2 rounded p-2 shadow-sm"
							data-dnd-handle
						>
							<span
								class="hover:text-primary-500 cursor-grab"
								data-dnd-handle
								title="Drag to reorder"
							>
								<Icons.GripVertical size={18} />
							</span>
							<span class="flex-1 truncate font-semibold">
								{entry.name}
							</span>
							<span class="text-xs">#{entry.position}</span>
						</div>
					{/each}
				</div>
				<div class="mt-4 flex gap-2">
					<button
						class="btn btn-sm preset-filled-success-500 w-full"
						onclick={() => (isReordering = false)}
					>
						<Icons.Check size={16} />
						Done
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<DeleteLorebookEntryConfirmModal
	open={showDeleteConfirmModal}
	onOpenChange={(e) => {showDeleteConfirmModal = e.open; deleteEntryId = null}}
	onConfirm={onDeleteConfirm}
	onCancel={onDeleteCancel}
/>