import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { generateResponse } from "../utils/generateResponse"
import { getNextCharacterTurn } from "$lib/server/utils/getNextCharacterTurn"
import type { BaseConnectionAdapter } from "../connectionAdapters/BaseConnectionAdapter"
import { getConnectionAdapter } from "../utils/getConnectionAdapter"
import { historyEntries } from "../db/schema"
import { TokenCounters } from "$lib/server/utils/TokenCounterManager"

// --- Global map for active adapters ---
export const activeAdapters = new Map<string, BaseConnectionAdapter>()

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
				},
				orderBy: (cc, { asc }) => asc(cc.position)
			},
			chatPersonas: {
				with: {
					persona: true
				}
			}
		},
		where: (c, { eq }) => eq(c.userId, userId)
	})

	// Drizzle/Sqlite may not properly handle orderby,
	// Lets sort it manually
	// Order the chatCharacters by position
	chatsList.forEach((chat) => {
		chat.chatCharacters.sort(
			(a, b) => (a.position ?? 0) - (b.position ?? 0)
		)
		// Sort chatPersonas by position if it exists
		if (chat.chatPersonas) {
			chat.chatPersonas.sort(
				(a, b) => (a.position ?? 0) - (b.position ?? 0)
			)
		}
	})

	const res: Sockets.ChatsList.Response = { chatsList: chatsList as any }
	emitToUser("chatsList", res)
}

export async function createChat(
	socket: any,
	message: Sockets.CreateChat.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // Replace with actual user id
		const chatData: InsertChat = {
			...message.chat,
			userId,
			isGroup: message.characterIds.length > 1
		}
		const [newChat] = await db
			.insert(schema.chats)
			.values(chatData)
			.returning()
		for (const personaId of message.personaIds) {
			await db.insert(schema.chatPersonas).values({
				chatId: newChat.id,
				personaId
			})
		}
		for (const characterId of message.characterIds) {
			const position = message.characterPositions[characterId] || 0
			await db.insert(schema.chatCharacters).values({
				chatId: newChat.id,
				characterId,
				position
			})
		}
		// Insert a first message for every character assigned to the chat, ordered by position
		const chatCharacters = await db.query.chatCharacters.findMany({
			where: (cc, { eq }) => eq(cc.chatId, newChat.id),
			with: { character: true },
			orderBy: (cc, { asc }) => asc(cc.position ?? 0)
		})
		for (const cc of chatCharacters) {
			if (!cc.character) continue
			const firstMessageContent = (cc.character.firstMessage || "").trim()
			if (firstMessageContent) {
				const newMessage: InsertChatMessage = {
					userId,
					chatId: newChat.id,
					personaId: null,
					characterId: cc.character.id,
					role: "assistant",
					content: firstMessageContent,
					createdAt: new Date().toString(),
					isGenerating: false
				}
				await db.insert(schema.chatMessages).values(newMessage)
			}
		}
		const resChat = await getChatFromDB(newChat.id, userId)
		if (!resChat) return
		await chatsList(socket, {}, emitToUser) // Refresh chat list
		const res: Sockets.CreateChat.Response = { chat: resChat as any }
		emitToUser("createChat", res)
	} catch (error) {
		console.error("Error creating chat:", error)
		emitToUser("error", { error: "Failed to create chat." })
	}
}

export async function chat(
	socket: any,
	message: Sockets.Chat.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual user id
	const chat = await getChatFromDB(message.id, userId) // Replace with actual user id
	if (chat) {
		const res: Sockets.Chat.Response = { chat: chat as any }
		emitToUser("chat", res)
	}
}

export const getChat = chat

