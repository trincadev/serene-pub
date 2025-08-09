import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import type { SpecV3 } from "@lenml/char-card-reader"
import { and, eq } from "drizzle-orm"
import { CharacterBook } from "@lenml/char-card-reader"

// Helper function to process tags for lorebook creation/update
async function processLorebookTags(lorebookId: number, tagNames: string[]) {
	if (!tagNames || tagNames.length === 0) return

	// First, remove all existing tags for this lorebook
	await db
		.delete(schema.lorebookTags)
		.where(eq(schema.lorebookTags.lorebookId, lorebookId))

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

	// Link all tags to the lorebook
	if (tagIds.length > 0) {
		const lorebookTagsData = tagIds.map((tagId) => ({
			lorebookId,
			tagId
		}))

		await db
			.insert(schema.lorebookTags)
			.values(lorebookTagsData)
			.onConflictDoNothing() // In case of race conditions
	}
}

export async function lorebookList(
	socket: any,
	message: Sockets.LorebookList.Call,
	emitToUser: (event: string, data: any) => void
) {
	// Fetch all lorebooks for the user
	const userId = 1 // TODO: Replace with actual user ID from socket data
	if (!userId) return socket.emit("lorebookList", { lorebookList: [] })
	const books = await db.query.lorebooks.findMany({
		where: (l, { eq }) => eq(l.userId, userId),
		orderBy: (l, { desc }) => desc(l.name),
		with: {
			worldLoreEntries: {
				columns: {
					id: true
				}
			},
			characterLoreEntries: {
				columns: {
					id: true
				}
			},
			historyEntries: {
				columns: {
					id: true
				}
			},
			lorebookBindings: {
				columns: {
					id: true
				}
			},
			lorebookTags: {
				with: {
					tag: true
				}
			}
		}
	})

	// Transform lorebook tags to include tags as string array
	const booksWithTags = books.map((book) => ({
		...book,
		tags: book.lorebookTags?.map((lt) => lt.tag.name) || []
	}))

	const res: Sockets.LorebookList.Response = { lorebookList: booksWithTags }
	emitToUser("lorebookList", res)
}

export async function lorebook(
	socket: any,
	message: Sockets.Lorebook.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // TODO: Replace with actual user ID from socket data
	if (!userId) return socket.emit("lorebookGet", { lorebook: null })
	const book = await db.query.lorebooks.findFirst({
		where: (l, { and, eq }) =>
			and(eq(l.id, message.id), eq(l.userId, userId)),
		with: {
			worldLoreEntries: true,
			characterLoreEntries: true,
			historyEntries: true,
			lorebookBindings: true,
			lorebookTags: {
				with: {
					tag: true
				}
			}
		}
	})

	if (!book) {
		return socket.emit("lorebook", { lorebook: null })
	}

	// Transform lorebook tags to include tags as string array
	const bookWithTags = {
		...book,
		tags: book.lorebookTags?.map((lt) => lt.tag.name) || []
	}

	const res: Sockets.Lorebook.Response = { lorebook: bookWithTags }
	emitToUser("lorebook", res)
}

const getLorebook = lorebook

export async function createLorebook(
	socket: any,
	message: Sockets.CreateLorebook.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data
		const tags = message.tags || []

		const [newBook] = await db
			.insert(schema.lorebooks)
			.values({
				name: message.name,
				userId
			})
			.returning()

		// Process tags after lorebook creation
		if (tags.length > 0) {
			await processLorebookTags(newBook.id, tags)
		}

		const res: Sockets.CreateLorebook.Response = { lorebook: newBook }
		emitToUser("createLorebook", res)
		await lorebookList(socket, { userId }, emitToUser)
	} catch (error) {
		console.error("Error creating lorebook:", error)
		socket.emit("error", { error: "Failed to create lorebook." })
	}
}

