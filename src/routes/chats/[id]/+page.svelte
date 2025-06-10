<script lang="ts">
    import { page } from "$app/state"
    import { Avatar, Modal } from "@skeletonlabs/skeleton-svelte"
    import * as skio from "sveltekit-io"
    import * as Icons from "@lucide/svelte"
    import MessageComposer from "$lib/client/components/chatMessages/MessageComposer.svelte"
    import { renderMarkdownWithQuotedText } from "$lib/client/utils/markdownToHTML"
    import { getContext } from "svelte"

    let chat: Sockets.Chat.Response["chat"] | undefined = $state()
    let newMessage = $state("")
    const socket = skio.get()
    let showDeleteMessageModal = $state(false)
    let deleteChatMessage: SelectChatMessage | undefined = $state()
    let editChatMessage: SelectChatMessage | undefined = $state()
    let promptStats:
        | {
              tokenCount: number
              tokenLimit: number
              messagesIncluded: number
              totalMessages: number
          }
        | undefined = $state()
    let userCtx: UserCtx = getContext("user")
    let promptTokenCountTimeout: ReturnType<typeof setTimeout> | null = null
    let contextExceeded = $derived( !!promptStats ? promptStats!.tokenCount > promptStats!.tokenLimit : false )

    // Get chat id from route params
    let chatId: number = $derived.by(() => Number(page.params.id))

    socket.on("chat", (msg: Sockets.Chat.Response) => {
        if (msg.chat.id === Number.parseInt(page.params.id)) {
            chat = msg.chat
            // Instantly jump to bottom on chat update
            window.scrollTo(0, document.body.scrollHeight)
        }
    })

    socket.on("chatMessage", (msg: Sockets.ChatMessage.Response) => {
        if (chat !== undefined && msg.chatMessage.chatId === chatId) {
            const existingIndex = chat!.chatMessages.findIndex(
                (m: SelectChatMessage) => m.id === msg.chatMessage.id
            )
            if (existingIndex !== -1) {
                const updatedMessages = [...chat!.chatMessages]
                updatedMessages[existingIndex] = msg.chatMessage
                chat = { ...chat, chatMessages: updatedMessages }
            } else {
                chat = { ...chat, chatMessages: [...chat.chatMessages, msg.chatMessage] }
            }
        }
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
        }, 0)
    })

    socket.on("promptTokenCount", (msg: Sockets.PromptTokenCount.Response) => {
        promptStats = msg
    })

    let lastMessage: SelectChatMessage | undefined = $derived.by(() => {
        if (chat && chat.chatMessages.length > 0) {
            return chat.chatMessages[chat.chatMessages.length - 1]
        }
        return undefined
    })

    function handleSend() {
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
        if (msg.personaId) {
            const persona = chat?.chatPersonas?.find(
                (p: SelectChatPersona) => p.personaId === msg.personaId
            )?.persona
            return persona
        } else if (msg.characterId) {
            const character = chat?.chatCharacters?.find(
                (c: SelectChatCharacter) => c.characterId === msg.characterId
            )?.character
            return character
        }
    }

    function openDeleteMessageModal(message: SelectChatMessage) {
        deleteChatMessage = message
        showDeleteMessageModal = true
        console.log("Opening delete message modal for:", message)
    }

    function onOpenMessageDeleteChange(details: OpenChangeDetails) {
        showDeleteMessageModal = details.open
        if (!showDeleteMessageModal) {
            deleteChatMessage = undefined
        }
    }

    function onDeleteMessageConfirm() {
        console.log("Deleting message")
        socket.emit("deleteChatMessage", {
            id: deleteChatMessage?.id
        })
        deleteChatMessage = undefined
        showDeleteMessageModal = false
    }

    function onDeleteMessageCancel() {
        console.log("Delete message cancelled")
        deleteChatMessage = undefined
        showDeleteMessageModal = false
    }

    function handleEditMessageClick(message: SelectChatMessage) {
        editChatMessage = { ...message }
    }

    function handleMessageUpdate(event?: Event) {
        if (event) event.preventDefault()
        if (!editChatMessage || !editChatMessage.content.trim()) return

        const updatedMessage: Sockets.UpdateChatMessage.Call = {
            chatMessage: editChatMessage
        }
        socket.emit("updateChatMessage", updatedMessage)
        editChatMessage = undefined
    }

    $effect(() => {
        const _chatId = page.params.id
        if (_chatId) {
            chatId = Number.parseInt(_chatId)
            socket.emit("chat", { id: chatId })
        }
    })

    $effect(() => {
        const _connection = userCtx?.user?.activeConnection // DO NOT REMOVE THIS LINE - REACTIVITY TRIGGER
        const _samplingConfig = userCtx?.user?.activeSamplingConfig // DO NOT REMOVE THIS LINE - REACTIVITY TRIGGER
        const _contextConfig = userCtx?.user?.activeContextConfig // DO NOT REMOVE THIS LINE - REACTIVITY TRIGGER
        const _promptConfig = userCtx?.user?.activePromptConfig // DO NOT REMOVE THIS LINE - REACTIVITY TRIGGER
        const _newMessage = newMessage // DO NOT REMOVE THIS LINE - REACTIVITY TRIGGER
        if (!chatId || !lastMessage || lastMessage.isGenerating || !!editChatMessage) return
        if (promptTokenCountTimeout) clearTimeout(promptTokenCountTimeout)
        promptTokenCountTimeout = setTimeout(() => {
            socket.emit("promptTokenCount", {
                chatId,
                content: newMessage,
                personaId: chat?.chatPersonas?.[0]?.personaId || undefined,
                role: "user"
            })
        }, 2000)
    })

    let chatMessagesContainer: HTMLDivElement | null = null

    function handleCancelEditMessage(e: Event) {
        e.stopPropagation()
        editChatMessage = undefined
    }
    function handleSaveEditMessage(e: Event) {
        e.stopPropagation()
        handleMessageUpdate(e)
    }
    function handleHideMessage(e: Event, msg: SelectChatMessage) {
        e.stopPropagation()
        socket.emit("updateChatMessage", { chatMessage: { ...msg, isHidden: !msg.isHidden } })
    }
    function handleEditMessage(e: Event, msg: SelectChatMessage) {
        e.stopPropagation()
        handleEditMessageClick(msg)
    }
    function handleDeleteMessage(e: Event, msg: SelectChatMessage) {
        e.stopPropagation()
        openDeleteMessageModal(msg)
    }
    function handleRegenerateMessage(e: Event, msg: SelectChatMessage) {
        e.stopPropagation()
        socket.emit("regenerateChatMessage", { id: msg.id })
    }
    function handleAbortMessage(e: Event, msg: SelectChatMessage) {
        e.stopPropagation()
        socket.emit("abortChatMessage", { id: msg.id })
    }
    function handleSendButton(e: Event) {
        e.stopPropagation()
        handleSend()
    }
    function handleAbortLastMessage(e: Event) {
        e.stopPropagation()
        if (lastMessage) socket.emit("abortChatMessage", { id: lastMessage.id })
    }
    function handleTriggerGenerateMessage(e: Event) {
        e.stopPropagation()
        socket.emit("triggerGenerateMessage", { chatId })
    }
    function handleRegenerateLastMessage(e: Event) {
        e.stopPropagation()
        if (lastMessage && !lastMessage.isGenerating) {
            socket.emit("regenerateChatMessage", { id: lastMessage.id })
        }
    }

