<script lang="ts">
	import { onMount } from "svelte"
	import * as Icons from "@lucide/svelte"
	import PersonaSelectModal from "../modals/PersonaSelectModal.svelte"
	import CharacterSelectModal from "../modals/CharacterSelectModal.svelte"
	import * as skio from "sveltekit-io"
	import Avatar from "../Avatar.svelte"
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
	let characterList: Sockets.CharacterList.Response["characterList"] = $state(
		[]
	)
	let lorebookBindingList: Sockets.LorebookBindingList.Response["lorebookBindingList"] =
		$state([])
	let personaList: Sockets.PersonaList.Response["personaList"] = $state([])
	let showLinkPersonaBindingModal = $state(false)
	let showLinkCharacterBindingModal = $state(false)
	let showAddPersonaBindingModal = $state(false)
	let showAddCharacterBindingModal = $state(false)
	let lorebookBindingId: number | null = $state(null)

	let hasUnsavedChanges = $derived(
		JSON.stringify(editLorebook) !== JSON.stringify(originalLorebook)
	)
	let availableBindingCharacters = $derived.by(() => {
		// Filter out the characters that are already bound to this lorebook
		return characterList.filter(
			(c) =>
				!lorebookBindingList.some(
					(b) =>
						b.characterId === c.id &&
						b.lorebookId === editLorebook?.id
				)
		)
	})

	let availableBindingPersonas = $derived.by(() => {
		// Filter out the personas that are already bound to this lorebook
		return personaList.filter(
			(p) =>
				!lorebookBindingList.some(
					(b) =>
						b.personaId === p.id &&
						b.lorebookId === editLorebook?.id
				)
		)
	})

	function handleSave() {
		// TODO: emit save event with updated data
		showEditLorebookForm = false
	}
	function handleCancel() {
		showEditLorebookForm = false
	}

	function unlinkBinding(id: number) {
		const req: Sockets.UpdateLorebookBinding.Call = {
			lorebookBinding: {
				id,
				personaId: null,
				characterId: null
			}
		}
		socket.emit("update", req)
	}

	function onClickLinkCharacterBinding(bindingId: number) {
		lorebookBindingId = bindingId
		showLinkCharacterBindingModal = true
	}

	function onClickLinkPersonaBinding(bindingId: number) {
		lorebookBindingId = bindingId
		showLinkPersonaBindingModal = true
	}

	function onClickAddCharacterBinding() {
		showAddCharacterBindingModal = true
	}

	function onClickAddPersonaBinding() {
		showAddPersonaBindingModal = true
	}

	function handleLinkPersonaBindingSelect(
		persona: Partial<SelectPersona> & { id: number }
	) {
		showLinkPersonaBindingModal = false
		const req: Sockets.UpdateLorebookBinding.Call = {
			lorebookBinding: {
				id: lorebookBindingId ?? 0,
				personaId: persona.id ?? null,
				characterId: null
			}
		}
		socket.emit("updateLorebookBinding", req)
	}

	function handleLinkCharacterBindingSelect(
		character: Partial<SelectCharacter> & { id: number }
	) {
		showLinkCharacterBindingModal = false
		const req: Sockets.UpdateLorebookBinding.Call = {
			lorebookBinding: {
				id: lorebookBindingId ?? 0,
				characterId: character.id ?? null,
				personaId: null
			}
		}
		socket.emit("updateLorebookBinding", req)
		lorebookBindingId = null
	}

	function handleAddPersonaBindingSelect(
		persona: Partial<SelectPersona> & { id: number }
	) {
		showAddPersonaBindingModal = false
		const req: Sockets.CreateLorebookBinding.Call = {
			lorebookBinding: {
				lorebookId: editLorebook?.id ?? 0,
				personaId: persona.id ?? null,
				characterId: null
			}
		}
		socket.emit("createLorebookBinding", req)
	}

	function handleAddCharacterBindingSelect(
		character: Partial<SelectCharacter> & { id: number }
	) {
		showAddCharacterBindingModal = false
		const req: Sockets.CreateLorebookBinding.Call = {
			lorebookBinding: {
				lorebookId: editLorebook?.id ?? 0,
				characterId: character.id ?? null,
				personaId: null
			}
		}
		socket.emit("createLorebookBinding", req)
		lorebookBindingId = null
	}

	socket.once("lorebook", (msg: Sockets.Lorebook.Response) => {
		if (msg.lorebook && msg.lorebook.id === lorebookId) {
			editLorebook = { ...msg.lorebook }
			originalLorebook = { ...msg.lorebook }
		}
	})

	socket.on("characterList", (msg: Sockets.CharacterList.Response) => {
		characterList = msg.characterList || []
	})

	socket.on("personaList", (msg: Sockets.PersonaList.Response) => {
		personaList = msg.personaList || []
	})

	socket.on(
		"lorebookBindingList",
		(msg: Sockets.LorebookBindingList.Response) => {
			lorebookBindingList = msg.lorebookBindingList || []
		}
	)

	socket.on(
		"createLorebookBinding",
		(msg: Sockets.CreateLorebookBinding.Response) => {
			toaster.success({
				title: "Binding Created",
				description: "Lorebook binding created successfully."
			})
		}
	)

	socket.on(
		"updateLorebookBinding",
		(msg: Sockets.UpdateLorebookBinding.Response) => {
			toaster.success({
				title: "Binding Updated",
				description: "Lorebook binding updated successfully."
			})
		}
	)

	onMount(() => {
		const lorebookReq: Sockets.Lorebook.Call = { id: lorebookId }
		socket.emit("lorebook", lorebookReq)
		socket.emit("characterList", {})
		socket.emit("personaList", {})
		const bindingReq: Sockets.LorebookBindingList.Call = {
			lorebookId
		}
		socket.emit("lorebookBindingList", bindingReq)
	})

	function getBindingCharacter(binding: SelectLorebookBinding) {
		return binding.characterId
			? characterList.find((c) => c.id === binding.characterId)
			: binding.personaId
				? personaList.find((p) => p.id === binding.personaId)
				: null
	}
