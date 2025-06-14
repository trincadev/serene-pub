<script lang="ts">
	import { onMount } from "svelte"
	import * as skio from "sveltekit-io"
	import CharacterSelectModal from "../modals/CharacterSelectModal.svelte"
	import PersonaSelectModal from "../modals/PersonaSelectModal.svelte"
	import Avatar from "../Avatar.svelte"
	import * as Icons from "@lucide/svelte"
	import { dndzone } from "svelte-dnd-action"
	import RemoveFromChatModal from "../modals/RemoveFromChatModal.svelte"

	interface Props {
		editChatId?: number | null // If provided, edit mode; else create mode
		showEditChatForm: boolean // Controls visibility of the form
	}

	let {
		editChatId = $bindable(null),
		showEditChatForm = $bindable()
	}: Props = $props()

	let chat:
		| (SelectChat & {
				chatCharacters?: SelectChatCharacter &
					{ character: SelectCharacter }[]
				chatPersonas?: SelectChatPersona & { persona: SelectPersona }[]
		  })
		| undefined = $state()
	let isCreating = $state(!chat)
	let characters: Sockets.CharactersList.Response["charactersList"] = $state(
		[]
	)
	let personas: Sockets.PersonasList.Response["personasList"] = $state([])
	let data = $state({
		name: chat?.name || "",
		scenario: chat?.scenario || "",
		selectedCharacters: [] as SelectCharacter[],
		selectedPersonas: [] as SelectPersona[],
		characterPositions: {} as Record<number, number>,
		groupReplyStrategy: chat?.group_reply_strategy || "ordered"
	})
	let originalData = $state({
		name: chat?.name || "",
		scenario: chat?.scenario || "",

		selectedCharacters: [] as SelectCharacter[],
		selectedPersonas: [] as SelectPersona[],
		characterPositions: {} as Record<number, number>,
		groupReplyStrategy: chat?.group_reply_strategy || "ordered"
	})
	let showCharacterModal = $state(false)
	let showPersonaModal = $state(false)

	let canSave = $derived.by(() => {
		return (
			(!!editChatId && isDirty) ||
			(!editChatId &&
				data.name.trim() &&
				data.selectedCharacters.length > 0 &&
				data.selectedPersonas.length > 0)
		)
	})
	let showRemoveModal = $state(false)
	let removeType: "character" | "persona" = $state("character")
	let removeName = $state("")
	let removeId: number | null = $state(null)

	const groupReplyOptions = [
		{
			value: "manual",
			label: "Manual (user selects persona for each reply)"
		},
		{ value: "ordered", label: "Ordered (replies follow persona order)" },
		{ value: "natural", label: "Natural (assigned by conversation flow)" }
	]
	const socket = skio.get()

	socket.on("charactersList", (msg: Sockets.CharactersList.Response) => {
		characters = msg.charactersList || []
	})
	socket.on("personasList", (msg: Sockets.PersonasList.Response) => {
		personas = msg.personasList || []
	})
	socket.emit("charactersList", {})
	socket.emit("personasList", {})

	$effect(() => {
		if (editChatId) {
			// Fetch chat details if editing
			socket.once("chat", (msg: Sockets.Chat.Response) => {
				if (msg.chat && msg.chat.id === editChatId) {
					chat = msg.chat
					// Populate selectedCharacters and selectedPersonas from chat
					data.selectedCharacters =
						chat?.chatCharacters!.map((c) => c.character) || []
					data.selectedPersonas =
						chat?.chatPersonas!.map((p) => p.persona) || []
					data.name = chat.name || ""
					data.scenario = chat.scenario || ""
					data.groupReplyStrategy =
						chat.group_reply_strategy || "ordered"
					chat.chatCharacters?.forEach((c) => {
						data.characterPositions[c.character.id] =
							c.position || 0
					})
					originalData = { ...data }
				}
			})
			socket.emit("chat", { id: editChatId })
		}
	})

	$effect(() => {
		data.characterPositions = Object.fromEntries(
			data.selectedCharacters.map((c, i) => [c.id, i])
		)
	})

	function handleAddCharacter(char: SelectCharacter) {
		if (!data.selectedCharacters.some((c) => c.id === char.id))
			data.selectedCharacters = [...data.selectedCharacters, char]
		showCharacterModal = false
	}
	function handleRemoveCharacter(id: number) {
		data.selectedCharacters = data.selectedCharacters.filter(
			(c) => c.id !== id
		)
	}
	function handleAddPersona(p: SelectPersona) {
		if (!data.selectedPersonas.some((pp) => pp.id === p.id))
			data.selectedPersonas = [...data.selectedPersonas, p]
		showPersonaModal = false
	}
	function handleRemovePersona(id: number) {
		data.selectedPersonas = data.selectedPersonas.filter((p) => p.id !== id)
	}
	function handleSave() {
		if (
			!data.name.trim() ||
			data.selectedCharacters.length === 0 ||
			data.selectedPersonas.length === 0
		)
			return
		const chatData: any = { name: data.name }
		if (data.scenario.trim()) chatData.scenario = data.scenario
		if (data.selectedCharacters.length > 1)
			chatData.group_reply_strategy = data.groupReplyStrategy
		const characterIds = data.selectedCharacters.map((c) => c.id)
		const personaIds = data.selectedPersonas.map((p) => p.id)
		// characterPositions is now always up-to-date in data.characterPositions
		if (chat && chat.id) {
			const updateChat: Sockets.UpdateChat.Call = {
				id: chat.id,
				chat: chatData,
				characterIds,
				personaIds,
				characterPositions: data.characterPositions
			}
			socket.emit("updateChat", updateChat)
		} else {
			const createChat: Sockets.CreateChat.Call = {
				chat: chatData,
				characterIds,
				personaIds,
				characterPositions: data.characterPositions
			}
			socket.emit("createChat", createChat)
		}
		isCreating = false
		dispatch("saved")
	}

	function confirmRemoveCharacter(id, name) {
		removeType = "character"
		removeName = name
		removeId = id
		showRemoveModal = true
	}
	function confirmRemovePersona(id, name) {
		removeType = "persona"
		removeName = name
		removeId = id
		showRemoveModal = true
	}
	function handleRemoveConfirm() {
		if (removeType === "character") handleRemoveCharacter(removeId)
		else if (removeType === "persona") handleRemovePersona(removeId)
		showRemoveModal = false
		removeId = null
		removeName = ""
	}
	function handleRemoveCancel() {
		showRemoveModal = false
		removeId = null
		removeName = ""
	}
	function isDirty() {
		return JSON.stringify(data) !== JSON.stringify(originalData)
	}

	$effect(() => {
		console.log("can save:", canSave)
	})
