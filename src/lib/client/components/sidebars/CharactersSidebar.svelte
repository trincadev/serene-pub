<script lang="ts">
    import skio from "sveltekit-io"
    import { onMount } from "svelte"
    import { Avatar, FileUpload, Modal } from "@skeletonlabs/skeleton-svelte"
    import * as Icons from "@lucide/svelte"
    import CharacterForm from "../characterForms/CharacterForm.svelte"
    import CharacterUnsavedChangesModal from "../modals/CharacterUnsavedChangesModal.svelte"
    import { toaster } from "$lib/client/utils/toaster"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    const socket = skio.get()

    let charactersList: Sockets.CharactersList.Response["charactersList"] = $state([])
    let search = $state("")
    let characterId: number | undefined = $state()
    let isCreating = $state(false)
    let isSafeToCloseCharacterForm = $state(true)
    let showDeleteModal = $state(false)
    let characterToDelete: number | undefined = $state(undefined)
    let showUnsavedChangesModal = $state(false)
    let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null
    let showImportModal = $state(false)

    let unsavedChanges = $derived.by(() => {
        return !isCreating && !characterId ? false : !isSafeToCloseCharacterForm
    })

    $effect(() => {
        console.log("Unsaved changes:", unsavedChanges)
    })

    socket.on("charactersList", (msg: Sockets.CharactersList.Response) => {
        charactersList = msg.charactersList
    })

    // Filtered list
    let filteredCharacters: Sockets.CharactersList.Response["charactersList"] = $derived.by(() => {
        if (!search) return charactersList
        return charactersList.filter(
            (c: Sockets.CharactersList.Response["charactersList"][0]) =>
                c.name!.toLowerCase().includes(search.toLowerCase()) ||
                (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
        )
    })

    function handleCreateClick() {
        isCreating = true
    }

    function handleEditClick(id: number) {
        characterId = id
    }

    function closeCharacterForm() {
        isCreating = false
        characterId = undefined
    }

    function handleDeleteClick(id: number) {
        characterToDelete = id
        showDeleteModal = true
    }

    function confirmDelete() {
        if (characterToDelete !== undefined) {
            socket.emit("deleteCharacter", { characterId: characterToDelete })
        }
        showDeleteModal = false
        characterToDelete = undefined
        // Optionally, close form if deleting from edit view
        if (characterId === characterToDelete) closeCharacterForm()
    }

    function cancelDelete() {
        showDeleteModal = false
        characterToDelete = undefined
    }

    async function handleOnClose() {
        console.log("unsavedChanges", unsavedChanges)
        if (unsavedChanges) {
            showUnsavedChangesModal = true
            return new Promise<boolean>((resolve) => {
                confirmCloseSidebarResolve = resolve
            })
        } else {
            return true
        }
    }

    function handleCloseModalDiscard() {
        showUnsavedChangesModal = false
        if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(true)
    }

    function handleCloseModalCancel() {
        showUnsavedChangesModal = false
        if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
    }

    function handleUnsavedChangesOnOpenChange(e: OpenChangeDetails) {
        if (!e.open) {
            showUnsavedChangesModal = false
            if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
        }
    }

    function handleImportClick() {
        showImportModal = true
    }

    async function handleFileImport(details: FileAcceptDetails) {
        console.log("File import details:", details)
        if (!details.files || details.files.length === 0) return
        const file = details.files[0]
        const reader = new FileReader()
        reader.onload = function (e) {
            const base64 = (e.target?.result as string)?.split(",")[1]
            if (base64) {
                socket.emit("characterCardImport", { file: base64 })
                showImportModal = false
            }
        }
        reader.readAsDataURL(file)
        showImportModal = false
        const req: Sockets.CharacterCardImport.Call = {
            file
        }
    }

    function handleCharacterClick(character: Sockets.CharactersList.Response["charactersList"][0]) {
        toaster.warning({
            title: "Action not implemented"
        })
    }

    onMount(() => {
        socket.emit("charactersList", {})
        onclose = handleOnClose
    })
</script>

<div class="text-foreground h-full p-4">
    {#if isCreating}
        <CharacterForm
            bind:isSafeToClose={isSafeToCloseCharacterForm}
            closeForm={closeCharacterForm}
        />
    {:else if characterId}
        <CharacterForm
            bind:isSafeToClose={isSafeToCloseCharacterForm}
            {characterId}
            closeForm={closeCharacterForm}
        />
    {:else}
        <div class="mb-2 flex gap-2">
            <button
                class="btn btn-sm preset-filled-primary-500"
                onclick={handleCreateClick}
                title="Create New Character"
            >
                <Icons.Plus size={16} />
            </button>
            <button
                class="btn btn-sm preset-filled-primary-500"
                title="Import Character"
                onclick={handleImportClick}
            >
                <Icons.Upload size={16} />
            </button>
            <button class="btn btn-sm preset-filled-primary-500" title="Export Character" disabled>
                <Icons.Download size={16} />
            </button>
        </div>
        <div class="mb-4 flex items-center gap-2">
            <input
                type="text"
                placeholder="Search characters..."
                class="input input-sm bg-background border-muted w-full rounded border"
                bind:value={search}
            />
        </div>
        <div class="flex flex-col gap-2">
            {#if filteredCharacters.length === 0}
                <div class="text-muted-foreground py-8 text-center">No characters found.</div>
            {:else}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                {#each filteredCharacters as c}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div
                        class="hover:bg-surface-800 flex cursor-pointer items-center gap-2 rounded-lg p-2 transition"
                        onclick={() => handleCharacterClick(c)}
                    >
                        <span class="text-muted-foreground w-[2.5em] text-xs">
                            #{c.id}
                        </span>
                        <Avatar src={c.avatar || ""} size="w-[4em] h-[4em]" name={c.name!}>
                            <Icons.User size={36} />
                        </Avatar>
                        <div class="min-w-0 flex-1">
                            <div class="truncate font-semibold">{c.name ?? "Unnamed"}</div>
                            {#if c.description}
                                <div class="text-muted-foreground truncate text-xs">
                                    {c.description}
                                </div>
                            {/if}
                        </div>
                        <div class="flex gap-4">
                            <button
                                class="btn btn-xs text-primary-500 px-0"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(c.id!)
                                }}
                                title="Edit Character"
                            >
                                <Icons.Edit size={16} />
                            </button>
                            <button
                                class="btn btn-xs text-error-500 px-0"
                                onclick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteClick(c.id!)
                                }}
                                title="Delete Character"
                            >
                                <Icons.Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</div>

<Modal
    open={showDeleteModal}
    onOpenChange={(e) => (showDeleteModal = e.open)}
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <div class="p-6">
            <h2 class="mb-2 text-lg font-bold">Delete Character?</h2>
            <p class="mb-4">
                Are you sure you want to delete this character? This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
                <button class="btn preset-filled-surface-500" onclick={cancelDelete}>Cancel</button>
                <button class="btn preset-filled-error-500" onclick={confirmDelete}>Delete</button>
            </div>
        </div>
    {/snippet}
</Modal>

<Modal
    open={showImportModal}
    onOpenChange={(e) => (showImportModal = e.open)}
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <div class="p-6">
            <h2 class="mb-2 text-lg font-bold">Import Character</h2>
            <p class="mb-4">
                Import your character card or JSON file here. Make sure the file is in the correct
                format.
            </p>
            <FileUpload
                name="example"
                accept="image/*"
                maxFiles={1}
                onFileAccept={handleFileImport}
                onFileReject={console.error}
                classes="w-full bg-surface-50-950"
            />
            <div class="mt-4 flex gap-2">
                <button
                    class="btn preset-filled-surface-500"
                    onclick={() => (showImportModal = false)}
                >
                    Cancel
                </button>
            </div>
        </div>
    {/snippet}
</Modal>

<CharacterUnsavedChangesModal
    open={showUnsavedChangesModal}
    onOpenChange={handleUnsavedChangesOnOpenChange}
    onConfirm={handleCloseModalDiscard}
    onCancel={handleCloseModalCancel}
/>