// Helper to get chat with userId
async function getChatFromDB(chatId: number, userId: number) {
	const res = db.query.chats.findFirst({
		where: (c, { eq, and }) => and(eq(c.id, chatId), eq(c.userId, userId)),
		with: {
			chatPersonas: {
				with: { persona: true },
				orderBy: (cp, { asc }) => asc(cp.position)
			},
			chatCharacters: { with: { character: true } },
			chatMessages: true
		}
	})

	// Drizzle/Sqlite may not properly handle orderby,
	// Lets sort it manually
	const chat = await res
	if (chat) {
		// Order the chatCharacters by position
		chat.chatCharacters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		// Sort chatPersonas by position if it exists
		if (chat.chatPersonas) {
			chat.chatPersonas.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		}
	}
	return chat
}

// Returns complete chat data for prompt compilation
async function getPromptChatFromDb(chatId: number, userId: number) {
	const chat = await db.query.chats.findFirst({
		where: (c, { eq, and }) =>
			and(eq(c.id, chatId), eq(c.userId, userId)),
		with: {
			chatMessages: true,
			chatCharacters: {
				with: {
					character: {
						with: { lorebook: true }
					}
				},
				orderBy: (cc, { asc }) => asc(cc.position ?? 0)
			},
			chatPersonas: {
				with: {
					persona: {
						with: { lorebook: true }
					}
				},
				orderBy: (cp, { asc }) => asc(cp.position ?? 0)
			},
			lorebook: {
				with: {
					lorebookBindings: {
						with: { character: true, persona: true }
					},
					worldLoreEntries: true,
					characterLoreEntries: {
						with: {
							lorebookBinding: {
								with: {
									character: true,
									persona: true
								}
							}
						}
					},
					historyEntries: true
				}
			}
		}
	})

	if (chat) {
		// Order the chatCharacters by position
		chat.chatCharacters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		// Sort chatPersonas by position if it exists
		if (chat.chatPersonas) {
			chat.chatPersonas.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		}
	}
	return chat
}

export async function sendPersonaMessage(
	socket: any,
	message: Sockets.SendPersonaMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const { chatId, personaId, content } = message
	const userId = 1 // Replace with actual user id
	let chat = await getPromptChatFromDb(chatId, userId)
	if (!chat) {
		// Return a valid but empty chatMessage object with required fields set to null or default
		const res: Sockets.SendPersonaMessage.Response = {
			chatMessage: null as any
		}
		emitToUser("sendPersonaMessage", res)
		return
	}
	const newMessage: InsertChatMessage = {
		userId,
		chatId,
		personaId,
		role: "user",
		content,
		createdAt: new Date().toString()
	}
	const [inserted] = await db
		.insert(schema.chatMessages)
		.values(newMessage)
		.returning()
	// Instead of refreshing the chat, emit the new chatMessage
	await chatMessage(socket, { chatMessage: inserted as any }, emitToUser)
	const res: Sockets.SendPersonaMessage.Response = {
		chatMessage: inserted as any
	}
	emitToUser("sendPersonaMessage", res)

	// --- Round-robin character response loop ---
	let maxTurns = 20 // Prevent infinite loops in case of data issues
	let currentTurn = 1

	while (chat && chat.chatCharacters.length > 0 && currentTurn <= maxTurns) {
		currentTurn++
		// Always fetch the latest chat state at the start of each loop
		chat = await getPromptChatFromDb(chatId, userId)
		if (!chat) break
		const nextCharacterId = getNextCharacterTurn(
			{
				chatMessages: chat!.chatMessages,
				chatCharacters: chat!.chatCharacters.filter(
					(cc) => cc.character !== null
				) as any,
				chatPersonas: chat!.chatPersonas.filter(
					(cp) => cp.persona !== null
				) as any
			},
			{ triggered: false }
		)
		if (!nextCharacterId) {
			break
		}
		const nextCharacter = chat.chatCharacters.find(
			(cc) => cc.character && cc.character.id === nextCharacterId
		)

		if (!nextCharacter || !nextCharacter.character) break
		const assistantMessage: InsertChatMessage = {
			userId,
			chatId,
			personaId: null,
			characterId: nextCharacter.character.id,
			content: "",
			role: "assistant",
			createdAt: new Date().toString(),
			isGenerating: true
		}
		const [generatingMessage] = await db
			.insert(schema.chatMessages)
			.values(assistantMessage)
			.returning()
		await generateResponse({
			socket,
			emitToUser,
			chatId,
			userId,
			generatingMessage: generatingMessage as any
		})
	}
}