</script>

<div class="flex flex-col gap-6 p-6">
    <div class="mt-4 flex gap-2">
		<button
			class="btn preset-filled-surface-500 w-full"
			onclick={() => (isCreating = false)}
		>
			Cancel
		</button>
		<button
			class="btn preset-filled-success-500 w-full"
			onclick={handleSave}
			disabled={canSave}
		>
			{chat ? "Save Changes" : "Create Chat"}
		</button>
	</div>
	<div>
		<label class="font-semibold" for="chatName">Chat Name*</label>
		<input
			id="chatName"
			class="input input-lg w-full"
			type="text"
			placeholder="Enter chat name"
			bind:value={data.name}
			required
		/>
	</div>
	<div>
		<span class="mb-2 font-semibold">Characters*</span>
		<div
			class="relative mb-2 flex max-w-100 flex-wrap gap-3"
			use:dndzone={{
				items: data.selectedCharacters,
				flipDurationMs: 150,
				dragDisabled: !(data.selectedCharacters.length > 1),
				dropFromOthersDisabled: true
			}}
			onconsider={(e) => (data.selectedCharacters = e.detail.items)}
			onfinalize={(e) => (data.selectedCharacters = e.detail.items)}
		>
			{#each data.selectedCharacters as c (c.id)}
				<div
					class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full max-w-[25em] gap-3 overflow-hidden rounded p-3"
					data-dnd-handle
				>
					<div class="relative w-fit">
						<span
							class="text-surface-400 hover:text-primary-500 absolute -top-2 -left-2 z-10 cursor-grab"
							data-dnd-handle
							class:hidden={data.selectedCharacters.length <= 1}
							title="Drag to reorder"
						>
							<Icons.GripVertical size={20} />
						</span>
						<Avatar char={c} />
					</div>
					<div class="relative flex w-0 min-w-0 flex-1 flex-col">
						<div
							class="w-full truncate text-left font-semibold select-none"
						>
							{c.nickname || c.name}
						</div>
						<div
							class="text-surface-500 group-hover:text-surface-800-200 line-clamp-2 w-full text-left text-xs select-none"
						>
							{c.creatorNotes || c.description || ""}
						</div>
					</div>
					<button
						class="text-text-error-500 absolute -top-2 -right-2 z-10 mt-2 mr-2 opacity-0 group-hover:opacity-100"
						onclick={() =>
							confirmRemoveCharacter(c.id, c.nickname || c.name)}
						title="Remove"
					>
						<Icons.X size={26} class="text-error-500" />
					</button>
				</div>
			{/each}
		</div>
		<div>
			<button
				class="btn btn-sm preset-filled-primary-500 flex items-center"
				onclick={() => (showCharacterModal = true)}
			>
				<Icons.Plus size={16} /> Add Character
			</button>
		</div>
	</div>
	<div>
		<span class="mb-2 font-semibold">Personas*</span>
		<div class="mb-2 flex flex-wrap gap-3">
			{#each data.selectedPersonas as p}
				<div
					class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full max-w-[25em] gap-3 overflow-hidden rounded p-3"
				>
					<div class="w-fit">
						<Avatar char={p} />
					</div>
					<div class="relative flex w-0 min-w-0 flex-1 flex-col">
						<div
							class="w-full truncate text-left font-semibold select-none"
						>
							{p.name}
						</div>
						<div
							class="text-surface-500 group-hover:text-surface-800-200 line-clamp-2 w-full text-left text-xs select-none"
						>
							{p.description || ""}
						</div>
					</div>
					<button
						class="text-text-error-500 absolute -top-2 -right-2 z-10 mt-2 mr-2 opacity-0 group-hover:opacity-100"
						onclick={() => confirmRemovePersona(p.id, p.name)}
						title="Remove"
					>
						<Icons.X size={26} class="text-error-500" />
					</button>
				</div>
			{/each}
		</div>
		<div>
			<button
				class="btn btn-sm preset-filled-primary-500 flex items-center gap-1"
				disabled={data.selectedPersonas.length > 0}
				onclick={() => (showPersonaModal = true)}
			>
				<Icons.Plus size={16} /> Add Persona
			</button>
		</div>
	</div>
	{#if data.selectedCharacters.length > 1}
		<div>
			<label class="font-semibold" for="groupReplyStrategy">
				Group Reply Strategy
			</label>
			<select
				id="groupReplyStrategy"
				class="input input-lg w-full"
				bind:value={data.groupReplyStrategy}
			>
				{#each groupReplyOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>
	{/if}
	<div>
		<label class="font-semibold" for="scenario">Scenario</label>
		<textarea
			id="scenario"
			class="input input-lg w-full"
			placeholder="Describe the chat scenario, setting, or context (optional)"
			bind:value={data.scenario}
			rows={3}
		></textarea>
	</div>
</div>
<CharacterSelectModal
	open={showCharacterModal}
	characters={characters.filter(
		(c) => !data.selectedCharacters.some((sel) => sel.id === c.id)
	)}
	onOpenChange={(e) => (showCharacterModal = e.open)}
	onSelect={handleAddCharacter}
/>
<PersonaSelectModal
	open={showPersonaModal}
	personas={personas.filter(
		(p) => !data.selectedPersonas.some((sel) => sel.id === p.id)
	)}
	onOpenChange={(e) => (showPersonaModal = e.open)}
	onSelect={handleAddPersona}
/>
<RemoveFromChatModal
	open={showRemoveModal}
	onOpenChange={(e) => (showRemoveModal = e.open)}
	onConfirm={handleRemoveConfirm}
	onCancel={handleRemoveCancel}
	name={removeName}
	type={removeType}
/>
