<script lang="ts">
	import * as skio from "sveltekit-io"
	import CharacterSelectModal from "../modals/CharacterSelectModal.svelte"
	import PersonaSelectModal from "../modals/PersonaSelectModal.svelte"
	import Avatar from "../Avatar.svelte"
	import * as Icons from "@lucide/svelte"
	import { dndzone } from "svelte-dnd-action"
	import RemoveFromChatModal from "../modals/RemoveFromChatModal.svelte"
	import { onDestroy, onMount } from "svelte"
	import { Switch } from "@skeletonlabs/skeleton-svelte"
	import { toaster } from "$lib/client/utils/toaster"
	import { GroupReplyStrategies } from "$lib/shared/constants/GroupReplyStrategies"

	interface Props {
		editChatId?: number | null // If provided, edit mode; else create mode
		showEditChatForm: boolean // Controls visibility of the form
	}

	let {
		editChatId = $bindable(null),
		showEditChatForm = $bindable()
	}: Props = $props()

	const socket = skio.get()

	// STATE VARIABLES

	let chat: Sockets.Chat.Response["chat"] | undefined = $state()
	let isCreating = $state(!chat)
	let characters: Sockets.CharacterList.Response["characterList"] = $state([])
	let personas: Sockets.PersonaList.Response["personaList"] = $state([])
	let lorebookList: Sockets.LorebookList.Response["lorebookList"] = $state([])

	// Data structure to hold chat and selected characters/personas
	let data:
		| {
				chat: {
					id: number | undefined
					name: string
					scenario: string
					groupReplyStrategy: string
					lorebookId?: number | null
				}
				characterIds: number[]
				personaIds: number[]
				characterPositions: Record<number, number>
		  }
		| undefined = $state()

	let originalData:
		| {
				chat: {
					id: number | undefined
					name: string
					scenario: string
					groupReplyStrategy: string
					lorebookId?: number | null
				}
				characterIds: number[]
				personaIds: number[]
				characterPositions: Record<number, number>
		  }
		| undefined = $state()

	// DATA FIELDS
	let name = $state("")
	let scenario = $state("")
	let groupReplyStrategy = $state("ordered")
	let lorebookId: number | null = $state(null)

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

	$effect(() => {
		const _name = name.trim()
		const _scenario = scenario.trim()
		const _groupReplyStrategy = groupReplyStrategy || "ordered"
		const _selectedCharacters = selectedCharacters
		const _selectedPersonas = selectedPersonas
		const _lorebookId = lorebookId || null
		data = {
			chat: {
				id: chat?.id,
				name: _name,
				scenario: _scenario,
				groupReplyStrategy: _groupReplyStrategy || "ordered",
				lorebookId: _lorebookId
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
			socket.emit("chat", { id: editChatId })
		}
	})

	function handleAddCharacter(char: SelectCharacter & { id: number }) {
		if (!selectedCharacters.some((c) => c.id === char.id))
			selectedCharacters = [...selectedCharacters, char]
		showCharacterModal = false
	}

	function handleRemoveCharacter(id: number) {
		selectedCharacters = selectedCharacters.filter((c) => c.id !== id)
	}

	function handleAddPersona(p: SelectPersona & { id: number }) {
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

	onMount(() => {
		socket.on("chat", (msg: Sockets.Chat.Response) => {
			if (msg.chat && msg.chat.id === editChatId) {
				chat = msg.chat
				name = chat.name || ""
				scenario = chat.scenario || ""
				groupReplyStrategy = chat.groupReplyStrategy || "ordered"
				selectedCharacters =
					chat.chatCharacters?.map((cc) => cc.character) || []
				selectedPersonas =
					chat.chatPersonas?.map((cp) => cp.persona) || []
				lorebookId = chat.lorebookId || null
			}
		})
		socket.on("characterList", (msg: Sockets.CharacterList.Response) => {
			characters = msg.characterList || []
		})
		socket.on("personaList", (msg: Sockets.PersonaList.Response) => {
			personas = msg.personaList || []
		})
		socket.on("lorebookList", (msg: Sockets.LorebookList.Response) => {
			lorebookList = msg.lorebookList || []
		})
		socket.on(
			"toggleChatCharacterActive",
			(msg: Sockets.ToggleChatCharacterActive.Response) => {
				if (chat && chat.id === msg.chatId) {
					toaster.success({
						title: `Character ${msg.isActive ? "activated" : "deactivated"}`
					})
				}
			}
		)
		socket.emit("characterList", {})
		socket.emit("personaList", {})
		socket.emit("lorebookList", {})
	})

	onDestroy(() => {
		socket.off("chat")
		socket.off("characterList")
		socket.off("personaList")
		socket.off("lorebookList")
		socket.off("toggleChatCharacterActive")
	})

	function toggleCharacterActive(
		e: { checked: boolean },
		c: SelectCharacter
	): void {
		const req: Sockets.ToggleChatCharacterActive.Call = {
			chatId: chat!.id,
			characterId: c.id
		}
		socket.emit("toggleChatCharacterActive", req)
	}
</script>

{#if data}
	<div class="flex min-h-full flex-col gap-6">
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
			{#key chat?.chatCharacters}
				<div
					class="relative mb-2 flex flex-col gap-3"
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
						{@const isActive = !!chat?.chatCharacters?.find(
							(cc) => cc.characterId === c.id
						)?.isActive}
						<div class="flex gap-2">
							<div
								class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full gap-3 overflow-hidden rounded p-3"
								data-dnd-handle
							>
								<div class="relative w-fit">
									<span
										class="text-surface-400 hover:text-primary-500 absolute -top-2 -left-2 z-10 cursor-grab"
										data-dnd-handle
										class:hidden={selectedCharacters.length <=
											1}
										title="Drag to reorder"
									>
										<Icons.GripVertical size={20} />
									</span>
									<Avatar char={c} />
								</div>
								<div
									class="relative flex w-0 min-w-0 flex-1 flex-col"
								>
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
							</div>
							<div
								class="flex flex-col justify-between py-1 text-center"
							>
								<button
									class="preset-tonal-error btn btn-sm opacity-75"
									onclick={() =>
										confirmRemoveCharacter(
											c.id,
											c.nickname || c.name
										)}
									title="Remove"
								>
									<Icons.X size={16} />
								</button>
								<span>
									<Switch
										name="Toggle Character Active"
										controlWidth="w-9"
										controlActive="preset-filled-success-500"
										controlDisabled="preset-filled-surface-500"
										compact
										checked={isActive}
										disabled={!chat}
										onCheckedChange={(e) =>
											toggleCharacterActive(e, c)}
									>
										{#snippet inactiveChild()}<Icons.Meh
												size="20"
											/>{/snippet}
										{#snippet activeChild()}<Icons.Smile
												size="20"
											/>{/snippet}
									</Switch>
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/key}
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
			<div class="relative mb-2 flex flex-col gap-3">
				{#each selectedPersonas as p}
					<div class="flex gap-2">
						<div
							class="group preset-outlined-surface-400-600 hover:preset-filled-surface-500 relative flex w-full gap-3 overflow-hidden rounded p-3"
						>
							<div class="w-fit">
								<Avatar char={p} />
							</div>
							<div
								class="relative flex w-0 min-w-0 flex-1 flex-col"
							>
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
								onclick={() =>
									confirmRemovePersona(p.id, p.name)}
								title="Remove"
							>
								<Icons.X size={26} class="text-error-500" />
							</button>
						</div>
						<div
							class="flex flex-col justify-between py-1 text-center"
						>
							<button
								class="preset-tonal-error btn btn-sm opacity-75"
								onclick={() =>
									confirmRemovePersona(p.id, p.name)}
								title="Remove"
							>
								<Icons.X size={16} />
							</button>
						</div>
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
					{#each GroupReplyStrategies.options as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
		{/if}
		<div>
			<label class="flex gap-1 font-semibold" for="scenario">
				Scenario <span
					class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
					title="This field will be visible in prompts"
				>
					<Icons.ScanEye
						size={16}
						class="relative top-[1px] inline"
					/>
				</span>
			</label>
			<textarea
				id="scenario"
				class="textarea input-lg w-full"
				placeholder="Describe the chat scenario, setting, or context (optional)"
				bind:value={scenario}
				rows={3}
			></textarea>
		</div>
		<div>
			<label class="flex gap-1 font-semibold" for="lorebook">
				Lorebook <span
					class="flex items-center opacity-50 transition-opacity duration-200 hover:opacity-100"
					title="The chat will use world lore, character lore and history entries from this lorebook"
				>
					<Icons.MessageCircleQuestion
						size={16}
						class="relative top-[1px] inline"
					/>
				</span>
			</label>
			<select
				id="lorebook"
				class="select input-lg w-full"
				bind:value={lorebookId}
			>
				<option value={null}>None</option>
				{#each lorebookList as lorebook (lorebook.id)}
					<option value={lorebook.id}>{lorebook.name}</option>
				{/each}
			</select>
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
{/if}