export async function deleteChatMessage(
	socket: any,
	message: Sockets.DeleteChatMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const chatMsg = await db.query.chatMessages.findFirst({
		where: (cm, { eq }) => eq(cm.id, message.id),
		columns: {
			chatId: true
		}
	})
	if (!chatMsg) {
		const res = { error: "Message not found." }
		emitToUser("error", res)
		return
	}
	const userId = 1 // Replace with actual user id
	await db
		.delete(schema.chatMessages)
		.where(
			and(
				eq(schema.chatMessages.id, message.id),
				eq(schema.chatMessages.userId, userId)
			)
		)
	await getChat(socket, { id: chatMsg.chatId }, emitToUser)
	const res: Sockets.DeleteChatMessage.Response = { id: message.id }
	emitToUser("deleteChatMessage", res)
}

export async function updateChatMessage(
	socket: any,
	message: Sockets.UpdateChatMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual user id
	const [updated] = await db
		.update(schema.chatMessages)
		.set({ ...message.chatMessage, id: undefined })
		.where(
			and(
				eq(schema.chatMessages.id, message.chatMessage.id),
				eq(schema.chatMessages.userId, userId)
			)
		)
		.returning()
	// Instead of refreshing the chat, emit the updated chatMessage
	await chatMessage(socket, { chatMessage: updated as any }, emitToUser)
	const res: Sockets.UpdateChatMessage.Response = {
		chatMessage: updated as any
	}
	emitToUser("updateChatMessage", res)
}

export async function deleteChat(
	socket: any,
	message: Sockets.DeleteChat.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // Replace with actual user id
		await db
			.delete(schema.chats)
			.where(
				and(
					eq(schema.chats.id, message.id),
					eq(schema.chats.userId, userId)
				)
			)
		const res: Sockets.DeleteChat.Response = { id: message.id }
		emitToUser("deleteChat", res)
	} catch (error) {
		// Optionally emit a separate error event
	}
}

export async function regenerateChatMessage(
	socket: any,
	message: Sockets.RegenerateChatMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual user id
	const chatMessage = await db.query.chatMessages.findFirst({
		where: (cm, { eq }) => eq(cm.id, message.id)
	})
	if (!chatMessage) {
		const res: Sockets.RegenerateChatMessage.Response = {
			error: "Message not found."
		}
		emitToUser("regenerateChatMessage", res)
		return
	}
	const chat = await getPromptChatFromDb(chatMessage.chatId, userId)
	if (!chat) {
		const res: Sockets.RegenerateChatMessage.Response = {
			error: "Chat not found."
		}
		emitToUser("regenerateChatMessage", res)
		return
	}

	await db
		.update(schema.chatMessages)
		.set({ isGenerating: true, content: "" })
		.where(eq(schema.chatMessages.id, chatMessage.id))

	try {
		await generateResponse({
			socket,
			emitToUser,
			chatId: chat.id,
			userId,
			generatingMessage: {
				...chatMessage,
				isGenerating: true,
				content: ""
			} as any
		})
	} catch (error) {
		let [canceledMsg] = await db
			.update(schema.chatMessages)
			.set({
				isGenerating: false
			})
			.where(eq(schema.chatMessages.id, message.id))
			.returning()
		emitToUser("chatMessage", { chatMessage: canceledMsg })
		emitToUser("error", {
			error: "Failed to regenerate message."
		})
	}
}

