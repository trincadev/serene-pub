import {
    connectionsList,
    connection,
    updateConnection,
    deleteConnection,
    setUserActiveConnection,
    testConnection,
    refreshModels,
    createConnection
} from "./connections"
import {
    sampling,
    samplingConfigsList,
    setUserActiveSamplingConfig,
    createSamplingConfig,
    deleteSamplingConfig,
    updateSamplingConfig
} from "./samplingConfigs"
import {
    charactersList,
    character,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    characterCardImport
} from "./characters"
import { personasList, persona, createPersona, updatePersona, deletePersona } from "./personas"
import {
    contextConfigsList,
    contextConfig,
    createContextConfig,
    updateContextConfig,
    deleteContextConfig,
    setUserActiveContextConfig
} from "./contextConfigs"
import {chat, chatsList, createChat, deleteChatMessage, sendPersonaMessage, updateChatMessage, deleteChat, regenerateChatMessage, promptTokenCount, abortChatMessage, triggerGenerateMessage, chatMessage, updateChat} from './chats';
import {
    promptConfigsList,
    promptConfig,
    createPromptConfig,
    updatePromptConfig,
    deletePromptConfig,
    setUserActivePromptConfig
} from "./promptConfigs"
import { user } from "./users"
import { lorebook, lorebookList } from "./lorebooks"

const userId = 1 // Replace with actual user id

export function connectSockets(io: {
    on: (arg0: string, arg1: (socket: any) => void) => void
    to: (room: string) => any
}) {
    io.on("connect", (socket) => {
        // Attach io to socket for use in handlers
        socket.io = io
        socket.join("user_" + userId)

        // Helper to emit to all user_1 sockets
        function emitToUser(event: string, data: any) {
            io.to("user_" + userId).emit(event, data)
        }

        // Users
        register(socket, user, emitToUser)
        // SamplingConfig
        register(socket, sampling, emitToUser)
        register(socket, samplingConfigsList, emitToUser)
        register(socket, setUserActiveSamplingConfig, emitToUser)
        register(socket, createSamplingConfig, emitToUser)
        register(socket, deleteSamplingConfig, emitToUser)
        register(socket, updateSamplingConfig, emitToUser)
        // Connections
        register(socket, connectionsList, emitToUser)
        register(socket, connection, emitToUser)
        register(socket, createConnection, emitToUser)
        register(socket, updateConnection, emitToUser)
        register(socket, deleteConnection, emitToUser)
        register(socket, setUserActiveConnection, emitToUser)
        register(socket, testConnection, emitToUser)
        register(socket, refreshModels, emitToUser)
        // Characters
        register(socket, charactersList, emitToUser)
        register(socket, character, emitToUser)
        register(socket, createCharacter, emitToUser)
        register(socket, updateCharacter, emitToUser)
        register(socket, deleteCharacter, emitToUser)
        // Personas
        register(socket, personasList, emitToUser)
        register(socket, persona, emitToUser)
        register(socket, createPersona, emitToUser)
        register(socket, updatePersona, emitToUser)
        register(socket, deletePersona, emitToUser)
        // Context Configs
        register(socket, contextConfigsList, emitToUser)
        register(socket, contextConfig, emitToUser)
        register(socket, createContextConfig, emitToUser)
        register(socket, updateContextConfig, emitToUser)
        register(socket, deleteContextConfig, emitToUser)
        register(socket, setUserActiveContextConfig, emitToUser)
        // Prompt Configs
        register(socket, promptConfigsList, emitToUser)
        register(socket, promptConfig, emitToUser)
        register(socket, createPromptConfig, emitToUser)
        register(socket, updatePromptConfig, emitToUser)
        register(socket, deletePromptConfig, emitToUser)
        register(socket, setUserActivePromptConfig, emitToUser)
        // Chats
        register(socket, chatsList, emitToUser)
        register(socket, createChat, emitToUser)
        register(socket, chat, emitToUser)
        register(socket, sendPersonaMessage, emitToUser)
        register(socket, characterCardImport, emitToUser)
        register(socket, deleteChatMessage, emitToUser)
        register(socket, updateChatMessage, emitToUser)
        register(socket, deleteChat, emitToUser)
        register(socket, regenerateChatMessage, emitToUser)
        register(socket, promptTokenCount, emitToUser)
        register(socket, abortChatMessage, emitToUser)
        register(socket, triggerGenerateMessage, emitToUser)
        register(socket, chatMessage, emitToUser)
        register(socket, updateChat, emitToUser)
        // Lorebooks
        register(socket, lorebookList, emitToUser)
        register(socket, lorebook, emitToUser)
        console.log(`Socket connected: ${socket.id} for user ${userId}`)
    })
}

function register(
    socket: any,
    event: (
        socket: any,
        message: any,
        emitToUser: (event: string, data: any) => void
    ) => Promise<void>,
    emitToUser: (event: string, data: any) => void
) {
    socket.on(event.name, async (message: any) => {
        try {
            await event(socket, message, emitToUser)
        } catch (error) {
            console.error(`Error handling event ${event.name}:`, error)
            socket.io.to("user_" + userId).emit(`${event.name}Error`, {
                error: "An error occurred while processing your request."
            })
        }
    })
}
