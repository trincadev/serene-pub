<script lang="ts">
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

    const groupReplyOptions = [
		{
			value: "manual",
			label: "Manual (user selects persona for each reply)"
		},
		{ value: "ordered", label: "Ordered (replies follow persona order)" },
		{ value: "natural", label: "Natural (assigned by conversation flow)" }
	]
	const socket = skio.get()

    // STATE VARIABLES

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
	let data: {
        chat: {
			id: number | undefined,
			name: string
			scenario: string
			groupReplyStrategy: string
		},
		characterIds: number[],
		personaIds: number[],
		characterPositions: Record<number, number>
    } | undefined = $state()

	let originalData: {
        chat: {
			id: number | undefined,
			name: string
			scenario: string
			groupReplyStrategy: string
		},
		characterIds: number[],
		personaIds: number[],
		characterPositions: Record<number, number>
    } | undefined = $state()

    // DATA FIELDS
    let name = $state("")
    let scenario = $state("")
	let groupReplyStrategy = $state("ordered")

    // MODALS
	let showCharacterModal = $state(false)
	let showPersonaModal = $state(false)

    // FORM SUBMIT STATE
	let isDirty: boolean = $derived(
		JSON.stringify(data) !== JSON.stringify(originalData)
	)
	let canSave: boolean = $derived(
		(!!editChatId && isDirty) ||
			(!editChatId &&
				data?.chat.name.trim() &&
				data?.characterIds.length > 0 &&
				data?.personaIds.length > 0)
	)

    // SELECTED CHARACTERS AND PERSONAS
	let selectedCharacters: SelectCharacter[] = $state([])
	let selectedPersonas: SelectPersona[] = $state([])
	let showRemoveModal = $state(false)
	let removeType: "character" | "persona" = $state("character")
	let removeName = $state("")
	let removeId: number | null = $state(null)


    // SOCKET LISTENERS

	socket.on("charactersList", (msg: Sockets.CharactersList.Response) => {
		characters = msg.charactersList || []
	})
	socket.on("personasList", (msg: Sockets.PersonasList.Response) => {
		personas = msg.personasList || []
	})
	socket.emit("charactersList", {})
	socket.emit("personasList", {})

    $effect(() => {
        const _name = name.trim()
        const _scenario = scenario.trim()
        const _groupReplyStrategy = groupReplyStrategy || "ordered"
        const _selectedCharacters = selectedCharacters
        const _selectedPersonas = selectedPersonas
        data = {
            chat: {
                id: chat?.id,
                name: _name,
                scenario: _scenario,
                groupReplyStrategy: _groupReplyStrategy || "ordered"
            },
            characterIds: _selectedCharacters.map((cc) => cc.id),
            personaIds: _selectedPersonas.map((cp) => cp.id),
            characterPositions: Object.fromEntries(
                _selectedCharacters.map((cc, i) => [cc.id, i])
            )
        }

        if (!originalData) {
            originalData = { ...data }
        }
    })

	$effect(() => {
		if (editChatId) {
			// Fetch chat details if editing
			socket.once("chat", (msg: Sockets.Chat.Response) => {
				if (msg.chat && msg.chat.id === editChatId) {
					chat = msg.chat
					name = chat.name || ""
                    scenario = chat.scenario || ""
                    groupReplyStrategy = chat.group_reply_strategy || "ordered"
                    selectedCharacters = chat.chatCharacters?.map((cc) => cc.character) || []
                    selectedPersonas = chat.chatPersonas?.map((cp) => cp.persona) || []
				}
			})
			socket.emit("chat", { id: editChatId })
		}
	})

	function handleAddCharacter(char: SelectCharacter) {
		if (!selectedCharacters.some((c) => c.id === char.id))
			selectedCharacters = [...selectedCharacters, char]
		showCharacterModal = false
	}
	function handleRemoveCharacter(id: number) {
		selectedCharacters = selectedCharacters.filter((c) => c.id !== id)
	}
	function handleAddPersona(p: SelectPersona) {
		if (!selectedPersonas.some((pp) => pp.id === p.id))
			selectedPersonas = [...selectedPersonas, p]
		showPersonaModal = false
		// Sync data.personaIds
	}
	function handleRemovePersona(id: number) {
		selectedPersonas = selectedPersonas.filter((p) => p.id !== id)
	}
	function handleSave() {
		if (
			!data?.chat.name.trim() ||
			selectedCharacters.length === 0 ||
			selectedPersonas.length === 0
		)
			return
		const chatData: any = { name: data.chat.name }
		if (data.chat.scenario.trim()) chatData.scenario = data.chat.scenario
		if (selectedCharacters.length > 1)
			chatData.group_reply_strategy = data.chat.groupReplyStrategy
		const characterIds = selectedCharacters.map((c) => c.id)
		const personaIds = selectedPersonas.map((p) => p.id)
		// characterPositions is now always up-to-date in data.characterPositions
		if (chat && chat.id) {
			const updateChat: Sockets.UpdateChat.Call = data
			socket.emit("updateChat", updateChat)
		} else {
			const createChat: Sockets.CreateChat.Call = data
			socket.emit("createChat", createChat)
		}
		isCreating = false
		showEditChatForm = false
	}

	function confirmRemoveCharacter(id: number, name: string) {
		removeType = "character"
		removeName = name
		removeId = id
		showRemoveModal = true
	}
	function confirmRemovePersona(id: number, name: string) {
		removeType = "persona"
		removeName = name
		removeId = id
		showRemoveModal = true
	}
	function handleRemoveConfirm() {
		if (removeType === "character") handleRemoveCharacter(removeId!)
		else if (removeType === "persona") handleRemovePersona(removeId!)
		showRemoveModal = false
		removeId = null
		removeName = ""
	}
	function handleRemoveCancel() {
		showRemoveModal = false
		removeId = null
		removeName = ""
	}

	function handleCloseForm() {
		// TODO handle unsaved changes if any
		showEditChatForm = false
	}
