import { db } from "$lib/server/db"
import { and, eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import * as fsPromises from "fs/promises"
import { getCharacterDataDir, handleCharacterAvatarUpload } from "../utils"
import { CharacterCard } from "@lenml/char-card-reader"
import { fileTypeFromBuffer } from "file-type"

// Helper function to process tags for character creation/update
async function processCharacterTags(characterId: number, tagNames: string[]) {
	if (!tagNames || tagNames.length === 0) return

	// First, remove all existing tags for this character
	await db
		.delete(schema.characterTags)
		.where(eq(schema.characterTags.characterId, characterId))

	// Process each tag name
	const tagIds: number[] = []

	for (const tagName of tagNames) {
		if (!tagName.trim()) continue

		// Check if tag exists
		let existingTag = await db.query.tags.findFirst({
			where: eq(schema.tags.name, tagName.trim())
		})

		// Create tag if it doesn't exist
		if (!existingTag) {
			const [newTag] = await db
				.insert(schema.tags)
				.values({
					name: tagName.trim()
					// description and colorPreset will use database defaults
				})
				.returning()
			existingTag = newTag
		}

		tagIds.push(existingTag.id)
	}

	// Link all tags to the character
	if (tagIds.length > 0) {
		const characterTagsData = tagIds.map((tagId) => ({
			characterId,
			tagId
		}))

		await db
			.insert(schema.characterTags)
			.values(characterTagsData)
			.onConflictDoNothing() // In case of race conditions
	}
}

export async function characterList(
	socket: any,
	message: Sockets.CharacterList.Call,
	emitToUser: (event: string, data: any) => void
) {
	const characterList = await db.query.characters.findMany({
		columns: {
			id: true,
			name: true,
			nickname: true,
			avatar: true,
			isFavorite: true,
			description: true,
			creatorNotes: true
		},
		where: (c, { eq }) => eq(c.userId, 1), // TODO: Replace with actual user id
		orderBy: (c, { asc }) => asc(c.id)
	})
	const res: Sockets.CharacterList.Response = { characterList }
	emitToUser("characterList", res)
}

export async function character(
	socket: any,
	message: Sockets.Character.Call,
	emitToUser: (event: string, data: any) => void
) {
	const character = await db.query.characters.findFirst({
		where: (c, { eq }) => eq(c.id, message.id),
		with: {
			characterTags: {
				with: {
					tag: true
				}
			}
		}
	})
	if (character) {
		// Transform the character data to include tags as string array
		const characterWithTags = {
			...character,
			tags: character.characterTags.map((ct) => ct.tag.name)
		}
		delete characterWithTags.characterTags // Remove the junction table data

		const res: Sockets.Character.Response = { character: characterWithTags }
		emitToUser("character", res)
	}
}

export async function createCharacter(
	socket: any,
	message: Sockets.CreateCharacter.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const data = { ...message.character }
		const tags = data.tags || []

		// Remove fields that shouldn't be in the database insert
		delete data.avatar // Remove avatar from character data to avoid conflicts
		delete data.tags // Remove tags - will be handled separately

		const [character] = await db
			.insert(schema.characters)
			.values({ ...data, userId: 1 })
			.returning()

		// Process tags after character creation
		if (tags.length > 0) {
			await processCharacterTags(character.id, tags)
		}

		if (message.avatarFile) {
			await handleCharacterAvatarUpload({
				character,
				avatarFile: message.avatarFile
			})
		}

		await characterList(socket, {}, emitToUser)

		const res: Sockets.CreateCharacter.Response = { character }
		emitToUser("createCharacter", res)
	} catch (e: any) {
		console.error("Error creating character:", e)
		emitToUser("error", {
			error: e.message || "Failed to create character."
		})
		return
	}
}

export async function updateCharacter(
	socket: any,
	message: Sockets.UpdateCharacter.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const data = { ...message.character }
		const id = data.id
		const userId = 1 // Replace with actual userId
		const tags = data.tags || []

		// Remove fields that shouldn't be in the database update
		if ("userId" in data) (data as any).userId = undefined
		if ("id" in data) (data as any).id = undefined
		delete data.avatar // Remove avatar from character data to avoid conflicts
		delete data.tags // Remove tags - will be handled separately

		const [updated] = await db
			.update(schema.characters)
			.set(data)
			.where(
				and(
					eq(schema.characters.id, id),
					eq(schema.characters.userId, userId)
				)
			)
			.returning()

		// Process tags after character update
		await processCharacterTags(id, tags)

		if (message.avatarFile) {
			await handleCharacterAvatarUpload({
				character: updated,
				avatarFile: message.avatarFile
			})
		}

		const res: Sockets.UpdateCharacter.Response = { character: updated }
		await characterList(socket, {}, emitToUser)
		emitToUser("updateCharacter", res)
	} catch (e: any) {
		console.error("Error updating character:", e)
		emitToUser("error", {
			error: e.message || "Failed to update character."
		})
		return
	}
}

