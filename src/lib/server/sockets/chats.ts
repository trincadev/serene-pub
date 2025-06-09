import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { OllamaAdapter } from "../connectionAdapters/ollama"
// import extractChunks from "png-chunks-extract"
// import { decode as decodeText } from "png-chunk-text"
// import { handleCharacterAvatarUpload } from "../utils"
// import { charactersList } from "./characters"
import { and, eq } from "drizzle-orm"

// List all chats for the current user
export async function chatsList(
    socket: any,
    message: Sockets.ChatsList.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual user id
    const chatsList = await db.query.chats.findMany({
        with: {
            chatCharacters: {
                with: {
                    character: true
                }
            },
            chatPersonas: {
                with: {
                    persona: true
                }
            }
        },
        where: (c, { eq }) => eq(c.userId, userId)
    })
    const res: Sockets.ChatsList.Response = { chatsList }
    emitToUser("chatsList", res)
}

export async function createChat(
    socket: any,
    message: Sockets.CreateChat.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual user id
    const chatData = {
        ...message.chat,
        userId
    }
    const [newChat] = await db.insert(schema.chats).values(chatData).returning()
    message.personaIds.forEach(async (personaId: number) => {
        await db.insert(schema.chatPersonas).values({
            chatId: newChat.id,
            personaId
        })
    })
    message.characterIds.forEach(async (characterId: number) => {
        await db.insert(schema.chatCharacters).values({
            chatId: newChat.id,
            characterId
        })
    })

    // TODO, update to handle multiple characters
    // Insert first message if character has a first message
    console.log(
        "Creating first message for chat:",
        newChat.id,
        "with characterIds:",
        message.characterIds
    )
    const firstCharacter = await db.query.characters.findFirst({
        where: (c, { eq }) => eq(c.id, message.characterIds[0])
    })
    console.log("First character found:", firstCharacter)

    const firstMessageContent = (firstCharacter!.firstMessage || "").trim()
    console.log("First message content:", firstMessageContent)
    if (firstMessageContent) {
        const newMessage: InsertChatMessage = {
            userId,
            chatId: newChat.id,
            personaId: null,
            characterId: firstCharacter!.id,
            role: "assistant",
            content: firstMessageContent,
            createdAt: new Date().toString(),
            isGenerating: false // This is not a generating message
        }
        await db.insert(schema.chatMessages).values(newMessage)
    }

    const resChat = await db.query.chats.findFirst({
        where: (c, { eq }) => eq(c.id, newChat.id),
        with: {
            chatCharacters: {
                with: {
                    character: true
                }
            },
            chatPersonas: {
                with: {
                    persona: true
                }
            },
            chatMessages: true
        }
    })

    const res: Sockets.CreateChat.Response = { chat: resChat }
    await chatsList(socket, res, emitToUser)
}

export async function chat(
    socket: any,
    message: Sockets.Chat.Call,
    emitToUser: (event: string, data: any) => void
) {
    const chat = await db.query.chats.findFirst({
        where: (c, { eq }) => eq(c.id, message.id),
        with: {
            chatCharacters: {
                with: {
                    character: true
                }
            },
            chatPersonas: {
                with: {
                    persona: true
                }
            },
            chatMessages: true
        }
    })
    if (chat) {
        const res: Sockets.Chat.Response = { chat }
        emitToUser("chat", res)
    } else {
        emitToUser("chatError", { error: "Chat not found." })
    }
}

export const getChat = chat

export async function getChatFromDB(chatId: number, userId: number) {
    const chat = await db.query.chats.findFirst({
        where: (c, { eq, and }) => and(eq(c.id, chatId), eq(c.userId, userId)),
        with: {
            chatPersonas: {
                with: {
                    persona: true
                }
            },
            chatCharacters: {
                with: {
                    character: true
                }
            },
            chatMessages: true
        }
    })
    return chat
}

