<script lang="ts">
	import * as Icons from "@lucide/svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import * as skio from "sveltekit-io"
	import { onDestroy, onMount, tick } from "svelte"
	import LoreEntryField from "./LoreEntryField.svelte"
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { v4 as uuid } from "uuid"

	interface Props {
		lorebookId: number
	}

	const socket = skio.get()

	let { lorebookId = $bindable() }: Props = $props()
	let worldLoreEntryList: Sockets.WorldLoreEntryList.Response["worldLoreEntryList"] =
		$state([])
	let lorebookBindingList: SelectLorebookBinding[] = $state([])
	let editEntriesData: Record<number, SelectWorldLoreEntry> = $state({})
	let newEntriesData: (InsertWorldLoreEntry & { _uuid: string })[] = $state(
		[]
	)

	const PRIORITIES = [
		{ value: 1, label: "Normal" },
		{ value: 2, label: "High" },
		{ value: 3, label: "Very High" }
	]

	const DefaultWorldEntry: InsertWorldLoreEntry = {
		name: "",
		content: "",
		keys: [],
		useRegex: false,
		caseSensitive: false,
		constant: false,
		enabled: true,
		priority: 1, // Default priority
		lorebookId
	}

	let orderBy: string = $state("position-asc")
	let search = $state("")

	function getSortedEntries() {
		return worldLoreEntryList.slice().sort((a, b) => {
			const getPinned = (e) => (e.constant ? 1 : 0)
			const getPriority = (e) => e.priority || 1
			const getCreated = (e) => new Date(e.createdAt || 0).getTime()
			const getUpdated = (e) => new Date(e.updatedAt || 0).getTime()
			const getPosition = (e) =>
				typeof e.position === "number" ? e.position : 0
			switch (orderBy) {
				case "position-asc":
					return getPosition(a) - getPosition(b)
				case "position-desc":
					return getPosition(b) - getPosition(a)
				case "priority-desc":
					// Pinned > 3 > 2 > 1
					if (getPinned(a) !== getPinned(b))
						return getPinned(b) - getPinned(a)
					return getPriority(b) - getPriority(a)
				case "priority-asc":
					if (getPinned(a) !== getPinned(b))
						return getPinned(a) - getPinned(b)
					return getPriority(a) - getPriority(b)
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
			const name = (entry.name || "").toLowerCase()
			const content = (entry.content || "").toLowerCase()
			const keys = Array.isArray(entry.keys)
				? entry.keys.join(", ")
				: entry.keys || ""
			return (
				name.includes(lower) ||
				content.includes(lower) ||
				keys.toLowerCase().includes(lower)
			)
		})
	}

	function handleSave({
		entry
	}: {
		entry: SelectWorldLoreEntry | (InsertWorldLoreEntry & { _uuid: string })
	}) {
		if (!entry.name.trim()) {
			toaster.error({ title: "Name is required" })
			return
		}
		if (!entry.content.trim()) {
			toaster.error({ title: "Content is required" })
			return
		}

		if (entry._uuid) {
			// New entry, send create request
			const req: Sockets.CreateWorldLoreEntry.Call = {
				worldLoreEntry: { ...entry, lorebookId, _uuid: undefined }
			}
			socket.emit("createWorldLoreEntry", req)
			newEntriesData = newEntriesData.filter(
				(e) => e._uuid !== entry._uuid
			)
		} else {
			// Existing entry, send update request
			const req: Sockets.UpdateWorldLoreEntry.Call = {
				worldLoreEntry: { ...entry, lorebookId }
			}
			socket.emit("updateWorldLoreEntry", req)
			delete editEntriesData[entry.id]
		}
		// tick().then(() => {
		// 	const el = document.getElementById(`entry-${entry.id}`)
		// 	if (el) {
		// 		el.scrollIntoView({ behavior: "smooth" })
		// 	}
		// })
	}

	function handleCancel({
		entry
	}: {
		entry: SelectWorldLoreEntry | (InsertWorldLoreEntry & { _uuid: string })
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
		const newEntry: InsertWorldLoreEntry & { _uuid: string } = {
			...DefaultWorldEntry,
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

	onMount(() => {
		socket.on(
			"worldLoreEntryList",
			(msg: Sockets.WorldLoreEntryList.Response) => {
				if (
					msg.worldLoreEntryList.length &&
					msg.worldLoreEntryList[0].lorebookId === lorebookId
				) {
					// Use spread to ensure Svelte reactivity
					console.log(
						"Received world lore entry list:",
						msg.worldLoreEntryList
					)
					worldLoreEntryList = msg.worldLoreEntryList
				}
			}
		)

		socket.on(
			"createWorldLoreEntry",
			(msg: Sockets.CreateWorldLoreEntry.Response) => {
				if (
					msg.worldLoreEntry &&
					msg.worldLoreEntry.lorebookId === lorebookId
				) {
					toaster.success({ title: "World Lore Entry created" })
				}
			}
		)

		socket.on(
			"updateWorldLoreEntry",
			(msg: Sockets.UpdateWorldLoreEntry.Response) => {
				if (
					msg.worldLoreEntry &&
					msg.worldLoreEntry.lorebookId === lorebookId
				) {
					toaster.success({ title: "World Lore Entry updated" })
				}
			}
		)
		socket.on(
			"deleteWorldLoreEntry",
			(msg: Sockets.DeleteWorldLoreEntry.Response) => {
				if (msg.id && worldLoreEntryList.some((e) => e.id === msg.id)) {
					toaster.success({ title: "World Lore Entry deleted" })
					// worldLoreEntryList = worldLoreEntryList.filter(
					// 	(e) => e.id !== msg.id
					// )
				}
			}
		)
		socket.on(
			"lorebookBindingList",
			(msg: Sockets.LorebookBindingList.Response) => {
				if (msg.lorebookId === lorebookId) {
					lorebookBindingList = [...msg.lorebookBindingList]
				}
			}
		)
		const req: Sockets.WorldLoreEntryList.Call = { lorebookId: lorebookId }
		socket.emit("worldLoreEntryList", req)
		const bindingReq: Sockets.LorebookBindingList.Call = {
			lorebookId: lorebookId,
			with: { character: true, persona: true }
		}
		socket.emit("lorebookBindingList", bindingReq)
	})

	onDestroy(() => {
		socket.off("worldLoreEntryList")
		socket.off("createWorldLoreEntry")
		socket.off("updateWorldLoreEntry")
		socket.off("deleteWorldLoreEntry")
		socket.off("lorebookBindingList")
	})
</script>

<div class="flex flex-col gap-4">
	<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
		<input
			class="input input-sm w-full"
			placeholder="Search entries..."
			type="text"
			bind:value={search}
			disabled={newEntriesData.length > 0 ||
				Object.keys(editEntriesData).length > 0}
		/>
		<div class="flex gap-2">
			<select
				id="orderBy"
				class="select compact text-sm"
				bind:value={orderBy}
				disabled={newEntriesData.length > 0 ||
					Object.keys(editEntriesData).length > 0}
			>
				<option value="position-asc">Position ↑</option>
				<option value="position-desc">Position ↓</option>
				<option value="priority-desc">Priority ↑</option>
				<option value="priority-asc">Priority ↓</option>
				<option value="created-desc">Date Created ↑</option>
				<option value="created-asc">Date Created ↓</option>
				<option value="updated-desc">Date Updated ↑</option>
				<option value="updated-asc">Date Updated ↓</option>
			</select>
		</div>
		<button
			class="btn btn-sm preset-filled-success-500"
			onclick={onClickCreateEntry}
		>
			<Icons.Plus size={16} /> Create Entry
		</button>
	</div>
	{#each [...newEntriesData, ...getFilteredEntries()] as oe}
		{@const entry =
			!!oe._uuid ||
			!Object.values(editEntriesData).find((e) => e.id === oe.id)
				? oe
				: Object.values(editEntriesData).find((e) => e.id === oe.id) ||
					oe}
		{@const isEditing = entry.id in editEntriesData || !entry.id}
		{#key entry}
			{#if isEditing}
				<!-- Edit mode: show the form -->
				<div
					class="preset-filled-surface-100-900 border-success-500 flex flex-col gap-4 rounded-lg border-2 p-2"
					class:border-success-500={!entry.id}
				>
					<div>
						<label
							class="flex items-center gap-1 font-semibold"
							for="entryName"
						>
							<span>Name</span>
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
							id="entryName"
							class="input preset-filled-surface-200-800 w-full rounded-lg"
							type="text"
							bind:value={entry.name}
							required
							placeholder="Umber City"
						/>
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
						<LoreEntryField
							bind:content={entry.content}
							bind:lorebookBindingList
						/>
					</div>
					<div>
						<label
							class="flex items-center gap-1 font-semibold"
							for="entryKeys"
						>
							<span>Content</span>
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
										(entry.caseSensitive = e.checked)}
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
							<div class="flex w-full justify-between">
								<label
									for="entryPriority"
									class="font-semibold"
									class:disabled={entry.constant}
								>
									Priority
								</label>
								<select
									id="entryPriority"
									bind:value={entry.priority}
									class="select preset-filled-surface-200-800 w-full w-max max-w-xs rounded-lg text-sm"
									disabled={entry.constant}
								>
									{#each PRIORITIES as priority}
										<option value={priority.value}>
											{priority.label}
										</option>
									{/each}
								</select>
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
						>
							<Icons.Save size={16} />
							Save
						</button>
					</div>
				</div>
			{:else}
				<!-- View mode: show entry details -->
				<div
					class="preset-filled-surface-100-900 flex flex-col gap-4 rounded-lg p-2"
					class:opacity-50={!entry.enabled}
				>
					<div>
						<strong>Name:</strong>
						{entry.name}
					</div>
					<div>
						<strong>Content:</strong>
						<div class="whitespace-pre-line">{entry.content}</div>
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
						{:else}
							<span
								class="rounded px-2 py-1"
								class:preset-filled-success-500={entry.priority ===
									1}
								class:preset-filled-primary-500={entry.priority ===
									2}
								class:preset-filled-tertiary-500={entry.priority ===
									3}
								title={`${PRIORITIES[entry.priority - 1].label} Priority`}
							>
								{#if entry.priority === 1}
									<Icons.Plus size={16} class="inline" />
								{:else if entry.priority === 2}
									<Icons.Plus
										size={16}
										class="inline"
									/><Icons.Plus size={16} class="inline" />
								{:else if entry.priority === 3}
									<Icons.Plus
										size={16}
										class="inline"
									/><Icons.Plus
										size={16}
										class="inline"
									/><Icons.Plus size={16} class="inline" />
								{/if}
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
							onclick={() =>
								socket.emit("deleteWorldLoreEntry", {
									id: entry.id,
									lorebookId
								})}
							title="Delete Entry"
						>
							<Icons.Trash2 size={16} /> Delete
						</button>
					</div>
				</div>
			{/if}
		{/key}
	{/each}
</div>
