import { db } from "$lib/server/db"

export async function user(socket: any, message: {}, emitToUser: (event: string, data: any) => void) {
    const userId = 1 // Replace with actual user id
    const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId)
    })
    socket.server.to("user_" + userId).emit("user", { user })
}
