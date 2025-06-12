<script lang="ts">
    import * as skio from "sveltekit-io"
    import { getContext, onMount } from "svelte"
    import * as Icons from "@lucide/svelte"
    import ContextConfigUnsavedChangesModal from "../modals/ContextConfigUnsavedChangesModal.svelte"
    import PromptConfigUnsavedChangesModal from "../modals/PromptConfigUnsavedChangesModal.svelte"
    import NewNameModal from '../modals/NewNameModal.svelte'

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }

    let { onclose = $bindable() }: Props = $props()

    const socket = skio.get()
    let userCtx: { user: SelectUser } = getContext("user")
    let promptsList: Sockets.PromptConfigsList.Response["promptConfigsList"] = $state([])
    let selectedPromptId: number | undefined = $state(
        userCtx.user.activePromptConfigId || undefined
    )
    let promptConfig: Sockets.PromptConfig.Response["promptConfig"] = $state(
        {} as Sockets.PromptConfig.Response["promptConfig"]
    )
    let originalData: Sockets.PromptConfig.Response["promptConfig"] = $state(
        {} as Sockets.PromptConfig.Response["promptConfig"]
    )
    let unsavedChanges = $derived(JSON.stringify(promptConfig) !== JSON.stringify(originalData))
    let showNewNameModal = $state(false)
    let showUnsavedChangesModal = $state(false)
    let confirmCloseSidebarResolve: ((v: boolean) => void) | null = null

    function handleSave() {
        socket.emit("updatePromptConfig", {
            promptConfig: { ...promptConfig, id: promptConfig.id }
        })
    }

    function handleDelete() {
        if (!promptConfig.isImmutable) {
            socket.emit("deletePromptConfig", { id: promptConfig.id })
            selectedPromptId = undefined
        }
    }

    function handleReset() {
        promptConfig = { ...originalData }
    }

    function handleNew() {
        showNewNameModal = true
    }

    function handleNewNameConfirm(name: string) {
        if (!name.trim()) return
        const newPromptConfig = { ...promptConfig, name: name.trim(), isImmutable: false }
        delete newPromptConfig.id
        socket.emit("createPromptConfig", { promptConfig: newPromptConfig })
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
        if (!!selectedPromptId && selectedPromptId !== userCtx.user.activePromptConfigId) {
            socket.emit("setUserActivePromptConfig", {
                id: selectedPromptId
            })
        }
    })

    $effect(() => {
        if (selectedPromptId) {
            socket.emit("promptConfig", { id: selectedPromptId })
        }
    })

    onMount(() => {
        socket.on("promptConfigsList", (msg: Sockets.PromptConfigsList.Response) => {
            promptsList = msg.promptConfigsList
            if (!selectedPromptId && promptsList.length > 0) {
                selectedPromptId = userCtx.user.activePromptConfigId ?? promptsList[0].id
            }
        })

        socket.on("promptConfig", (msg: Sockets.PromptConfig.Response) => {
            promptConfig = { ...msg.promptConfig }
            originalData = { ...msg.promptConfig }
        })

        socket.on("createPromptConfig", (msg: Sockets.CreatePromptConfig.Response) => {
            selectedPromptId = msg.promptConfig.id
        })
        socket.emit("promptConfigsList", {})
        if (selectedPromptId) {
            socket.emit("promptConfig", { id: selectedPromptId })
        }
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
            disabled={!promptConfig || promptConfig.isImmutable}
        >
            <Icons.X size={16} />
        </button>
    </div>
    <div class="mb-6 flex items-center gap-2">
        <select class="input input-sm w-full" bind:value={selectedPromptId}>
            {#each promptsList.filter((c) => c.isImmutable) as c}
                <option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
            {/each}
            {#each promptsList.filter((c) => !c.isImmutable) as c}
                <option value={c.id}>{c.name}{c.isImmutable ? "*" : ""}</option>
            {/each}
        </select>
    </div>
    {#if promptConfig}
        <div class="mt-4 mb-4 flex w-full justify-end gap-2">
            <button
                class="btn preset-filled-primary-500 w-full"
                onclick={handleSave}
                disabled={promptConfig.isImmutable || !unsavedChanges}>Save</button
            >
        </div>
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="promptName">Name*</label>
                <input
                    id="promptName"
                    type="text"
                    bind:value={promptConfig.name}
                    class="input input-sm w-full"
                    disabled={promptConfig.isImmutable}
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="font-semibold" for="systemPrompt">System Prompt</label>
                <textarea
                    id="systemPrompt"
                    rows="15"
                    bind:value={promptConfig.systemPrompt}
                    class="input input-sm w-full"
                ></textarea>
            </div>
        </div>
    {/if}
</div>

<PromptConfigUnsavedChangesModal
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
    title="New Prompt Config"
    description="Your current settings will be copied."
/>
