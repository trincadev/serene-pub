<script lang="ts">
	import { onDestroy, onMount } from "svelte"
	import * as skio from "sveltekit-io"
	import * as Icons from "@lucide/svelte"
	import NewNameModal from "../modals/NewNameModal.svelte"
	import EditLorebookForm from "../lorebookForms/EditLorebookForm.svelte"
	import { Tabs } from "@skeletonlabs/skeleton-svelte"
	import LorebookBindingsForm from "../lorebookForms/LorebookBindingsForm.svelte"
	import WorldLoreForm from "../lorebookForms/WorldLoreForm.svelte"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}

	type EditGroup =
		| "lorebook"
		| "bindings"
		| "world"
		| "characters"
		| "history"

	let { onclose = $bindable() }: Props = $props()

	const socket = skio.get()
	let lorebookList: any[] = $state([])
	let search: string = $state("")
	let isCreating: boolean = $state(false)
	let isEditingLorebook: boolean = $state(false)
	let selectedLorebook: any = $state(undefined)
	let editGroup: EditGroup = $state("lorebook")

	async function handleOnClose() {
		return true
	}

	function handleCreateClick() {
		isCreating = true
	}

	function handleLorebookClick(lorebook: any) {
		selectedLorebook = lorebook
		isEditingLorebook = true
	}

	$effect(() => {
		// Filtered list effect if needed
	})

	let filteredLorebooks = $derived.by(() => {
		let list = [...lorebookList]
		list.sort((a, b) => a.id - b.id)
		if (!search) return list
		return list.filter(
			(l) =>
				l.name.toLowerCase().includes(search.toLowerCase()) ||
				(l.description &&
					l.description.toLowerCase().includes(search.toLowerCase()))
		)
	})

	async function handleOnCreateConfirm(name: string) {
		if (!name.trim()) return
		isCreating = false
		const req: Sockets.CreateLorebook.Call = {
			name: name.trim()
		}
		socket.emit("createLorebook", req)
	}

	onMount(() => {
		socket.on("lorebookList", (msg: Sockets.LorebookList.Response) => {
			if (msg.lorebookList) {
				lorebookList = msg.lorebookList
			}
		})
		onclose = handleOnClose
		socket.emit("lorebookList", {})
	})

	onDestroy(() => {
		socket.off("lorebookList")
		onclose = undefined
	})
</script>

<div class="min-h-full p-4">
	{#if isEditingLorebook}
		<div class="flex justify-between">
			<h2 class="mb-4 text-lg font-bold">
				{selectedLorebook?.name || "Lorebook"}
			</h2>
			<button
				onclick={() => {
					isEditingLorebook = false
				}}
				class="mb-4"
			>
				<Icons.ArrowLeft size={20} class="inline" /> Back
			</button>
		</div>
		<Tabs
			value={editGroup}
			onValueChange={(e) => (editGroup = e.value as EditGroup)}
		>
			{#snippet list()}
				<Tabs.Control value="lorebook">
					<Icons.Book size={20} class="inline" />
					{#if editGroup === "lorebook"}
						Lorebook
					{/if}
				</Tabs.Control>
				<Tabs.Control value="bindings">
					<Icons.Link size={20} class="inline" />
					{#if editGroup === "bindings"}
						Bindings
					{/if}
				</Tabs.Control>
				<Tabs.Control value="world">
					<Icons.Globe size={20} class="inline" />
					{#if editGroup === "world"}
						World Lore
					{/if}
				</Tabs.Control>
				<Tabs.Control value="characters">
					<Icons.User size={20} class="inline" />
					{#if editGroup === "characters"}
						Characters
					{/if}
				</Tabs.Control>
				<Tabs.Control value="history">
					<Icons.Calendar size={20} class="inline" />
					{#if editGroup === "history"}
						History
					{/if}
				</Tabs.Control>
			{/snippet}
			{#snippet content()}
				<Tabs.Panel value="lorebook">
					<EditLorebookForm
						lorebookId={selectedLorebook.id}
						bind:showEditLorebookForm={isEditingLorebook}
					/>
				</Tabs.Panel>
				<Tabs.Panel value="bindings">
					<LorebookBindingsForm
						lorebookId={selectedLorebook.id}
						bind:showEditLorebookForm={isEditingLorebook}
					/>
				</Tabs.Panel>
				<Tabs.Panel value="world">
					<WorldLoreForm
						lorebookId={selectedLorebook.id}
						bind:showEditLorebookForm={isEditingLorebook}
					/>
				</Tabs.Panel>
			{/snippet}
		</Tabs>
	{:else}
		<div class="mb-2 flex gap-2">
			<button
				class="btn btn-sm preset-filled-primary-500"
				onclick={handleCreateClick}
				title="Create New Lorebook"
			>
				<Icons.Plus size={16} />
			</button>
		</div>
		<div class="mb-4 flex items-center gap-2">
			<input
				type="text"
				placeholder="Search lorebooks..."
				class="input"
				bind:value={search}
			/>
		</div>
		<div class="flex flex-col gap-2">
			{#if filteredLorebooks.length === 0}
				<div class="text-muted-foreground py-8 text-center">
					No lorebooks found.
				</div>
			{:else}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				{#each filteredLorebooks as l}
					{@const hasWorldLore = l.worldLoreEntries?.length > 0}
					{@const hasCharacterLore =
						l.characterLoreEntries?.length > 0}
					{@const hasHistory = l.historyEntries?.length > 0}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="sidebar-list-item"
						onclick={() => handleLorebookClick(l)}
					>
						<span class="text-muted-foreground w-[2.5em] text-xs">
							#{l.id}
						</span>
						<div class="min-w-0 flex-1">
							<div class="truncate font-semibold">
								{l.name}
							</div>
							<div
								class="text-muted-foreground line-clamp-2 h-[3em] text-xs"
							>
								{l.description || "No description provided."}
							</div>
							<span
								class="badge preset-filled-primary-500"
								class:disabled={!hasWorldLore}
								title={hasWorldLore
									? "World Lore Entries"
									: "No World Lore Entries"}
							>
								World
							</span>
							<span
								class="badge preset-filled-primary-500"
								class:disabled={!hasCharacterLore}
								title={hasCharacterLore
									? "Character Lore Entries"
									: "No Character Lore Entries"}
							>
								Character
							</span>
							<span
								class="badge preset-filled-primary-500"
								class:disabled={!hasHistory}
								title={hasHistory
									? "History Entries"
									: "No History Entries"}
							>
								History
							</span>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<NewNameModal
	open={isCreating}
	onOpenChange={(details) => (isCreating = details.open)}
	onConfirm={handleOnCreateConfirm}
	onCancel={() => (isCreating = false)}
	title="Create New Lorebook"
	description="What would you like to call it?"
/>
