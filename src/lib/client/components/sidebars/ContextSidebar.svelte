<script lang="ts">
    import * as skio from "sveltekit-io"
    import { getContext, onMount } from "svelte"
    import * as Icons from "@lucide/svelte"
    import ContextConfigUnsavedChangesModal from "../modals/ContextConfigUnsavedChangesModal.svelte"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    const socket = skio.get()
    let userCtx: { user: SelectUser } = getContext("user")
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
    let showNamePrompt = $state(false)
    let newConfigName = $state("")
    let showUnsavedChangesModal = $state(false)
    let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null

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

    $effect(() => {})

    function handleSave() {
        socket.emit("saveContextConfig", {
            contextConfig
        })
    }

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
        showNamePrompt = true
        newConfigName = ""
    }

    function confirmClone() {
        if (!newConfigName.trim()) return
        const newContextConfig = { ...contextConfig, name: newConfigName, isImmutable: false }
        socket.emit("createContextConfig", {
            contextConfig: newContextConfig
        })
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
        <select class="input input-sm w-full" bind:value={selectedConfigId}>
            {#each configsList.filter((c) => c.isImmutable) as c}
                <option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
            {/each}
            {#each configsList.filter((c) => !c.isImmutable) as c}
                <option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
            {/each}
        </select>
    </div>
    {#if showNamePrompt}
        <div class="modal">
            <div class="modal-content">
                <label for="newConfigNameInput">Enter name for new config:</label>
                <input
                    id="newConfigNameInput"
                    class="input input-sm w-full"
                    bind:value={newConfigName}
                />
                <div class="mt-2 flex justify-end gap-2">
                    <button class="btn btn-sm" onclick={() => (showNamePrompt = false)}
                        >Cancel</button
                    >
                    <button
                        class="btn btn-sm preset-filled-primary-500"
                        onclick={confirmClone}
                        disabled={!newConfigName.trim()}>Clone</button
                    >
                </div>
            </div>
        </div>
    {/if}
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
                    class="input input-sm w-full"
                    disabled={contextConfig.isImmutable}
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="contextTemplate">Template</label>
                <textarea
                    id="template"
                    rows="8"
                    bind:value={contextConfig.template}
                    class="input input-sm w-full"
                ></textarea>
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="exampleSeparator">Example Separator</label>
                <input
                    id="exampleSeparator"
                    type="text"
                    bind:value={contextConfig.exampleSeparator}
                    class="input input-sm w-full"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="chatStart">Chat Start</label>
                <input
                    id="chatStart"
                    type="text"
                    bind:value={contextConfig.chatStart}
                    class="input input-sm w-full"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="stoppingStrings"
                    >Stopping Strings (JSON array)</label
                >
                <input
                    id="stoppingStrings"
                    type="text"
                    bind:value={contextConfig.stoppingStrings}
                    class="input input-sm w-full"
                />
            </div>
            <div class="flex flex-row flex-wrap gap-4">
                <label class="flex items-center gap-2">
                    <input type="checkbox" bind:checked={contextConfig.useStopStrings} /> Use Stop Strings
                </label>
                <label class="flex items-center gap-2">
                    <input type="checkbox" bind:checked={contextConfig.alwaysForceName} /> Always Force
                    Name
                </label>
                <label class="flex items-center gap-2">
                    <input type="checkbox" bind:checked={contextConfig.trimSentences} /> Trim Sentences
                </label>
                <label class="flex items-center gap-2">
                    <input type="checkbox" bind:checked={contextConfig.singleLine} /> Single Line
                </label>
            </div>
        </div>
    {/if}
</div>

<ContextConfigUnsavedChangesModal
    open={showUnsavedChangesModal}
    onOpenChange={handleUnsavedChangesModalOpenChange}
    onConfirm={handleUnsavedChangesModalConfirm}
    onCancel={handleUnsavedChangesModalCancel}
/>
