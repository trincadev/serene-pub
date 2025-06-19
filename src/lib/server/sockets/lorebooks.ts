import { db } from "$lib/server/db"
import { emit } from "process"
import * as schema from "$lib/server/db/schema"

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
		with: {
			worldLoreEntries: true,
			characterLoreEntries: true,
			historyEntries: true
		},
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
			historyEntries: true
		}
	})
    if (!book) {
        return socket.emit("error", { error: "Lorebook not found." })
    }
	const res: Sockets.Lorebook.Response = { lorebook: book }
	await lorebookList(socket, { userId }, emitToUser)
	emitToUser("lorebook", res)
}

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