</script>

<svelte:head>
    <title>Serene Pub - {chat?.name}</title>
    <meta name="description" content="Serene Pub" />
</svelte:head>

<div class="flex h-full w-full flex-col px-2">
    <div class="chat-messages flex-1" bind:this={chatMessagesContainer}>
        {#if !chat || chat.chatMessages.length === 0}
            <div class="text-muted mt-8 text-center">No messages yet.</div>
        {:else}
            <ul class="flex flex-col gap-3 py-2">
                {#each chat.chatMessages as msg (msg.id)}
                {@const character = getMessageCharacter(msg)}
                    <li class="bg-primary-50-950 flex flex-col rounded-lg p-4" class:opacity-50={msg.isHidden && editChatMessage?.id !== msg.id}>
                        <div class="flex justify-between gap-2">
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
                                <span class="funnel-display text-[1.1em] font-bold"
                                    >{character?.name || "Unknown"}</span
                                >
                            </div>
                            <div class="flex gap-2">
                                {#if editChatMessage && editChatMessage.id === msg.id}
                                    <button
                                        class="btn btn-sm msg-cntrl-icon preset-filled-surface-500"
                                        title="Cancel Edit"
                                        onclick={handleCancelEditMessage}
                                    >
                                        <Icons.X size={16} />
                                    </button>
                                    <button
                                        class="btn btn-sm msg-cntrl-icon preset-filled-primary-500"
                                        title="Save"
                                        onclick={handleSaveEditMessage}
                                    >
                                        <Icons.Save size={16} />
                                    </button>
                                {:else}
                                    <div class="flex gap-6">
                                        <span class="text-surface-500 mx-6">
                                            {new Date(msg.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <button
                                        class="btn btn-sm msg-cntrl-icon hover:preset-filled-secondary-500"
                                        class:preset-filled-secondary-500={msg.isHidden}
                                        title={msg.isHidden ? "Unhide Message" : "Hide Message"}
                                        disabled={lastMessage?.isGenerating || !!editChatMessage}
                                        onclick={(e) => handleHideMessage(e, msg)}
                                    >
                                        <Icons.Ghost size={16} />
                                    </button>
                                    <button
                                        class="btn btn-sm msg-cntrl-icon hover:preset-filled-success-500"
                                        title="Edit Message"
                                        disabled={lastMessage?.isGenerating ||
                                            !!editChatMessage ||
                                            msg.isGenerating ||
                                            msg.isHidden}
                                        onclick={(e) => handleEditMessage(e, msg)}
                                    >
                                        <Icons.Edit size={16} />
                                    </button>
                                    <button
                                        class="btn btn-sm msg-cntrl-icon hover:preset-filled-error-500"
                                        title="Delete Message"
                                        disabled={lastMessage?.isGenerating || !!editChatMessage}
                                        onclick={(e) => handleDeleteMessage(e, msg)}
                                    >
                                        <Icons.Trash2 size={16} />
                                    </button>
                                    {#if !!msg.characterId && msg.id === lastMessage?.id && !msg.isGenerating}
                                        <button
                                            class="btn btn-sm msg-cntrl-icon hover:preset-filled-warning-500"
                                            title="Regenerate Response"
                                            disabled={msg.isHidden}
                                            onclick={(e) => handleRegenerateMessage(e, msg)}
                                        >
                                            <Icons.RefreshCw size={16} />
                                        </button>
                                    {/if}
                                    {#if msg.isGenerating}
                                        <button
                                            class="btn btn-sm msg-cntrl-icon preset-filled-error-500"
                                            title="Stop Generation"
                                            onclick={(e) => handleAbortMessage(e, msg)}
                                        >
                                            <Icons.Square size={16} />
                                        </button>
                                    {/if}
                                {/if}
                            </div>
                        </div>
                        <div class="flex h-fit rounded p-2 text-left">
                            {#if msg.content === "" && msg.isGenerating}
                                <div class="wrapper">
                                    <div class="circle"></div>
                                    <div class="circle"></div>
                                    <div class="circle"></div>
                                    <div class="shadow"></div>
                                    <div class="shadow"></div>
                                    <div class="shadow"></div>
                                </div>
                            {:else if editChatMessage && editChatMessage.id === msg.id}
                                <div
                                    class="chat-input-bar bg-surface-100-900 w-full rounded-xl p-2 pb-6 align-middle"
                                >
                                    <MessageComposer
                                        bind:markdown={editChatMessage.content}
                                        onSend={handleMessageUpdate}
                                    />
                                </div>
                            {:else}
                                <div class="rendered-chat-message-content">
                                    {@html renderMarkdownWithQuotedText(msg.content)}
                                </div>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
    <!-- NEW CHAT MESSAGE FORM -->
    <div class="chat-input-bar preset-tonal-surface gap-4 pb-6 align-middle">
        <MessageComposer
            bind:markdown={newMessage}
            onSend={handleSend}
            {promptStats}
            extraTabs={[
                {
                    value: "extraControls",
                    title: "Extra Controls",
                    control: extraControlsButton,
                    content: extraControlsContent
                },
                {
                    value: "statistics",
                    title: "Statistics",
                    control: statisticsButton,
                    content: statisticsContent
                }
            ]}
        >
            {#snippet leftControls()}
                {#if chat?.chatPersonas?.[0]?.persona}
                    {@const persona = chat?.chatPersonas?.[0]?.persona}
                    <div class="flex flex-col gap-2">
                        <span>
                            <Avatar
                                src={persona.avatar ?? ""}
                                size="w-[4em] h-[4em]"
                                name={persona?.name ?? "Unknown"}
                                background="preset-filled-primary-500"
                            >
                                <Icons.User size={36} />
                            </Avatar>
                        </span>
                    </div>
                {/if}
            {/snippet}
            {#snippet rightControls()}
                {#if !lastMessage?.isGenerating && !editChatMessage}
                    <button
                        class="text-success-500 hover:preset-tonal-success h-auto rounded-lg p-3 text-center"
                        type="button"
                        disabled={!newMessage.trim() || lastMessage?.isGenerating}
                        title="Send"
                        onclick={handleSendButton}
                    >
                        <Icons.Send size={24} class="mx-auto" />
                    </button>
                {:else if lastMessage?.isGenerating}
                    <button
                        title="Stop Generation"
                        class="text-error-500 hover:preset-tonal-error h-auto rounded-lg p-3 text-center"
                        type="button"
                        onclick={handleAbortLastMessage}
                    >
                        <Icons.Square size={24} class="mx-auto" />
                    </button>
                {/if}
            {/snippet}
        </MessageComposer>
    </div>
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
            <p class="opacity-60">Are you sure you want to delete this message?</p>
        </article>
        <footer class="flex justify-end gap-4">
            <button class="btn preset-filled-surface-500" onclick={onDeleteMessageCancel}
                >Cancel</button
            >
            <button class="btn preset-filled-error-500" onclick={onDeleteMessageConfirm}
                >Delete</button
            >
        </footer>
    {/snippet}
</Modal>

{#snippet extraControlsButton()}
    <Icons.MessageSquare size="0.75em" />
{/snippet}

{#snippet extraControlsContent()}
    <div class="flex gap-2">
        <button
            class="btn preset-filled-primary-500"
            title="Trigger Character Generation"
            onclick={handleTriggerGenerateMessage}
            disabled={!chat || !chat.chatPersonas?.[0]?.personaId || lastMessage?.isGenerating}
        >
            <Icons.MessageSquarePlus size={24} />
        </button>
        <button
            class="btn preset-filled-warning-500"
            title="Regenerate Last Message"
            onclick={handleRegenerateLastMessage}
            disabled={!lastMessage || lastMessage.isGenerating}
        >
            <Icons.RefreshCw size={24} />
        </button>
    </div>
{/snippet}

{#snippet statisticsButton()}
    <Icons.BarChart2 size="0.75em" />
{/snippet}

{#snippet statisticsContent()}
    <div class="flex flex-col p-2 text-sm">
        {#if promptStats}
            <div>
                <b>Prompt Tokens:</b> <span class:text-error-500={contextExceeded}>{promptStats.tokenCount} / {promptStats.tokenLimit}</span>
                
            </div>
            <div>
                <b>Messages Inserted:</b> {promptStats.messagesIncluded} / {promptStats.totalMessages}
                <span class="text-surface-500">(Includes current draft)</span>
            </div>
        {:else}
            <div class="text-muted">No prompt statistics available.</div>
        {/if}
    </div>
{/snippet}

<style lang="postcss">
    @reference "tailwindcss";

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
        animation: circle7124 0.5s alternate infinite ease;
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
        animation-delay: 0.2s;
    }
    .circle:nth-child(3) {
        left: auto;
        right: 15%;
        animation-delay: 0.3s;
    }
    .shadow {
        width: 6.6px;
        height: 1.33px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.9);
        position: absolute;
        top: 20.66px;
        transform-origin: 50%;
        z-index: -1;
        left: 15%;
        filter: blur(0.33px);
        animation: shadow046 0.5s alternate infinite ease;
    }
    @keyframes shadow046 {
        0% {
            transform: scaleX(1.5);
        }
        40% {
            transform: scaleX(1);
            opacity: 0.7;
        }
        100% {
            transform: scaleX(0.2);
            opacity: 0.4;
        }
    }
    .shadow:nth-child(4) {
        left: 45%;
        animation-delay: 0.2s;
    }
    .shadow:nth-child(5) {
        left: auto;
        right: 15%;
        animation-delay: 0.3s;
    }
    /* --- Markdown custom styles --- */
    :global(.markdown-body) {
        white-space: pre-line;
    }
    :global(.markdown-body blockquote) {
        color: #7dd3fc; /* sky-300 */
        border-left: 4px solid #38bdf8; /* sky-400 */
        background: rgba(56, 189, 248, 0.08);
        padding-left: 1em;
        margin-left: 0;
    }
    :global(.markdown-body em),
    :global(.markdown-body i) {
        color: #f472b6; /* pink-400 */
        font-style: italic;
        background: rgba(244, 114, 182, 0.08);
        border-radius: 0.2em;
        padding: 0 0.15em;
    }
    /* Preserve blank lines between paragraphs */
    :global(.markdown-body p) {
        margin-top: 1em;
        margin-bottom: 1em;
        min-height: 1.5em;
    }

    .msg-cntrl-icon {
        @apply h-min w-min px-2 disabled:opacity-25;
    }
</style>
