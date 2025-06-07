<script lang="ts">
    import { onMount } from "svelte"
    import * as skio from "sveltekit-io"
    import CreateChatForm from "../chatForms/CreateChatForm.svelte"
    import * as Icons from "@lucide/svelte"
    import { Avatar } from "@skeletonlabs/skeleton-svelte"
    import { goto } from "$app/navigation"
    import { toaster } from "$lib/client/utils/toaster"

    interface Props {
        onclose?: () => Promise<boolean> | undefined
    }
    let { onclose = $bindable() }: Props = $props()

    let chats: Sockets.ChatsList.Response["chatsList"] = $state([])
    let search = $state("")
    let isCreating = $state(false)
    const socket = skio.get()

    // Filtered chats derived from search
    let filteredChats: Sockets.ChatsList.Response["chatsList"] = $derived.by(() => {
        if (!search.trim()) return chats
        const lower = search.toLowerCase()
        return chats.filter((chat) => {
            const chatName = chat.name?.toLowerCase() || ""
            const personaNames = (chat.chatPersonas || [])
                .map((cp) => cp.persona?.name?.toLowerCase() || "")
                .join(" ")
            const characterNames = (chat.chatCharacters || [])
                .map((cc) => cc.character?.name?.toLowerCase() || "")
                .join(" ")
            return (
                chatName.includes(lower) ||
                personaNames.includes(lower) ||
                characterNames.includes(lower)
            )
        })
    })

    socket.on("chatsList", (msg: Sockets.ChatsList.Response) => {
        chats = msg.chatsList || []
    })

    function getAvatarUrl(entity: any) {
        // Replace with your actual avatar URL logic
        return entity?.avatar || "/avatars/default.png"
    }

    async function handleOnClose() {
        return true // TODO
    }

    function handleCreateClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
    ) {
        isCreating = true
    }

    function handleEditClick(chatId: number) {
        toaster.warning({
            title: "Action not implemented"
        })
    }

    function handleChatClick(chat: any) {
        goto(`/chats/${chat.id}`)
    }

    $effect(() => {
        console.log("Filtered chats:", $state.snapshot(filteredChats))
    })

    onMount(() => {
        socket.emit("chatsList", {})
        onclose = handleOnClose
    })
</script>

<div class="text-foreground flex h-full flex-col p-4">
    {#if isCreating}
        <CreateChatForm bind:isCreating />
    {:else}
        <div class="mb-2 flex gap-2">
            <button
                class="btn btn-sm preset-filled-primary-500"
                onclick={handleCreateClick}
                title="Create New Chat"
            >
                <Icons.Plus size={16} />
            </button>
        </div>
        <div class="mb-4 flex items-center gap-2">
            <input
                class="input input-sm w-full"
                type="text"
                placeholder="Search chats, personas, characters..."
                bind:value={search}
            />
        </div>
        <div class="flex-1 overflow-y-auto">
            {#if filteredChats.length === 0}
                <div class="text-muted">No chats found.</div>
            {:else}
                <ul class="flex flex-col gap-2">
                    {#each filteredChats as chat}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <li
                            class="hover:bg-surface-800 flex cursor-pointer items-center gap-2 rounded-lg p-2 transition"
                            onclick={() => handleChatClick(chat)}
                        >
                            <!-- First character avatar -->
                            {#if chat && chat.chatCharacters}
                                {#each chat.chatCharacters as cc}
                                    <Avatar
                                        src={cc.character.avatar || ""}
                                        size="w-[4em] h-[4em]"
                                        name={cc.character.name}
                                    >
                                        <Icons.User size={36} />
                                    </Avatar>
                                {/each}
                            {/if}
                            <!-- First persona avatar -->
                            {#if chat && chat.chatPersonas}
                                {#each chat.chatPersonas as cp}
                                    <Avatar
                                        src={cp.persona.avatar || ""}
                                        size="w-[4em] h-[4em]"
                                        name={cp.persona.name}
                                    >
                                        <Icons.User size={36} />
                                    </Avatar>
                                {/each}
                            {/if}
                            <div class="flex min-w-0 flex-col">
                                <div class="truncate font-semibold">
                                    {chat.name || "Untitled Chat"}
                                </div>
                                <div class="text-muted-foreground truncate text-xs">
                                    {#if chat.chatPersonas?.length}
                                        {chat.chatPersonas
                                            .map((cp) => cp.persona?.name)
                                            .filter(Boolean)
                                            .join(", ")}
                                    {/if}
                                    {#if chat.chatCharacters?.length}
                                        {#if chat.chatPersonas?.length},
                                        {/if}
                                        {chat.chatCharacters
                                            .map((cc) => cc.character?.name)
                                            .filter(Boolean)
                                            .join(", ")}
                                    {/if}
                                </div>
                            </div>
                            <div class="flex gap-4 ml-auto">
                                <button
                                    class="btn btn-xs text-primary-500 px-0"
                                    onclick={() => {
                                        handleEditClick(chat.id!)
                                    }}
                                    title="Edit Character"
                                >
                                    <Icons.Edit size={16} />
                                </button>
                                <button
                                    class="btn btn-xs text-error-500 px-0"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteClick(chat.id!)
                                    }}
                                    title="Delete Character"
                                >
                                    <Icons.Trash2 size={16} />
                                </button>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}
</div>
