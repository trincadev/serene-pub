<script lang="ts">
    import { page } from "$app/state"
    import { Avatar, Modal, Tabs } from "@skeletonlabs/skeleton-svelte"
    import Markdown from "svelte-exmarkdown"
    import * as skio from "sveltekit-io"
    import * as Icons from "@lucide/svelte"
    import { Carta, MarkdownEditor } from "carta-md"

    // @ts-ignore
    const carta = new Carta({ disableIcons: ["code", "link"] })
    let chat: any = $state(null)
    let newMessage = $state("")
    const socket = skio.get()
    let showDeleteMessageModal = $state(false)
    let deleteChatMessage: SelectChatMessage | undefined = $state()
    let editChatMessage: SelectChatMessage | undefined = $state()
    let newMessageGroup: "compose" | "preview" = $state("compose")
    let editMessageGroup: "compose" | "preview" = $state("compose")

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
        if (!newMessage.trim()) return
        // TODO: Implement send message socket call
        const msg: Sockets.SendPersonaMessage.Call = {
            chatId,
            personaId: chat?.chatPersonas?.[0]?.personaId,
            content: newMessage
        }
        socket.emit("sendPersonaMessage", msg)
        newMessage = " "
    }

    function getMessageCharacter(
        msg: SelectChatMessage
    ): SelectCharacter | SelectPersona | undefined {
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

    function handleMessageUpdate(event: SubmitEvent) {
        event.preventDefault()
        if (!editChatMessage || !editChatMessage.content.trim()) return

        const updatedMessage: Sockets.UpdateChatMessage.Call = {
            id: editChatMessage.id,
            content: editChatMessage.content
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

    let chatMessagesContainer: HTMLDivElement | null = null
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
                {#each chat.chatMessages as msg}
                    {@const character = getMessageCharacter(msg)}
                    <li class="bg-primary-50-950 flex flex-col rounded-lg p-4">
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
                                    class="btn btn-sm preset-tonal-surface hover:preset-tonal-primary h-min w-min px-2 opacity-50 hover:opacity-100"
                                    title="Edit Message"
                                    disabled={lastMessage?.isGenerating || !!editChatMessage}
                                    onclick={(e) => {
                                        e.stopPropagation()
                                        handleEditMessageClick(msg)
                                    }}
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
                            {:else if msg.isLoading}
                                <div class="animate-pulse">
                                    <div class="mb-2 h-4 w-3/4 rounded bg-gray-300"></div>
                                    <div class="h-4 w-1/2 rounded bg-gray-300"></div>
                                </div>
                            {:else if msg.isError}
                                <div class="text-red-500">Error loading message</div>
                            {:else if editChatMessage && editChatMessage.id === msg.id}
                                <form
                                    class="chat-input-bar bg-surface-100-900 gap-4 p-2 pb-6 align-middle w-full rounded-xl"
                                    onsubmit={(e) => {
                                        e.preventDefault()
                                        handleMessageUpdate(e)
                                    }}
                                >
                                    <Tabs
                                        value={editMessageGroup}
                                        onValueChange={(e) =>
                                            (editMessageGroup = e.value as "compose" | "preview")}
                                    >
                                        {#snippet list()}
                                            <Tabs.Control value="compose"
                                                ><span title="Compose"
                                                    ><Icons.Pen size="0.75em" /></span
                                                ></Tabs.Control
                                            >
                                            <Tabs.Control value="preview"
                                                ><span title="Preview"
                                                    ><Icons.Eye size="0.75em" /></span
                                                ></Tabs.Control
                                            >
                                        {/snippet}
                                        {#snippet content()}
                                            <div class="flex gap-2">
                                                <div class="w-full">
                                                    <Tabs.Panel value="compose">
                                                        <textarea
                                                            class="input input-sm field-sizing-content min-h-[4.75em] flex-1"
                                                            placeholder="Type a message..."
                                                            bind:value={editChatMessage!.content}
                                                            autocomplete="off"
                                                            spellcheck="true"
                                                        >
                                                        </textarea>
                                                    </Tabs.Panel>
                                                    <Tabs.Panel value="preview">
                                                        <div
                                                            class="card bg-surface-100-900 min-h-[5em] w-full rounded-lg p-2"
                                                        >
                                                            <Markdown md={editChatMessage!.content} />
                                                        </div>
                                                    </Tabs.Panel>
                                                </div>
                                                <div class="flex flex-col gap-4">
                                                <button
                                                    class="btn preset-filled-success-500 h-auto w-fit"
                                                    type="submit"
                                                    disabled={!editChatMessage!.content.trim()}
                                                    title="Save"
                                                >
                                                    <Icons.Send size={24} />
                                                </button>
                                                <button
                                                    class="btn preset-filled-surface-500 h-auto w-fit"
                                                    type="button"
                                                    title="Save"
                                                    onclick={(e) => {
                                                        e.stopPropagation()
                                                        editChatMessage = undefined
                                                    }}
                                                >
                                                    <Icons.X size={24} />
                                                </button>
                                                </div>
                                            </div>
                                        {/snippet}
                                    </Tabs>
                                </form>
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
    <!-- NEW CHAT MESSAGE FORM -->
    <form
        class="chat-input-bar preset-tonal-surface gap-4 p-2 pb-6 align-middle"
        onsubmit={(e) => {
            e.preventDefault()
            handleSend(e)
        }}
    >
        <Tabs
            value={newMessageGroup}
            onValueChange={(e) => (newMessageGroup = e.value as "compose" | "preview")}
        >
            {#snippet list()}
                <Tabs.Control value="compose"
                    ><span title="Compose"><Icons.Pen size="0.75em" /></span></Tabs.Control
                >
                <Tabs.Control value="preview"
                    ><span title="Preview"><Icons.Eye size="0.75em" /></span></Tabs.Control
                >
            {/snippet}
            {#snippet content()}
                <div class="flex gap-4">
                    <div class="flex gap-4">
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
                    </div>
                    <div class="w-full">
                        <Tabs.Panel value="compose">
                            <textarea
                                class="input input-sm field-sizing-content min-h-[3.75em] flex-1"
                                placeholder="Type a message..."
                                bind:value={newMessage}
                                autocomplete="off"
                                spellcheck="true"
                            >
                            </textarea>
                        </Tabs.Panel>
                        <Tabs.Panel value="preview">
                            <div class="card bg-surface-100-900 min-h-[4em] w-full rounded-lg p-2">
                                <Markdown md={newMessage} />
                            </div>
                        </Tabs.Panel>
                    </div>
                    <button
                        class="btn preset-filled-success-500 h-auto w-fit"
                        type="submit"
                        disabled={!newMessage.trim() || lastMessage?.isGenerating}
                        title="Send"
                    >
                        <Icons.Send size={24} />
                    </button>
                </div>
            {/snippet}
        </Tabs>
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
        background: rgba(56,189,248,0.08);
        padding-left: 1em;
        margin-left: 0;
    }
    :global(.markdown-body em),
    :global(.markdown-body i) {
        color: #f472b6; /* pink-400 */
        font-style: italic;
        background: rgba(244,114,182,0.08);
        border-radius: 0.2em;
        padding: 0 0.15em;
    }
    /* Preserve blank lines between paragraphs */
    :global(.markdown-body p) {
        margin-top: 1em;
        margin-bottom: 1em;
        min-height: 1.5em;
    }
</style>
