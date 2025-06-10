import { db } from "$lib/server/db"
import { and, eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import * as fsPromises from "fs/promises"
import { getCharacterDataDir, handleCharacterAvatarUpload } from "../utils"
import extractChunks from 'png-chunks-extract';
import {decode as decodeText} from 'png-chunk-text';

export async function charactersList(
    socket: any,
    message: Sockets.CharactersList.Call,
    emitToUser: (event: string, data: any) => void
) {
    const charactersList = await db.query.characters.findMany({
        columns: {
            id: true,
            name: true,
            avatar: true,
            isFavorite: true
        },
        where: (c, { eq }) => eq(c.userId, 1) // TODO: Replace with actual user id
    })
    const res: Sockets.CharactersList.Response = { charactersList }
    emitToUser("charactersList", res)
}

export async function character(
    socket: any,
    message: Sockets.Character.Call,
    emitToUser: (event: string, data: any) => void
) {
    const character = await db.query.characters.findFirst({
        where: (c, { eq }) => eq(c.id, message.id)
    })
    if (character) {
        const res: Sockets.Character.Response = { character }
        emitToUser("character", res)
    }
}

export async function createCharacter(
    socket: any,
    message: Sockets.CreateCharacter.Call,
    emitToUser: (event: string, data: any) => void
) {
    try {
        const data = message.character
        delete data.avatar // Remove avatar from character data to avoid conflicts
        const [character] = await db
            .insert(schema.characters)
            .values({ ...message.character, userId: 1 })
            .returning()

        if (message.avatarFile) {
            await handleCharacterAvatarUpload({
                character,
                avatarFile: message.avatarFile
            })
        }

        await charactersList(socket, {}, emitToUser)

        const res: Sockets.CreateCharacter.Response = { character }
        emitToUser("createCharacter", res)
    } catch (e: any) {
        console.error("Error creating character:", e)
        emitToUser("error", { error: e.message || "Failed to create character." })
        return
    }
}

export async function updateCharacter(
    socket: any,
    message: Sockets.UpdateCharacter.Call,
    emitToUser: (event: string, data: any) => void
) {
    const data = message.character
    const id = data.id
    const userId = 1 // Replace with actual userId

    // Remove userId and id if present and optional
    if ('userId' in data) (data as any).userId = undefined
    if ('id' in data) (data as any).id = undefined
    delete data.avatar // Remove avatar from character data to avoid conflicts
    const [updated] = await db
        .update(schema.characters)
        .set(data)
        .where(and(eq(schema.characters.id, id), eq(schema.characters.userId, userId)))
        .returning()

    if (message.avatarFile) {
        await handleCharacterAvatarUpload({
            character: updated,
            avatarFile: message.avatarFile
        })
    }

    const res: Sockets.UpdateCharacter.Response = { character: updated }
    await charactersList(socket, {}, emitToUser)
    emitToUser("updateCharacter", res)
}

export async function deleteCharacter(
    socket: any,
    message: Sockets.DeleteCharacter.Call,
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1 // Replace with actual userId
    await db
        .delete(schema.characters)
        .where(
            and(eq(schema.characters.id, message.characterId), eq(schema.characters.userId, userId))
        )
    await charactersList(socket, {}, emitToUser)
    // Delete the character data directory if it exists
    const avatarDir = getCharacterDataDir({
        characterId: message.characterId,
        userId
    })
    try {
        await fsPromises.rmdir(avatarDir, { recursive: true })
    } catch (err) {
        console.error("Error deleting character data directory:", err)
    }
    // Emit the delete event
    const res: Sockets.DeleteCharacter.Response = { id: message.characterId }
    await charactersList(socket, {}, emitToUser)
    emitToUser("deleteCharacter", res)
}

export async function characterCardImport(
    socket: any,
    message: { file?: string },
    emitToUser: (event: string, data: any) => void
) {
    const userId = 1
    let charaData: CharaImportMetadata
    let base64 = message.file!
    if (base64.startsWith("data:")) base64 = base64.split(",")[1]
    const buffer = Buffer.from(base64, "base64")

    const chunks = extractChunks(buffer)

    for (const chunk of chunks) {
        if (chunk.name === "tEXt") {
            const { keyword, text } = decodeText(chunk.data)
            if (keyword.toLocaleLowerCase() === "chara") {
                charaData = JSON.parse(
                    Buffer.from(text, "base64").toString("utf8")
                ) as CharaImportMetadata
            }
        }
    }

    const data: InsertCharacter = {
        userId,
        name: charaData!.data.name || "Imported Character",
        description: charaData!.data.description || "",
        personality: charaData!.data.personality || "",
        scenario: charaData!.data.scenario || "",
        firstMessage: charaData!.data.first_mes || "",
        exampleDialogues: charaData!.data.mes_example || "",
    }

    const [character] = await db.insert(schema.characters).values(data).returning()
    await handleCharacterAvatarUpload({
        character,
        avatarFile: buffer
    })
    const res: Sockets.CreateCharacter.Response = { character }
    emitToUser("createCharacter", res)
    await charactersList(socket, {}, emitToUser)
}