export async function updateLorebook(
	socket: any,
	message: Sockets.UpdateLorebook.Call,
	emitToUser: (event: string, data: any) => void
) {
	console.log("Updating lorebook with message:", message)
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data
		const tags = message.lorebook.tags || []

		// Only update fields that exist in the lorebooks table
		const updateData: Partial<typeof schema.lorebooks.$inferInsert> = {
			name: message.lorebook.name,
			description: message.lorebook.description,
			extraJson: message.lorebook.extraJson,
			userId
		}

		const [updatedBook] = await db
			.update(schema.lorebooks)
			.set(updateData)
			.where(
				and(
					eq(schema.lorebooks.id, message.lorebook.id),
					eq(schema.lorebooks.userId, userId)
				)
			)
			.returning()

		if (!updatedBook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to edit it."
			})
		}

		// Process tags after lorebook update
		await processLorebookTags(updatedBook.id, tags)

		// Fetch the complete updated lorebook with all related data
		const completeBook = await db.query.lorebooks.findFirst({
			where: (l, { eq }) => eq(l.id, updatedBook.id),
			with: {
				worldLoreEntries: true,
				characterLoreEntries: true,
				historyEntries: true,
				lorebookBindings: true,
				lorebookTags: {
					with: {
						tag: true
					}
				}
			}
		})

		if (!completeBook) {
			return socket.emit("error", {
				error: "Failed to fetch updated lorebook."
			})
		}

		// Transform lorebook tags to include tags as string array
		const bookWithTags = {
			...completeBook,
			tags: completeBook.lorebookTags?.map((lt) => lt.tag.name) || []
		}

		const res: Sockets.UpdateLorebook.Response = { lorebook: bookWithTags }
		emitToUser("updateLorebook", res)
		await lorebookList(socket, { userId }, emitToUser)
	} catch (error) {
		console.error("Error updating lorebook:", error)
		socket.emit("error", { error: "Failed to update lorebook." })
	}
}

export async function deleteLorebook(
	socket: any,
	message: Sockets.DeleteLorebook.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const book = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, message.id), eq(l.userId, userId))
		})

		if (!book) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to delete it."
			})
		}

		await db
			.delete(schema.lorebooks)
			.where(
				and(
					eq(schema.lorebooks.id, book.id),
					eq(schema.lorebooks.userId, userId)
				)
			)

		const res: Sockets.DeleteLorebook.Response = { id: book.id }
		emitToUser("deleteLorebook", res)
		await lorebookList(socket, { userId }, emitToUser)
	} catch (error) {
		console.error("Error deleting lorebook:", error)
		socket.emit("error", { error: "Failed to delete lorebook." })
	}
}

export async function createLorebookBinding(
	socket: any,
	message: Sockets.CreateLorebookBinding.Call, // { lorebookBinding: { lorebookId, characterId?, personaId? }}
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		if (
			!!message.lorebookBinding.characterId &&
			!!message.lorebookBinding.personaId
		) {
			return socket.emit("error", {
				error: "Cannot bind both character and persona."
			})
		}

		// Get the lorebook
		const book = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(
					eq(l.id, message.lorebookBinding.lorebookId),
					eq(l.userId, userId)
				),
			with: {
				lorebookBindings: true
			}
		})

		if (!book) {
			return socket.emit("error", { error: "Lorebook not found." })
		}

		// binding is strictly shaped as "{{char:1}}" (preferred) or "{char:1}" (deprecated), etc. Find the next available binding number by parsing the existing bindings
		const existingBindings = book.lorebookBindings.map((b) => b.binding)
		const rgx: RegExp = /\{\{?(\w+):(\d+)\}?\}/  // Matches both {{char:1}} and {char:1}
		const existingNumbers = existingBindings
			.map((binding) => {
				const match = binding.match(rgx)
				return match ? parseInt(match[2], 10) : null
			})
			.filter((num) => num !== null) as number[]
		let nextBindingNumber = 1
		while (existingNumbers.includes(nextBindingNumber)) {
			nextBindingNumber++
		}

		// Create the new binding
		const newBinding = {
			lorebookId: book.id,
			binding: `{{char:${nextBindingNumber}}}`, // Use preferred {{char:#}} syntax
			characterId: message.lorebookBinding.characterId || null,
			personaId: message.lorebookBinding.personaId || null
		}

		const [createdBinding] = await db
			.insert(schema.lorebookBindings)
			.values(newBinding)
			.returning()

		const res: Sockets.CreateLorebookBinding.Response = {
			lorebookBinding: createdBinding
		}
		emitToUser("createLorebookBinding", res)
		await getLorebook(socket, { id: book.id }, emitToUser)
		await lorebookBindingList(socket, { lorebookId: book.id }, emitToUser)
	} catch (error) {
		console.error("Error creating lorebook binding:", error)
		socket.emit("error", { error: "Failed to create lorebook binding." })
	}
}

export async function lorebookBindingList(
	socket: any,
	message: Sockets.LorebookBindingList.Call,
	emitToUser: (event: string, data: any) => void
) {
	const userId = 1 // TODO: Replace with actual user ID from socket data
	if (!userId) return socket.emit("error", { error: "User not found." })

	const book = await db.query.lorebooks.findFirst({
		where: (l, { and, eq }) =>
			and(eq(l.id, message.lorebookId), eq(l.userId, userId)),
		columns: {
			id: true
		},
		with: {
			lorebookBindings: {
				with: {
					character: true,
					persona: true
				}
			}
		}
	})

	// If the book doesn't exist, return an error
	if (!book) {
		return socket.emit("error", { error: "Lorebook not found." })
	}

	const res: Sockets.LorebookBindingList.Response = {
		lorebookId: book.id,
		lorebookBindingList: book.lorebookBindings
	}
	emitToUser("lorebookBindingList", res)
}

