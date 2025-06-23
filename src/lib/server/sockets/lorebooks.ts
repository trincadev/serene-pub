import { db } from "$lib/server/db"
import { emit } from "process"
import * as schema from "$lib/server/db/schema"
import { eq } from "drizzle-orm"

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
		orderBy: (l, { desc }) => desc(l.name)
	})
	const res: Sockets.LorebookList.Response = { lorebookList: books }
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
			lorebookBindings: true
		}
	})
    if (!book) {
        return socket.emit("error", { error: "Lorebook not found." })
    }
	const res: Sockets.Lorebook.Response = { lorebook: book }
	await lorebookList(socket, { userId }, emitToUser)
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

		const [newBook] = await db
			.insert(schema.lorebooks)
			.values({
				name: message.name,
				userId
			})
			.returning()
		const res: Sockets.CreateLorebook.Response = { lorebook: newBook }
		emitToUser("createLorebook", res)
		await lorebookList(socket, { userId }, emitToUser)
	} catch (error) {
		console.error("Error creating lorebook:", error)
		socket.emit("error", { error: "Failed to create lorebook." })
	}
}

export async function createLorebookBinding(
	socket: any,
	message: Sockets.CreateLorebookBinding.Call, // { lorebookBinding: { lorebookId, characterId?, personaId? }}
	emitToUser: (event: string, data: any) => void
) {
	try {
		const userId = 1 // TODO: Replace with actual user ID from socket data

		if (!!message.lorebookBinding.characterId && !!message.lorebookBinding.personaId) {
			return socket.emit("error", { error: "Cannot bind both character and persona." })
		}

		// Get the lorebook
		const book = await db.query.lorebooks.findFirst({
			where: (l, { and, eq }) =>
				and(eq(l.id, message.lorebookBinding.lorebookId), eq(l.userId, userId)),
			with: {
				lorebookBindings: true
			}
		})

		if (!book) {
			return socket.emit("error", { error: "Lorebook not found." })
		}

		// binding is strictly shapped as  "{char:1}", 2, 3 etc. Find the next available binding number by parsing the existing bindings
		const existingBindings = book.lorebookBindings.map(b => b.binding)
		const rgx: RegExp = /{(\w+):(\d+)}/
		const existingNumbers = existingBindings
			.map(binding => {
				const match = binding.match(rgx)
				return match ? parseInt(match[2], 10) : null
			})
			.filter(num => num !== null) as number[]
		let nextBindingNumber = 1
		while (existingNumbers.includes(nextBindingNumber)) {
			nextBindingNumber++
		}

		// Create the new binding
		const newBinding = {
			lorebookId: book.id,
			binding: `{char:${nextBindingNumber}}`,
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
			id: true,
		},
		with: {
			lorebookBindings: !!message.with ? {
				with: message.with
			} : true
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
		if (!!message.lorebookBinding.characterId && !!message.lorebookBinding.personaId) {
			return socket.emit("error", { error: "Cannot link both character and persona." })
		}

		const binding = await db.query.lorebookBindings.findFirst({
			where: (b, { eq }) =>
				eq(b.id, message.lorebookBinding.id),
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
			return socket.emit("error", { error: "Lorebook binding not found." })
		}

		if (binding.lorebook.userId !== userId) {
			return socket.emit("error", { error: "You do not have permission to update this lorebook binding." })
		}

		const updatedBinding = await db
			.update(schema.lorebookBindings)
			.set({
				characterId: message.lorebookBinding.characterId || null,
				personaId: message.lorebookBinding.personaId || null
			})
			.where(eq(schema.lorebookBindings.id, binding.id))
			.returning()

		const res: Sockets.UpdateLorebookBinding.Response = { lorebookBinding: updatedBinding[0] }
		emitToUser("updateLorebookBinding", res)
		await lorebookBindingList(socket, { lorebookId: binding.lorebookId }, emitToUser)
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

	const res: Sockets.WorldLoreEntryList.Response = { worldLoreEntryList: book.worldLoreEntries }
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
		data.name = data.name!.trim()
		data.content = data.content!.trim()
		// data.keys = data.keys

		// Get next available position for the lore entry
		const existingEntries = await db.query.worldLoreEntries.findMany({
			where: (e, { eq }) => eq(e.lorebookId, data.lorebookId),
			columns: {
				id: true,
				position: true
			},
			orderBy: (e, { asc }) => asc(e.position) // Don't trust this to be ordered in sqlite
		})

		let nextPosition = 1
		if (existingEntries.length > 0) {
			// Find the first available position
			const positions = existingEntries.map(e => e.position)
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
		await lorebookBindingList(socket, { lorebookId: newEntry.lorebookId }, emitToUser)

		const res: Sockets.CreateWorldLoreEntry.Response = { worldLoreEntry: newEntry }
		emitToUser("createWorldLoreEntry", res)
		const entryListReq: Sockets.WorldLoreEntryList.Call = { lorebookId: newEntry.lorebookId }
		await worldLoreEntryList(socket, entryListReq, emitToUser)
	} catch (error) {
		console.error("Error creating world lore entry:", error)
		socket.emit("error", { error: "Failed to create world lore entry." })
	}
}

async function syncLorebookBindings({lorebookId}:{ lorebookId: number }) {
	const queries: (() => Promise<any>)[] = []
	// Query all lorebook bindings for the given lorebook
	const existingBindings = await db.query.lorebookBindings.findMany({
		where: (b, { eq }) => eq(b.lorebookId, lorebookId),
	})
	// Query all world, character and history entries for the given lorebook
	const worldEntries = await db.query.worldLoreEntries.findMany({
		where: (e, { eq }) => eq(e.lorebookId, lorebookId),
	})
	const characterEntries = await db.query.characterLoreEntries.findMany({
		where: (e, { eq }) => eq(e.lorebookId, lorebookId),
	})
	const historyEntries = await db.query.historyEntries.findMany({
		where: (e, { eq }) => eq(e.lorebookId, lorebookId),
	})
	// Create a list of all unique lorebook bindings from the entries
	const foundBindings: string[] = []
	for (const entry of [...worldEntries, ...characterEntries, ...historyEntries]) {
        const keys = Array.isArray(entry.keys)
            ? entry.keys
            : (typeof entry.keys === "string" && entry.keys.length > 0
                ? [entry.keys]
                : []);
    const matches = keys.filter(key => key.startsWith("{char:") && key.endsWith("}"));
    for (const match of matches) {
        if (!foundBindings.includes(match)) {
            foundBindings.push(match);
        }
    }
	}
	// If a binding does not exist in the lorebook bindings, create it without a character or persona
	foundBindings.forEach(fb => {
		const existingBinding = existingBindings.find(eb => eb.binding === fb)
		if (!existingBinding) {
			queries.push(
				db.insert(schema.lorebookBindings).values({
					lorebookId,
					binding: fb,
					characterId: null,
					personaId: null
				}) as any as () => Promise<any>
			)
		}
	})
	// If a binding exists in the lorebook bindings without a bound character or persona, consider it orphaned and delete it
	existingBindings.forEach(eb => {
		if (!!eb.characterId || !!eb.personaId) {return} // Skip bindings that are still in use
		const isBindingUsed = foundBindings.some(fb => fb === eb.binding)
		if (!isBindingUsed) {
			queries.push(
				db.delete(schema.lorebookBindings).where(eq(schema.lorebookBindings.id, eb.id)) as any as () => Promise<any>
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
				and(eq(l.id, message.worldLoreEntry.lorebookId), eq(l.userId, userId)),
			columns: {
				id: true,
				userId: true
			}
		})

		if (!lorebook) {
			return socket.emit("error", { error: "Lorebook not found or you do not have permission to edit it." })
		}

		const entry = await db.query.worldLoreEntries.findFirst({
			where: (e, { eq }) => eq(e.id, message.worldLoreEntry.id)
		})

		if (!entry) {
			return socket.emit("error", { error: "World lore entry not found." })
		}

		const data: SelectWorldLoreEntry = {...message.worldLoreEntry}
		data.name = data.name!.trim()
		data.content = data.content!.trim()
		// data.keys = data.keys

		const [updatedEntry] = await db
			.update(schema.worldLoreEntries)
			.set(data)
			.where(eq(schema.worldLoreEntries.id, entry.id))
			.returning()

		await syncLorebookBindings({ lorebookId: entry.lorebookId })
		await lorebookBindingList(socket, { lorebookId: entry.lorebookId }, emitToUser)

		const res: Sockets.UpdateWorldLoreEntry.Response = { worldLoreEntry: updatedEntry }
		emitToUser("updateWorldLoreEntry", res)
		const entryListReq: Sockets.WorldLoreEntryList.Call = { lorebookId: updatedEntry.lorebookId }
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

		const entry = await db.query.worldLoreEntries.findFirst({
			where: (e, { eq }) => eq(e.id, message.id)
		})

		if (!entry || entry.userId !== userId) {
			return socket.emit("error", { error: "World lore entry not found or you do not have permission to delete it." })
		}

		await db.delete(schema.worldLoreEntries).where(eq(schema.worldLoreEntries.id, entry.id))

		const res: Sockets.DeleteWorldLoreEntry.Response = { id: entry.id, lorebookId: entry.lorebookId }
		emitToUser("deleteWorldLoreEntry", res)
		await worldLoreEntryList(socket, {}, emitToUser)
	} catch (error) {
		console.error("Error deleting world lore entry:", error)
		socket.emit("error", { error: "Failed to delete world lore entry." })
	}
}