import path from 'path';
import envPaths from 'env-paths';
import {db} from '$lib/server/db';
import {eq} from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import {writeFile, mkdir} from 'fs/promises';
import * as fsPromises from 'fs/promises';

export function getAppDataDir() {
    const paths = envPaths("SerenePub", { suffix: "" })
    return paths.data
}

export function getCharacterDataDir({characterId, userId}: { characterId: number; userId: number }) {
    const appData = getAppDataDir()
    return path.join(
        appData,
        "data",
        "users",
        String(userId),
        "characters",
        String(characterId)
    )
}

export function getPersonaDataDir({personaId, userId}: { personaId: number; userId: number }) {
    const appData = getAppDataDir()
    return path.join(
        appData,
        "data",
        "users",
        String(userId),
        "personas",
        String(personaId)
    )
}

export async function handleCharacterAvatarUpload({
    character,
    avatarFile
}: {
    character: any
    avatarFile: Buffer
}) {
    const ext = character.avatarType?.split("/")[1] || "png"
    const filename = `avatar.${ext}`
    const avatarDir = getCharacterDataDir({
        characterId: character.id,
        userId: character.userId
    })
    // Ensure the directory exists
    await mkdir(avatarDir, { recursive: true })
    // Save the new avatar file
    const filePath = path.join(avatarDir, filename)
    await writeFile(filePath, avatarFile, { flag: "w"}) // Write the file to disk
    const avatar = `/images/data/users/${character.userId}/characters/${character.id}/${filename}` // Construct URL for the avatar
    await db.update(schema.characters).set({ avatar }).where(eq(schema.characters.id, character.id))
}

export async function handlePersonaAvatarUpload({
    persona,
    avatarFile
}: {
    persona: any
    avatarFile: Buffer
}) {
    const ext = persona.avatarType?.split("/")[1] || "png"
    const filename = `avatar.${ext}`
    const avatarDir = getPersonaDataDir({
        personaId: persona.id,
        userId: persona.userId
    })
    // Ensure the directory exists
    await mkdir(avatarDir, { recursive: true })
    // Save the new avatar file
    const filePath = path.join(avatarDir, filename)
    await writeFile(filePath, avatarFile, { flag: "w"}) // Write the file to disk
    const avatar = `/images/data/users/${persona.userId}/personas/${persona.id}/${filename}` // Construct URL for the avatar
    await db.update(schema.personas).set({ avatar }).where(eq(schema.personas.id, persona.id))
}