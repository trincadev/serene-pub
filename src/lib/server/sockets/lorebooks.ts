
import { db } from "$lib/server/db"

export async function lorebookList(
    socket: any,
    message: Sockets.LorebookList.Call,
    emitToUser: (event: string, data: any) => void
) {
    // Fetch all lorebooks for the user
    const userId = socket.data.user?.id
    if (!userId) return socket.emit("lorebooksList", { lorebooksList: [] })
    const books = await db.query.lorebooks.findMany({
      where: (l, {eq}) => eq(l.userId, userId),
      with: {
        worldLoreEntries: true,
        characterLoreEntries: true,
        historyEntries: true
      },
      orderBy: (l, {desc}) => desc(l.name)
    })
    socket.emit("lorebooksList", { lorebooksList: books })
  }

export async function lorebook(
    socket: any,
    message: Sockets.Lorebook.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = socket.data.user?.id
    if (!userId) return socket.emit("lorebookGet", { lorebook: null })
    const book = await db.query.lorebooks.findFirst({
      where: (l, {and, eq}) => and(eq(l.id, message.id), eq(l.userId, userId)),
      with: {
        worldLoreEntries: true,
        characterLoreEntries: true,
        historyEntries: true
      }
    })
    socket.emit("lorebookGet", { lorebook: book })
}