export async function updateLorebookBinding(
	socket: any,
	message: Sockets.UpdateLorebookBinding.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		// Make sure characterId or personaId is provided, but not both
		if (
			!!message.lorebookBinding.characterId &&
			!!message.lorebookBinding.personaId
		) {
			return socket.emit("error", {
				error: "Cannot link both character and persona."
			})
		}

		const binding = await db.query.lorebookBindings.findFirst({
			where: (b, { eq }) => eq(b.id, message.lorebookBinding.id),
			with: {
				lorebook: {
					columns: {
						id: true,
						userId: true
					}
				}
			}
		})

		if (!binding) {
			return socket.emit("error", {
				error: "Lorebook binding not found."
			})
		}

		if (binding.lorebook.userId !== userId) {
			return socket.emit("error", {
				error: "You do not have permission to update this lorebook binding."
			})
		}

		const updatedBinding = await db
			.update(schema.lorebookBindings)
			.set({
				characterId: message.lorebookBinding.characterId || null,
				personaId: message.lorebookBinding.personaId || null
			})
			.where(eq(schema.lorebookBindings.id, binding.id))
			.returning()

		const res: Sockets.UpdateLorebookBinding.Response = {
			lorebookBinding: updatedBinding[0]
		}
		emitToUser("updateLorebookBinding", res)
		await lorebookBindingList(
			socket,
			{ lorebookId: binding.lorebookId },
			emitToUser
		)
	} catch (error) {
		console.error("Error updating lorebook binding:", error)
		socket.emit("error", { error: "Failed to update lorebook binding." })
	}
}

export async function worldLoreEntryList(
	socket: any,
	message: Sockets.WorldLoreEntryList.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data
		if (!userId) return socket.emit("error", { error: "User not found." })

		const book = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, message.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			},
			with: {
				worldLoreEntries: true
			}
		})

		if (!book) {
			return socket.emit("error", { error: "Lorebook not found." })
		}

		const res: Sockets.WorldLoreEntryList.Response = {
			worldLoreEntryList: book.worldLoreEntries
		}
		emitToUser("worldLoreEntryList", res)
	} catch (error) {
		console.error("Error fetching world lore entries:", error)
		socket.emit("error", { error: "Failed to fetch world lore entries." })
	}
}

export async function createWorldLoreEntry(
	socket: any,
	message: Sockets.CreateWorldLoreEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const data: InsertWorldLoreEntry = message.worldLoreEntry
		data.name = data.name.trim()
		data.content = data.content?.trim() || ""
		// data.keys = data.keys

		// Get next available position for the lore entry
		const existingBook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, data.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			},
			with: {
				worldLoreEntries: {
					columns: {
						id: true,
						position: true
					},
					orderBy: (e, { asc }) => asc(e.position)
				}
			}
		})

		if (!existingBook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to create an entry."
			})
		}

		const existingEntries = existingBook.worldLoreEntries

		let nextPosition = 1
		if (existingEntries.length > 0) {
			// Find the first available position
			const positions = existingEntries.map((e) => e.position)
			while (positions.includes(nextPosition)) {
				nextPosition++
			}
		}

		data.position = nextPosition

		const [newEntry] = await db
			.insert(schema.worldLoreEntries)
			.values(data)
			.returning()

		await syncLorebookBindings({ lorebookId: newEntry.lorebookId })
		await lorebookBindingList(
			socket,
			{ lorebookId: newEntry.lorebookId },
			emitToUser
		)

		const res: Sockets.CreateWorldLoreEntry.Response = {
			worldLoreEntry: newEntry
		}
		emitToUser("createWorldLoreEntry", res)
		const entryListReq: Sockets.WorldLoreEntryList.Call = {
			lorebookId: newEntry.lorebookId
		}
		await worldLoreEntryList(socket, entryListReq, emitToUser)
	} catch (error) {
		console.error("Error creating world lore entry:", error)
		socket.emit("error", { error: "Failed to create world lore entry." })
	}
}

