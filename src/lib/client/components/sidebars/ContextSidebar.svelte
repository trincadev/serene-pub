<script lang="ts">
    import * as skio from "sveltekit-io"
    import { getContext, onMount } from "svelte"
    import * as Icons from "@lucide/svelte"
    import ContextConfigUnsavedChangesModal from "../modals/ContextConfigUnsavedChangesModal.svelte"
    import NewNameModal from "../modals/NewNameModal.svelte"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    const socket = skio.get()
    let userCtx: { user: SelectUser } = getContext("userCtx")
    let configsList: Sockets.ContextConfigsList.Response["contextConfigsList"] = $state([])
    let selectedConfigId: number | undefined = $state(
        userCtx.user.activeContextConfigId || undefined
    )
    let contextConfig: Sockets.ContextConfig.Response["contextConfig"] = $state(
        {} as Sockets.ContextConfig.Response["contextConfig"]
    )
    let originalData: Sockets.ContextConfig.Response["contextConfig"] = $state(
        {} as Sockets.ContextConfig.Response["contextConfig"]
    )
    let unsavedChanges = $derived(JSON.stringify(contextConfig) !== JSON.stringify(originalData))
    let showNewNameModal = $state(false)
    let showUnsavedChangesModal = $state(false)
    let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null
    let showAdvanced = $state(false)

    function handleSave() {
        socket.emit("updateContextConfig", {
            contextConfig
        })
        // After saving, reload the config from the server
        // socket.emit("contextConfig", { id: selectedConfigId })
    }

    $effect(() => {
        // When selectedConfigId changes, load the config from the server
        if (selectedConfigId) {
            socket.emit("contextConfig", { id: selectedConfigId })
        }
    })

    $effect(() => {
        console.log("Context config changed:", $state.snapshot(contextConfig))
    })

    function handleDelete() {
        if (contextConfig.isImmutable) {
            socket.emit("deleteContextConfig", { id: contextConfig.id })
            selectedConfigId = undefined
        }
    }

    function handleReset() {
        contextConfig = { ...originalData }
    }

    function handleNew() {
        showNewNameModal = true
    }

    function handleNewNameConfirm(name: string) {
        if (!name.trim()) return
        const newContextConfig = { ...contextConfig, name: name.trim(), isImmutable: false }
        delete newContextConfig.id
        socket.emit("createContextConfig", { contextConfig: newContextConfig })
        showNewNameModal = false
    }

    function handleNewNameCancel() {
        showNewNameModal = false
    }

    async function handleOnClose() {
        if (unsavedChanges) {
            showUnsavedChangesModal = true
            return new Promise<boolean>((resolve) => {
                confirmCloseSidebarResolve = resolve
            })
        } else {
            return true
        }
    }

    function handleUnsavedChangesModalConfirm() {
        showUnsavedChangesModal = false
        if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(true)
    }
    function handleUnsavedChangesModalCancel() {
        showUnsavedChangesModal = false
        if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
    }
    function handleUnsavedChangesModalOpenChange(e: OpenChangeDetails) {
        if (!e.open) {
            showUnsavedChangesModal = false
            if (confirmCloseSidebarResolve) confirmCloseSidebarResolve(false)
        }
    }

    $effect(() => {
        if (!!selectedConfigId && selectedConfigId !== userCtx.user.activeContextConfigId) {
            socket.emit("setUserActiveContextConfig", {
                id: selectedConfigId
            })
        }
    })

    onMount(() => {
        socket.on("contextConfigsList", (msg: Sockets.ContextConfigsList.Response) => {
            configsList = msg.contextConfigsList
            if (!selectedConfigId && configsList.length > 0) {
                selectedConfigId = userCtx.user.activeContextConfigId ?? configsList[0].id
            }
        })

        socket.on("contextConfig", (msg: Sockets.ContextConfig.Response) => {
            contextConfig = { ...msg.contextConfig }
            originalData = { ...msg.contextConfig }
        })

        socket.on("createContextConfig", (msg: Sockets.CreateContextConfig.Response) => {
            selectedConfigId = msg.contextConfig.id
        })
        socket.emit("contextConfigsList", {})
        socket.emit("contextConfig", {
            id: selectedConfigId
        })
        onclose = handleOnClose
    })
</script>

<div class="text-foreground h-full p-4">
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
            disabled={!contextConfig || contextConfig.isImmutable}
        >
            <Icons.X size={16} />
        </button>
    </div>
    <div class="mb-6 flex items-center gap-2">
        <select class="select w-full" bind:value={selectedConfigId}>
            {#each configsList.filter((c) => c.isImmutable) as c}
                <option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
            {/each}
            {#each configsList.filter((c) => !c.isImmutable) as c}
                <option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
            {/each}
        </select>
    </div>
    {#if contextConfig}
        <div class="mt-4 mb-4 flex w-full justify-end gap-2">
            <button
                class="btn preset-filled-primary-500 w-full"
                onclick={handleSave}
                disabled={contextConfig.isImmutable || !unsavedChanges}>Save</button
            >
        </div>
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="contextName">Name*</label>
                <input
                    id="contextName"
                    type="text"
                    bind:value={contextConfig.name}
                    class="input w-full"
                    disabled={contextConfig.isImmutable}
                />
            </div>
            <button
                type="button"
                class="btn btn-sm preset-filled-surface-500 mt-2 mb-2 w-full"
                onclick={() => (showAdvanced = !showAdvanced)}
            >
                {showAdvanced ? "Hide Advanced" : "Show Advanced"}
            </button>
            {#if showAdvanced}
                <div class="flex flex-col gap-1">
                    <label class="font-semibold" for="contextTemplate">Template</label>
                    <textarea
                        id="template"
                        rows="8"
                        bind:value={contextConfig.template}
                        class="input w-full"
                    ></textarea>
                </div>
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="flex items-center gap-2 font-semibold disabled">
                            <input
                                type="checkbox"
                                checked={contextConfig.alwaysForceName}
                                onchange={(e) =>
                                    (contextConfig = {
                                        ...contextConfig,
                                        alwaysForceName: e.target.checked
                                    })}
                                    disabled
                            /> Append Name to Prompt
                        </label>
                        <div class="card preset-filled-surface-400-600 p-2">
                            <p>
                                Append Name to Prompt is disabled for now.
                            </p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<ContextConfigUnsavedChangesModal
    open={showUnsavedChangesModal}
    onOpenChange={handleUnsavedChangesModalOpenChange}
    onConfirm={handleUnsavedChangesModalConfirm}
    onCancel={handleUnsavedChangesModalCancel}
/>

<NewNameModal
    open={showNewNameModal}
    onOpenChange={(e) => (showNewNameModal = e.open)}
    onConfirm={handleNewNameConfirm}
    onCancel={handleNewNameCancel}
    title="New Context Config"
    description="Your current settings will be copied."
/>