export async function promptTokenCount(
	socket: any,
	message: Sockets.PromptTokenCount.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual user id
	const chat = await getPromptChatFromDb(message.chatId, userId)
	if (!chat) {
		emitToUser("error", { error: "Chat not found." })
		return
	}
	const user = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.id, userId),
		with: {
			activeConnection: true,
			activeSamplingConfig: true,
			activeContextConfig: true,
			activePromptConfig: true
		}
	})
	if (
		!chat ||
		!user ||
		!user.activeConnection ||
		!user.activeSamplingConfig ||
		!user.activeContextConfig ||
		!user.activePromptConfig
	) {
		emitToUser("error", { error: "Chat or user configuration not found." })
		return
	}
	let chatForPrompt = { ...chat, chatMessages: [...chat.chatMessages] }
	if (message.content && message.role) {
		chatForPrompt.chatMessages.push({
			id: -1,
			chatId: chat.id,
			userId: userId,
			personaId: message.personaId ?? null,
			characterId: null,
			role: message.role,
			content: message.content,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			isEdited: 0,
			metadata: null,
			isGenerating: false,
			adapterId: null,
			isHidden: null
		})
	}
	const currentCharacterId = getNextCharacterTurn(
		{
			chatMessages: chat.chatMessages,
			chatCharacters: chat.chatCharacters.filter(
				(cc: any) => cc && cc.character != null
			) as any,
			chatPersonas: chat.chatPersonas.filter(
				(cp: any) => cp && cp.persona != null
			) as any
		},
		{ triggered: true }
	)

	if (!currentCharacterId) {
		emitToUser("error", { error: "No character available for prompt." })
		return
	}

	const { Adapter } = getConnectionAdapter(user.activeConnection.type)

	// Provide required params for Adapter (use defaults if not available)
	const tokenCounter = new TokenCounters("estimate")
	const tokenLimit = 4096
	const contextThresholdPercent = 0.8

	const adapter = new Adapter({
		chat: chatForPrompt,
		connection: user.activeConnection,
		sampling: user.activeSamplingConfig,
		contextConfig: user.activeContextConfig,
		promptConfig: user.activePromptConfig,
		currentCharacterId,
		tokenCounter,
		tokenLimit,
		contextThresholdPercent
	})
	const promptResult: Sockets.PromptTokenCount.Response =
		await adapter.promptBuilder.compilePrompt()
	emitToUser(
		"promptTokenCount",
		promptResult as Sockets.PromptTokenCount.Response
	)
}

export async function abortChatMessage(
	socket: any,
	message: Sockets.AbortChatMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	let chatMsg = await db.query.chatMessages.findFirst({
		where: (cm, { eq }) => eq(cm.id, message.id)
	})

	if (!chatMsg) {
		return
	}

	const adapterId = chatMsg.adapterId
	if (!adapterId) {
		// Already cleared above
		return
	}

	;[chatMsg] = await db
		.update(schema.chatMessages)
		.set({ isGenerating: false, adapterId: null })
		.where(eq(schema.chatMessages.id, message.id))
		.returning()

	const req: Sockets.ChatMessage.Call = {
		chatMessage: chatMsg
	}
	// Send updated chatMessage to the user
	await chatMessage(socket, req, emitToUser)

	const adapter = activeAdapters.get(adapterId)
	if (!adapter) {
		const res: Sockets.AbortChatMessage.Response = {
			id: message.id,
			success: true,
			info: "No active adapter, forcibly cleared."
		}
		emitToUser("chatMessage", res)
		emitToUser("abortChatMessage", res)
		return
	}
	try {
		adapter.abort()
		const res: Sockets.AbortChatMessage.Response = {
			id: message.id,
			success: true
		}
		emitToUser("chatMessage", res)
		emitToUser("abortChatMessage", res)
	} catch (e: any) {
		const res: Sockets.AbortChatMessage.Response = {
			id: message.id,
			success: false,
			error: e?.message || String(e)
		}
		emitToUser("chatMessage", res)
		emitToUser("abortChatMessage", res)
	}
}