async function syncLorebookBindings({ lorebookId }: { lorebookId: number }) {
	console.log("Syncing lorebook bindings for lorebookId:", lorebookId)
	const queries: (() => Promise<any>)[] = []
	// Query all lorebook bindings for the given lorebook
	const existingBindings = await db.query.lorebookBindings.findMany({
		where: (b, { eq }) => eq(b.lorebookId, lorebookId),
		with: {
			characterLoreEntries: true
		}
	})
	// Query all world, character and history entries for the given lorebook
	const worldEntries = await db.query.worldLoreEntries.findMany({
		where: (e, { eq }) => eq(e.lorebookId, lorebookId)
	})
	const characterEntries = await db.query.characterLoreEntries.findMany({
		where: (e, { eq }) => eq(e.lorebookId, lorebookId)
	})
	const historyEntries = await db.query.historyEntries.findMany({
		where: (e, { eq }) => eq(e.lorebookId, lorebookId)
	})
	// Create a list of all unique lorebook bindings from the entries
	const foundBindings: string[] = []
	for (const entry of [
		...worldEntries,
		...characterEntries,
		...historyEntries
	]) {
		// use regex to find all {{char:1}}, {{char:2}}, {char:1}, {char:2}, etc. bindings in the entry content
		const rgx: RegExp = /\{\{?(\w+):(\d+)\}?\}/g  // Matches both {{char:1}} and {char:1} (deprecated)
		let match: RegExpExecArray | null
		while ((match = rgx.exec(entry.content)) !== null) {
			const binding = `{{${match[1]}:${match[2]}}}` // Store as preferred syntax
			if (!foundBindings.includes(binding)) {
				foundBindings.push(binding)
			}
		}
	}
	// If a binding does not exist in the lorebook bindings, create it without a character or persona
	foundBindings.forEach((fb) => {
		// Check for both {{char:#}} and {char:#} syntax when looking for existing bindings
		const legacyBinding = fb.replace(/\{\{(\w+):(\d+)\}\}/, '{$1:$2}') // Convert {{char:1}} to {char:1}
		const existingBinding = existingBindings.find((eb) => eb.binding === fb || eb.binding === legacyBinding)
		if (!existingBinding) {
			queries.push(
				db.insert(schema.lorebookBindings).values({
					lorebookId,
					binding: fb, // Use preferred {{char:#}} syntax
					characterId: null,
					personaId: null
				}) as any as () => Promise<any>
			)
		}
	})
	// If a binding exists in the lorebook bindings without a bound character or persona, consider it orphaned and delete it
	existingBindings.forEach((eb) => {
		if (
			!!eb.characterId ||
			!!eb.personaId ||
			!!eb.characterLoreEntries.length
		) {
			return
		} // Skip bindings that are still in use
		const isBindingUsed = foundBindings.some((fb) => fb === eb.binding)
		if (!isBindingUsed) {
			queries.push(
				db
					.delete(schema.lorebookBindings)
					.where(
						eq(schema.lorebookBindings.id, eb.id)
					) as any as () => Promise<any>
			)
		}
	})
	// Execute all queries in parallel
	if (queries.length > 0) {
		await Promise.all(queries)
	}
}

export async function updateWorldLoreEntry(
	socket: any,
	message: Sockets.UpdateWorldLoreEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const lorebook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(
					eq(l.id, message.worldLoreEntry.lorebookId),
					eq(l.userId, userId)
				),
			columns: {
				id: true,
				userId: true
			}
		})

		if (!lorebook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to edit it."
			})
		}

		const entry = await db.query.worldLoreEntries.findFirst({
			where: (e, { eq }) => eq(e.id, message.worldLoreEntry.id)
		})

		if (!entry) {
			return socket.emit("error", {
				error: "World lore entry not found."
			})
		}

		const data: SelectWorldLoreEntry = { ...message.worldLoreEntry }
		data.name = data.name!.trim()
		data.content = data.content!.trim()
		// data.keys = data.keys

		const [updatedEntry] = await db
			.update(schema.worldLoreEntries)
			.set(data)
			.where(eq(schema.worldLoreEntries.id, entry.id))
			.returning()

		await syncLorebookBindings({ lorebookId: entry.lorebookId })
		await lorebookBindingList(
			socket,
			{ lorebookId: entry.lorebookId },
			emitToUser
		)

		const res: Sockets.UpdateWorldLoreEntry.Response = {
			worldLoreEntry: updatedEntry
		}
		emitToUser("updateWorldLoreEntry", res)
		const entryListReq: Sockets.WorldLoreEntryList.Call = {
			lorebookId: updatedEntry.lorebookId
		}
		await worldLoreEntryList(socket, entryListReq, emitToUser)
	} catch (error) {
		console.error("Error updating world lore entry:", error)
		socket.emit("error", { error: "Failed to update world lore entry." })
	}
}

