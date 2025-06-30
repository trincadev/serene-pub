import { db as sqlite } from "./index"
import { db as pg } from "../db/index"
import * as schema from "../db/schema"
import { eq } from "drizzle-orm"

// This function migrates the SQLite database to PostgreSQL
// This will only be available in 0.3.0, remove in 0.4.0
export async function migrateToPg() {
	await pg.transaction(async (tx) => {
		// Get non default sampling configs from SQLite
		const samplingConfigs = await sqlite.query.samplingConfigs.findMany({
			where: (s, { eq }) => eq(s.isImmutable, false)
		})

		samplingConfigs.forEach(async (config) => {
			return await tx.insert(schema.samplingConfigs).values({
				id: config.id,
				name: config.name,
				isImmutable: config.isImmutable,
				temperatureEnabled: config.temperatureEnabled,
				contextTokensEnabled: config.contextTokensEnabled,
				responseTokensEnabled: config.responseTokensEnabled
			})
		})

		// Get non default context configs from SQLite
		const contextConfigs = await sqlite.query.contextConfigs.findMany({
			where: (c, { eq }) => eq(c.isImmutable, false)
		})
		contextConfigs.forEach(async (config) => {
			return await tx.insert(schema.contextConfigs).values({
				id: config.id,
				name: config.name,
				isImmutable: false,
				template: config.template
			})
		})

		// Get non default prompt configs from SQLite
		const promptConfigs = await sqlite.query.promptConfigs.findMany({
			where: (p, { eq }) => eq(p.isImmutable, false)
		})
		promptConfigs.forEach(async (config) => {
			return await tx.insert(schema.promptConfigs).values({
				id: config.id,
				name: config.name,
				isImmutable: false,
				systemPrompt: config.systemPrompt
			})
		})

        // Get connections from SQLite
		const connections = await sqlite.query.connections.findMany()
		connections.forEach(async (connection) => {
			return await tx.insert(schema.connections).values({
                id: connection.id,
				name: connection.name,
                baseUrl: connection.baseUrl,
				type: connection.type,
                tokenCounter: connection.tokenCounter,
                model: connection.model,
                promptFormat: connection.promptFormat,
				extraJson: connection.extraJson || {},
			})
		})

        // Get characters from SQLite
		const characters = await sqlite.query.characters.findMany()
		characters.forEach(async (character) => {
			// Map null fields to undefined for compatibility with schema
			const mappedCharacter = {
				...character,
				updatedAt: undefined,
                createdAt: undefined,
                metadata: character.metadata || {},
                lorebookId: null,
				// Add other nullable fields as needed
			}
			return await tx.insert(schema.characters).values(mappedCharacter)
		})

        // Get personas from SQLite
        const personas = await sqlite.query.personas.findMany()
        personas.forEach(async (persona) => {
            return await tx.insert(schema.personas).values({
                ...persona,
                updatedAt: undefined,
                createdAt: undefined,
            })
        })

        // Get lorebooks from SQLite
        const lorebooks = await sqlite.query.lorebooks.findMany()
        lorebooks.forEach(async (lorebook) => {
            return await tx.insert(schema.lorebooks).values({
                ...lorebook,
                updatedAt: undefined,
                createdAt: undefined,
            })
        })

        // Get lorebook bindings from SQLite
        const lorebookBindings = await sqlite.query.lorebookBindings.findMany()
        lorebookBindings.forEach(async (binding) => {
            return await tx.insert(schema.lorebookBindings).values({
                ...binding,
            })
        })

        // Get worldLoreEntries from SQLite
        const worldLoreEntries = await sqlite.query.worldLoreEntries.findMany()
        worldLoreEntries.forEach(async (entry) => {
            return await tx.insert(schema.worldLoreEntries).values({
                ...entry,
                updatedAt: undefined,
                createdAt: undefined,
            })
        })

        // Get characterLoreEntries from SQLite
        const characterLoreEntries = await sqlite.query.characterLoreEntries.findMany()
        characterLoreEntries.forEach(async (entry) => {
            return await tx.insert(schema.characterLoreEntries).values({
                ...entry,
                updatedAt: undefined,
                createdAt: undefined,
            })
        })

        // Get historyEntries from SQLite
        const historyEntries = await sqlite.query.historyEntries.findMany()
        historyEntries.forEach(async (entry) => {
            return await tx.insert(schema.historyEntries).values({
                ...entry,
                date: undefined,
                updatedAt: undefined,
                createdAt: undefined,
                day: entry.date?.day || undefined,
                month: entry.date?.month || undefined,
                year: entry.date?.year || undefined,
            })
        })

        // Get chats from SQLite
        const chats = await sqlite.query.chats.findMany()
        chats.forEach(async (chat) => {
            return await tx.insert(schema.chats).values({
                ...chat,
                updatedAt: undefined,
                createdAt: undefined,
            })
        })

        // Get chatCharacters from SQLite
        const chatCharacters = await sqlite.query.chatCharacters.findMany()
        chatCharacters.forEach(async (chatCharacter) => {
            return await tx.insert(schema.chatCharacters).values({
                ...chatCharacter,
                updatedAt: undefined,
                createdAt: undefined,
                
            })
        })

        // Get chatPersonas from SQLite
        const chatPersonas = await sqlite.query.chatPersonas.findMany()
        chatPersonas.forEach(async (chatPersona) => {
            return await tx.insert(schema.chatPersonas).values({
                ...chatPersona,
                updatedAt: undefined,
                createdAt: undefined,
            })
        })

        // Get chatMessages from SQLite
        const chatMessages = await sqlite.query.chatMessages.findMany()
        chatMessages.forEach(async (chatMessage) => {
            return await tx.insert(schema.chatMessages).values({
                ...chatMessage,
                updatedAt: undefined,
                createdAt: undefined,
                metadata: chatMessage.metadata || {},
            })
        })
    
        // Get users from SQLite
        const users = await sqlite.query.users.findMany()
        users.forEach(async (user) => {
            return await tx.update(schema.users)
                .set({
                    activeConnectionId: user.activeConnectionId,
                    activeSamplingConfigId: user.activeSamplingConfigId,
                    activeContextConfigId: user.activeContextConfigId,
                    activePromptConfigId: user.activePromptConfigId,
                })
                .where(eq(schema.users.id, user.id))
        })
    })
    .catch((error) => {
        console.error("Migration to PostgreSQL failed:", error)
        throw error
    })
    .then(() => {
        console.log("Migration to PostgreSQL completed successfully.")
    })
}
