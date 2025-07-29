import { db } from "$lib/server/db"
import * as schema from "$lib/server/db/schema"
import { eq } from "drizzle-orm"

export async function systemSettings(
	socket: any,
	message: Sockets.SystemSettings.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const settings = await db.query.systemSettings.findFirst({
			where: eq(schema.systemSettings.id, 1),
			columns: {
				id: false, // We don't need the ID in the response
			}
		})

		if (!settings) {
			throw new Error("System settings not found")
		}

		const res: Sockets.SystemSettings.Response = {
			systemSettings: settings
		}

		emitToUser("systemSettings", res)

	} catch (error: any) {
		console.error("Error fetching system settings:", error)
		emitToUser("error", {
			error: "Failed to fetch system settings"
		})
	}
}

export async function updateOllamaManagerEnabled(
	socket: any,
	message: Sockets.UpdateOllamaManagerEnabled.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		await db.update(schema.systemSettings).set({
			ollamaManagerEnabled: message.enabled
		}).where(eq(schema.systemSettings.id, 1))
		
		const res: Sockets.UpdateOllamaManagerEnabled.Response = {
			success: true,
			enabled: message.enabled
		}
		emitToUser("updateOllamaManagerEnabled", res)
		await systemSettings(socket, {}, emitToUser) // Refresh system settings after update
	} catch (error: any) {
		console.error("Update Ollama Manager enabled error:", error)
		const res = {
			error: "Failed to update Ollama Manager setting"
		}
		emitToUser("error", res)
	}
}

export async function updateShowAllCharacterFields(
	socket: any,
	message: Sockets.UpdateShowAllCharacterFields.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		await db.update(schema.systemSettings).set({
			showAllCharacterFields: message.enabled
		}).where(eq(schema.systemSettings.id, 1))
		
		const res: Sockets.UpdateShowAllCharacterFields.Response = {
			success: true,
			enabled: message.enabled
		}
		emitToUser("updateShowAllCharacterFields", res)
		await systemSettings(socket, {}, emitToUser) // Refresh system settings after update
	} catch (error: any) {
		console.error("Update show all character fields error:", error)
		const res = {
			error: "Failed to update show all character fields setting"
		}
		emitToUser("error", res)
	}
}

export async function updateEasyCharacterCreation(
	socket: any,
	message: Sockets.UpdateEasyCharacterCreation.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		await db.update(schema.systemSettings).set({
			enableEasyCharacterCreation: message.enabled
		}).where(eq(schema.systemSettings.id, 1))
		
		const res: Sockets.UpdateEasyCharacterCreation.Response = {
			success: true,
			enabled: message.enabled
		}
		emitToUser("updateEasyCharacterCreation", res)
		await systemSettings(socket, {}, emitToUser) // Refresh system settings after update
	} catch (error: any) {
		console.error("Update easy character creation error:", error)
		const res = {
			error: "Failed to update easy character creation setting"
		}
		emitToUser("error", res)
	}
}

export async function updateEasyPersonaCreation(
	socket: any,
	message: Sockets.UpdateEasyPersonaCreation.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		await db.update(schema.systemSettings).set({
			enableEasyPersonaCreation: message.enabled
		}).where(eq(schema.systemSettings.id, 1))
		
		const res: Sockets.UpdateEasyPersonaCreation.Response = {
			success: true,
			enabled: message.enabled
		}
		emitToUser("updateEasyPersonaCreation", res)
		await systemSettings(socket, {}, emitToUser) // Refresh system settings after update
	} catch (error: any) {
		console.error("Update easy persona creation error:", error)
		const res = {
			error: "Failed to update easy persona creation setting"
		}
		emitToUser("error", res)
	}
}