export async function deleteWorldLoreEntry(
	socket: any,
	message: Sockets.DeleteWorldLoreEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const book = await db.query.lorebooks.findFirst({
			where: (e, { eq }) =>
				and(eq(e.id, message.lorebookId), eq(e.userId, userId)),
			with: {
				worldLoreEntries: {
					where: (we, { eq }) => eq(we.id, message.id),
					columns: {
						id: true,
						lorebookId: true
					}
				}
			}
		})

		if (!book || !book.worldLoreEntries.length) {
			return socket.emit("error", {
				error: "World lore entry not found or you do not have permission to delete it."
			})
		}

		await db
			.delete(schema.worldLoreEntries)
			.where(eq(schema.worldLoreEntries.id, message.id))

		const res: Sockets.DeleteWorldLoreEntry.Response = {
			// worldLoreEntry: lorebook.worldLoreEntries[0]
		}
		emitToUser("deleteWorldLoreEntry", res)
		await worldLoreEntryList(
			socket,
			{ lorebookId: message.lorebookId },
			emitToUser
		)
	} catch (error) {
		console.error("Error deleting world lore entry:", error)
		socket.emit("error", { error: "Failed to delete world lore entry." })
	}
}

export async function updateWorldLoreEntryPositions(
	socket: any,
	message: Sockets.UpdateWorldLoreEntryPositions.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const lorebook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, message.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			}
		})

		if (!lorebook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to edit it."
			})
		}

		const queries = []
		for (const update of message.positions) {
			queries.push(
				db
					.update(schema.worldLoreEntries)
					.set({ position: update.position })
					.where(eq(schema.worldLoreEntries.id, update.id))
			)
		}

		await Promise.all(queries)

		const res: Sockets.UpdateWorldLoreEntryPositions.Response = {
			lorebookId: lorebook.id
		}
		emitToUser("updateWorldLoreEntryPositions", res)
		await worldLoreEntryList(
			socket,
			{ lorebookId: lorebook.id },
			emitToUser
		)
	} catch (error) {
		console.error("Error updating world lore entry positions:", error)
		socket.emit("error", {
			error: "Failed to update world lore entry positions."
		})
	}
}

// --- Character Lore Entry Endpoints ---

export async function characterLoreEntryList(
	socket: any,
	message: Sockets.CharacterLoreEntryList.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data
		if (!userId) return socket.emit("error", { error: "User not found." })

		const book = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, message.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			},
			with: {
				characterLoreEntries: true
			}
		})

		if (!book) {
			return socket.emit("error", { error: "Lorebook not found." })
		}

		const res: Sockets.CharacterLoreEntryList.Response = {
			characterLoreEntryList: book.characterLoreEntries
		}
		emitToUser("characterLoreEntryList", res)
	} catch (error) {
		console.error("Error fetching character lore entries:", error)
		socket.emit("error", {
			error: "Failed to fetch character lore entries."
		})
	}
}

export async function createCharacterLoreEntry(
	socket: any,
	message: Sockets.CreateCharacterLoreEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const data: InsertCharacterLoreEntry = message.characterLoreEntry
		data.name = data.name.trim()
		data.content = data.content?.trim() || ""

		// Get next available position for the lore entry
		const existingBook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, data.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			},
			with: {
				characterLoreEntries: {
					columns: {
						id: true,
						position: true
					},
					orderBy: (e, { asc }) => asc(e.position)
				}
			}
		})

		if (!existingBook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to create an entry."
			})
		}

		const existingEntries = existingBook.characterLoreEntries

		let nextPosition = 1
		if (existingEntries.length > 0) {
			const positions = existingEntries.map((e) => e.position)
			while (positions.includes(nextPosition)) {
				nextPosition++
			}
		}
		data.position = nextPosition

		const [newEntry] = await db
			.insert(schema.characterLoreEntries)
			.values(data)
			.returning()

		await syncLorebookBindings({ lorebookId: newEntry.lorebookId })
		await lorebookBindingList(
			socket,
			{ lorebookId: newEntry.lorebookId },
			emitToUser
		)

		const res: Sockets.CreateCharacterLoreEntry.Response = {
			characterLoreEntry: newEntry
		}
		emitToUser("createCharacterLoreEntry", res)
		const entryListReq: Sockets.CharacterLoreEntryList.Call = {
			lorebookId: newEntry.lorebookId
		}
		await characterLoreEntryList(socket, entryListReq, emitToUser)
	} catch (error) {
		console.error("Error creating character lore entry:", error)
		socket.emit("error", {
			error: "Failed to create character lore entry."
		})
	}
}

