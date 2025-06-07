<script lang="ts">
    import { page } from "$app/state"
    import { Avatar, Modal } from "@skeletonlabs/skeleton-svelte"
    import { onMount } from "svelte"
    import Markdown from "svelte-exmarkdown"
    import * as skio from "sveltekit-io"
    import * as Icons from "@lucide/svelte"

    let chat: any = $state(null)
    let newMessage = $state("")
    const socket = skio.get()
    let showDeleteMessageModal = $state(false)
    let chatMessage: SelectChatMessage | undefined = $state(undefined)

    // Get chat id from route params
    let chatId: number = $derived.by(() => Number(page.params.id))

    socket.on("chat", (msg: Sockets.Chat.Response) => {
        chat = msg.chat
        if (chatMessagesContainer) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight
        }
    })

    let lastMessage: SelectChatMessage | undefined = $derived.by(() => {
        if (chat && chat.chatMessages.length > 0) {
            return chat.chatMessages[chat.chatMessages.length - 1]
        }
        return undefined
    })

    function handleSend() {
        console.log("Sending message:", newMessage)
        if (!newMessage.trim()) return
        // TODO: Implement send message socket call
        const msg: Sockets.SendPersonaMessage.Call = {
            chatId,
            personaId: chat?.chatPersonas?.[0]?.personaId,
            content: newMessage
        }
        socket.emit("sendPersonaMessage", msg)
        newMessage = ""
    }

    function getMessageCharacter(
        msg: SelectChatMessage
    ): SelectCharacter | SelectPersona | undefined {
        console.log("Getting character for message:", msg)
        if (msg.personaId) {
            const persona = chat?.chatPersonas?.find(
                (p: SelectChatPersona) => p.personaId === msg.personaId
            )?.persona
            console.log("Found persona:", persona)
            return persona
        } else if (msg.characterId) {
            const character = chat?.chatCharacters?.find(
                (c: SelectChatCharacter) => c.characterId === msg.characterId
            )?.character
            console.log("Found character:", character)
            return character
        }
    }

    function openDeleteMessageModal(message: SelectChatMessage) {
        chatMessage = message
        showDeleteMessageModal = true
        console.log("Opening delete message modal for:", message)
    }

    function onOpenMessageDeleteChange(details: OpenChangeDetails) {
        showDeleteMessageModal = details.open
        if (!showDeleteMessageModal) {
            chatMessage = undefined
        }
    }

    function onDeleteMessageConfirm() {
        console.log("Deleting message")
        socket.emit("deleteChatMessage", {
            id: chatMessage?.id
        })
        chatMessage = undefined
        showDeleteMessageModal = false
    }

    function onDeleteMessageCancel() {
        console.log("Delete message cancelled")
        chatMessage = undefined
        showDeleteMessageModal = false
    }

    $effect(() => {
        const _chatId = page.params.id
        if (_chatId) {
            chatId = Number.parseInt(_chatId)
            socket.emit("chat", { id: chatId })
        }
    })

    let chatMessagesContainer: HTMLDivElement | null = null
</script>

