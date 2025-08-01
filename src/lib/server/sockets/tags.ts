import { db } from "$lib/server/db"
import { eq, and } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"

export async function tagsList(
	_socket: any,
	_message: any,
	emitToUser: (event: string, data: any) => void
) {
	const tagsList = await db.query.tags.findMany({
		orderBy: (t, { asc }) => asc(t.name)
	})
	const res = { tagsList }
	emitToUser("tagsList", res)
}

export async function createTag(
	socket: any,
	message: { tag: InsertTag },
	emitToUser: (event: string, data: any) => void
) {
	try {
		const [tag] = await db
			.insert(schema.tags)
			.values(message.tag)
			.returning()

		const res = { tag }
		emitToUser("createTag", res)

		// Also emit updated tags list
		tagsList(socket, {}, emitToUser)
	} catch (error) {
		console.error("Error creating tag:", error)
		socket.emit("createTagError", {
			error: "Failed to create tag. Tag name might already exist."
		})
	}
}

export async function updateTag(
	socket: any,
	message: { tag: SelectTag },
	emitToUser: (event: string, data: any) => void
) {
	try {
		const [tag] = await db
			.update(schema.tags)
			.set({
				name: message.tag.name,
				description: message.tag.description,
				colorPreset: message.tag.colorPreset
			})
			.where(eq(schema.tags.id, message.tag.id))
			.returning()

		const res = { tag }
		emitToUser("updateTag", res)

		// Also emit updated tags list
		tagsList(socket, {}, emitToUser)
	} catch (error) {
		console.error("Error updating tag:", error)
		socket.emit("updateTagError", {
			error: "Failed to update tag. Tag name might already exist."
		})
	}
}

export async function deleteTag(
	socket: any,
	message: { id: number },
	emitToUser: (event: string, data: any) => void
) {
	try {
		// First delete all character tag associations
		await db
			.delete(schema.characterTags)
			.where(eq(schema.characterTags.tagId, message.id))

		// Then delete the tag
		await db.delete(schema.tags).where(eq(schema.tags.id, message.id))

		const res = { id: message.id }
		emitToUser("deleteTag", res)

		// Also emit updated tags list
		tagsList(socket, {}, emitToUser)
	} catch (error) {
		console.error("Error deleting tag:", error)
		socket.emit("deleteTagError", {
			error: "Failed to delete tag."
		})
	}
}

export async function tagRelatedData(
	socket: any,
	message: { tagId: number },
	emitToUser: (event: string, data: any) => void
) {
	try {
		// Get characters with this tag
		const characters = await db.query.characterTags.findMany({
			where: eq(schema.characterTags.tagId, message.tagId),
			with: {
				character: {
					columns: {
						id: true,
						name: true,
						nickname: true,
						description: true,
						avatar: true
					}
				}
			}
		})

		// Get personas with this tag
		const personas = await db.query.personaTags.findMany({
			where: eq(schema.personaTags.tagId, message.tagId),
			with: {
				persona: {
					columns: {
						id: true,
						name: true,
						description: true,
						avatar: true,
						isDefault: true
					}
				}
			}
		})

		// Get lorebooks with this tag
		const lorebooks = await db.query.lorebookTags.findMany({
			where: eq(schema.lorebookTags.tagId, message.tagId),
			with: {
				lorebook: {
					columns: {
						id: true,
						name: true,
						description: true,
						createdAt: true
					}
				}
			}
		})

		// Get chats with this tag directly
		const directChats = await db.query.chatTags.findMany({
			where: eq(schema.chatTags.tagId, message.tagId),
			with: {
				chat: {
					columns: {
						id: true,
						name: true,
						scenario: true,
						createdAt: true,
						isGroup: true
					}
				}
			}
		})

		// Get related chats through characters (existing functionality)
		const characterIds = characters
			.map((ct) => ct.character?.id)
			.filter(Boolean)
		const characterChats =
			characterIds.length > 0
				? await db.query.chatCharacters.findMany({
						where: (cc, { inArray }) =>
							inArray(cc.characterId, characterIds),
						with: {
							chat: {
								columns: {
									id: true,
									name: true,
									scenario: true,
									createdAt: true,
									isGroup: true
								}
							}
						}
					})
				: []

		// Combine direct chats and character-related chats, removing duplicates
		const allChats = [
			...directChats.map((ct) => ct.chat).filter(Boolean),
			...characterChats.map((cc) => cc.chat).filter(Boolean)
		]
		const uniqueChats = allChats.filter((chat, index, self) => 
			index === self.findIndex(c => c.id === chat.id)
		)

		const res = {
			characters: characters.map((ct) => ct.character).filter(Boolean),
			personas: personas.map((pt) => pt.persona).filter(Boolean),
			lorebooks: lorebooks.map((lt) => lt.lorebook).filter(Boolean),
			chats: uniqueChats
		}

		emitToUser("tagRelatedData", res)
	} catch (error) {
		console.error("Error getting tag related data:", error)
		socket.emit("tagRelatedDataError", {
			error: "Failed to load related data."
		})
	}
}

export async function addTagToCharacter(
	socket: any,
	message: { characterId: number; tagId: number },
	emitToUser: (event: string, data: any) => void
) {
	try {
		await db
			.insert(schema.characterTags)
			.values({
				characterId: message.characterId,
				tagId: message.tagId
			})
			.onConflictDoNothing()

		const res = { characterId: message.characterId, tagId: message.tagId }
		emitToUser("addTagToCharacter", res)
	} catch (error) {
		console.error("Error adding tag to character:", error)
		socket.emit("addTagToCharacterError", {
			error: "Failed to add tag to character."
		})
	}
}

export async function removeTagFromCharacter(
	socket: any,
	message: { characterId: number; tagId: number },
	emitToUser: (event: string, data: any) => void
) {
	try {
		await db
			.delete(schema.characterTags)
			.where(
				and(
					eq(schema.characterTags.characterId, message.characterId),
					eq(schema.characterTags.tagId, message.tagId)
				)
			)

		const res = { characterId: message.characterId, tagId: message.tagId }
		emitToUser("removeTagFromCharacter", res)
	} catch (error) {
		console.error("Error removing tag from character:", error)
		socket.emit("removeTagFromCharacterError", {
			error: "Failed to remove tag from character."
		})
	}
}
