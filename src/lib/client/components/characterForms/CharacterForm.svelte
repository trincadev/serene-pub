<script lang="ts">
	import { Avatar, Switch } from "@skeletonlabs/skeleton-svelte"
	import * as Icons from "@lucide/svelte"
	import skio from "sveltekit-io"
	import { onMount } from "svelte"
	import CharacterUnsavedChangesModal from "../modals/CharacterUnsavedChangesModal.svelte"

	interface EditCharacterData {
		id?: number
		name: string
		nickname: string
		avatar: string
		description: string
		personality: string
		scenario: string
		firstMessage: string
		alternateGreetings: string[]
		exampleDialogues: string
		creatorNotes: string
		creatorNotesMultilingual: Record<string, string>
		groupOnlyGreetings: string[]
		postHistoryInstructions: string
		isFavorite: boolean
		_avatarFile?: File | undefined
		_avatar: string
	}

	export interface Props {
		characterId?: number
		isSafeToClose: boolean
		closeForm: () => void
	}

	let {
		characterId,
		isSafeToClose = $bindable(),
		closeForm
	}: Props = $props()

	const socket = skio.get()

	let editCharacterData: EditCharacterData = $state({
		id: undefined,
		name: "",
		nickname: "",
		avatar: "",
		description: "",
		personality: "",
		scenario: "",
		firstMessage: "",
		alternateGreetings: [],
		exampleDialogues: "",
		creatorNotes: "",
		creatorNotesMultilingual: {},
		groupOnlyGreetings: [],
		postHistoryInstructions: "",
		isFavorite: false,
		characterVersion: "",
		_avatarFile: undefined,
		_avatar: ""
	})
	let originalCharacterData: EditCharacterData = $state({
		...editCharacterData
	})
	let expanded = $state({
		description: true,
		personality: false,
		scenario: false,
		firstMessage: false,
		exampleDialogues: false,
		creatorNotes: false,
		creatorNotesMultilingual: false,
		alternateGreetings: false,
		groupOnlyGreetings: false,
		postHistoryInstructions: false
	})
	let character = $state(undefined)
	let mode: "create" | "edit" = $derived.by(() =>
		!!character ? "edit" : "create"
	)
	let isDataValid = $derived(
		!!editCharacterData?.name?.trim() && !!editCharacterData?.name?.trim()
	)
	let showCancelModal = $state(false)
	let newLangKey = $state("")
	let newLangNote = $state("")

	// Events: avatarChange, save, cancel
	function handleAvatarChange(e: Event) {
		const input = e.target as HTMLInputElement | null
		if (!input || !input.files || input.files.length === 0) return
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return
		// Only set preview, do not upload yet
		const previewReader = new FileReader()
		previewReader.onload = (ev2) => {
			editCharacterData._avatar = ev2.target?.result as string
		}
		previewReader.readAsDataURL(file)
		// Store file for later upload
		editCharacterData._avatarFile = file
	}

	function onSave() {
		if (mode === "create") {
			// Create new character
			handleCreate()
		} else if (mode === "edit" && character) {
			// Update existing character
			handleUpdate()
		}
	}

	function handleCreate() {
		const newCharacter = { ...editCharacterData }
		const avatarFile = newCharacter._avatarFile
		delete newCharacter._avatarFile
		socket.emit("createCharacter", {
			character: newCharacter,
			avatarFile
		})
	}

	function handleUpdate() {
		const updatedCharacter = { ...editCharacterData }
		const avatarFile = updatedCharacter._avatarFile
		delete updatedCharacter._avatarFile
		socket.emit("updateCharacter", {
			character: updatedCharacter,
			avatarFile
		})
	}

	function handleCancelModalOnOpenChange(e: OpenChangeDetails) {
		if (!e.open) {
			showCancelModal = false
		}
	}

	function handleCancel() {
		if (isSafeToClose) {
			closeForm()
		} else {
			showCancelModal = true
		}
	}

	function handleCancelModalDiscard() {
		showCancelModal = false
		closeForm()
	}

	function handleCancelModalCancel() {
		showCancelModal = false
	}

	onMount(() => {
		socket.on("createCharacter", (res) => {
			if (!res.error) {
				closeForm()
			}
		})

		socket.on("updateCharacter", (res) => {
			if (!res.error) {
				closeForm()
			}
		})
		if (characterId) {
			socket.once("character", (message) => {
				console.log(
					"[CharacterForm] Received character data:",
					message.character
				)
				character = message.character
				editCharacterData = {
					...editCharacterData,
					...message.character
				}
				originalCharacterData = { ...editCharacterData }
			})
			socket.emit("character", { id: characterId })
		}
	})

	$effect(() => {
		isSafeToClose =
			JSON.stringify(editCharacterData) ===
			JSON.stringify(originalCharacterData)
	})

	// Helper for editing arrays
	function addToArray(arr: string[], value = "") {
		arr.push(value)
	}
	function removeFromArray(arr: string[], idx: number) {
		arr.splice(idx, 1)
	}
	// Helper for editing object
	function setObjectKey(
		obj: Record<string, string>,
		key: string,
		value: string
	) {
		obj[key] = value
	}
	function removeObjectKey(obj: Record<string, string>, key: string) {
		delete obj[key]
	}
