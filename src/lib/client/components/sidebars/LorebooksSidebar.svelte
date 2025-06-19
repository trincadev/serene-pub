<script lang="ts">
	import { onMount } from "svelte"
	import skio from "sveltekit-io"
	import * as Icons from "@lucide/svelte"
	import NewNameModal from "../modals/NewNameModal.svelte"
	import EditLorebookForm from "../lorebookForms/EditLorebookForm.svelte"

	interface Props {
		onclose?: () => Promise<boolean> | undefined
	}

	let { onclose = $bindable() }: Props = $props()

	const socket = skio.get()
	let lorebookList: any[] = $state([])
	let search: string = $state("")
	let isCreating: boolean = $state(false)
	let showEditLorebookForm: boolean = $state(false)
	let selectedLorebook: any = $state(undefined)

	async function handleOnClose() {
		return true
	}

	function handleCreateClick() {
		isCreating = true
	}

	function handleLorebookClick(lorebook: any) {
		selectedLorebook = lorebook
		showEditLorebookForm = true
	}

	$effect(() => {
		// Filtered list effect if needed
	})

	let filteredLorebooks = $derived.by(() => {
		if (!search) return lorebookList
		return lorebookList.filter(
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

	socket.on("lorebookList", (msg: Sockets.LorebookList.Response) => {
		if (msg.lorebookList) {
			lorebookList = msg.lorebookList
		}
	})

	onMount(() => {
		onclose = handleOnClose
		socket.emit("lorebookList", {})
	})
</script>

<div class="p-4 min-h-full">
	{#if showEditLorebookForm}
		<EditLorebookForm
			editLorebook={selectedLorebook}
			bind:showEditLorebookForm
		/>
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
							{#if l.description}
								<div
									class="text-muted-foreground truncate text-xs"
								>
									{l.description}
								</div>
							{/if}
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
