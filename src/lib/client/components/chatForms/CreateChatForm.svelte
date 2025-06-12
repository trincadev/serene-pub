<script lang="ts">
	import { getContext, onMount } from "svelte"
	import * as skio from "sveltekit-io"

	interface Props {
		isCreating?: boolean
	}

	let { isCreating = $bindable() }: Props = $props()

	let panelsCtx: PanelsCtx = getContext("panels")

	let name = $state("")
	let selectedCharacterId: number | undefined = $state(undefined)
	let selectedPersonaId: number | undefined = $state(undefined)
	let characters: Sockets.CharactersList.Response["charactersList"] = $state(
		[]
	)
	let personas: Sockets.PersonasList.Response["personasList"] = $state([])
	const socket = skio.get()

	function handleSave() {
		if (!name.trim() || !selectedCharacterId || !selectedPersonaId) return
		socket.emit("createChat", {
			chat: { name },
			characterIds: [selectedCharacterId],
			personaIds: [selectedPersonaId]
		})
		isCreating = false // Close the form after saving
		// Optionally reset form or close modal here
	}

	function goToCharactersTab() {
		// Figure out which side panel is currently open
		let panel: "left" | "right" | "mobile"
		if (panelsCtx.leftPanel === "chats") {
			panel = "left"
		} else if (panelsCtx.rightPanel === "chats") {
			panel = "right"
		} else {
			panel = "mobile"
		}
		panelsCtx.openPanel({ panel, which: "characters" })
	}

	function goToPersonasTab() {
		// Figure out which side panel is currently open
		let panel: "left" | "right" | "mobile"
		if (panelsCtx.leftPanel === "chats") {
			panel = "left"
		} else if (panelsCtx.rightPanel === "chats") {
			panel = "right"
		} else {
			panel = "mobile"
		}
		panelsCtx.openPanel({ panel, which: "personas" })
	}

	$effect(() => {
		console.log("Characters:", $state.snapshot(characters))
		console.log("Personas:", $state.snapshot(personas))
	})

	onMount(() => {
		socket.on("charactersList", (msg: Sockets.CharactersList.Response) => {
			console.log("Received charactersList:", msg)
			characters = msg.charactersList || []
			if (!selectedCharacterId && characters.length > 0) {
				selectedCharacterId = characters[0].id
			}
		})
		socket.on("personasList", (msg: Sockets.PersonasList.Response) => {
			console.log("Received personasList:", msg)
			personas = msg.personasList || []
			if (!selectedPersonaId && personas.length > 0) {
				selectedPersonaId = personas[0].id
			}
		})
		socket.emit("charactersList", {})
		socket.emit("personasList", {})
	})
</script>

{#if characters.length === 0}
	<div class="p-4 text-center text-gray-500">
		No characters available. Please create one first.
	</div>
	<div class="flex gap-2">
		<button
			class="btn preset-filled-surface-500 w-full"
			onclick={() => (isCreating = false)}
		>
			Cancel
		</button>
		<button
			class="btn preset-filled-primary-500 w-full"
			onclick={goToCharactersTab}
		>
			Create Character
		</button>
	</div>
{:else if personas.length === 0}
	<div class="p-4 text-center text-gray-500">
		No personas available. Please create one first.
	</div>
	<div class="flex gap-2">
		<button
			class="btn preset-filled-surface-500 w-full"
			onclick={() => (isCreating = false)}
		>
			Cancel
		</button>
		<button
			class="btn preset-filled-primary-500 w-full"
			onclick={goToPersonasTab}
		>
			Create Persona
		</button>
	</div>
{:else}
	<div class="flex flex-col gap-4 p-4">
		<div>
			<label class="font-semibold" for="chatName">Chat Name</label>
			<input
				id="chatName"
				class="input input-sm w-full"
				type="text"
				placeholder="Enter chat name"
				bind:value={name}
			/>
		</div>
		<div>
			<label class="font-semibold" for="characterSelect">Character</label>
			<select
				id="characterSelect"
				class="input input-sm w-full"
				bind:value={selectedCharacterId}
			>
				{#each characters as c}
					<option value={c.id}>{c.nickname || c.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="font-semibold" for="personaSelect">Persona</label>
			<select
				id="personaSelect"
				class="input input-sm w-full"
				bind:value={selectedPersonaId}
			>
				{#each personas as p}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>
		</div>
		<div class="mt-2 flex gap-2">
			<button
				class="btn preset-filled-surface-500 w-full"
				onclick={() => (isCreating = false)}
			>
				Cancel
			</button>
			<button
				class="btn preset-filled-success-500 w-full"
				onclick={handleSave}
				disabled={!name.trim() ||
					!selectedCharacterId ||
					!selectedPersonaId}
			>
				Create Chat
			</button>
		</div>
	</div>

	<div class="card preset-filled-primary-500 m-4 p-4">
		<p class="mb-2"><b>Not Implemented</b></p>
		<p>Group chats are not yet implemented.</p>
		<!-- Add lorebook management UI here -->
	</div>
{/if}

<!-- <CharacterUnsavedChangesModal
    open={showCancelModal}
    onOpenChange={handleCancelModalOnOpenChange}
    onConfirm={handleCancelModalDiscard}
    onCancel={handleCancelModalCancel}
/> -->