</script>

<div class="flex flex-col gap-6 rounded-lg border border-surface-500/25 p-2 min-h-full">
	<div class="mt-4 flex gap-2">
		<button
			class="btn btn-sm preset-filled-surface-500 w-full"
			onclick={handleCloseForm}
		>
			Cancel
		</button>
		<button
			class="btn btn-sm preset-filled-success-500 w-full"
			onclick={handleSave}
			disabled={!canSave}
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
			bind:value={name}
			required
		/>
	</div>
	<div>
		<span class="mb-2 font-semibold">Characters*</span>
		<div
			class="relative mb-2 flex flex-wrap gap-3"
			use:dndzone={{
				items: selectedCharacters,
				flipDurationMs: 150,
				dragDisabled: !(selectedCharacters.length > 1),
				dropFromOthersDisabled: true
			}}
			onconsider={(e) => (selectedCharacters = e.detail.items)}
			onfinalize={(e) => (selectedCharacters = e.detail.items)}
		>
			{#each selectedCharacters as c (c.id)}
				<div
					class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full gap-3 overflow-hidden rounded p-3"
					data-dnd-handle
				>
					<div class="relative w-fit">
						<span
							class="text-surface-400 hover:text-primary-500 absolute -top-2 -left-2 z-10 cursor-grab"
							data-dnd-handle
							class:hidden={selectedCharacters.length <= 1}
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
			{#each selectedPersonas as p}
				<div
					class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full gap-3 overflow-hidden rounded p-3"
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
				disabled={selectedPersonas.length > 0}
				onclick={() => (showPersonaModal = true)}
			>
				<Icons.Plus size={16} /> Add Persona
			</button>
		</div>
	</div>
	{#if selectedCharacters.length > 1}
		<div>
			<label class="font-semibold" for="groupReplyStrategy">
				Group Reply Strategy
			</label>
			<select
				id="groupReplyStrategy"
				class="select input-lg w-full"
				bind:value={groupReplyStrategy}
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
			class="textarea input-lg w-full"
			placeholder="Describe the chat scenario, setting, or context (optional)"
			bind:value={scenario}
			rows={3}
		></textarea>
	</div>
</div>
<CharacterSelectModal
	open={showCharacterModal}
	characters={characters.filter(
		(c) => !selectedCharacters.some((sel) => sel.id === c.id)
	)}
	onOpenChange={(e) => (showCharacterModal = e.open)}
	onSelect={handleAddCharacter}
/>
<PersonaSelectModal
	open={showPersonaModal}
	personas={personas.filter(
		(p) => !selectedPersonas.some((sel) => sel.id === p.id)
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
