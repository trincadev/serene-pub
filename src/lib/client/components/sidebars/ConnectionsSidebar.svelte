<script lang="ts">
    import skio from "sveltekit-io"
    import { getContext, onMount } from "svelte"
    import * as Icons from "@lucide/svelte"
    import { Modal } from "@skeletonlabs/skeleton-svelte"
    import OllamaForm from "$lib/client/connectionForms/OllamaForm.svelte"
    import ChatGPTForm from "$lib/client/connectionForms/ChatGPTForm.svelte"
    import { CONNECTION_TYPES } from "$lib/shared/constants/ConnectionTypes"
    import { PromptFormats } from "$lib/shared/constants/PromptFormats"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()
    let userCtx: UserCtx = getContext("user")
    const socket = skio.get()

    // --- State ---
    let connectionsList = $state([])
    let connection: Sockets.Connection.Response["connection"] | undefined = $state()
    let originalConnection = $state()
    let unsavedChanges = $derived.by(() => {
        if (!connection || !originalConnection) return false
        return JSON.stringify(connection) !== JSON.stringify(originalConnection)
    })
    let editingField: string | null = $state(null)
    let showConfirmModal = $state(false)
    let confirmResolve: ((v: boolean) => void) | null = null
    let testResult: { ok: boolean; error?: string; models?: any[] } | null = $state(null)
    let refreshModelsResult: { models?: any[]; error?: string } | null = $state(null)
    let showNewConnectionModal = $state(false)
    let newConnectionName = $state("")
    let newConnectionType = $state(CONNECTION_TYPES[0].value)

    function handleSelectChange(e: Event) {
        socket.emit("setUserActiveConnection", { id: +(e.target as HTMLSelectElement).value })
    }
    function handleNew() {
        newConnectionName = ""
        newConnectionType = CONNECTION_TYPES[0].value
        showNewConnectionModal = true
    }
    function handleNewConnectionConfirm() {
        if (!newConnectionName.trim()) return
        const newConn = {
            name: newConnectionName.trim(),
            type: newConnectionType,
            enabled: true
        }
        socket.emit("createConnection", { connection: newConn })
        showNewConnectionModal = false
    }
    function handleNewConnectionCancel() {
        showNewConnectionModal = false
    }
    function handleUpdate() {
        socket.emit("updateConnection", { connection })
    }
    function handleReset() {
        connection = { ...originalConnection }
    }
    function handleDelete() {
        if (confirm("Are you sure you want to delete this connection? This cannot be undone.")) {
            socket.emit("deleteConnection", { id: connection.id })
        }
    }
    async function handleOnClose() {
        if (!unsavedChanges) return true
        showConfirmModal = true
        return new Promise<boolean>((resolve) => {
            confirmResolve = resolve
        })
    }
    function handleModalDiscard() {
        showConfirmModal = false
        if (confirmResolve) confirmResolve(true)
    }
    function handleModalCancel() {
        showConfirmModal = false
        if (confirmResolve) confirmResolve(false)
    }
    function handleTestConnection() {
        testResult = null
        socket.emit("testConnection", { connection })
    }
    function handleRefreshModels() {
        refreshModelsResult = null
        socket.emit("refreshModels", { baseUrl: connection?.baseUrl })
    }
    function handleFieldChange(key: string, value: any) {
        connection = { ...connection, [key]: value }
    }

    onMount(() => {
        socket.on("connectionsList", (msg) => {
            connectionsList = msg.connectionsList
        })
        socket.on("connection", (msg) => {
            connection = { ...msg.connection }
            originalConnection = { ...msg.connection }
        })
        socket.on("testConnection", (msg) => {
            testResult = msg
        })
        socket.on("refreshModels", (msg) => {
            refreshModelsResult = msg.models || []
        })
        socket.emit("connectionsList", {})
        if (userCtx.user?.activeConnectionId) {
            socket.emit("connection", { id: userCtx.user.activeConnectionId })
        }
        onclose = handleOnClose
        // If ollama, fetch models
        if (connection?.type === "ollama" && connection.baseUrl) {
            handleRefreshModels()
        }
    })
</script>