<div class="flex h-full w-full flex-col px-2">
    <div class="chat-messages flex-1" bind:this={chatMessagesContainer}>
        {#if !chat || chat.chatMessages.length === 0}
            <div class="text-muted mt-8 text-center">No messages yet.</div>
        {:else}
            <ul class="flex flex-col gap-3 p-4">
                {#each chat.chatMessages as msg}
                    {@const character = getMessageCharacter(msg)}
                    <li class="bg-primary-50-950 flex flex-col rounded-lg p-4">
                        <div class="flex gap-2 justify-between">
                            <div class="flex gap-2">
                                <span>
                                    <Avatar
                                        src={character?.avatar ?? ""}
                                        size="w-[4em] h-[4em]"
                                        name={character?.name ?? "Unknown"}
                                        background="preset-filled-primary-500"
                                    >
                                        <Icons.User size={36} />
                                    </Avatar>
                                </span>
                                <span>{character?.name || "Unknown"}</span>
                            </div>
                            <div class="flex gap-2">
                                <div class="flex gap-6">
                                    <span class="text-surface-500 mx-6">
                                        {new Date(msg.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    class="btn btn-sm preset-tonal-surface h-min w-min px-2 opacity-50"
                                    title="Disable Message"
                                    disabled
                                >
                                    <Icons.Ghost size={16} />
                                </button>
                                <button
                                    class="btn btn-sm preset-tonal-surface h-min w-min px-2 opacity-50"
                                    title="Edit Message"
                                    disabled
                                >
                                    <Icons.Edit size={16} />
                                </button>
                                <button
                                    class="btn btn-sm preset-tonal-surface hover:preset-tonal-error h-min w-min px-2 opacity-50 hover:opacity-100"
                                    title="Delete Message"
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        openDeleteMessageModal(msg)
                                    }}
                                >
                                    <Icons.Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div class="rounded p-2 text-left flex h-fit">
                            {#if msg.content === "" && msg.isGenerating}
                                <div class="wrapper">
                                    <div class="circle"></div>
                                    <div class="circle"></div>
                                    <div class="circle"></div>
                                    <div class="shadow"></div>
                                    <div class="shadow"></div>
                                    <div class="shadow"></div>
                                </div>
                            {:else if msg.isLoading}
                                <div class="animate-pulse">
                                    <div class="mb-2 h-4 w-3/4 rounded bg-gray-300"></div>
                                    <div class="h-4 w-1/2 rounded bg-gray-300"></div>
                                </div>
                            {:else if msg.isError}
                                <div class="text-red-500">Error loading message</div>
                            {:else}
                                <div>
                                    <Markdown md={msg.content} />
                                </div>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
    <form
        class="chat-input-bar preset-tonal-surface flex w-full items-end gap-2 p-2 pb-6 align-middle"
        onsubmit={(e) => {
            e.preventDefault()
            handleSend(e)
        }}
    >
        <textarea
            class="input input-sm flex-1"
            placeholder="Type a message..."
            bind:value={newMessage}
            autocomplete="off"
        ></textarea>
        <button class="btn preset-filled-success-500 mb-3 pl-3 pr-3" type="submit" disabled={!newMessage.trim() || lastMessage?.isGenerating} title="Send"> 
            <Icons.Send size={24} />
        </button>
    </form>
</div>

<Modal
    open={showDeleteMessageModal}
    onOpenChange={onOpenMessageDeleteChange}
    contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <header class="flex justify-between">
            <h2 class="h2">Confirm</h2>
        </header>
        <article>
            <p class="opacity-60">
                Are you sure you want to delete this message?
            </p>
        </article>
        <footer class="flex justify-end gap-4">
            <button class="btn preset-filled-surface-500" onclick={onDeleteMessageCancel}>Cancel</button
            >
            <button class="btn preset-filled-error-500" onclick={onDeleteMessageConfirm}>Delete</button
            >
        </footer>
    {/snippet}
</Modal>

<style>
    .chat-messages {
        overflow-y: auto;
        flex: 1 1 0%;
        padding-bottom: 4rem;
    }
    .chat-input-bar {
        position: sticky;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 10;
    }
    /* Loader styles from Uiverse.io by mobinkakei */
    .wrapper {
      width: 66px;
      height: 20px;
      position: relative;
      z-index: 1;
      margin-left: 0;
    }
    .circle {
      width: 6.6px;
      height: 6.6px;
      position: absolute;
      border-radius: 50%;
      background-color: #fff;
      left: 15%;
      transform-origin: 50%;
      animation: circle7124 .5s alternate infinite ease;
    }
    @keyframes circle7124 {
      0% {
        top: 20px;
        height: 1.66px;
        border-radius: 50px 50px 25px 25px;
        transform: scaleX(1.7);
      }
      40% {
        height: 6.6px;
        border-radius: 50%;
        transform: scaleX(1);
      }
      100% {
        top: 0%;
      }
    }
    .circle:nth-child(2) {
      left: 45%;
      animation-delay: .2s;
    }
    .circle:nth-child(3) {
      left: auto;
      right: 15%;
      animation-delay: .3s;
    }
    .shadow {
      width: 6.6px;
      height: 1.33px;
      border-radius: 50%;
      background-color: rgba(0,0,0,0.9);
      position: absolute;
      top: 20.66px;
      transform-origin: 50%;
      z-index: -1;
      left: 15%;
      filter: blur(0.33px);
      animation: shadow046 .5s alternate infinite ease;
    }
    @keyframes shadow046 {
      0% {
        transform: scaleX(1.5);
      }
      40% {
        transform: scaleX(1);
        opacity: .7;
      }
      100% {
        transform: scaleX(.2);
        opacity: .4;
      }
    }
    .shadow:nth-child(4) {
      left: 45%;
      animation-delay: .2s
    }
    .shadow:nth-child(5) {
      left: auto;
      right: 15%;
      animation-delay: .3s;
    }
</style>