</script>

<div
	class="border-primary bg-background animate-fade-in min-h-full rounded-lg border p-4 shadow-lg"
>
	<h2 class="mb-4 text-lg font-bold">
		{mode === "edit"
			? `Edit: ${character.nickname || character.name}`
			: "Create Character"}
	</h2>
	<div class="mt-4 mb-4 flex gap-2">
		<button
			type="button"
			class="btn btn-sm preset-filled-surface-500 w-full"
			onclick={handleCancel}
		>
			Cancel
		</button>
		<button
			type="button"
			class="btn btn-sm preset-filled-primary-500 w-full"
			onclick={onSave}
			disabled={!isDataValid || isSafeToClose}
		>
			{mode === "edit" ? "Update" : "Create"}
		</button>
	</div>
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-4">
			<span>
				<Avatar
					src={editCharacterData._avatar || editCharacterData.avatar}
					size="w-[4em] h-[4em]"
					name={editCharacterData.name ??
						(mode === "edit" ? "Edit Character" : "New Character")}
					background="preset-filled-primary-500"
					imageClasses="object-cover"
				>
					<Icons.User size={36} />
				</Avatar>
			</span>
			<div class="flex w-full flex-col gap-2">
				<div class="flex w-full items-center justify-center">
					<label
						for="dropzone-file"
						class="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600 dark:hover:bg-gray-800"
					>
						<div
							class="flex w-full flex-col items-center justify-center"
						>
							<svg
								class="my-4 h-8 w-8 text-gray-500 dark:text-gray-400"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 20 16"
							>
								<path
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
								/>
							</svg>
						</div>
						<input
							id="dropzone-file"
							type="file"
							class="hidden"
							accept="image/*"
							onchange={handleAvatarChange}
						/>
					</label>
				</div>
				<button
					type="button"
					class="btn btn-sm preset-tonal-error mt-1"
					onclick={() => {
						editCharacterData._avatarFile = undefined
						editCharacterData._avatar = ""
					}}
					disabled={!editCharacterData._avatarFile}
				>
					Clear Selection
				</button>
			</div>
		</div>
		<div class="flex flex-col gap-1">
			<label class="font-semibold" for="charName">Name*</label>
			<input
				id="charName"
				type="text"
				bind:value={editCharacterData.name}
				class="input input-sm bg-background border-muted w-full rounded border"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label class="font-semibold" for="charNickname">Nickname</label>
			<input
				id="charNickname"
				type="text"
				bind:value={editCharacterData.nickname}
				class="input input-sm bg-background border-muted w-full rounded border"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label class="font-semibold" for="charVersion">
				Character Version
			</label>
			<input
				id="charVersion"
				type="text"
				bind:value={editCharacterData.characterVersion}
				class="input input-sm bg-background border-muted w-full rounded border"
				placeholder="1.0"
			/>
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() => (expanded.description = !expanded.description)}
			>
				<span>Description*</span>
				<span class="ml-1">{expanded.description ? "▼" : "►"}</span>
			</button>
			{#if expanded.description}
				<textarea
					rows="8"
					bind:value={editCharacterData.description}
					class="input input-sm bg-background border-muted w-full rounded border"
					placeholder="Description..."
				></textarea>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() => (expanded.personality = !expanded.personality)}
			>
				<span>Personality</span>
				<span class="ml-1">{expanded.personality ? "▼" : "►"}</span>
			</button>
			{#if expanded.personality}
				<textarea
					rows="8"
					bind:value={editCharacterData.personality}
					class="input input-sm bg-background border-muted w-full rounded border"
					placeholder="Personality..."
				></textarea>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() => (expanded.scenario = !expanded.scenario)}
			>
				<span>Scenario</span>
				<span class="ml-1">{expanded.scenario ? "▼" : "►"}</span>
			</button>
			{#if expanded.scenario}
				<textarea
					rows="8"
					bind:value={editCharacterData.scenario}
					class="input input-sm bg-background border-muted w-full rounded border"
					placeholder="Scenario..."
				></textarea>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() => (expanded.firstMessage = !expanded.firstMessage)}
			>
				<span>First Message</span>
				<span class="ml-1">{expanded.firstMessage ? "▼" : "►"}</span>
			</button>
			{#if expanded.firstMessage}
				<textarea
					rows="8"
					bind:value={editCharacterData.firstMessage}
					class="input input-sm bg-background border-muted w-full rounded border"
					placeholder="First message..."
				></textarea>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() =>
					(expanded.alternateGreetings =
						!expanded.alternateGreetings)}
			>
				<span>Alternate Greetings</span>
				<span class="ml-1">
					{expanded.alternateGreetings ? "▼" : "►"}
				</span>
			</button>
			{#if expanded.alternateGreetings}
				<div class="flex flex-col gap-1">
					{#each editCharacterData.alternateGreetings as greeting, idx (idx)}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={
									editCharacterData.alternateGreetings[idx]
								}
								class="input input-xs bg-background border-muted flex-1 rounded border"
								placeholder="Greeting..."
							/>
							<button
								class="btn btn-sm preset-filled-error-500"
								type="button"
								onclick={() =>
									removeFromArray(
										editCharacterData.alternateGreetings,
										idx
									)}
							>
								<Icons.Minus class="h-4 w-4" />
							</button>
						</div>
					{/each}
					<button
						class="btn btn-sm preset-filled-primary-500 mt-1"
						type="button"
						onclick={() =>
							addToArray(editCharacterData.alternateGreetings)}
					>
						<Icons.Plus class="h-4 w-4" />
						Add Greeting
					</button>
				</div>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() => (expanded.creatorNotes = !expanded.creatorNotes)}
			>
				<span>Creator Notes</span>
				<span class="ml-1">{expanded.creatorNotes ? "▼" : "►"}</span>
			</button>
			{#if expanded.creatorNotes}
				<textarea
					rows="4"
					bind:value={editCharacterData.creatorNotes}
					class="input input-sm bg-background border-muted w-full rounded border"
					placeholder="Notes from the character creator..."
				></textarea>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() =>
					(expanded.creatorNotesMultilingual =
						!expanded.creatorNotesMultilingual)}
			>
				<span>Creator Notes (Multilingual)</span>
				<span class="ml-1">
					{expanded.creatorNotesMultilingual ? "▼" : "►"}
				</span>
			</button>
			{#if expanded.creatorNotesMultilingual}
				<div class="flex flex-col gap-1">
					{#each Object.entries(editCharacterData.creatorNotesMultilingual) as [lang, note], idx (lang)}
						<div class="flex items-center gap-2">
							<input
								type="text"
								value={lang}
								class="input input-xs bg-background border-muted w-16 rounded border"
								readonly
							/>
							<input
								type="text"
								bind:value={
									editCharacterData.creatorNotesMultilingual[
										lang
									]
								}
								class="input input-xs bg-background border-muted flex-1 rounded border"
								placeholder="Note..."
							/>
							<button
								class="btn btn-sm preset-filled-success-500"
								type="button"
								onclick={() =>
									removeObjectKey(
										editCharacterData.creatorNotesMultilingual,
										lang
									)}
							>
								-
							</button>
						</div>
					{/each}
					<div class="mt-1 flex gap-2">
						<input
							type="text"
							class="input input-xs bg-background border-muted w-16 rounded border"
							bind:value={newLangKey}
							placeholder="Lang"
						/>
						<input
							type="text"
							class="input input-xs bg-background border-muted flex-1 rounded border"
							bind:value={newLangNote}
							placeholder="Note..."
						/>
						<button
							class="btn btn-sm preset-filled-success-500"
							type="button"
							onclick={() => {
								if (newLangKey) {
									setObjectKey(
										editCharacterData.creatorNotesMultilingual,
										newLangKey,
										newLangNote
									)
									newLangKey = ""
									newLangNote = ""
								}
							}}
						>
							<Icons.Plus class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() =>
					(expanded.groupOnlyGreetings =
						!expanded.groupOnlyGreetings)}
			>
				<span>Group-Only Greetings</span>
				<span class="ml-1">
					{expanded.groupOnlyGreetings ? "▼" : "►"}
				</span>
			</button>
			{#if expanded.groupOnlyGreetings}
				<div class="flex flex-col gap-1">
					{#each editCharacterData.groupOnlyGreetings as greeting, idx (idx)}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={
									editCharacterData.groupOnlyGreetings[idx]
								}
								class="input input-xs bg-background border-muted flex-1 rounded border"
								placeholder="Group greeting..."
							/>
							<button
								class="btn btn-sm preset-filled-success-500"
								type="button"
								onclick={() =>
									removeFromArray(
										editCharacterData.groupOnlyGreetings,
										idx
									)}
							>
								-
							</button>
						</div>
					{/each}
					<button
						class="btn btn-sm preset-filled-primary-500 mt-1"
						type="button"
						onclick={() =>
							addToArray(editCharacterData.groupOnlyGreetings)}
					>
						<Icons.Plus class="h-4 w-4" />
						Add Group Greeting
					</button>
				</div>
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold"
				onclick={() =>
					(expanded.postHistoryInstructions =
						!expanded.postHistoryInstructions)}
			>
				<span>Post-History Instructions</span>
				<span class="ml-1">
					{expanded.postHistoryInstructions ? "▼" : "►"}
				</span>
			</button>
			{#if expanded.postHistoryInstructions}
				<textarea
					rows="4"
					bind:value={editCharacterData.postHistoryInstructions}
					class="input input-sm bg-background border-muted w-full rounded border"
					placeholder="Instructions for post-history processing..."
				></textarea>
			{/if}
		</div>
		<div class="mt-2 flex items-center gap-2">
			<Switch
				name="example"
				checked={editCharacterData.isFavorite}
				onCheckedChange={(e) =>
					(editCharacterData.isFavorite = e.checked)}
			/>
			Favorite
		</div>
	</div>
</div>

<CharacterUnsavedChangesModal
	open={showCancelModal}
	onOpenChange={handleCancelModalOnOpenChange}
	onConfirm={handleCancelModalDiscard}
	onCancel={handleCancelModalCancel}
/>
