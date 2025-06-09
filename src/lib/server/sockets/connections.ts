import { db } from "$lib/server/db"
import { and, eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import { user as loadUser } from "./users"
import { OllamaAdapter } from "../connectionAdapters/ollama"
import { TokenCounterManager } from "$lib/server/utils/TokenCounterManager"

// --- CONNECTIONS SOCKET HANDLERS ---

export async function connectionsList(
    socket: any,
    message: Sockets.ConnectionsList.Call,
    emitToUser: (event: string, data: any) => void
) {
    const connectionsList = await db.query.connections.findMany({
        columns: {
            id: true,
            name: true,
            type: true
        }
    })
    const res: Sockets.ConnectionsList.Response = { connectionsList }
    emitToUser("connectionsList", res)
}

export async function connection(
    socket: any,
    message: Sockets.Connection.Call,
    emitToUser: (event: string, data: any) => void
) {
    const connection = await db.query.connections.findFirst({
        where: (c, { eq }) => eq(c.id, message.id)
    })
    if (!connection) {
        emitToUser("error", { error: "Connection not found." })
        return
    }
    const res: Sockets.Connection.Response = { connection }
    emitToUser("connection", res)
}

export async function createConnection(
    socket: any,
    message: Sockets.CreateConnection.Call,
    emitToUser: (event: string, data: any) => void
) {

    let data = {...message.connection }
    if (data.type === "ollama") {
        data = {...OllamaAdapter.connectionDefaults, ...data }
        try {
            const modelsRes = await OllamaAdapter.listModels(data)
            if (!modelsRes.models || modelsRes.models.length === 0) {
                emitToUser("error", { error: "No models found for this connection." })
            } else {
                data.model = modelsRes.models[0].model
            }
        } catch (error: any) {
            console.error("Error fetching models:", error)
            emitToUser("error", { error: "Failed to fetch models for this connection." })
            return
        }
    }

    const [conn] = await db.insert(schema.connections).values(data).returning()
    await setUserActiveConnection(socket, { id: conn.id }, emitToUser)
    await connectionsList(socket, {}, emitToUser)
    const res: Sockets.CreateConnection.Response = { connection: conn }
    emitToUser("createConnection", res)
}

export async function updateConnection(
    socket: any,
    message: Sockets.UpdateConnection.Call,
    emitToUser: (event: string, data: any) => void
) {
    const id = message.connection.id
    if ("id" in message.connection) delete (message.connection as any).id
    const [updated] = await db
        .update(schema.connections)
        .set(message.connection)
        .where(eq(schema.connections.id, id))
        .returning()
    await connection(socket, { id }, emitToUser)
    const res: Sockets.UpdateConnection.Response = { connection: updated }
    emitToUser("updateConnection", res)
}

export async function deleteConnection(
    socket: any,
    message: Sockets.DeleteConnection.Call,
    emitToUser: (event: string, data: any) => void
) {
    const currentUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, 1)
    })
    if (currentUser && currentUser.activeConnectionId === message.id) {
        await setUserActiveConnection(socket, { id: null }, emitToUser)
    }
    await db.delete(schema.connections).where(eq(schema.connections.id, message.id))
    await connectionsList(socket, {}, emitToUser)
    const res: Sockets.DeleteConnection.Response = { id: message.id }
    emitToUser("deleteConnection", res)
}

export async function setUserActiveConnection(
    socket: any,
    message: Sockets.SetUserActiveConnection.Call,
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
            activeConnectionId: message.id
        })
        .where(eq(schema.users.id, currentUser.id))
    // The user handler is not modularized yet, so call as in original
    // @ts-ignore
    await loadUser(socket, {}, emitToUser)
    if (message.id) await connection(socket, { id: message.id }, emitToUser)
    const res: Sockets.SetUserActiveConnection.Response = { user: updatedUser }
    emitToUser("setUserActiveConnection", res)
}

export async function testConnection(
    socket: any,
    message: Sockets.TestConnection.Call,
    emitToUser: (event: string, data: any) => void
) {
    let AdapterClass
    if (message.connection.type === "ollama") {
        AdapterClass = OllamaAdapter
    } else {
        // TODO
    }

    try {
        const res = await AdapterClass!.testConnection(message.connection)
        if (res.ok) {
            emitToUser("testConnection", { ok: true, message: "Connection successful." })
        } else {
            emitToUser("testConnection", { ok: false, message: "Connection failed." })
        }
    } catch (error: any) {
        console.error("Connection test error:", error)
        emitToUser("testConnection", { ok: false, error: "Connection failed"})
    }
}

export async function refreshModels(
    socket: any,
    message: Sockets.RefreshModels.Call,
    emitToUser: (event: string, data: any) => void
) {
    let AdapterClass
    if (message.connection.type === "ollama") {
        AdapterClass = OllamaAdapter
    } else {
        // TODO
    }

    try {
        const res = await AdapterClass!.listModels(message.connection)
        if (!res.models) {
            emitToUser("refreshModels", { ok: false, error: "Failed to refresh models." })
            return
        }
        emitToUser("refreshModels", { ok: true, models: res.models })
    } catch (error: any) {
        console.error("Refresh models error:", error)
        emitToUser("refreshModels", { ok: false, error: "Failed to refresh models." })
    }
}

export async function tokenCounterOptions(
    socket: any,
    message: {},
    emitToUser: (event: string, data: any) => void
) {
    const options = Object.entries(TokenCounterManager.counters).map(([key, desc]) => ({
        value: key,
        label: desc.label
    }))
    emitToUser("tokenCounterOptions", { options })
}
