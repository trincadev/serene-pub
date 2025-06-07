import { db } from "$lib/server/db"
import { and, eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import { handlePersonaAvatarUpload } from "../utils"

export async function personasList(
    socket: any,
    message: Sockets.PersonasList.Call,
    emitToUser: (event: string, data: any) => void
) {
    const personasList = await db.query.personas.findMany({
        columns: {
            id: true,
            name: true,
            avatar: true,
            isDefault: true,
            description: true,
            position: true
        },
        where: (p, { eq }) => eq(p.userId, 1) // TODO: Replace with actual user id
    })
    const res: Sockets.PersonasList.Response = { personasList }
    emitToUser("personasList", res)
}

export async function persona(
    socket: any,
    message: Sockets.Persona.Call,
    emitToUser: (event: string, data: any) => void
) {
    const persona = await db.query.personas.findFirst({
        where: (p, { eq }) => eq(p.id, message.id)
    })
    const res: Sockets.Persona.Response = { persona }
    emitToUser("persona", res)
}

export async function createPersona(
    socket: any,
    message: Sockets.CreatePersona.Call,
    emitToUser: (event: string, data: any) => void
) {
    try {
        const data = message.persona
        delete data.avatar
        const [persona] = await db
            .insert(schema.personas)
            .values({ ...data, userId: 1 })
            .returning()

        if (message.avatarFile) {
            await handlePersonaAvatarUpload({
                persona,
                avatarFile: message.avatarFile
            })
        }

        await personasList(socket, {}, emitToUser)
        const res: Sockets.CreatePersona.Response = { persona }
        emitToUser("createPersona", res)
    } catch (e: any) {
        console.error("Error creating persona:", e)
        emitToUser("createPersonaError", { error: e.message || String(e) })
        return
    }
}

export async function updatePersona(
    socket: any,
    message: Sockets.UpdatePersona.Call,
    emitToUser: (event: string, data: any) => void
) {
    const data = message.persona
    const id = data.id
    const userId = 1 // Replace with actual userId
    delete data.userId
    delete data.id
    delete data.avatar
    const [updated] = await db
        .update(schema.personas)
        .set(data)
        .where(and(eq(schema.personas.id, id), eq(schema.personas.userId, userId)))
        .returning()

    if (message.avatarFile) {
        await handlePersonaAvatarUpload({
            persona: updated,
            avatarFile: message.avatarFile
        })
    }

    await persona(socket, { id }, emitToUser)
    await personasList(socket, {}, emitToUser)
    const res: Sockets.UpdatePersona.Response = { persona: updated }
    emitToUser("updatePersona", res)
}

export async function deletePersona(
    socket: any,
    message: Sockets.DeletePersona.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual userId
    await db
        .delete(schema.personas)
        .where(and(eq(schema.personas.id, message.id), eq(schema.personas.userId, userId)))
    await personasList(socket, {}, emitToUser)
    const res: Sockets.DeletePersona.Response = { id: message.id }
    emitToUser("deletePersona", res)
}
