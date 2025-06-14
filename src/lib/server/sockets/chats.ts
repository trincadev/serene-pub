import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { OllamaAdapter } from "../connectionAdapters/ollama"
// import extractChunks from "png-chunks-extract"
// import { decode as decodeText } from "png-chunk-text"
// import { handleCharacterAvatarUpload } from "../utils"
// import { charactersList } from "./characters"
import { and, eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import { generateResponse } from "../utils/generateResponse"

// --- Global map for active adapters ---
export const activeAdapters = new Map<string, OllamaAdapter>()

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
		const firstCharacter = await db.query.characters.findFirst({
			where: (c, { eq }) => eq(c.id, message.characterIds[0])
		})
		const firstMessageContent = (firstCharacter?.firstMessage || "").trim()
		if (firstMessageContent) {
			const newMessage: InsertChatMessage = {
				userId,
				chatId: newChat.id,
				personaId: null,
				characterId: firstCharacter!.id,
				role: "assistant",
				content: firstMessageContent,
				createdAt: new Date().toString(),
				isGenerating: false
			}
			await db.insert(schema.chatMessages).values(newMessage)
		}
		const resChat = await db.query.chats.findFirst({
			where: (c, { eq }) => eq(c.id, newChat.id),
			with: {
				chatCharacters: { with: { character: true } },
				chatPersonas: { with: { persona: true } },
				chatMessages: true
			}
		})
		if (!resChat) return
		const res: Sockets.CreateChat.Response = { chat: resChat as any }
		await chatsList(socket, {}, emitToUser) // Refresh chat list
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
	const chat = await db.query.chats.findFirst({
		where: (c, { eq }) => eq(c.id, message.id),
		with: {
			chatCharacters: { with: { character: true } },
			chatPersonas: { with: { persona: true } },
			chatMessages: true
		}
	})
	if (chat) {
		const res: Sockets.Chat.Response = { chat: chat as any }
		emitToUser("chat", res)
	}
}

export const getChat = chat

// Helper to get chat with userId
async function getChatFromDB(chatId: number, userId: number) {
	return db.query.chats.findFirst({
		where: (c, { eq, and }) => and(eq(c.id, chatId), eq(c.userId, userId)),
		with: {
			chatPersonas: { with: { persona: true } },
			chatCharacters: { with: { character: true } },
			chatMessages: true
		}
	})
}