</script>

{#if editLorebook}
	<div
		class="border-surface-500/25 flex min-h-full flex-col gap-6 rounded-lg border p-2"
	>
		<h2 class="text-lg font-bold">
			Edit: {editLorebook.name}
		</h2>
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
		<div class="bindings-tab">
			<h3 class="font-semibold">Character Bindings</h3>
			<div class="bindings-list">
				{#each lorebookBindingList as binding, i}
					{@render bindingCard(binding)}
				{/each}
			</div>
			<div class="flex gap-2">
				<button
					class="btn btn-sm preset-filled-primary-500 mt-2 w-full"
					onclick={() => onClickAddCharacterBinding()}
				>
					<Icons.Plus size={16} /> Add Character
				</button>
				<button
					class="btn btn-sm preset-filled-primary-500 mt-2 w-full"
					onclick={() => onClickAddPersonaBinding()}
				>
					<Icons.Plus size={16} /> Add Persona
				</button>
			</div>
		</div>
	</div>

	{#snippet bindingCard(binding: SelectLorebookBinding)}
		<div class="binding-card  group preset-outlined-surface-300-700 hover:preset-filled-surface-200-800">
		<div
			class="binding-top-row"
		>
			{#if binding}
				<!-- Show character card -->
				{@const char = getBindingCharacter(binding)}
				{#if char}
					<div class="binding-avatar">
						<Avatar {char} />
					</div>
					<div class="binding-info">
						<div class="binding-name">
							{"nickname" in char ? char.nickname : char.name}
						</div>
						<div
							class="binding-desc group-hover:text-surface-800-200 line-clamp-2"
						>
							{"creatorNotes" in char
								? char.creatorNotes
								: char.description}
						</div>
					</div>
				{:else}
					<div class="binding-avatar placeholder">No Char</div>
				{/if}
			{/if}
			<div class="binding-actions">
				<button
					onclick={() => onClickLinkCharacterBinding(binding.id)}
					class:hidden={binding.personaId || binding.characterId}
				>
					Link Character
				</button>
				<button
					onclick={() => onClickLinkPersonaBinding(binding.id)}
					class:hidden={binding.personaId || binding.characterId}
				>
					Link Persona
				</button>
				<button
					onclick={() => unlinkBinding(binding.id)}
					class:disabled={!binding.characterId && !binding.personaId}
					class="text-error-500 hidden group-hover:inline"
					title="Unlink Binding"
				>
					<Icons.Link size={16} />
				</button>
			</div>
			</div>
			<div>
				<span>Handlebar: <span class="text-tertiary-700-300">{binding.binding}</span></span>
				
			</div>
		</div>
	{/snippet}

	<!-- Link to existing bindings -->

	<PersonaSelectModal
		open={showLinkPersonaBindingModal}
		onSelect={handleLinkPersonaBindingSelect}
		onOpenChange={() => (showLinkPersonaBindingModal = false)}
		personas={availableBindingPersonas}
	/>
	<CharacterSelectModal
		open={showLinkCharacterBindingModal}
		onSelect={handleLinkCharacterBindingSelect}
		onOpenChange={() => (showLinkCharacterBindingModal = false)}
		characters={availableBindingCharacters}
	/>

	<!-- Modals for adding new bindings -->

	<PersonaSelectModal
		open={showAddPersonaBindingModal}
		onSelect={handleAddPersonaBindingSelect}
		onOpenChange={() => (showAddPersonaBindingModal = false)}
		personas={availableBindingPersonas}
	/>

	<CharacterSelectModal
		open={showAddCharacterBindingModal}
		onSelect={handleAddCharacterBindingSelect}
		onOpenChange={() => (showAddCharacterBindingModal = false)}
		characters={availableBindingCharacters}
	/>
{/if}

<style lang="postcss">
	@reference "tailwindcss";

	.bindings-list {
		@apply relative mb-2 flex flex-wrap gap-3;
	}

	.binding-card {
		@apply rounded-lg relative flex flex-col p-3 gap-2 transition-all;
	}

	.binding-top-row {
		@apply flex w-full gap-3 overflow-hidden rounded;
	}

	.binding-name {
		@apply truncate font-semibold;
	}

	.binding-desc {
		@apply: text-surface-500 line-clamp-2 w-full text-left text-xs select-none;
	}
</style>
