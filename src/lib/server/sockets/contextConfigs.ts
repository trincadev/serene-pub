import { db } from "$lib/server/db"
import { eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import {user as loadUser, user} from './users';

export async function contextConfigsList(
    socket: any,
    message: Sockets.ContextConfigsList.Call,
    emitToUser: (event: string, data: any) => void
) {
    const contextConfigsList = await db.query.contextConfigs.findMany({
        columns: {
            id: true,
            name: true,
            isImmutable: true
        }
    })
    const res: Sockets.ContextConfigsList.Response = { contextConfigsList }
    emitToUser("contextConfigsList", res)
}

export async function contextConfig(
    socket: any,
    message: Sockets.ContextConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const contextConfig = await db.query.contextConfigs.findFirst({
        where: (c, { eq }) => eq(c.id, message.id)
    })
    if (contextConfig) {
        const res: Sockets.ContextConfig.Response = { contextConfig }
        emitToUser("contextConfig", res)
    }
}

export async function createContextConfig(
    socket: any,
    message: Sockets.CreateContextConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const [contextConfig] = await db
        .insert(schema.contextConfigs)
        .values(message.contextConfig)
        .returning()
    await contextConfigsList(socket, {}, emitToUser)
    const res: Sockets.CreateContextConfig.Response = { contextConfig }
    emitToUser("createContextConfig", res)
}

export async function updateContextConfig(
    socket: any,
    message: Sockets.UpdateContextConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const id = message.contextConfig.id
    const updateData = { ...message.contextConfig }
    delete updateData.id
    console.log("Updating context config with ID:", id, "Data:", updateData)
    const [contextConfig] = await db
        .update(schema.contextConfigs)
        .set(updateData)
        .where(eq(schema.contextConfigs.id, id))
        .returning()
    await contextConfigsList(socket, {}, emitToUser)
    const res: Sockets.UpdateContextConfig.Response = { contextConfig }
    emitToUser("updateContextConfig", res)
    await user(socket, {}, emitToUser)
}

export async function deleteContextConfig(
    socket: any,
    message: Sockets.DeleteContextConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual userId
    let user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, userId)
    })
    if (user?.activeContextConfigId === message.id) {
        await setUserActiveContextConfig(socket, { id: null }, emitToUser)
    }
    await db.delete(schema.contextConfigs).where(eq(schema.contextConfigs.id, message.id))
    await contextConfigsList(socket, {}, emitToUser)
    const res: Sockets.DeleteContextConfig.Response = { id: message.id }
    emitToUser("deleteContextConfig", res)
}

export async function setUserActiveContextConfig(
    socket: any,
    message: Sockets.SetUserActiveContextConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual userId
    const updatedUser = await db
        .update(schema.users)
        .set({
            activeContextConfigId: message.id
        })
        .where(eq(schema.users.id, userId))
    // You may want to emit the user and contextConfig updates here as in the original
    await loadUser(socket, {}, emitToUser)
    emitToUser("setUserActiveContextConfig", { user: updatedUser })
}