export async function sendPersonaMessage(
	socket: any,
	message: Sockets.SendPersonaMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const { chatId, personaId, content } = message
	const userId = 1 // Replace with actual user id
	let chat = await getChatFromDB(chatId, userId)
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
	if (chat.chatCharacters.length > 0) {
		chat = await getChatFromDB(chatId, userId)
		const assistantMessage: InsertChatMessage = {
			userId,
			chatId,
			personaId: null,
			characterId: chat!.chatCharacters[0].character.id,
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
	const chat = await db.query.chats.findFirst({
		where: (c, { eq }) => eq(c.id, chatMessage.chatId),
		with: {
			chatCharacters: { with: { character: true } },
			chatPersonas: { with: { persona: true } },
			chatMessages: true
		}
	})
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
}

export async function promptTokenCount(
	socket: any,
	message: Sockets.PromptTokenCount.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual user id
	const chat = await db.query.chats.findFirst({
		where: (c, { eq }) => eq(c.id, message.chatId),
		with: {
			chatCharacters: { with: { character: true } },
			chatPersonas: { with: { persona: true } },
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
			isGenerating: false
		})
	}
	const adapter = new OllamaAdapter({
		chat: chatForPrompt as any,
		connection: user.activeConnection,
		sampling: user.activeSamplingConfig,
		contextConfig: user.activeContextConfig,
		promptConfig: user.activePromptConfig
	})
	const [prompt, tokenCount, tokenLimit, messagesIncluded, totalMessages] =
		await adapter.compilePrompt()
	const res: Sockets.PromptTokenCount.Response = {
		tokenCount,
		tokenLimit,
		messagesIncluded,
		totalMessages
	}
	emitToUser("promptTokenCount", res)
}

export async function abortChatMessage(
	socket: any,
	message: Sockets.AbortChatMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const chatMessage = await db.query.chatMessages.findFirst({
		where: (cm, { eq }) => eq(cm.id, message.id)
	})
	if (!chatMessage) {
		const res: Sockets.AbortChatMessage.Response = {
			id: message.id,
			success: false,
			error: "Message not found."
		}
		emitToUser("abortChatMessage", res)
		return
	}
	const adapterId = chatMessage.adapterId
	if (!adapterId) {
		await db
			.update(schema.chatMessages)
			.set({ isGenerating: false, adapterId: null })
			.where(eq(schema.chatMessages.id, message.id))
		return
	}
	const adapter = activeAdapters.get(adapterId)
	if (!adapter) {
		await db
			.update(schema.chatMessages)
			.set({ isGenerating: false, adapterId: null })
			.where(eq(schema.chatMessages.id, message.id))
		const res: Sockets.AbortChatMessage.Response = {
			id: message.id,
			success: true,
			info: "No active adapter, forcibly cleared."
		}
		emitToUser("abortChatMessage", res)
		return
	}
	try {
		adapter.abort()
		const res: Sockets.AbortChatMessage.Response = {
			id: message.id,
			success: true
		}
		emitToUser("abortChatMessage", res)
	} catch (e: any) {
		const res: Sockets.AbortChatMessage.Response = {
			id: message.id,
			success: false,
			error: e?.message || String(e)
		}
		emitToUser("abortChatMessage", res)
	}
}

export async function triggerGenerateMessage(
	socket: any,
	message: Sockets.TriggerGenerateMessage.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual user id
	let chat = await getChatFromDB(message.chatId, userId)
	if (!chat) {
		const res: Sockets.TriggerGenerateMessage.Response = {
			error: "Chat not found."
		}
		emitToUser("triggerGenerateMessage", res)
		return
	}
	if (chat.chatCharacters.length > 0) {
		chat = await getChatFromDB(message.chatId, userId)
		const assistantMessage: InsertChatMessage = {
			userId,
			chatId: message.chatId,
			personaId: null,
			characterId: chat!.chatCharacters[0].character.id,
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

async function updateChat(
	socket: any,
	message: Sockets.UpdateChat.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // Replace with actual user id
		const chatId = message.chat.id

		//  Select the chat to compare data
		const existingChat = await db.query.chats.findFirst({
			where: (c, { eq }) => eq(c.id, chatId),
			with: {
				chatCharacters: true,
				chatPersonas: true
			}
		})

		// Update chat main fields
		await db
			.update(schema.chats)
			.set({ ...message.chat, id: undefined })
			.where(
				and(
					eq(schema.chats.id, chatId),
					eq(schema.chats.userId, userId)
				)
			)

		// Remove any characters that are not in the new list
		const deletedCharacterIds =
			existingChat?.chatCharacters
				.filter(
					(c) => !message.characterIds.includes(c.characterId || 0)
				)
				.map((c) => c.characterId) || []

		if (deletedCharacterIds.length > 0) {
			await db
				.delete(schema.chatCharacters)
				.where(
					and(
						eq(schema.chatCharacters.chatId, chatId),
						eq(schema.chatCharacters.userId, userId),
						eq(
							schema.chatCharacters.characterId,
							deletedCharacterIds
						)
					)
				)
		}

		// Remove any personas that are not in the new list
		const deletedPersonaIds =
			existingChat?.chatPersonas
				.filter((p) => !message.personaIds.includes(p.personaId || 0))
				.map((p) => p.personaId) || []
		if (deletedPersonaIds.length > 0) {
			await db
				.delete(schema.chatPersonas)
				.where(
					and(
						eq(schema.chatPersonas.chatId, chatId),
						eq(schema.chatPersonas.userId, userId),
						eq(schema.chatPersonas.personaId, deletedPersonaIds)
					)
				)
		}

		// Add/Update new characters
		for (const characterId of message.characterIds) {
			const existingCharacter = existingChat?.chatCharacters.find(
				(c) => c.characterId === characterId
			)
			if (!existingCharacter) {
				const position = message.characterPositions[characterId] || 0
				await db.insert(schema.chatCharacters).values({
					chatId,
					characterId,
					position
				})
			} else {
				// Update position if it has changed
				const position = message.characterPositions[characterId] || 0
				if (existingCharacter.position !== position) {
					await db
						.update(schema.chatCharacters)
						.set({ position })
						.where(
							and(
								eq(schema.chatCharacters.chatId, chatId),
								eq(
									schema.chatCharacters.characterId,
									characterId
								)
							)
						)
				}
			}
		}

		// Add/Update new personas
		for (const personaId of message.personaIds) {
			const existingPersona = existingChat?.chatPersonas.find(
				(p) => p.personaId === personaId
			)
			if (!existingPersona) {
				await db.insert(schema.chatPersonas).values({
					chatId,
					personaId
				})
			} else {
				// If persona already exists, we can skip as we don't need to update anything
			}
		}

		// Fetch the updated chat with all relations
		const resChat = await db.query.chats.findFirst({
			where: (c, { eq }) => eq(c.id, chatId),
			with: {
				chatCharacters: { with: { character: true } },
				chatPersonas: { with: { persona: true } },
				chatMessages: true
			}
		})

		if (!resChat) return
		const res: Sockets.UpdateChat.Response = { chat: resChat as any }
		await chatsList(socket, {}, emitToUser)
		emitToUser("updateChat", res)
	} catch (error) {
		console.error("Error updating chat:", error)
		emitToUser("error", { error: "Failed to update chat." })
	}
}
