import { db as sqlite } from "./index"
import { db as pg } from "../db/index"
import * as schema from "../db/schema"
import { eq, sql } from "drizzle-orm"

// This function migrates the SQLite database to PostgreSQL
// This will only be available in 0.3.0, remove in 0.4.0
export async function migrateToPg() {
	await pg
		.transaction(async (tx) => {
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
				// Convert any String[] fields to string[] (primitive) or text as needed
				const safeCharacter = {
					...character,
					// alternateGreetings should be string[] for JSON field
					alternateGreetings: character.alternateGreetings 
						? Array.isArray(character.alternateGreetings)
							? character.alternateGreetings.map((s: any) => String(s))
							: [String(character.alternateGreetings)]
						: [],
					// exampleDialogues should be string for text field
					exampleDialogues: character.exampleDialogues 
						? (typeof character.exampleDialogues === 'string' 
							? character.exampleDialogues 
							: Array.isArray(character.exampleDialogues)
								? (character.exampleDialogues as any[]).join('\n')
								: String(character.exampleDialogues))
						: null,
				}
				return await tx.insert(schema.characters).values({
					name: safeCharacter.name,
					description: safeCharacter.description ?? "",
					userId: safeCharacter.userId,
					nickname: safeCharacter.nickname ?? null,
					characterVersion: safeCharacter.characterVersion ?? null,
					personality: safeCharacter.personality ?? null,
					scenario: safeCharacter.scenario ?? null,
					firstMessage: safeCharacter.firstMessage ?? null,
					alternateGreetings: safeCharacter.alternateGreetings as string[] ?? null,
					exampleDialogues: safeCharacter.exampleDialogues ?? null,
					avatar: safeCharacter.avatar ?? null,
					creatorNotes: safeCharacter.creatorNotes ?? null,
					creatorNotesMultilingual: safeCharacter.creatorNotesMultilingual ?? null,
					groupOnlyGreetings: safeCharacter.groupOnlyGreetings ?? null,
					postHistoryInstructions: safeCharacter.postHistoryInstructions ?? null,
					isFavorite: !!safeCharacter.isFavorite,
				})
			})
			// Get personas from SQLite
			const personas = await sqlite.query.personas.findMany()
			personas.forEach(async (persona) => {
				return await tx.insert(schema.personas).values({
					name: persona.name || "",
					description: persona.description || "",
					userId: persona.userId,
					avatar: persona.avatar || null,
					isDefault: !!persona.isDefault,
					position: persona.position || null
				})
			})
			// Get chats from SQLite
			const chats = await sqlite.query.chats.findMany()
			chats.forEach(async (chat) => {
				return await tx.insert(schema.chats).values({
					id: chat.id,
					name: chat.name || "", // Add the required name property
					userId: chat.userId,
					scenario: chat.scenario,
					isGroup: !!chat.isGroup,
					groupReplyStrategy: chat.group_reply_strategy,
				})
			})
			// Get chatCharacters from SQLite
			const chatCharacters = await sqlite.query.chatCharacters.findMany()
			chatCharacters.forEach(async (chatCharacter) => {
				// Map null isActive to undefined for compatibility with schema
				const mappedChatCharacter = {
					...chatCharacter,
					isActive: chatCharacter.isActive === null ? undefined : chatCharacter.isActive,
				}
				return await tx.insert(schema.chatCharacters).values(mappedChatCharacter)
			})
			// Get chatPersonas from SQLite
			const chatPersonas = await sqlite.query.chatPersonas.findMany()
			chatPersonas.forEach(async (chatPersona) => {
			    return await tx.insert(schema.chatPersonas).values(chatPersona)
			})
			// Get chatMessages from SQLite
			const chatMessages = await sqlite.query.chatMessages.findMany()
			chatMessages.forEach(async (chatMessage) => {
				return await tx.insert(schema.chatMessages).values({
					id: chatMessage.id,
					userId: chatMessage.userId,
					content: chatMessage.content, // Add the required content property
					chatId: chatMessage.chatId,
					characterId: chatMessage.characterId ?? null,
					personaId: chatMessage.personaId ?? null,
					adapterId: chatMessage.adapterId ?? null,
					role: chatMessage.role ?? "user",
					isEdited: !!chatMessage.isEdited,
					isGenerating: !!chatMessage.isGenerating,
					isHidden: !!chatMessage.isHidden,
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

	// Sync up the serial sequence for each of the tables in PostgreSQL
	const tables = [
		"chat_messages",
		"chats",
		"characters",
		"connections",
		"context_configs",
		"history_entries",
		"lorebooks",
		"lorebook_bindings",
		"world_lore_entries",
		"character_lore_entries",
		"personas",
		"prompt_configs",
		"sampling_configs",
		"users"
	]

	const queries: Promise<any>[] = []
	tables.forEach((table) => {
		queries.push(
			pg.execute(
				`SELECT setval(
					pg_get_serial_sequence('${table}', 'id'),
					(SELECT COALESCE(MAX(id), 1) FROM ${table})
				);`
			)
		)
	})

    await Promise.all(queries)
}