export async function triggerGenerateMessage(
	socket: any,
	message: Sockets.TriggerGenerateMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual user id

	const msgLimit = 10
	let currentMsg = 1
	let triggered = true

	while (currentMsg <= msgLimit) {
		let chat = await getPromptChatFromDb(message.chatId, userId)
		if (!chat) {
			const res: Sockets.TriggerGenerateMessage.Response = {
				error: "Chat not found."
			}
			emitToUser("triggerGenerateMessage", res)
			return
		}

		// Find the next character who should reply (using triggered: true)
		const nextCharacterId =
			message.characterId ||
			getNextCharacterTurn(
				{
					chatMessages: chat.chatMessages,
					chatCharacters: chat.chatCharacters.filter(
						(cc) => cc.character !== null
					) as any,
					chatPersonas: chat.chatPersonas.filter(
						(cp) => cp.persona !== null
					) as any
				},
				{ triggered }
			)

		if (!nextCharacterId) {
			break
		}
		if (chat && chat.chatCharacters.length > 0 && nextCharacterId) {
			const nextCharacter = chat.chatCharacters.find(
				(cc) => cc.character && cc.character.id === nextCharacterId
			)
			if (!nextCharacter || !nextCharacter.character) return
			const assistantMessage: InsertChatMessage = {
				userId,
				chatId: message.chatId,
				personaId: null,
				characterId: nextCharacter.character.id,
				content: "",
				role: "assistant",
				createdAt: new Date().toString(),
				isGenerating: true
			}
			const [generatingMessage] = await db
				.insert(schema.chatMessages)
				.values(assistantMessage)
				.returning()
			await chatMessage(
				socket,
				{ chatMessage: generatingMessage },
				emitToUser
			)
			await generateResponse({
				socket,
				emitToUser,
				chatId: message.chatId,
				userId,
				generatingMessage: generatingMessage as any
			})
		}
		if (message.once) {
			break
		}
		currentMsg++
		triggered = false // After the first message, we don't trigger again
	}
}

export async function chatMessage(
	socket: any,
	message: Sockets.ChatMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	if (message.chatMessage) {
		// If chatMessage object is provided, emit it directly
		const res: Sockets.ChatMessage.Response = {
			chatMessage: message.chatMessage
		}
		emitToUser("chatMessage", res)
		return
	}
	if (message.id) {
		// If id is provided, fetch from database
		const chatMessage = await db.query.chatMessages.findFirst({
			where: (m, { eq }) => eq(m.id, message.id!)
		})
		if (!chatMessage) {
			emitToUser("error", { error: "Chat message not found." })
			return
		}
		const res: Sockets.ChatMessage.Response = { chatMessage }
		emitToUser("chatMessage", res)
		return
	}
	emitToUser("error", { error: "Must provide either id or chatMessage." })
}

