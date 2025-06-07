import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { OllamaAdapter } from "../connectionAdapters/ollama"
import extractChunks from "png-chunks-extract"
import { decode as decodeText } from "png-chunk-text"
import { handleCharacterAvatarUpload } from "../utils"
import { charactersList } from "./characters"
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
    const [chat] = await db.insert(schema.chats).values(chatData).returning()
    message.personaIds.forEach(async (personaId: number) => {
        await db.insert(schema.chatPersonas).values({
            chatId: chat.id,
            personaId
        })
    })
    message.characterIds.forEach(async (characterId: number) => {
        await db.insert(schema.chatCharacters).values({
            chatId: chat.id,
            characterId
        })
    })
    const resChats = await db.query.chats.findMany({
        where: (c, { eq }) => eq(c.id, chat.id),
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
    const resChat = resChats[0]
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

export async function sendPersonaMessage(socket: any, message: Sockets.SendPersonaMessage.Call, emitToUser: (event: string, data: any) => void) {
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

        const user = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, userId),
            with: {
                activeConnection: true,
                activeWeights: true,
                activeContextConfig: true,
                activePromptConfig: true
            }
        })

        const adapter = new OllamaAdapter({
            chat,
            connection: user!.activeConnection!,
            weights: user!.activeWeights!,
            contextConfig: user!.activeContextConfig!,
            promptConfig: user!.activePromptConfig!
        })

        const content = await adapter.getCompletion()
        await db
            .update(schema.chatMessages)
            .set({
                content,
                isGenerating: false
            })
            .where(eq(schema.chatMessages.id, generatingMessage.id))
        const response: Sockets.SendPersonaMessage.Response = {
            chatMessage: assistantMessage
        }
        socket.io.to("user_" + userId).emit("personaMessageReceived", response)
    }

    await getChat(socket, { id: chatId }, emitToUser)
}

export async function characterCardImport(
    socket: any,
    message: { file?: string },
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1
    let charaData: CharaImportMetadata
    let base64 = message.file!
    if (base64.startsWith("data:")) base64 = base64.split(",")[1]
    const buffer = Buffer.from(base64, "base64")

    const chunks = extractChunks(buffer)

    for (const chunk of chunks) {
        if (chunk.name === "tEXt") {
            const { keyword, text } = decodeText(chunk.data)
            if (keyword.toLocaleLowerCase() === "chara") {
                charaData = JSON.parse(
                    Buffer.from(text, "base64").toString("utf8")
                ) as CharaImportMetadata
            }
        }
    }

    const data: InsertCharacter = {
        userId,
        name: charaData!.data.name || "Imported Character",
        description: charaData!.data.description || "",
        personality: charaData!.data.personality || "",
        scenario: charaData!.data.scenario || "",
        firstMessage: charaData!.data.first_mes || "",
        exampleDialogues: charaData!.data.mes_example || "",
    }

    const [character] = await db.insert(schema.characters).values(data).returning()
    await handleCharacterAvatarUpload({
        character,
        avatarFile: buffer
    })
    emitToUser("createCharacter", { character })
    await charactersList(socket, {}, emitToUser)
}

export async function deleteChatMessage(
    socket: any,
    message: { id: number },
    emitToUser: (event: string, data: any) => void
) {
    const chatMsg = await db.query.chatMessages.findFirst({
        where: (cm, { eq }) => eq(cm.id, message.id),
    })
    const userId = 1 // Replace with actual user id
    await db.delete(schema.chatMessages).where(
        and(eq(schema.chatMessages.id, message.id), eq(schema.chatMessages.userId, userId))
    )
    await getChat(socket, { id: chatMsg!.chatId }, emitToUser)
    emitToUser("deleteChatMessage", { id: message.id })
}

export async function updateChatMessage(
    socket: any,
    message: { id: number; content: string },
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual user id
    const [updated] = await db.update(schema.chatMessages)
        .set({ content: message.content, isEdited: 1 })
        .where(and(eq(schema.chatMessages.id, message.id), eq(schema.chatMessages.userId, userId)))
        .returning()
    emitToUser("updateChatMessage", { chatMessage: updated })
}
