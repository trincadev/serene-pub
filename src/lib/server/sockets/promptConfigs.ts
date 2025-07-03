import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { eq } from "drizzle-orm"
import { user as loadUser } from "./users"

// List all prompt configs for the current user
export async function promptConfigsList(
    socket: any,
    message: Sockets.PromptConfigsList.Call,
    emitToUser: (event: string, data: any) => void
) {
    const promptConfigsList = await db.query.promptConfigs.findMany({
        columns: {
            id: true,
            name: true,
            isImmutable: true
        },
        orderBy: (c, { asc }) => [asc(c.isImmutable), asc(c.name)],
    })
    const res: Sockets.PromptConfigsList.Response = { promptConfigsList }
    emitToUser("promptConfigsList", res)
}

// Get a single prompt config by id
export async function promptConfig(
    socket: any,
    message: Sockets.PromptConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const promptConfig = await db.query.promptConfigs.findFirst({
        where: (c, { eq }) => eq(c.id, message.id)
    })
    if (promptConfig) {
        const res: Sockets.PromptConfig.Response = { promptConfig }
        emitToUser("promptConfig", res)
    }
}

// Create a new prompt config
export async function createPromptConfig(
    socket: any,
    message: Sockets.CreatePromptConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const [promptConfig] = await db
        .insert(schema.promptConfigs)
        .values(message.promptConfig)
        .returning()
    await promptConfigsList(socket, {}, emitToUser)
    const res: Sockets.CreatePromptConfig.Response = { promptConfig }
    emitToUser("createPromptConfig", res)
}

// Update an existing prompt config
export async function updatePromptConfig(
    socket: any,
    message: Sockets.UpdatePromptConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const id = message.promptConfig.id
    const updateData = { ...message.promptConfig }
    // Only delete if id is present and not required by type
    if (Object.prototype.hasOwnProperty.call(updateData, 'id')) (updateData as any).id = undefined
    const [promptConfig] = await db
        .update(schema.promptConfigs)
        .set(updateData)
        .where(eq(schema.promptConfigs.id, id))
        .returning()
    await promptConfigsList(socket, {}, emitToUser)
    const res: Sockets.UpdatePromptConfig.Response = { promptConfig }
    emitToUser("updatePromptConfig", res)
}

// Delete a prompt config
export async function deletePromptConfig(
    socket: any,
    message: Sockets.DeletePromptConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    await db.delete(schema.promptConfigs).where(eq(schema.promptConfigs.id, message.id))
    await promptConfigsList(socket, {}, emitToUser)
    const res: Sockets.DeletePromptConfig.Response = { id: message.id }
    emitToUser("deletePromptConfig", res)
}

// Set user active prompt config
export async function setUserActivePromptConfig(
    socket: any,
    message: Sockets.SetUserActivePromptConfig.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual userId
    await db
        .update(schema.users)
        .set({
            activePromptConfigId: message.id
        })
        .where(eq(schema.users.id, userId))
    // Fetch the updated user
    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) })
    await loadUser(socket, {}, emitToUser) // Emit updated user info
    await promptConfig(socket, { id: message.id! }, emitToUser)
    if (!user) {
        emitToUser("error", { error: "User not found." })
        return
    }
    const res: Sockets.SetUserActivePromptConfig.Response = { user }
    emitToUser("setUserActivePromptConfig", res)
}