export async function updateChat(
	socket: any,
	message: Sockets.UpdateChat.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		console.log("Updating chat with message:", message)
		const userId = 1 // Replace with actual user id

		//  Select the chat to compare data
		const existingChat = await getPromptChatFromDb(message.chat.id, userId)

		// Update chat main fields
		await db
			.update(schema.chats)
			.set({
				...message.chat,
				isGroup: message.characterIds.length > 1,
				userId: undefined,
				id: undefined
			})
			.where(
				and(
					eq(schema.chats.id, message.chat.id),
					eq(schema.chats.userId, userId)
				)
			)

		// Remove any characters that are not in the new list
		const deletedCharacterIds =
			existingChat?.chatCharacters
				.filter(
					(c) => !message.characterIds.includes(c.characterId || 0)
				)
				.map((c) => c.characterId)
				.filter(
					(id): id is number => id !== null && id !== undefined
				) || []

		// Remove any personas that are not in the new list
		const deletedPersonaIds =
			existingChat?.chatPersonas
				.filter((p) => !message.personaIds.includes(p.personaId || 0))
				.map((p) => p.personaId)
				.filter(
					(id): id is number => id !== null && id !== undefined
				) || []

		// Find new character IDs that are not in the existing chat
		const newCharacterIds = message.characterIds.filter(
			(id) =>
				!existingChat?.chatCharacters.some((c) => c.characterId === id)
		)

		// Find new persona IDs that are not in the existing chat
		const newPersonaIds = message.personaIds.filter(
			(id) => !existingChat?.chatPersonas.some((p) => p.personaId === id)
		)

		console.log("chatId", message.chat.id)

		// Delete characters that are no longer in the chat
		if (deletedCharacterIds.length > 0) {
			await db
				.delete(schema.chatCharacters)
				.where(
					and(
						eq(schema.chatCharacters.chatId, message.chat.id),
						inArray(
							schema.chatCharacters.characterId,
							deletedCharacterIds
						)
					)
				)
		}

		// Delete personas that are no longer in the chat
		if (deletedPersonaIds.length > 0) {
			await db
				.delete(schema.chatPersonas)
				.where(
					and(
						eq(schema.chatPersonas.chatId, message.chat.id),
						inArray(
							schema.chatPersonas.personaId,
							deletedPersonaIds
						)
					)
				)
		}

		// Insert new characters that are not already in the chat
		if (newCharacterIds.length > 0) {
			const newChatCharacters = newCharacterIds.map((characterId) => ({
				chatId: message.chat.id,
				characterId,
				position: message.characterPositions[characterId] ?? 0
			}))
			await db.insert(schema.chatCharacters).values(newChatCharacters)
		}

		// Insert new personas that are not already in the chat
		if (newPersonaIds.length > 0) {
			const newChatPersonas = newPersonaIds.map((personaId) => ({
				chatId: message.chat.id,
				personaId
			}))
			await db.insert(schema.chatPersonas).values(newChatPersonas)
		}

		// Update positions for all characters in the chat (not just new ones)
		if (message.characterPositions) {
			for (const characterId of message.characterIds) {
				const position = message.characterPositions[characterId]
				console.log(
					"Updating position for characterId",
					characterId,
					"to",
					position
				)
				if (typeof position === "number") {
					await db
						.update(schema.chatCharacters)
						.set({ position })
						.where(
							and(
								eq(
									schema.chatCharacters.chatId,
									message.chat.id
								),
								eq(
									schema.chatCharacters.characterId,
									characterId
								)
							)
						)
				}
			}
		}

		// After updating character positions in the DB, also update the position field for existing characters
		if (message.characterPositions) {
			for (const [characterId, position] of Object.entries(
				message.characterPositions
			)) {
				await db
					.update(schema.chatCharacters)
					.set({ position })
					.where(
						and(
							eq(schema.chatCharacters.chatId, message.chat.id),
							eq(
								schema.chatCharacters.characterId,
								Number(characterId)
							)
						)
					)
			}
		}

		// Insert a first message for every new character added to the chat, ordered by position
		if (newCharacterIds.length > 0) {
			const newChatCharacters = await db.query.chatCharacters.findMany({
				where: (cc, { eq }) => eq(cc.chatId, message.chat.id),
				with: { character: true },
				orderBy: (cc, { asc }) => asc(cc.position ?? 0)
			})
			for (const cc of newChatCharacters) {
				if (!cc.character) continue
				if (!newCharacterIds.includes(cc.character.id)) continue
				const firstMessageContent = (
					cc.character.firstMessage || ""
				).trim()
				if (firstMessageContent) {
					const newMessage: InsertChatMessage = {
						userId,
						chatId: message.chat.id,
						personaId: null,
						characterId: cc.character.id,
						role: "assistant",
						content: firstMessageContent,
						createdAt: new Date().toString(),
						isGenerating: false
					}
					await db.insert(schema.chatMessages).values(newMessage)
				}
			}
		}

		// Fetch the updated chat with all relations
		const resChat = await getChatFromDB(message.chat.id, userId)

		if (!resChat) return
		const res: Sockets.UpdateChat.Response = { chat: resChat as any }
		await chatsList(socket, {}, emitToUser)
		emitToUser("updateChat", res)
	} catch (error) {
		console.error("Error updating chat:", error)
		emitToUser("error", { error: "Failed to update chat." })
	}
}
