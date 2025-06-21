<script lang="ts">
	import { onMount } from "svelte"
	import * as Icons from "@lucide/svelte"
	
	import * as skio from "sveltekit-io"
	import { toaster } from "$lib/client/utils/toaster"

	interface Props {
		lorebookId: number // ID of the lorebook to edit
		showEditLorebookForm: boolean // Controls visibility of the form
	}

	let { lorebookId, showEditLorebookForm = $bindable() }: Props = $props()

	const socket = skio.get()

	let editLorebook: Sockets.Lorebook.Response["lorebook"] | undefined =
		$state()
	let originalLorebook: Sockets.Lorebook.Response["lorebook"] | undefined =
		$state()
	
	
	let hasUnsavedChanges = $derived(
		JSON.stringify(editLorebook) !== JSON.stringify(originalLorebook)
	)

	function handleSave() {
		// TODO: emit save event with updated data
		showEditLorebookForm = false
	}
	function handleCancel() {
		showEditLorebookForm = false
	}

	socket.once("lorebook", (msg: Sockets.Lorebook.Response) => {
		if (msg.lorebook && msg.lorebook.id === lorebookId) {
			editLorebook = { ...msg.lorebook }
			originalLorebook = { ...msg.lorebook }
		}
	})

	onMount(() => {
		const lorebookReq: Sockets.Lorebook.Call = { id: lorebookId }
		socket.emit("lorebook", lorebookReq)
	})

	
</script>

{#if editLorebook}
	<div
		class="flex flex-col gap-6"
	>
		<div class="flex gap-2">
			<button
				class="btn btn-sm preset-filled-surface-500 w-full"
				onclick={handleCancel}
			>
				Cancel
			</button>
			<button
				class="btn btn-sm preset-filled-success-500 w-full"
				onclick={handleSave}
			>
				<Icons.Save size={16} />
				Save
			</button>
		</div>
		<div>
			<label class="font-semibold" for="lorebookName">Name*</label>
			<input
				id="lorebookName"
				class="input input-lg w-full"
				type="text"
				placeholder="Enter lorebook name"
				bind:value={editLorebook.name}
				required
			/>
		</div>
		<div>
			<label class="font-semibold" for="lorebookDescription">
				Description
			</label>
			<textarea
				id="lorebookDescription"
				class="textarea input-lg w-full"
				placeholder="Describe this lorebook (optional)"
				bind:value={editLorebook.description}
				rows={2}
			></textarea>
		</div>
</div>
{/if}


