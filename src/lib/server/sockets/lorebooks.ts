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
	console.log("Fetching lorebook binding list for message:", message)
	const userId = 1 // TODO: Replace with actual user ID from socket data
	if (!userId) return socket.emit("error", { error: "User not found." })

	const book = await db.query.lorebooks.findFirst({
		where: (l, { and, eq }) =>
			and(eq(l.id, message.lorebookId), eq(l.userId, userId)),
		columns: {
			id: true,
		},
		with: {
			lorebookBindings: true
		}
	})

	// If the book doesn't exist, return an error
	if (!book) {
		return socket.emit("error", { error: "Lorebook not found." })
	}

	const res: Sockets.LorebookBindingList.Response = { lorebookBindingList: book.lorebookBindings }
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