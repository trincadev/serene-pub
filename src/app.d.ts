// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Component } from "@lucide/svelte"
import * as schema from "$lib/server/db/schema"
import type { Schema } from "inspector/promises"

// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }

    interface OpenChangeDetails {
        open: boolean
    }

    interface PanelsCtx {
        leftPanel: string | null
        rightPanel: string | null
        mobilePanel: string | null
        isMobileMenuOpen: boolean
        openPanel: (key: string) => void
        closePanel: (args: { panel: "left" | "right" | "mobile" }) => Promise<boolean>
        onLeftPanelClose?: () => Promise<boolean>
        onRightPanelClose?: () => Promise<boolean>
        onMobilePanelClose?: () => Promise<boolean>
        leftNav: Record<string, { icon: Component<Icons.IconProps, {}, "">; title: string }>
        rightNav: Record<string, { icon: Component<Icons.IconProps, {}, "">; title: string }>
    }

    interface UserCtx {
        user: SelectUser | undefined
    }

    // Model select and insert
    type SelectUser = typeof schema.users.$inferSelect
    type InsertUser = typeof schema.users.$inferInsert
    type SelectSamplingConfig = typeof schema.samplingConfigs.$inferSelect
    type InsertSamplingConfig = typeof schema.samplingConfigs.$inferInsert
    type SelectConnection = typeof schema.connections.$inferSelect
    type InsertConnection = typeof schema.connections.$inferInsert
    type SelectContextConfig = typeof schema.contextConfigs.$inferSelect
    type InsertContextConfig = typeof schema.contextConfigs.$inferInsert
    type SelectPromptConfig = typeof schema.promptConfigs.$inferSelect
    type InsertPromptConfig = typeof schema.promptConfigs.$inferInsert
    type SelectLorebook = typeof schema.lorebooks.$inferSelect
    type InsertLorebook = typeof schema.lorebooks.$inferInsert
    type SelectLorebookEntry = typeof schema.lorebookEntries.$inferSelect
    type InsertLorebookEntry = typeof schema.lorebookEntries.$inferInsert
    type SelectTag = typeof schema.tags.$inferSelect
    type InsertTag = typeof schema.tags.$inferInsert
    type SelectCharacterTag = typeof schema.characterTags.$inferSelect
    type InsertCharacterTag = typeof schema.characterTags.$inferInsert
    type SelectCharacter = typeof schema.characters.$inferSelect
    type InsertCharacter = typeof schema.characters.$inferInsert
    type SelectPersona = typeof schema.personas.$inferSelect
    type InsertPersona = typeof schema.personas.$inferInsert
    type SelectChat = typeof schema.chats.$inferSelect
    type InsertChat = typeof schema.chats.$inferInsert
    type SelectChatMessage = typeof schema.chatMessages.$inferSelect
    type InsertChatMessage = typeof schema.chatMessages.$inferInsert
    type SelectChatPersona = typeof schema.chatPersonas.$inferSelect
    type InsertChatPersona = typeof schema.chatPersonas.$inferInsert
    type SelectChatCharacter = typeof schema.chatCharacters.$inferSelect
    type InsertChatCharacter = typeof schema.chatCharacters.$inferInsert

    namespace Sockets {
        namespace SamplingConfig {
            interface Call {
                id: number
            }
            interface Response {
                sampling: SelectSamplingConfig
            }
        }
        namespace SamplingConfigList {
            interface Call {}
            interface Response {
                samplingConfigsList: Partial<SelectSamplingConfig>[]
            }
        }
        namespace ContextConfigsList {
            interface Call {}
            interface Response {
                contextConfigsList: Partial<SelectContextConfig>[]
            }
        }
        namespace ContextConfig {
            interface Call {
                id: number
            }
            interface Response {
                contextConfig: SelectContextConfig
            }
        }
        namespace CreateContextConfig {
            interface Call {
                contextConfig: InsertContextConfig
            }
            interface Response {
                contextConfig: SelectContextConfig
            }
        }
        namespace UpdateContextConfig {
            interface Call {
                contextConfig: InsertContextConfig & { id: number }
            }
            interface Response {
                contextConfig: SelectContextConfig
            }
        }
        namespace SetUserActiveContextConfig {
            interface Call {
                id: number
            }
            interface Response {
                user: SelectUser
            }
        }
        namespace DeleteContextConfig {
            interface Call {
                id: number
            }
            interface Response {
                id: number
            }
        }
        // PERSONAS
        namespace PersonasList {
            interface Call {}
            interface Response {
                personasList: Partial<SelectPersona>[]
            }
        }
        namespace Persona {
            interface Call {
                id: number
            }
            interface Response {
                persona: SelectPersona | null
            }
        }
        namespace CreatePersona {
            interface Call {
                persona: InsertPersona
                avatarFile?: Buffer
            }
            interface Response {
                persona: SelectPersona
            }
        }
        namespace UpdatePersona {
            interface Call {
                persona: InsertPersona & { id: number }
                avatarFile?: Buffer
            }
            interface Response {
                persona: SelectPersona
            }
        }
        namespace DeletePersona {
            interface Call {
                id: number
            }
            interface Response {
                id: number
            }
        }
        // CHARACTERS
        namespace CharactersList {
            interface Call {}
            interface Response {
                charactersList: Partial<SelectCharacter>[]
            }
        }
        namespace Character {
            interface Call {
                id: number
            }
            interface Response {
                character: SelectCharacter | null
            }
        }
        namespace CreateCharacter {
            interface Call {
                character: InsertCharacter
                avatarFile?: Buffer
            }
            interface Response {
                character: SelectCharacter
            }
        }
        namespace UpdateCharacter {
            interface Call {
                character: InsertCharacter & { id: number }
                avatarFile?: Buffer
            }
            interface Response {
                character: SelectCharacter
            }
        }
        namespace DeleteCharacter {
            interface Call {
                characterId: number
            }
            interface Response {
                id: number
            }
        }
        // CONNECTIONS
        namespace ConnectionsList {
            interface Call {}
            interface Response {
                connectionsList: Partial<SelectConnection>[]
            }
        }
        namespace Connection {
            interface Call {
                id: number
            }
            interface Response {
                connection: SelectConnection | null
            }
        }
        namespace CreateConnection {
            interface Call {
                connection: InsertConnection
            }
            interface Response {
                connection: SelectConnection
            }
        }
        namespace UpdateConnection {
            interface Call {
                connection: InsertConnection & { id: number }
            }
            interface Response {
                connection: SelectConnection
            }
        }
        namespace DeleteConnection {
            interface Call {
                id: number
            }
            interface Response {
                id: number
            }
        }
        namespace SetUserActiveConnection {
            interface Call {
                id: number | null
            }
            interface Response {
                ok: boolean
            }
        }
        namespace TestConnection {
            interface Call {
                connection: any
            }
            interface Response {
                ok: boolean
                error: string | null
                models: any[]
            }
        }
        namespace RefreshModels {
            interface Call {
                connection: SelectConnection
            }
            interface Response {
                models: any[]
                error: string | null
            }
        }
        // --- WEIGHTS ---
        namespace DeleteSamplingConfig {
            interface Call {
                id: number
            }
            interface Response {
                id: number
            }
        }
        namespace UpdateSamplingConfig {
            interface Call {
                samplingConfig: Partial<InsertSamplingConfig> & { id: number }
            }
            interface Response {
                samplingConfig: SelectSamplingConfig
            }
        }
        namespace SetUserActiveSamplingConfig {
            interface Call {
                id: number | null
            }
            interface Response {
                user: any
            }
        }
        // --- CHATS ---
        namespace ChatsList {
            interface Call {}
            interface Response {
                chatsList: Partial<
                    SelectChat & {
                        chatPersonas: SelectChatPersona & { persona: SelectPersona }[]
                        chatCharacters: SelectChatCharacter & { character: SelectCharacter }[]
                    }
                >[]
            }
        }
        namespace CreateChat {
            interface Call {
                chat: InsertChat
                personaIds: number[]
                characterIds: number[]
            }
            interface Response {
                chat: SelectChat & {
                    chatPersonas: SelectChatPersona & { persona: SelectPersona }[]
                    chatCharacters: SelectChatCharacter & { character: SelectCharacter }[]
                    chatMessages: SelectChatMessage[]
                }
            }
        }
        namespace Chat {
            interface Call {
                id: number
            }
            interface Response {
                chat: SelectChat & {
                    chatPersonas: SelectChatPersona & { persona: SelectPersona }[]
                    chatCharacters: SelectChatCharacter & { character: SelectCharacter }[]
                }
            }
        }
        namespace ChatMessage {
            interface Call {
                id?: number
                chatMessage?: SelectChatMessage
            }
            interface Response {
                chatMessage: SelectChatMessage
            }
        }
        // PROMPT CONFIGS
        namespace PromptConfigsList {
            interface Call {}
            interface Response {
                promptConfigsList: Partial<SelectPromptConfig>[]
            }
        }
        namespace PromptConfig {
            interface Call {
                id: number
            }
            interface Response {
                promptConfig: SelectPromptConfig
            }
        }
        namespace CreatePromptConfig {
            interface Call {
                promptConfig: InsertPromptConfig
            }
            interface Response {
                promptConfig: SelectPromptConfig
            }
        }
        namespace UpdatePromptConfig {
            interface Call {
                promptConfig: InsertPromptConfig & { id: number }
            }
            interface Response {
                promptConfig: SelectPromptConfig
            }
        }
        namespace DeletePromptConfig {
            interface Call {
                id: number
            }
            interface Response {
                id: number
            }
        }
        namespace SetUserActivePromptConfig {
            interface Call {
                id: number
            }
            interface Response {
                user: SelectUser
            }
        }
        namespace SendPersonaMessage {
            interface Call {
                chatId: number
                personaId: number
                content: string
            }
            interface Response {
                chatMessage: SelectChatMessage
            }
        }
        namespace DeleteChat {
            interface Call {
                id: number
            }
            interface Response {
                id: number
            }
        }
        namespace DeleteChatMessage {
            interface Call {
                id: number
            }
            interface Response {
                id: number
            }
        }
        namespace UpdateChatMessage {
            interface Call {
                chatMessage: SelectChatMessage
            }
            interface Response {
                chatMessage: SelectChatMessage
            }
        }
        namespace RegenerateChatMessage {
            interface Call {
                id: number
            }
            interface Response {
                chatMessage?: SelectChatMessage
                error?: string
            }
        }
        namespace PromptTokenCount {
            interface Call {
                chatId: number
                content?: string
                role?: string
                personaId?: number
            }
            interface Response {
                tokenCount: number
                tokenLimit: number | null
            }
        }
        namespace AbortChatMessage {
            interface Call {
                id: number
            }
            interface Response {
                id: number
                success: boolean
                info?: string
                error?: string
            }
        }
        namespace TriggerGenerateMessage {
            interface Call {
                chatId: number
            }
            interface Response {
                chatMessage?: SelectChatMessage
                error?: string
            }
        }
    }

    export interface CharaImportMetadata {
            data: {
                alternate_greetings?: string[]
                avatar?: string
                character_version?: string
                creator?: string
                creator_notes?: string
                description: string
                extensions?: {
                    [key:string]: {
                        alt_expressions: Record<string, unknown>
                        expressions: unknown
                        full_path: string
                        id: number
                        related_lorebooks: unknown[]
                    }
                }
                first_mes?: string
                mes_example?: string
                name: string
                personality?: string
                post_history_instructions?: string
                scenario?: string
                system_prompt?: string
                tags?: string[]
            }
            spec: string
            spec_version: string
        }
}

export {}
