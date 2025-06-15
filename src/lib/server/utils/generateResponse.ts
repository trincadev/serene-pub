import {db} from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import {OllamaAdapter} from '../connectionAdapters/ollama';
import {eq} from 'drizzle-orm';
import {v4 as uuidv4} from 'uuid';
import {activeAdapters, chatMessage} from '../sockets/chats';
import { getNextCharacterTurn } from './PromptBuilder';

export async function generateResponse({
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
    // Generate a UUID for this adapter instance
    const adapterId = uuidv4();
    // Save the adapterId to the chatMessage (set isGenerating true, content empty, and adapterId)
    await db
        .update(schema.chatMessages)
        .set({ isGenerating: true, content: "", adapterId })
        .where(eq(schema.chatMessages.id, generatingMessage.id))
    // Instead of getChat, emit the chatMessage
    await chatMessage(socket, { chatMessage: { ...generatingMessage, isGenerating: true, content: "", adapterId } }, emitToUser)

    const chat = await db.query.chats.findFirst({
        where: (c, { eq }) => eq(c.id, chatId),
        with: {
            chatCharacters: { with: { character: true } },
            chatPersonas: { with: { persona: true } },
            chatMessages: {
                where: (cm, {ne}) => ne(cm.id, generatingMessage.id),
            }
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
        promptConfig: user!.activePromptConfig!,
        currentCharacterId: generatingMessage.characterId!,
    })
    // Store adapter in global map
    activeAdapters.set(adapterId, adapter)

    // Generate completion
    let completionResult = await adapter.generate();
    let content = ""
    try {
        if (typeof completionResult === "function") {
            await completionResult(async (chunk: string) => {
                content += chunk
                await db
                    .update(schema.chatMessages)
                    .set({ content, isGenerating: true })
                    .where(eq(schema.chatMessages.id, generatingMessage.id))
                // Instead of getChat, emit the chatMessage
                await chatMessage(socket, { chatMessage: { ...generatingMessage, content, isGenerating: true } }, emitToUser)
            })
            // Final update: mark as not generating, clear adapterId
            content = content.trim()
            await db
                .update(schema.chatMessages)
                .set({ content, isGenerating: false, adapterId: null })
                .where(eq(schema.chatMessages.id, generatingMessage.id))
            // Instead of getChat, emit the chatMessage
            await chatMessage(socket, { chatMessage: { ...generatingMessage, content, isGenerating: false, adapterId: null } }, emitToUser)
        } else {
            content = completionResult
            content = content.trim()
            await db
                .update(schema.chatMessages)
                .set({ content, isGenerating: false, adapterId: null })
                .where(eq(schema.chatMessages.id, generatingMessage.id))
            // Instead of getChat, emit the chatMessage
            await chatMessage(socket, { chatMessage: { ...generatingMessage, content, isGenerating: false, adapterId: null } }, emitToUser)
        }
    } finally {
        // Remove adapter from global map
        activeAdapters.delete(adapterId)
    }
    // Fetch the updated message for the response
    const updatedMsg = await db.query.chatMessages.findFirst({
        where: (cm, { eq }) => eq(cm.id, generatingMessage.id)
    })
    const response: Sockets.SendPersonaMessage.Response = {
        chatMessage: updatedMsg!
    }
    socket.io.to("user_" + userId).emit("personaMessageReceived", response)
    // Instead of getChat, emit the chatMessage
    await chatMessage(socket, { chatMessage: updatedMsg! }, emitToUser)
}