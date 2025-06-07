<script lang="ts">
    import skio from "sveltekit-io"
    import { onMount } from "svelte"
    import { Avatar, Modal } from "@skeletonlabs/skeleton-svelte"
    import * as Icons from "@lucide/svelte"
    import PersonaForm from "../personaForms/PersonaForm.svelte"
    import PersonaUnsavedChangesModal from "../modals/PersonaUnsavedChangesModal.svelte"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    const socket = skio.get()

    let personasList = $state([])
    let search = $state("")
    let personaId: number | undefined = $state()
    let isCreating = $state(false)
    let isSafeToClosePersonasForm = $state(true)
    let showDeleteModal = $state(false)
    let personaToDelete: number | undefined = $state(undefined)
    let showUnsavedChangesModal = $state(false)
    let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null

    onMount(() => {
        socket.emit("personasList", {})
        onclose = handleOnClose
    })

    socket.on("personasList", (msg) => {
        personasList = msg.personasList
    })

    let filteredPersonas = $derived.by(() => {
        if (!search) return personasList
        return personasList.filter(
            (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
        )
    })

    function handleCreateClick() {
        isCreating = true
    }

    function handleEditClick(id: number) {
        personaId = id
    }

    function closePersonasForm() {
        isCreating = false
        personaId = undefined
    }

    function handleDeleteClick(id: number) {
        personaToDelete = id
        showDeleteModal = true
    }

    function confirmDelete() {
        if (personaToDelete !== undefined) {
            socket.emit("deletePersona", { id: personaToDelete })
        }
        showDeleteModal = false
        personaToDelete = undefined
        if (personaId === personaToDelete) closePersonasForm()
    }

    function cancelDelete() {
        showDeleteModal = false
        personaToDelete = undefined
    }

    async function handleOnClose() {
        if (!isSafeToClosePersonasForm) {
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

    function handleUnsavedChangesOnOpenChange(e: { open: boolean }) {
        if (!e.open) {
            showUnsavedChangesModal = false
            if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
        }
    }
</script>

<div class="text-foreground h-full p-4">
    {#if isCreating}
        <PersonaForm bind:isSafeToClose={isSafeToClosePersonasForm} closeForm={closePersonasForm} />
    {:else if personaId}
        <PersonaForm
            bind:isSafeToClose={isSafeToClosePersonasForm}
            {personaId}
            closeForm={closePersonasForm}
        />
    {:else}
        <div class="mb-2 flex gap-2">
            <button
                class="btn btn-sm preset-filled-primary-500"
                onclick={handleCreateClick}
                title="Create New Persona"
            >
                <Icons.Plus size={16} />
            </button>
        </div>
        <div class="mb-4 flex items-center gap-2">
            <input
                type="text"
                placeholder="Search personas..."
                class="input input-sm bg-background border-muted w-full rounded border"
                bind:value={search}
            />
        </div>
        <div class="flex flex-col gap-2">
            {#if filteredPersonas.length === 0}
                <div class="text-muted-foreground py-8 text-center">No personas found.</div>
            {:else}
                {#each filteredPersonas as p}
                    <div
                        class="hover:bg-surface-800 flex cursor-pointer items-center gap-2 rounded-lg p-2 transition" 
                    >
                        <span class="w-[2.5em] text-xs text-muted-foreground">
                            #{p.id}
                        </span>
                        <Avatar src={p.avatar} size="w-[4em] h-[4em]" name={p.name}>
                            <Icons.User size={36} />
                        </Avatar>
                        <div class="min-w-0 flex-1">
                            <div class="truncate font-semibold">{p.name ?? "Unnamed"}</div>
                            {#if p.description}
                                <div class="text-muted-foreground truncate text-xs">
                                    {p.description}
                                </div>
                            {/if}
                        </div>
                        <div class="flex gap-4">
                        <button
                            class="btn btn-xs text-primary-500 px-0"
                            onclick={() => {
                                handleEditClick(c.id)
                            }}
                            title="Edit Persona"
                        >
                            <Icons.Edit size={16} />
                        </button>
                        <button
                            class="btn btn-xs text-error-500 px-0"
                            onclick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(p.id)
                            }}
                            title="Delete Personar"
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

<Modal open={showDeleteModal} onclose={cancelDelete}>
    <div class="p-6">
        <h2 class="mb-2 text-lg font-bold">Delete Persona?</h2>
        <p class="mb-4">
            Are you sure you want to delete this persona? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
            <button class="btn btn-sm" onclick={cancelDelete}>Cancel</button>
            <button class="btn btn-sm btn-error" onclick={confirmDelete}>Delete</button>
        </div>
    </div>
</Modal>
<PersonaUnsavedChangesModal
    open={showUnsavedChangesModal}
    onOpenChange={handleUnsavedChangesOnOpenChange}
    onConfirm={handleCloseModalDiscard}
    onCancel={handleCloseModalCancel}
/>
