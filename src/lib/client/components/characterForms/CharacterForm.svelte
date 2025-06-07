<script lang="ts">
    import { Avatar } from "@skeletonlabs/skeleton-svelte"
    import * as Icons from "@lucide/svelte"
    import skio from "sveltekit-io"
    import { onMount } from "svelte"
    import CharacterUnsavedChangesModal from "../modals/CharacterUnsavedChangesModal.svelte"

    interface EditCharacterData {
        id?: number
        name: string
        avatar: string
        description: string
        personality: string
        scenario: string
        firstMessage: string
        exampleDialogues: string
        _avatarFile?: File | undefined
        _avatar: string
    }

    export interface Props {
        characterId?: number
        isSafeToClose: boolean
        closeForm: () => void
    }

    let { characterId, isSafeToClose = $bindable(), closeForm }: Props = $props()

    const socket = skio.get()

    let editCharacterData: EditCharacterData = $state({
        id: undefined,
        name: "",
        avatar: "",
        description: "",
        personality: "",
        scenario: "",
        firstMessage: "",
        exampleDialogues: "",
        _avatarFile: undefined,
        _avatar: "",
    })
    let originalCharacterData: EditCharacterData = $state({
        ...editCharacterData
    })
    let expanded = $state({
        description: true,
        personality: false,
        scenario: false,
        firstMessage: false,
        exampleDialogues: false
    })
    let character = $state(undefined)
    let mode: "create" | "edit" = $derived.by(() => (!!character ? "edit" : "create"))
    let isDataValid = $derived(
        !!editCharacterData?.name?.trim() && !!editCharacterData?.name?.trim()
    )
    let showCancelModal = $state(false)

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
        if (characterId) {
            socket.once("character", (message) => {
                console.log("[CharacterForm] Received character data:", message.character)
                character = message.character
                editCharacterData = message.character
                originalCharacterData = { ...editCharacterData }
            })
            socket.emit("character", { id: characterId })
        }
    })

    $effect(() => {
        isSafeToClose = JSON.stringify(editCharacterData) === JSON.stringify(originalCharacterData)
    })
</script>

<div class="border-primary bg-background animate-fade-in h-full rounded-lg border p-4 shadow-lg">
    <h2 class="mb-4 text-lg font-bold">
        {mode === "edit" ? `Edit: ${character.name}` : "Create Character"}
    </h2>
    <div class="mt-4 mb-4 flex gap-2">
        <button
            type="button"
            class="btn btn-sm preset-filled-surface-500 w-full"
            onclick={handleCancel}>Cancel</button
        >
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
                >
                    <Icons.User size={36} />
                </Avatar>
            </span>
            <div class="flex flex-col gap-2 w-full">
                <div class="flex items-center justify-center w-full">
                    <label for="dropzone-file" class="flex flex-col items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                        <div class="flex flex-col items-center justify-center w-full">
                            <svg class="w-8 h-8 my-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                        </div>
                        <input id="dropzone-file" type="file" class="hidden" accept="image/*"
                    onchange={handleAvatarChange} />
                    </label>
                </div>
                <button
                    type="button"
                    class="btn btn-xs preset-tonal-error mt-1"
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
                    rows="3"
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
                    rows="3"
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
                    rows="2"
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
                    rows="2"
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
                onclick={() => (expanded.exampleDialogues = !expanded.exampleDialogues)}
            >
                <span>Example Dialogues</span>
                <span class="ml-1">{expanded.exampleDialogues ? "▼" : "►"}</span>
            </button>
            {#if expanded.exampleDialogues}
                <textarea
                    rows="2"
                    bind:value={editCharacterData.exampleDialogues}
                    class="input input-sm bg-background border-muted w-full rounded border"
                    placeholder="Example dialogues..."
                ></textarea>
            {/if}
        </div>
    </div>
</div>

<CharacterUnsavedChangesModal
    open={showCancelModal}
    onOpenChange={handleCancelModalOnOpenChange}
    onConfirm={handleCancelModalDiscard}
    onCancel={handleCancelModalCancel}
/>