export async function updateCharacterLoreEntry(
	socket: any,
	message: Sockets.UpdateCharacterLoreEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const existingBook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(
					eq(l.id, message.characterLoreEntry.lorebookId),
					eq(l.userId, userId)
				),
			columns: {
				id: true,
				userId: true
			},
			with: {
				characterLoreEntries: {
					where: (we, { eq }) =>
						eq(we.id, message.characterLoreEntry.id),
					columns: {
						id: true,
						lorebookId: true
					}
				}
			}
		})

		if (!existingBook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to edit it."
			})
		}

		const entry = existingBook.characterLoreEntries.find(
			(e) => e.id === message.characterLoreEntry.id
		)

		if (!entry) {
			return socket.emit("error", {
				error: "Character lore entry not found."
			})
		}

		const data: SelectCharacterLoreEntry = { ...message.characterLoreEntry }
		data.name = data.name!.trim()
		data.content = data.content!.trim()

		const [updatedEntry] = await db
			.update(schema.characterLoreEntries)
			.set(data)
			.where(eq(schema.characterLoreEntries.id, entry.id))
			.returning()

		await syncLorebookBindings({ lorebookId: entry.lorebookId })
		await lorebookBindingList(
			socket,
			{ lorebookId: entry.lorebookId },
			emitToUser
		)

		const res: Sockets.UpdateCharacterLoreEntry.Response = {
			characterLoreEntry: updatedEntry
		}
		emitToUser("updateCharacterLoreEntry", res)
		const entryListReq: Sockets.CharacterLoreEntryList.Call = {
			lorebookId: updatedEntry.lorebookId
		}
		await characterLoreEntryList(socket, entryListReq, emitToUser)
	} catch (error) {
		console.error("Error updating character lore entry:", error)
		socket.emit("error", {
			error: "Failed to update character lore entry."
		})
	}
}

export async function deleteCharacterLoreEntry(
	socket: any,
	message: Sockets.DeleteCharacterLoreEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const book = await db.query.lorebooks.findFirst({
			where: (e, { eq }) =>
				and(eq(e.id, message.lorebookId), eq(e.userId, userId)),
			with: {
				characterLoreEntries: {
					where: (we, { eq }) => eq(we.id, message.id),
					columns: {
						id: true,
						lorebookId: true
					}
				}
			}
		})

		if (!book || !book.characterLoreEntries.length) {
			return socket.emit("error", {
				error: "Character lore entry not found or you do not have permission to delete it."
			})
		}

		await db
			.delete(schema.characterLoreEntries)
			.where(eq(schema.characterLoreEntries.id, message.id))

		const res: Sockets.DeleteCharacterLoreEntry.Response = {
			id: message.id,
			lorebookId: message.lorebookId
		}
		emitToUser("deleteCharacterLoreEntry", res)
		await characterLoreEntryList(
			socket,
			{ lorebookId: message.lorebookId },
			emitToUser
		)
	} catch (error) {
		console.error("Error deleting character lore entry:", error)
		socket.emit("error", {
			error: "Failed to delete character lore entry."
		})
	}
}

export async function updateCharacterLoreEntryPositions(
	socket: any,
	message: Sockets.UpdateCharacterLoreEntryPositions.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const lorebook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, message.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			}
		})

		if (!lorebook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to edit it."
			})
		}

		const queries = []
		for (const update of message.positions) {
			queries.push(
				db
					.update(schema.characterLoreEntries)
					.set({ position: update.position })
					.where(eq(schema.characterLoreEntries.id, update.id))
			)
		}

		await Promise.all(queries)

		const res: Sockets.UpdateCharacterLoreEntryPositions.Response = {
			lorebookId: lorebook.id
		}
		emitToUser("updateCharacterLoreEntryPositions", res)
		await characterLoreEntryList(
			socket,
			{ lorebookId: lorebook.id },
			emitToUser
		)
	} catch (error) {
		console.error("Error updating character lore entry positions:", error)
		socket.emit("error", {
			error: "Failed to update character lore entry positions."
		})
	}
}

// --- History Entry Endpoints ---

export async function historyEntryList(
	socket: any,
	message: Sockets.HistoryEntryList.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data
		if (!userId) return socket.emit("error", { error: "User not found." })

		const book = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, message.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			},
			with: {
				historyEntries: true
			}
		})

		if (!book) {
			return socket.emit("error", { error: "Lorebook not found." })
		}

		const res: Sockets.HistoryEntryList.Response = {
			historyEntryList: book.historyEntries
		}
		emitToUser("historyEntryList", res)
	} catch (error) {
		console.error("Error fetching history entries:", error)
		socket.emit("error", { error: "Failed to fetch history entries." })
	}
}