export async function sendPersonaMessage(
    socket: any,
    message: Sockets.SendPersonaMessage.Call,
    emitToUser: (event: string, data: any) => void
) {
    const { chatId, personaId, content } = message
    const userId = 1 // Replace with actual user id

    // Find the chat
    let chat = await getChatFromDB(chatId, userId)
    if (!chat) {
        socket.io.to("user_" + userId).emit("sendPersonaMessageError", { error: "Chat not found." })
        return
    }

    // Create the message
    const newMessage: InsertChatMessage = {
        userId,
        chatId,
        personaId,
        role: "user",
        content,
        createdAt: new Date().toString()
    }

    await db.insert(schema.chatMessages).values(newMessage)

    // Emit the new message to the client
    await getChat(socket, { id: chatId }, emitToUser)

    // Trigger message from first character in chat
    if (chat.chatCharacters.length > 0) {
        chat = await getChatFromDB(chatId, userId)

        const assistantMessage: InsertChatMessage = {
            userId,
            chatId,
            personaId: null,
            characterId: chat!.chatCharacters[0].character.id, // First character responds
            content: "",
            role: "assistant",
            createdAt: new Date().toString(),
            isGenerating: true // Indicate that this is a generating message
        }

        const [generatingMessage] = await db
            .insert(schema.chatMessages)
            .values(assistantMessage)
            .returning()

        await getChat(socket, { id: chatId }, emitToUser)

        await generateResponse({
            socket,
            emitToUser,
            chatId,
            userId,
            generatingMessage: generatingMessage as SelectChatMessage
        })
    }
}

async function generateResponse({
    socket,
    emitToUser,
    chatId,
    userId,
    generatingMessage
}: {
    socket: any
    emitToUser: (event: string, data: any) => void
    chatId: number
    userId: number
    generatingMessage: SelectChatMessage
}) {
    if (!generatingMessage.isGenerating || generatingMessage.content) {
        await db
            .update(schema.chatMessages)
            .set({ isGenerating: true, content: "" })
            .where(eq(schema.chatMessages.id, generatingMessage.id))
        await getChat(socket, { id: chatId }, emitToUser)
    }

    const chat = await db.query.chats.findFirst({
        where: (c, { eq }) => eq(c.id, chatId),
        with: {
            chatCharacters: {
                with: {
                    character: true
                }
            },
            chatPersonas: {
                with: {
                    persona: true
                }
            },
            chatMessages: true
        }
    })

    const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
        with: {
            activeConnection: true,
            activeSamplingConfig: true,
            activeContextConfig: true,
            activePromptConfig: true
        }
    })

    const adapter = new OllamaAdapter({
        chat,
        connection: user!.activeConnection!,
        sampling: user!.activeSamplingConfig!,
        contextConfig: user!.activeContextConfig!,
        promptConfig: user!.activePromptConfig!
    })

    // For now, always stream. You can add a config flag if needed.
    const completionResult = adapter.generate()

    if (typeof completionResult === "function") {
        // Streaming mode: progressively update the message
        let content = ""
        await completionResult(async (chunk: string) => {
            content += chunk
            await db
                .update(schema.chatMessages)
                .set({ content, isGenerating: true })
                .where(eq(schema.chatMessages.id, generatingMessage.id))
            await getChat(socket, { id: chatId }, emitToUser)
        })
        // Final update: mark as not generating
        await db
            .update(schema.chatMessages)
            .set({ content, isGenerating: false })
            .where(eq(schema.chatMessages.id, generatingMessage.id))
        // Fetch the updated message for the response
        const updatedMsg = await db.query.chatMessages.findFirst({
            where: (cm, { eq }) => eq(cm.id, generatingMessage.id)
        })
        const response: Sockets.SendPersonaMessage.Response = {
            chatMessage: updatedMsg!
        }
        socket.io.to("user_" + userId).emit("personaMessageReceived", response)
        await getChat(socket, { id: chatId }, emitToUser)
    } else {
        // Completed text mode
        const content = await completionResult
        await db
            .update(schema.chatMessages)
            .set({
                content,
                isGenerating: false
            })
            .where(eq(schema.chatMessages.id, generatingMessage.id))
        // Fetch the updated message for the response
        const updatedMsg = await db.query.chatMessages.findFirst({
            where: (cm, { eq }) => eq(cm.id, generatingMessage.id)
        })
        const response: Sockets.SendPersonaMessage.Response = {
            chatMessage: updatedMsg!
        }
        socket.io.to("user_" + userId).emit("personaMessageReceived", response)
        await getChat(socket, { id: chatId }, emitToUser)
    }
    await getChat(socket, { id: chatId }, emitToUser)
}

