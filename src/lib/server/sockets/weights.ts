import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { eq } from "drizzle-orm"
import { user } from "./users"

// --- WEIGHTS SOCKET HANDLERS ---

export async function weights(
    socket: any,
    message: { id: number },
    emitToUser: (event: string, data: any) => void
) {
    const weights = await db.query.weights.findFirst({
        where: (w, { eq }) => eq(w.id, message.id)
    })
    emitToUser("weights", { weights })
}

export async function weightsList(
    socket: any,
    message: {},
    emitToUser: (event: string, data: any) => void
) {
    const weightsList = await db.query.weights.findMany({
        columns: {
            id: true,
            name: true,
            isImmutable: true
        }
    })
    emitToUser("weightsList", { weightsList })
}

export async function setUserActiveWeights(
    socket: any,
    message: Sockets.SetUserActiveWeights.Call,
    emitToUser: (event: string, data: any) => void
) {
    const currentUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, 1)
    })
    if (!currentUser) {
        emitToUser("error", { error: "User not found." })
        return
    }
    const updatedUser = await db
        .update(schema.users)
        .set({
            activeWeightsId: message.id
        })
        .where(eq(schema.users.id, currentUser.id))
    await user(socket, {}, emitToUser)
    await weights(socket, { id: message.id }, emitToUser)
    const res: Sockets.SetUserActiveWeights.Response = { user: updatedUser }
    emitToUser("setUserActiveWeights", res)
}

export async function createWeights(
    socket: any,
    message: any,
    emitToUser: (event: string, data: any) => void
) {
    const [weights] = await db.insert(schema.weights).values(message.weights).returning()
    await setUserActiveWeights(socket, { id: weights.id }, emitToUser)
    await weightsList(socket, {}, emitToUser)
    emitToUser("createWeights", {})
}

export async function deleteWeights(
    socket: any,
    message: Sockets.DeleteWeights.Call,
    emitToUser: (event: string, data: any) => void
) {
    const currentWeights = await db.query.weights.findFirst({
        where: (w, { eq }) => eq(w.id, message.id)
    })
    if (currentWeights!.isImmutable) {
        emitToUser("error", { error: "Cannot delete immutable weights." })
        return
    }
    const currentUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, 1)
    })
    if (currentUser!.activeWeightsId === message.id) {
        await setUserActiveWeights(socket, { id: 1 }, emitToUser)
    }
    await db.delete(schema.weights).where(eq(schema.weights.id, message.id))
    await weightsList(socket, {}, emitToUser)
    const res: Sockets.DeleteWeights.Response = { id: message.id }
    emitToUser("deleteWeights", res)
}

export async function updateWeights(
    socket: any,
    message: Sockets.UpdateWeights.Call,
    emitToUser: (event: string, data: any) => void
) {
    console.log("updateWeights", message)
    const id = message.weights.id
    delete message.weights.id // Remove id from weights object to avoid conflicts
    const currentWeights = await db.query.weights.findFirst({
        where: (w, { eq }) => eq(w.id, id)
    })
    if (currentWeights!.isImmutable) {
        emitToUser("error", { error: "Cannot update immutable weights." })
        return
    }
    const updatedWeights = await db
        .update(schema.weights)
        .set(message.weights)
        .where(eq(schema.weights.id, id))
        .returning()
    await weightsList(socket, {}, emitToUser)
    await weights(socket, { id }, emitToUser)
    const res: Sockets.UpdateWeights.Response = { weights: updatedWeights }
    emitToUser("updateWeights", res)
}