export async function createHistoryEntry(
	socket: any,
	message: Sockets.CreateHistoryEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const existingBook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(
					eq(l.id, message.historyEntry.lorebookId),
					eq(l.userId, userId)
				),
			columns: {
				id: true,
				userId: true
			},
			with: {
				historyEntries: {
					columns: {
						id: true,
						position: true
					},
					orderBy: (e, { asc }) => asc(e.position)
				}
			}
		})

		if (!existingBook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to create an entry."
			})
		}

		const data: InsertHistoryEntry = message.historyEntry

		const [newEntry] = await db
			.insert(schema.historyEntries)
			.values(data)
			.returning()

		await syncLorebookBindings({ lorebookId: newEntry.lorebookId })
		await lorebookBindingList(
			socket,
			{ lorebookId: newEntry.lorebookId },
			emitToUser
		)

		const res: Sockets.CreateHistoryEntry.Response = {
			historyEntry: newEntry
		}
		emitToUser("createHistoryEntry", res)
		const entryListReq: Sockets.HistoryEntryList.Call = {
			lorebookId: newEntry.lorebookId
		}
		await historyEntryList(socket, entryListReq, emitToUser)
	} catch (error) {
		console.error("Error creating history entry:", error)
		socket.emit("error", { error: "Failed to create history entry." })
	}
}

export async function updateHistoryEntry(
	socket: any,
	message: Sockets.UpdateHistoryEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const existingBook = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(
					eq(l.id, message.historyEntry.lorebookId),
					eq(l.userId, userId)
				),
			columns: {
				id: true,
				userId: true
			},
			with: {
				historyEntries: {
					where: (we, { eq }) => eq(we.id, message.historyEntry.id),
					columns: {
						id: true,
						lorebookId: true
					}
				}
			}
		})

		if (!existingBook) {
			return socket.emit("error", {
				error: "Lorebook not found or you do not have permission to edit it."
			})
		}

		const entry = existingBook.historyEntries.find(
			(e) => e.id === message.historyEntry.id
		)

		if (!entry) {
			return socket.emit("error", {
				error: "History entry not found."
			})
		}

		const data: SelectHistoryEntry = { ...message.historyEntry }
		if (typeof data.content === "string") data.content = data.content.trim()

		const [updatedEntry] = await db
			.update(schema.historyEntries)
			.set(data)
			.where(eq(schema.historyEntries.id, entry.id))
			.returning()

		await syncLorebookBindings({ lorebookId: entry.lorebookId })
		await lorebookBindingList(
			socket,
			{ lorebookId: entry.lorebookId },
			emitToUser
		)

		const res: Sockets.UpdateHistoryEntry.Response = {
			historyEntry: updatedEntry
		}
		emitToUser("updateHistoryEntry", res)
		const entryListReq: Sockets.HistoryEntryList.Call = {
			lorebookId: updatedEntry.lorebookId
		}
		await historyEntryList(socket, entryListReq, emitToUser)
	} catch (error) {
		console.error("Error updating history entry:", error)
		socket.emit("error", { error: "Failed to update history entry." })
	}
}

export async function deleteHistoryEntry(
	socket: any,
	message: Sockets.DeleteHistoryEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const book = await db.query.lorebooks.findFirst({
			where: (e, { and, eq }) =>
				and(eq(e.id, message.lorebookId), eq(e.userId, userId)),
			with: {
				historyEntries: {
					where: (we, { eq }) => eq(we.id, message.id),
					columns: {
						id: true,
						lorebookId: true
					}
				}
			}
		})

		if (!book || !book.historyEntries.length) {
			return socket.emit("error", {
				error: "History entry not found or you do not have permission to delete it."
			})
		}

		await db
			.delete(schema.historyEntries)
			.where(eq(schema.historyEntries.id, message.id))

		const res: Sockets.DeleteHistoryEntry.Response = {
			id: message.id,
			lorebookId: message.lorebookId
		}
		emitToUser("deleteHistoryEntry", res)
		await historyEntryList(
			socket,
			{ lorebookId: message.lorebookId },
			emitToUser
		)
	} catch (error) {
		console.error("Error deleting history entry:", error)
		socket.emit("error", { error: "Failed to delete history entry." })
	}
}

