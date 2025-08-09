import path from "path"
import envPaths from "env-paths"
import { db } from "$lib/server/db"
import { eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import { writeFile, mkdir } from "fs/promises"
import { v4 as uuid } from "uuid"

/**
 * Gets the application data directory with optional override from environment
 * Checks SERENE_PUB_DATA_DIR environment variable first, falls back to envPaths
 */
export function getAppDataDir() {
	const envDataDir = process.env.SERENE_PUB_DATA_DIR
	if (envDataDir) {
		return envDataDir
	}

	const paths = envPaths("SerenePub", { suffix: "" })
	return paths.data
}

/**
 * Gets the database data directory (app data dir + /data)
 * Includes CI environment check for compatibility with existing logic
 */
export function getDbDataDir() {
	const isCI = process.env.CI === "true"
	if (isCI) {
		return "~/SerenePubData"
	}

	const appDataDir = getAppDataDir()
	return path.join(appDataDir, "data")
}

export function getCharacterDataDir({
	characterId,
	userId
}: {
	characterId: number
	userId: number
}) {
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

export function getPersonaDataDir({
	personaId,
	userId
}: {
	personaId: number
	userId: number
}) {
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
	const filename = `avatar-${uuid().substring(0, 4)}.${ext}`
	const avatarDir = getCharacterDataDir({
		characterId: character.id,
		userId: character.userId
	})
	const oldAvatar = character.avatar
	// Ensure the directory exists
	await mkdir(avatarDir, { recursive: true })
	// Save the new avatar file
	const filePath = path.join(avatarDir, filename)
	await writeFile(filePath, avatarFile, { flag: "w" }) // Write the file to disk
	const avatar = `/images/data/users/${character.userId}/characters/${character.id}/${filename}` // Construct URL for the avatar
	await db
		.update(schema.characters)
		.set({ avatar })
		.where(eq(schema.characters.id, character.id))
	// Delete old avatar file if it exists and is not the same as the new one
	if (oldAvatar && oldAvatar !== avatar) {
		try {
			const oldAvatarPath = path.join(avatarDir, path.basename(oldAvatar))
			await import("fs/promises").then((fs) => fs.unlink(oldAvatarPath))
		} catch (e) {
			// Ignore error if file does not exist
		}
	}
}

export async function handlePersonaAvatarUpload({
	persona,
	avatarFile
}: {
	persona: any
	avatarFile: Buffer
}) {
	const ext = persona.avatarType?.split("/")[1] || "png"
	const filename = `avatar-${uuid().substring(0, 4)}.${ext}` // Use UUID to ensure unique filename
	const avatarDir = getPersonaDataDir({
		personaId: persona.id,
		userId: persona.userId
	})
	const oldAvatar = persona.avatar
	// Ensure the directory exists
	await mkdir(avatarDir, { recursive: true })
	// Save the new avatar file
	const filePath = path.join(avatarDir, filename)
	await writeFile(filePath, avatarFile, { flag: "w" }) // Write the file to disk
	const avatar = `/images/data/users/${persona.userId}/personas/${persona.id}/${filename}` // Construct URL for the avatar
	await db
		.update(schema.personas)
		.set({ avatar })
		.where(eq(schema.personas.id, persona.id))
	// Delete old avatar file if it exists and is not the same as the new one
	if (oldAvatar && oldAvatar !== avatar) {
		try {
			const oldAvatarPath = path.join(avatarDir, path.basename(oldAvatar))
			await import("fs/promises").then((fs) => fs.unlink(oldAvatarPath))
		} catch (e) {
			// Ignore error if file does not exist
		}
	}
}