<div class="text-foreground p-4">
    <div class="mt-2 mb-2 flex gap-2 sm:mt-0">
        <button type="button" class="btn btn-sm preset-filled-primary-500" onclick={handleNew}>
            <Icons.Plus size={16} />
        </button>
        <button
            type="button"
            class="btn btn-sm preset-filled-secondary-500"
            onclick={handleReset}
            disabled={!unsavedChanges}
        >
            <Icons.RefreshCcw size={16} />
        </button>
        <button
            type="button"
            class="btn btn-sm preset-filled-error-500"
            onclick={handleDelete}
            disabled={!connection}
        >
            <Icons.X size={16} />
        </button>
    </div>
    <div
        class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
        class:hidden={!connectionsList.length}
    >
        <select
            class="select select-sm bg-background border-muted rounded border"
            onchange={handleSelectChange}
            bind:value={userCtx.user.activeConnectionId}
        >
            {#each connectionsList as c}
                <option value={c.id}>{c.name} ({c.type})</option>
            {/each}
        </select>
    </div>
    {#if !!connection}
        <div class="my-4 flex">
            <button
                type="button"
                class="btn preset-filled-primary-500 w-full"
                onclick={handleUpdate}
                disabled={!unsavedChanges}>Save</button
            >
        </div>
        <div class="flex flex-col gap-1">
            <label class="font-semibold" for="name">Name</label>
            <input
                id="name"
                type="text"
                bind:value={connection.name}
                class="input input-sm bg-background border-muted w-full rounded border"
            />
        </div>
        {#if connection.type === "ollama"}
            <OllamaForm bind:connection />
        {:else if connection.type === "chatgpt"}
            <ChatGPTForm bind:connection />
        {/if}
        <div class="mt-4 flex flex-col gap-2">
            {#if connection.type === "ollama"}
                {#if refreshModelsResult}
                    <div class="mt-1 text-sm">
                        {#if refreshModelsResult.models?.length}
                            <div>Available Models: {refreshModelsResult.models.join(", ")}</div>
                        {:else if refreshModelsResult.error}
                            <span class="text-error">{refreshModelsResult.error}</span>
                        {/if}
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
    {#if !connectionsList.length}
        <div class="text-muted-foreground py-8 text-center">
            No connections found. Create a new connection to get started.
        </div>
    {/if}
</div>

<Modal
    open={showConfirmModal}
    onOpenChange={(e) => (showConfirmModal = e.open)}
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <header class="flex justify-between">
            <h2 class="h2">Confirm</h2>
        </header>
        <article>
            <p class="opacity-60">
                Your connection has unsaved changes. Are you sure you want to discard them?
            </p>
        </article>
        <footer class="flex justify-end gap-4">
            <button class="btn preset-filled-surface-500" onclick={handleModalCancel}>Cancel</button
            >
            <button class="btn preset-filled-error-500" onclick={handleModalDiscard}>Discard</button
            >
        </footer>
    {/snippet}
</Modal>
<Modal
    open={showNewConnectionModal}
    onOpenChange={(e) => (showNewConnectionModal = e.open)}
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <header class="flex justify-between">
            <h2 class="h2">Create New Connection</h2>
        </header>
        <article class="flex flex-col gap-4">
            <div>
                <label class="font-semibold" for="newConnName">Name</label>
                <input
                    id="newConnName"
                    type="text"
                    class="input w-full"
                    bind:value={newConnectionName}
                    placeholder="Enter a name..."
                    onkeydown={(e) => {
                        if (e.key === "Enter" && newConnectionName.trim()) {
                            handleNewConnectionConfirm()
                        }
                    }}
                />
            </div>
            <div>
                <label class="font-semibold" for="newConnType">Type</label>
                <select id="newConnType" class="input w-full" bind:value={newConnectionType}>
                    {#each CONNECTION_TYPES as t}
                        <option value={t.value}>{t.label}</option>
                    {/each}
                </select>
            </div>
        </article>
        <footer class="mt-4 flex justify-end gap-4">
            <button class="btn preset-filled-surface-500" onclick={handleNewConnectionCancel}
                >Cancel</button
            >
            <button
                class="btn preset-filled-primary-500"
                onclick={handleNewConnectionConfirm}
                disabled={!newConnectionName.trim()}>Create</button
            >
        </footer>
    {/snippet}
</Modal>