export async function deleteChatMessage(
    socket: any,
    message: { id: number },
    emitToUser: (event: string, data: any) => void
) {
    const chatMsg = await db.query.chatMessages.findFirst({
        where: (cm, { eq }) => eq(cm.id, message.id)
    })
    const userId = 1 // Replace with actual user id
    await db
        .delete(schema.chatMessages)
        .where(and(eq(schema.chatMessages.id, message.id), eq(schema.chatMessages.userId, userId)))
    await getChat(socket, { id: chatMsg!.chatId }, emitToUser)
    emitToUser("deleteChatMessage", { id: message.id })
}

export async function updateChatMessage(
    socket: any,
    message: { id: number; content: string },
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual user id
    const [updated] = await db
        .update(schema.chatMessages)
        .set({ content: message.content, isEdited: 1 })
        .where(and(eq(schema.chatMessages.id, message.id), eq(schema.chatMessages.userId, userId)))
        .returning()
    emitToUser("updateChatMessage", { chatMessage: updated })
    await getChat(socket, { id: updated.chatId }, emitToUser)
}

export async function deleteChat(
    socket: any,
    message: { id: number },
    emitToUser: (event: string, data: any) => void
) {
    try {
        console.log("Deleting chat with ID:", message.id)
        const userId = 1 // Replace with actual user id
        // Delete chat messages
        // await db.delete(schema.chatMessages).where(eq(schema.chatMessages.chatId, message.id))
        // // Delete chat characters
        // await db.delete(schema.chatCharacters).where(eq(schema.chatCharacters.chatId, message.id))
        // // Delete chat personas
        // await db.delete(schema.chatPersonas).where(eq(schema.chatPersonas.chatId, message.id))
        // // Delete the chat itself
        await db
            .delete(schema.chats)
            .where(and(eq(schema.chats.id, message.id), eq(schema.chats.userId, userId)))
        // Emit updated chat list
        await chatsList(socket, {}, emitToUser)
        emitToUser("deleteChat", { id: message.id })
    } catch (error) {
        console.error("Error deleting chat:", error)
        emitToUser("error", { error: "Failed to delete chat." })
    }
}

export async function regenerateChatMessage(
    socket: any,
    message: { id: number },
    emitToUser: (event: string, data: any) => void
) {
    // Find the message to regenerate
    const userId = 1 // Replace with actual user id
    const chatMessage = await db.query.chatMessages.findFirst({
        where: (cm, { eq }) => eq(cm.id, message.id)
    })
    if (!chatMessage) {
        socket.io.to("user_" + userId).emit("regenerateChatMessageError", { error: "Message not found." })
        return
    }
    // Find the chat
    const chat = await db.query.chats.findFirst({
        where: (c, { eq }) => eq(c.id, chatMessage.chatId),
        with: {
            chatCharacters: { with: { character: true } },
            chatPersonas: { with: { persona: true } },
            chatMessages: true
        }
    })
    if (!chat) {
        socket.io.to("user_" + userId).emit("regenerateChatMessageError", { error: "Chat not found." })
        return
    }
    // Update the message to isGenerating: true and clear content
    await db.update(schema.chatMessages)
        .set({ isGenerating: true, content: "" })
        .where(eq(schema.chatMessages.id, chatMessage.id))
    await getChat(socket, { id: chat.id }, emitToUser)
    // Generate new content for this message
    await generateResponse({
        socket,
        emitToUser,
        chatId: chat.id,
        userId,
        generatingMessage: { ...chatMessage, isGenerating: true, content: "" }
    })
}
