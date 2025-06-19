import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { eq } from "drizzle-orm"
import { user } from "./users"

// --- WEIGHTS SOCKET HANDLERS ---

export async function sampling(
    socket: any,
    message: { id: number },
    emitToUser: (event: string, data: any) => void
) {
    const sampling = await db.query.samplingConfigs.findFirst({
        where: (w, { eq }) => eq(w.id, message.id)
    })
    emitToUser("sampling", { sampling })
}

export async function samplingConfigsList(
    socket: any,
    message: {},
    emitToUser: (event: string, data: any) => void
) {
    const samplingConfigsList = await db.query.samplingConfigs.findMany({
        columns: {
            id: true,
            name: true,
            isImmutable: true
        }
    })
    emitToUser("samplingConfigsList", { samplingConfigsList })
}

export async function setUserActiveSamplingConfig(
    socket: any,
    message: Sockets.SetUserActiveSamplingConfig.Call,
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
            activeSamplingConfigId: message.id
        })
        .where(eq(schema.users.id, currentUser.id))
    await user(socket, {}, emitToUser)
    await sampling(socket, { id: message.id }, emitToUser)
    const res: Sockets.SetUserActiveSamplingConfig.Response = { user: updatedUser }
    emitToUser("setUserActiveSamplingConfig", res)
}

export async function createSamplingConfig(
    socket: any,
    message: any,
    emitToUser: (event: string, data: any) => void
) {
    const [sampling] = await db.insert(schema.samplingConfigs).values(message.sampling).returning()
    await setUserActiveSamplingConfig(socket, { id: sampling.id }, emitToUser)
    await samplingConfigsList(socket, {}, emitToUser)
    emitToUser("createSamplingConfig", {})
}

export async function deleteSamplingConfig(
    socket: any,
    message: Sockets.DeleteSamplingConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const currentSamplingConfig = await db.query.samplingConfigs.findFirst({
        where: (w, { eq }) => eq(w.id, message.id)
    })
    if (currentSamplingConfig!.isImmutable) {
        emitToUser("error", { error: "Cannot delete immutable samplingConfigs." })
        return
    }
    const currentUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, 1)
    })
    if (currentUser!.activeSamplingConfigId === message.id) {
        await setUserActiveSamplingConfig(socket, { id: 1 }, emitToUser)
    }
    await db.delete(schema.samplingConfigs).where(eq(schema.samplingConfigs.id, message.id))
    await samplingConfigsList(socket, {}, emitToUser)
    const res: Sockets.DeleteSamplingConfig.Response = { id: message.id }
    emitToUser("deleteSamplingConfig", res)
}

export async function updateSamplingConfig(
    socket: any,
    message: { sampling: any },
    emitToUser: (event: string, data: any) => void
) {
    const id = message.sampling.id
    delete message.sampling.id // Remove id from sampling object to avoid conflicts
    const currentSamplingConfig = await db.query.samplingConfigs.findFirst({
        where: (w, { eq }) => eq(w.id, id)
    })
    if (currentSamplingConfig!.isImmutable) {
        emitToUser("error", { error: "Cannot update immutable samplingConfigs." })
        return
    }
    const updatedSamplingConfig = await db
        .update(schema.samplingConfigs)
        .set(message.sampling)
        .where(eq(schema.samplingConfigs.id, id))
        .returning()
    await samplingConfigsList(socket, {}, emitToUser)
    await sampling(socket, { id }, emitToUser)
    await user(socket, {}, emitToUser)
    const res = { samplingConfig: updatedSamplingConfig }
    emitToUser("updateSamplingConfig", res)
}
