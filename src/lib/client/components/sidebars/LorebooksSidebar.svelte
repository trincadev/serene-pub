<script lang="ts">
	import { onDestroy, onMount, tick } from "svelte"
	import * as skio from "sveltekit-io"
	import * as Icons from "@lucide/svelte"
	import NewNameModal from "../modals/NewNameModal.svelte"
	import EditLorebookForm from "../lorebookForms/EditLorebookForm.svelte"
	import { Tabs } from "@skeletonlabs/skeleton-svelte"
	import LorebookBindingsForm from "../lorebookForms/LorebookBindingsForm.svelte"
	import WorldLoreForm from "../lorebookForms/WorldLoreForm.svelte"
	import type { ValueChangeDetails } from "@zag-js/tabs"
	import LorebookUnsavedChangesModal from "../modals/LorebookUnsavedChangesModal.svelte"

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
	let nextEditGroup: EditGroup | undefined = $state()
	let tabHasUnsavedChanges: boolean = $state(false)
	let showUnsavedChangesModal: boolean = $state(false)
	let showUnsavedTabChangesModal: boolean = $state(false)
	let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null

	async function handleOnClose() {
        if (tabHasUnsavedChanges) {
            showUnsavedChangesModal = true
            return new Promise<boolean>((resolve) => {
                confirmCloseSidebarResolve = resolve
            })
        } else {
            return true
        }
    }

	function handleCreateClick() {
		isCreating = true
	}

	function handleLorebookClick(e: Event, {lorebook, tab}: {lorebook: SelectLorebook, tab?: EditGroup}) {
		e.preventDefault()
		e.stopPropagation()
		selectedLorebook = lorebook
		isEditingLorebook = true
		if (tab) {
			editGroup = tab
		} else {
			editGroup = "lorebook"
		}
	}

	// UNSAVED CHANGES MODAL HANDLERS

	function handleUnsavedChangesModalConfirm() {
        showUnsavedChangesModal = false
        if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(true)
    }
    function handleUnsavedChangesModalCancel() {
        showUnsavedChangesModal = false
        if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
    }
    function handleUnsavedChangesModalOpenChange(e: OpenChangeDetails) {
        if (!e.open) {
            showUnsavedChangesModal = false
            if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
        }
    }

	// UNSAVED TAB CHANGES MODAL HANDLERS

	function handleUnsavedTabChangesModalOpenChange(details: { open: boolean }) {
		showUnsavedTabChangesModal = details.open
	}

	function handleUnsavedTabChangesModalConfirm() {
		showUnsavedTabChangesModal = false
		editGroup = nextEditGroup || "lorebook"
		nextEditGroup = undefined
	}

	function handleUnsavedTabChangesModalCancel() {
		showUnsavedTabChangesModal = false
		nextEditGroup = undefined
	}

	async function handleOnCreateConfirm(name: string) {
		if (!name.trim()) return
		isCreating = false
		const req: Sockets.CreateLorebook.Call = {
			name: name.trim()
		}
		socket.emit("createLorebook", req)
	}

	async function handleSwitchTabGroup(e: ValueChangeDetails): void {
		if (!tabHasUnsavedChanges) {
			editGroup = e.value as EditGroup
			await tick()
		} else {
			nextEditGroup = e.value as EditGroup
			showUnsavedTabChangesModal = true
		}
	}

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

	onMount(() => {
		socket.on("lorebookList", (msg: Sockets.LorebookList.Response) => {
			if (msg.lorebookList) {
				console.log("Received lorebook list:", msg.lorebookList)
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
			onValueChange={(e) => (handleSwitchTabGroup(e))}
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
					{#if editGroup == "lorebook"}
						<EditLorebookForm
							lorebookId={selectedLorebook.id}
						/>
					{/if}
				</Tabs.Panel>
				<Tabs.Panel value="bindings">
					{#if editGroup == "bindings"}
						<LorebookBindingsForm
							lorebookId={selectedLorebook.id}
						/>
					{/if}
				</Tabs.Panel>
				<Tabs.Panel value="world">
					{#if editGroup == "world"}
						<WorldLoreForm
						lorebookId={selectedLorebook.id}
						bind:hasUnsavedChanges={tabHasUnsavedChanges}
					/>
					{/if}
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
				{console.log($state.snapshot(l))}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="sidebar-list-item"
						onclick={(e) => handleLorebookClick(e, {lorebook: l})}
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
							<button
								class="btn btn-sm"
								class:preset-filled-primary-500={l.lorebookBindings.length > 0}
								class:preset-filled-primary-300-700={l.lorebookBindings.length === 0}
								title={l.lorebookBindings?.length
									? "Lorebook Bindings"
									: "No Lorebook Bindings"}
								onclick={(e) => handleLorebookClick(e, {lorebook: l, tab: "bindings"})}
							>
								<Icons.Link size={16} class="inline" />
								{l.lorebookBindings?.length ? l.lorebookBindings.length : ""}
							</button>
							<button
								class="btn btn-sm"
								class:preset-filled-primary-500={l.worldLoreEntries.length > 0}
								class:preset-filled-primary-300-700={l.worldLoreEntries.length === 0}
								title={l.worldLoreEntries?.length
									? "World Lore Entries"
									: "No World Lore Entries"}
								onclick={(e) => handleLorebookClick(e, {lorebook: l, tab: "world"})}
							>
								<Icons.Globe size={16} class="inline" />
								{l.worldLoreEntries.length ? l.worldLoreEntries.length : ""}
							</button>
							<button
								class="btn btn-sm"
								class:preset-filled-primary-500={l.characterLoreEntries.length > 0}
								class:preset-filled-primary-300-700={l.characterLoreEntries.length === 0}
								title={l.characterLoreEntries
									? "Character Lore Entries"
									: "No Character Lore Entries"}
								onclick={(e) => handleLorebookClick(e, {lorebook: l, tab: "characters"})}
							>
								<Icons.User size={16} class="inline" />
								{l.characterLoreEntries?.length ? l.characterLoreEntries.length : ""}
							</button>
							<button
								class="btn btn-sm"
								class:preset-filled-primary-500={l.historyEntries.length > 0}
								class:preset-filled-primary-300-700={l.historyEntries.length === 0}
								title={l.historyEntries.length
									? "History Entries"
									: "No History Entries"}
								onclick={(e) => handleLorebookClick(e, {lorebook: l, tab: "history"})}
							>
								<Icons.Calendar size={16} class="inline" />
								{l.historyEntries?.length ? l.historyEntries.length : ""}
							</button>
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

<LorebookUnsavedChangesModal
    open={showUnsavedChangesModal}
    onOpenChange={handleUnsavedChangesModalOpenChange}
    onConfirm={handleUnsavedChangesModalConfirm}
    onCancel={handleUnsavedChangesModalCancel}
/>

<LorebookUnsavedChangesModal
    open={showUnsavedTabChangesModal}
    onOpenChange={handleUnsavedTabChangesModalOpenChange}
    onConfirm={handleUnsavedTabChangesModalConfirm}
    onCancel={handleUnsavedTabChangesModalCancel}
/>