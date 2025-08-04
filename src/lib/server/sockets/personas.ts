import { db } from "$lib/server/db"
import { and, eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import { handlePersonaAvatarUpload } from "../utils"

// Helper function to process tags for persona creation/update
async function processPersonaTags(personaId: number, tagNames: string[]) {
	if (!tagNames || tagNames.length === 0) return

	// First, remove all existing tags for this persona
	await db
		.delete(schema.personaTags)
		.where(eq(schema.personaTags.personaId, personaId))

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

	// Link all tags to the persona
	if (tagIds.length > 0) {
		const personaTagsData = tagIds.map((tagId) => ({
			personaId,
			tagId
		}))

		await db
			.insert(schema.personaTags)
			.values(personaTagsData)
			.onConflictDoNothing() // In case of race conditions
	}
}

export async function personaList(
	socket: any,
	message: Sockets.PersonaList.Call,
	emitToUser: (event: string, data: any) => void
) {
	const personaList = await db.query.personas.findMany({
		columns: {
			id: true,
			name: true,
			avatar: true,
			isDefault: true,
			description: true,
			position: true
		},
		where: (p, { eq }) => eq(p.userId, 1) // TODO: Replace with actual user id
	})
	const res: Sockets.PersonaList.Response = { personaList }
	emitToUser("personaList", res)
}

export async function persona(
	socket: any,
	message: Sockets.Persona.Call,
	emitToUser: (event: string, data: any) => void
) {
	const persona = await db.query.personas.findFirst({
		where: (p, { eq }) => eq(p.id, message.id),
		with: {
			personaTags: {
				with: {
					tag: true
				}
			}
		}
	})
	if (persona) {
		// Transform the persona data to include tags as string array
		const personaWithTags = {
			...persona,
			tags: persona.personaTags.map((pt) => pt.tag.name)
		}
		delete personaWithTags.personaTags // Remove the junction table data

		const res: Sockets.Persona.Response = { persona: personaWithTags }
		emitToUser("persona", res)
	}
}

export async function createPersona(
	socket: any,
	message: Sockets.CreatePersona.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const data = { ...message.persona }
		const tags = data.tags || []

		// Remove fields that shouldn't be in the database insert
		delete data.avatar // Remove avatar from persona data to avoid conflicts
		delete data.tags // Remove tags - will be handled separately

		const [persona] = await db
			.insert(schema.personas)
			.values({ ...data, userId: 1 })
			.returning()

		// Process tags after persona creation
		if (tags.length > 0) {
			await processPersonaTags(persona.id, tags)
		}

		if (message.avatarFile) {
			await handlePersonaAvatarUpload({
				persona,
				avatarFile: message.avatarFile
			})
		}

		await personaList(socket, {}, emitToUser)
		const res: Sockets.CreatePersona.Response = { persona }
		emitToUser("createPersona", res)
	} catch (e: any) {
		console.error("Error creating persona:", e)
		emitToUser("createPersonaError", { error: e.message || String(e) })
		return
	}
}

export async function updatePersona(
	socket: any,
	message: Sockets.UpdatePersona.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const data = { ...message.persona }
		const id = data.id
		const userId = 1 // Replace with actual userId
		const tags = data.tags || []

		// Remove fields that shouldn't be in the database update
		if ("userId" in data) (data as any).userId = undefined
		if ("id" in data) (data as any).id = undefined
		delete data.avatar // Remove avatar from persona data to avoid conflicts
		delete data.tags // Remove tags - will be handled separately

		const [updated] = await db
			.update(schema.personas)
			.set(data)
			.where(
				and(
					eq(schema.personas.id, id),
					eq(schema.personas.userId, userId)
				)
			)
			.returning()

		// Process tags after persona update
		await processPersonaTags(id, tags)

		if (message.avatarFile) {
			await handlePersonaAvatarUpload({
				persona: updated,
				avatarFile: message.avatarFile
			})
		}

		await persona(socket, { id }, emitToUser)
		await personaList(socket, {}, emitToUser)
		const res: Sockets.UpdatePersona.Response = { persona: updated }
		emitToUser("updatePersona", res)
	} catch (e: any) {
		console.error("Error updating persona:", e)
		emitToUser("error", {
			error: e.message || "Failed to update persona."
		})
		return
	}
}

export async function deletePersona(
	socket: any,
	message: Sockets.DeletePersona.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // Replace with actual userId

	// Delete persona tags first (cascade should handle this, but being explicit)
	await db
		.delete(schema.personaTags)
		.where(eq(schema.personaTags.personaId, message.id))

	// Delete the persona
	await db
		.delete(schema.personas)
		.where(
			and(
				eq(schema.personas.id, message.id),
				eq(schema.personas.userId, userId)
			)
		)
	await personaList(socket, {}, emitToUser)
	const res: Sockets.DeletePersona.Response = { id: message.id }
	emitToUser("deletePersona", res)
}