export async function iterateNextHistoryEntry(
	socket: any,
	message: Sockets.IterateNextHistoryEntry.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		const book = await db.query.lorebooks.findFirst({
			where: (e, { and, eq }) =>
				and(eq(e.id, message.lorebookId), eq(e.userId, userId)),
			with: {
				historyEntries: {
					orderBy: (e, { asc }) => [
						asc(e.year),
						asc(e.month),
						asc(e.day)
					],
					columns: {
						id: true,
						lorebookId: true,
						year: true,
						month: true,
						day: true
					}
				}
			}
		})

		if (!book) {
			return socket.emit("error", {
				error: "Lorebook not found."
			})
		}

		const mostRecentEntry = book.historyEntries.sort((a, b) => {
			// Compare by entry.year, entry.month, entry.day, month or day might be undefined/null
			const dateA = new Date(a.year, a.month || 0, a.day || 1)
			const dateB = new Date(b.year, b.month || 0, b.day || 1)
			return dateB.getTime() - dateA.getTime() // Sort in descending order
		})[0]

		const nextDate: {
			year: number
			month: number | null
			day: number | null
		} = {
			year: 1,
			month: null,
			day: null
		}

		// If mostRecent entry exists, iterate on the day?, month? or year!
		if (mostRecentEntry) {
			if (mostRecentEntry.day) {
				nextDate.year = mostRecentEntry.year
				nextDate.month = mostRecentEntry.month
				nextDate.day = (mostRecentEntry.day || 1) + 1 // Increment day
			} else if (mostRecentEntry.month) {
				nextDate.year = mostRecentEntry.year
				nextDate.month = (mostRecentEntry.month || 1) + 1 // Increment month
			} else {
				nextDate.year = mostRecentEntry.year + 1 // Increment year
			}
		}

		const data: InsertHistoryEntry = {
			lorebookId: book.id,
			year: nextDate.year,
			month: nextDate.month,
			day: nextDate.day,
			content: ""
		}

		const [newEntry] = await db
			.insert(schema.historyEntries)
			.values(data)
			.returning()

		const res: Sockets.IterateNextHistoryEntry.Response = {
			historyEntry: newEntry
		}
		emitToUser("iterateNextHistoryEntry", res)
		const historyEntryListReq: Sockets.HistoryEntryList.Call = {
			lorebookId: book.id
		}
		await historyEntryList(socket, historyEntryListReq, emitToUser)
	} catch (error) {
		console.error("Error iterating to next history entry:", error)
		socket.emit("error", {
			error: "Failed to iterate to next history entry."
		})
	}
}

export async function lorebookImport(
	socket: any,
	message: Sockets.LorebookImport.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		console.log("Importing lorebook data:", message.lorebookData)
		let charId: number | undefined = message.characterId
		let char: Partial<SelectCharacter> | undefined = undefined
		let card = CharacterBook.from_json(message.lorebookData)

		console.log("Importing lorebook data:", card)

		if (!card) {
			return socket.emit("error", { error: "No lorebook data provided." })
		}

		const userId = 1 // TODO: Replace with actual user ID from socket data

		// If message.characterId is provided, ensure it exists
		if (charId) {
			char = await db.query.characters.findFirst({
				where: (c, { eq }) => eq(c.id, charId) && eq(c.userId, userId),
				columns: {
					id: true,
					lorebookId: true
				}
			})
			if (!char) {
				return socket.emit("error", {
					error: "Character not found."
				})
			}

			if (char.lorebookId) {
				return socket.emit("error", {
					error: "Character already has a lorebook linked."
				})
			}
		}

		const [book] = await db
			.insert(schema.lorebooks)
			.values({
				name: card.name || "Imported Lorebook",
				description: card.description,
				userId,
				extraJson: {}
			})
			.returning()

		let position = 0
		const queries: Promise<any>[] = []
		card.entries.forEach((entry) => {
			// World entries are the most agnostic, so we will import all entries as world lore entries
			// Get priority from the entry. If the priority is null/less than 1,
			// If the priority is greater than 3, set it to 3
			if (entry.priority === null || (entry.priority || 1) < 1) {
				entry.priority = 1
			} else if ((entry.priority || 1) > 3) {
				entry.priority = 3
			}
			// console.log("Importing lore entry:", JSON.stringify(entry))
			queries.push(
				db.insert(schema.worldLoreEntries).values({
					name: entry.name || entry.comment || "Imported Entry",
					content: entry.content || "",
					lorebookId: book.id,
					position,
					keys: entry.keys.join(", ") || "",
					enabled: entry.enabled ?? true,
					constant: entry.constant ?? false,
					priority: entry.priority || 1,
					extraJson: {}
				})
			)
			position++
		})

		await Promise.all(queries)

		// If character Id, add the lorebook to the character, then add the character as a binding
		if (char) {
			await db
				.update(schema.characters)
				.set({ lorebookId: book.id })
				.where(eq(schema.characters.id, char.id!))
			await db.insert(schema.lorebookBindings).values({
				characterId: char.id,
				lorebookId: book.id,
				binding: "{char:1}"
			})
		}

		const completedBook = await db.query.lorebooks.findFirst({
			where: (l, { eq }) => eq(l.id, book.id),
			with: {
				lorebookBindings: true,
				worldLoreEntries: true,
				characterLoreEntries: true,
				historyEntries: true
			}
		})

		const res: Sockets.LorebookImport.Response = {
			lorebook: completedBook
		}
		emitToUser("lorebookImport", res)
		const lbListReq: Sockets.LorebookList.Call = {
			userId: userId
		}
		await lorebookList(socket, lbListReq, emitToUser)
	} catch (error) {
		console.error("Error importing lorebook:", error)
		socket.emit("error", { error: "Failed to import lorebook." })
	}
}