export async function deleteCharacter(
	socket: any,
	message: Sockets.DeleteCharacter.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual userId

	// Delete character tags first (cascade should handle this, but being explicit)
	await db
		.delete(schema.characterTags)
		.where(eq(schema.characterTags.characterId, message.characterId))

	// Delete the character
	await db
		.delete(schema.characters)
		.where(
			and(
				eq(schema.characters.id, message.characterId),
				eq(schema.characters.userId, userId)
			)
		)
	await characterList(socket, {}, emitToUser)
	// Delete the character data directory if it exists
	const avatarDir = getCharacterDataDir({
		characterId: message.characterId,
		userId
	})
	try {
		await fsPromises.rmdir(avatarDir, { recursive: true })
	} catch (err) {
		console.error("Error deleting character data directory:", err)
	}
	// Emit the delete event
	const res: Sockets.DeleteCharacter.Response = { id: message.characterId }
	await characterList(socket, {}, emitToUser)
	emitToUser("deleteCharacter", res)
}

export async function characterCardImport(
	socket: any,
	message: Sockets.CharacterCardImport.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1
		let base64 = message.file!
		if (base64.startsWith("data:")) base64 = base64.split(",")[1]
		const buffer = Buffer.from(base64, "base64")

		// Check if the file is JSON by trying to parse it as text
		let card: any
		try {
			const text = buffer.toString("utf8")
			const jsonData = JSON.parse(text) // Test if it's valid JSON
			// If we reach here, it's valid JSON
			card = await CharacterCard.from_json(jsonData)
		} catch (jsonError) {
			// If JSON parsing fails, treat it as a binary file (image with embedded data)
			card = await CharacterCard.from_file(buffer)
		}

		const v3Data = card.toSpecV3().data
		const creationDate =
			v3Data.creation_date && !isNaN(Number(v3Data.creation_date))
				? new Date(Number(v3Data.creation_date)).toISOString()
				: new Date().toISOString()

		const data: InsertCharacter = {
			userId,
			name: v3Data.name || "Imported Character",
			description: v3Data.description || "",
			personality: v3Data.personality || "",
			scenario: v3Data.scenario || "",
			firstMessage: v3Data.first_mes || "",
			exampleDialogues: !!v3Data.mes_example
				? v3Data.mes_example.split("<START>")
				: [],
			nickname: v3Data.nickname || "",
			alternateGreetings: v3Data.alternate_greetings || [],
			creatorNotes: v3Data.creator_notes || "",
			creatorNotesMultilingual: v3Data.creator_notes_multilingual || {},
			groupOnlyGreetings: v3Data.group_only_greetings || [],
			postHistoryInstructions: v3Data.post_history_instructions || "",
			source: v3Data.source || [],
			assets: v3Data.assets || [],
			createdAt: creationDate,
			extensions: v3Data.extensions || []
		}

		const [character] = await db
			.insert(schema.characters)
			.values(data)
			.returning()

		// Extract file extension and check if it's a supported image type
		let ext = ""
		if (typeof message.file === "string") {
			// If data URL, try to extract extension from MIME type
			const dataUrlMatch = message.file.match(/^data:image\/(\w+)/i)
			if (dataUrlMatch) {
				ext = dataUrlMatch[1].toLowerCase()
			} else {
				// Otherwise, try to extract from filename
				const fileNameMatch = message.file.match(/\.([a-zA-Z0-9]+)$/)
				if (fileNameMatch) {
					ext = fileNameMatch[1].toLowerCase()
				}
			}
		}

		async function detectMimeType(base64: string) {
			const buffer = Buffer.from(base64, "base64")
			const result = await fileTypeFromBuffer(buffer)
			return result ? result.mime : null
		}

		const mimeType = await detectMimeType(base64)

		// console.log("Extracted mime type:", mimeType)
		const supportedMimeTypes = [
			"image/png",
			"image/apng",
			"image/jpeg",
			"image/jpg",
			"image/gif",
			"image/webp"
		]
		if (supportedMimeTypes.includes(mimeType || "")) {
			await handleCharacterAvatarUpload({
				character,
				avatarFile: buffer
			})
		}

		// Import tags if available in the character card
		if (
			v3Data.tags &&
			Array.isArray(v3Data.tags) &&
			v3Data.tags.length > 0
		) {
			await processCharacterTags(character.id, v3Data.tags)
		}

		const res: Sockets.CharacterCardImport.Response = {
			character,
			book: v3Data.character_book || null
		}
		emitToUser("characterCardImport", res)
		await characterList(socket, {}, emitToUser)
	} catch (e: any) {
		console.error("Error importing character card:", e)
		emitToUser("error", {
			error: e.message || "Failed to import character card."
		})
	}
}
