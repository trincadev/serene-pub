import { db } from "$lib/server/db"
import { and, eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import { user as loadUser } from "./users"

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
        emitToUser("connectionError", { error: "Connection not found." })
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
    const [conn] = await db.insert(schema.connections).values(message.connection).returning()
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
        emitToUser("setUserActiveConnectionError", { error: "User not found." })
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
    // For now, just try a fetch to the Ollama baseUrl + '/api/tags' or similar endpoint
    const { baseUrl, extraJson } = message.connection
    let ok = false,
        error = null,
        models = []
    try {
        const url = baseUrl?.endsWith("/") ? baseUrl : baseUrl + "/"
        const resp = await fetch(url + "api/tags", { method: "GET" })
        ok = resp.ok
        if (ok) {
            const data = await resp.json()
            models = data.models || []
        }
    } catch (e: any) {
        error = e.message || String(e)
    }
    const res: Sockets.TestConnection.Response = { ok, error, models }
    emitToUser("testConnection", res)
}

export async function refreshOllamaModels(
    socket: any,
    message: Sockets.RefreshOllamaModels.Call,
    emitToUser: (event: string, data: any) => void
) {
    let models = [],
        error = null
    try {
        const url = message.baseUrl.endsWith("/") ? message.baseUrl : message.baseUrl + "/"
        const resp = await fetch(url + "api/tags", { method: "GET" })
        if (resp.ok) {
            const data = await resp.json()
            models = data.models || []
        } else {
            error = "Failed to fetch models: " + resp.status
        }
    } catch (e: any) {
        error = e.message || String(e)
    }
    const res: Sockets.RefreshOllamaModels.Response = { models, error }
    emitToUser("refreshOllamaModels", res)
}
