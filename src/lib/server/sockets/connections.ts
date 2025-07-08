import { db } from "$lib/server/db"
import { and, eq } from "drizzle-orm"
import * as schema from "$lib/server/db/schema"
import { user as loadUser, user } from "./users"
import { getConnectionAdapter } from "../utils/getConnectionAdapter"
import { Ollama } from "ollama"
import ollamaAdapter from "$lib/server/connectionAdapters/OllamaAdapter"
import { OllamaModelSearchSource } from "$lib/shared/constants/OllamaModelSource"


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
		},
		orderBy: (c, { asc }) => [asc(c.type), asc(c.name)],
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
		const res = { error: "Connection not found." }
		emitToUser("error", res)
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
	let data = { ...message.connection }
	const Adapter = getConnectionAdapter(data.type)
	data = { ...Adapter.connectionDefaults, ...data }
	// Ensure id is present for SelectConnection
	// Remove id for insert to avoid UNIQUE constraint error
	if ("id" in data) delete data.id
	try {
		const modelsRes = await Adapter.listModels(data as any)
		if (modelsRes.error) {
			const res = { error: modelsRes.error }
			emitToUser("error", res)
			return
		}
		if (!modelsRes.models || modelsRes.models.length === 0) {
			const res = { error: "No models found for this connection." }
			emitToUser("error", res)
		} else {
			data.model = modelsRes.models[0].id
		}
	} catch (error: any) {
		console.error("Error fetching models:", error)
		const res = { error: "Failed to fetch models for this connection." }
		emitToUser("error", res)
		return
	}
	// Always remove id before insert to let DB auto-increment
	if ("id" in data) delete data.id
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
	await user(socket, {}, emitToUser)
	await connectionsList(socket, {}, emitToUser)
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
	await db
		.delete(schema.connections)
		.where(eq(schema.connections.id, message.id))
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
		const res = { error: "User not found." }
		emitToUser("error", res)
		return
	}
	await db
		.update(schema.users)
		.set({
			activeConnectionId: message.id
		})
		.where(eq(schema.users.id, currentUser.id))
	// The user handler is not modularized yet, so call as in original
	// @ts-ignore
	await loadUser(socket, {}, emitToUser)
	if (message.id) await connection(socket, { id: message.id }, emitToUser)
	const res: Sockets.SetUserActiveConnection.Response = { ok: true }
	emitToUser("setUserActiveConnection", res)
}

export async function testConnection(
	socket: any,
	message: Sockets.TestConnection.Call,
	emitToUser: (event: string, data: any) => void
) {
	const {Adapter, testConnection, listModels} = getConnectionAdapter(message.connection.type)
	if (!Adapter) {
		const res: Sockets.TestConnection.Response = {
			ok: false,
			error: "Unsupported connection type.",
			models: []
		}
		emitToUser("testConnection", res)
		return
	}

	try {
		const result = await testConnection(message.connection)
		let models: any[] = []
		let error: string | null = null
		if (result.ok) {
			const modelsRes = await listModels(message.connection)
			if (modelsRes.error) {
				emitToUser("error", {
					error: modelsRes.error,
				})
				return
			}
			models = modelsRes.models || []
			error = modelsRes.error || null
		} else {
			error = result.error || "Connection failed."
		}
		const res: Sockets.TestConnection.Response = {
			ok: result.ok,
			error: error || null,
			models
		}
		emitToUser("testConnection", res)
	} catch (error: any) {
		console.error("Connection test error:", error)
		const res: Sockets.TestConnection.Response = {
			ok: false,
			error: error?.message || String(error) || "Connection failed.",
			models: []
		}
		emitToUser("testConnection", res)
	}
}

export async function refreshModels(
	socket: any,
	message: Sockets.RefreshModels.Call,
	emitToUser: (event: string, data: any) => void
) {
	const { listModels } = getConnectionAdapter(message.connection.type)

	try {
		const result = await listModels(message.connection)
		if (result.error) {
			const res = {
				error: result.error,
			}
			emitToUser("error", res)
		} else if (!result.models) {
			const res: Sockets.RefreshModels.Response = {
				error: "Failed to refresh models.",
				models: []
			}
			emitToUser("refreshModels", res)
			return
		}
		const res: Sockets.RefreshModels.Response = {
			models: result.models,
			error: null
		}
		emitToUser("refreshModels", res)
	} catch (error: any) {
		console.error("Refresh models error:", error)
		const res: Sockets.RefreshModels.Response = {
			error: "Failed to refresh models.",
			models: []
		}
		emitToUser("refreshModels", res)
	}
}

// --- OLLAMA SPECIFIC FUNCTIONS ---

export async function ollamaSetBaseUrl(
	socket: any,
	message: Sockets.OllamaSetBaseUrl.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		// This would typically update the active Ollama connection's baseUrl
		// For now, we'll just validate the URL format
		const url = new URL(message.baseUrl)
		if (!["http:", "https:"].includes(url.protocol)) {
			emitToUser("error", {
				error: 'Invalid URL protocol'
			})
			throw new Error('Invalid URL protocol')
		}

		await db.update(schema.systemSettings).set({
			ollamaManagerBaseUrl: message.baseUrl
		})
		
		const res: Sockets.OllamaSetBaseUrl.Response = {
			success: true
		}
		emitToUser("ollamaSetBaseUrl", res)
	} catch (error: any) {
		console.error("Ollama set base URL error:", error)
		const res = {
			error: "Failed to set base URL"
		}
		emitToUser("error", res)
	}
}

export async function ollamaModelsList(
	socket: any,
	message: Sockets.OllamaModelsList.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const { ollamaManagerBaseUrl: baseUrl } = (await db.query.systemSettings.findFirst())!
		const ollama = new Ollama({
			host: baseUrl
		})
		
		const result = await ollama.list()
		const res: Sockets.OllamaModelsList.Response = {
			models: result.models || []
		}
		emitToUser("ollamaModelsList", res)
	} catch (error: any) {
		console.error("Ollama models list error:", error)
		const res = {
			error: "Failed to list models",
		}
		emitToUser("error", res)
	}
}

export async function ollamaDeleteModel(
	socket: any,
	message: Sockets.OllamaDeleteModel.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const { ollamaManagerBaseUrl: baseUrl } = (await db.query.systemSettings.findFirst())!
		const ollama = new Ollama({
			host: baseUrl
		})
		
		await ollama.delete({ model: message.modelName })
		const res: Sockets.OllamaDeleteModel.Response = {
			success: true
		}
		emitToUser("ollamaDeleteModel", res)

		await db.delete(schema.connections).where(and(
			eq(schema.connections.type, "ollama"),
			eq(schema.connections.model, message.modelName)
		))

	} catch (error: any) {
		console.error("Ollama delete model error:", error)
		const res: Sockets.OllamaDeleteModel.Response = {
			success: false
		}
		emitToUser("error", {error: "Failed to delete model"})
	}
}

export async function ollamaConnectModel(
	socket: any,
	message: Sockets.OllamaConnectModel.Call,
	emitToUser: (event: string, data: any) => void
) {

	const userId = 1

	try {
		
		let existingConnection = await db.query.connections.findFirst({
			where: (c, { eq }) => and(
				eq(c.type, "ollama"),
				eq(c.model, message.modelName)
			)
		})

		if (!existingConnection) {
			// Parse and create a shorter name for the connection
			const connectionName: string = message.modelName.split("/").pop()! as string
			// Create a new connection if it doesn't exist
			const data = {
				...ollamaAdapter.connectionDefaults,
				name: connectionName,
				model: message.modelName,
			}
			console.log("Creating connection", data)
			const [newConnection] = await db.insert(schema.connections).values(data as InsertConnection).returning()
			existingConnection = newConnection
		}

		await db.update(schema.users)
			.set({
				activeConnectionId: existingConnection.id
			}).where(eq(schema.users.id, userId))
		
		await loadUser(socket, {}, emitToUser)
		await connectionsList(socket, {}, emitToUser)

		const res: Sockets.OllamaConnectModel.Response = {
			success: true
		}
		emitToUser("ollamaConnectModel", res)
	} catch (error: any) {
		console.error("Ollama connect model error:", error)
		const res = {
			error: "Failed to connect to model"
		}
		emitToUser("error", res)
	}
}

export async function ollamaListRunningModels(
	socket: any,
	message: Sockets.OllamaListRunningModels.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const { ollamaManagerBaseUrl: baseUrl } = (await db.query.systemSettings.findFirst())!
		const ollama = new Ollama({
			host: baseUrl
		})
		
		const result = await ollama.ps()
		const res: Sockets.OllamaListRunningModels.Response = {
			models: result.models || []
		}
		emitToUser("ollamaListRunningModels", res)
	} catch (error: any) {
		console.error("Ollama list running models error:", error)
		const res = {
			error: "Failed to list running models"
		}
		emitToUser("error", res)
	}
}

export async function ollamaPullModel(
	socket: any,
	message: Sockets.OllamaPullModel.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const { ollamaManagerBaseUrl: baseUrl } = (await db.query.systemSettings.findFirst())!
		const ollama = new Ollama({
			host: baseUrl
		})
		
		// For streaming progress, we could implement progress callbacks
		const stream = await ollama.pull({ 
			model: message.modelName,
			stream: true
		})
		
		for await (const chunk of stream) {
			// Emit progress updates
			if (chunk.status) {
				emitToUser("ollamaPullProgress", {
					modelName: message.modelName,
					status: chunk.status,
					completed: chunk.completed,
					total: chunk.total
				})
			}
		}
		
		const res: Sockets.OllamaPullModel.Response = {
			success: true
		}
		emitToUser("ollamaPullModel", res)
	} catch (error: any) {
		console.error("Ollama pull model error:", error)
		const res = {
			error: "Failed to download model"
		}
		emitToUser("error", res)
	}
}

export async function ollamaVersion(
	socket: any,
	message: Sockets.OllamaVersion.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		
		const { ollamaManagerBaseUrl: baseUrl } = (await db.query.systemSettings.findFirst())!
		// const ollama = new Ollama({
		// 	host: baseUrl
		// })
		const response = await fetch(`${baseUrl}/api/version`)
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}
		
		const result = await response.json()
		const res: Sockets.OllamaVersion.Response = {
			version: result.version
		}
		emitToUser("ollamaVersion", res)
	} catch (error: any) {
		console.error("Ollama version error:", error)
		const res = {
			error: "Failed to connect to Ollama or get version"
		}
		emitToUser("error", res)
	}
}

export async function ollamaIsUpdateAvailable(
	socket: any,
	message: Sockets.OllamaIsUpdateAvailable.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		// Get current version using direct HTTP request
		const { ollamaManagerBaseUrl: baseUrl } = (await db.query.systemSettings.findFirst())!
		const versionResponse = await fetch(`${baseUrl}/api/version`)
		
		if (!versionResponse.ok) {
			throw new Error(`HTTP ${versionResponse.status}: ${versionResponse.statusText}`)
		}
		
		const versionResult = await versionResponse.json()
		const currentVersion = versionResult.version
		
		// Fetch the latest version from Ollama's GitHub releases API
		const githubResponse = await fetch('https://api.github.com/repos/ollama/ollama/releases/latest')
		
		if (!githubResponse.ok) {
			throw new Error(`GitHub API error: ${githubResponse.status}`)
		}
		
		const latestRelease = await githubResponse.json()
		const latestVersion = latestRelease.tag_name
		
		// Compare versions (remove 'v' prefix if present)
		const currentVersionClean = currentVersion.replace(/^v/, '')
		const latestVersionClean = latestVersion.replace(/^v/, '')
		
		// Simple version comparison (works for semantic versioning)
		const updateAvailable = compareVersions(latestVersionClean, currentVersionClean) > 0
		
		const res: Sockets.OllamaIsUpdateAvailable.Response = {
			updateAvailable,
			currentVersion: currentVersion,
			latestVersion: latestVersion
		}
		emitToUser("ollamaIsUpdateAvailable", res)
	} catch (error: any) {
		console.error("Ollama update check error:", error)
		const res = {
			error: "Failed to check for updates"
		}
		emitToUser("error", res)
	}
}

export async function ollamaSearchAvailableModels(
	socket: any,
	message: Sockets.OllamaSearchAvailableModels.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const { search, source } = message
		let models: Array<{
			name: string
			description?: string
			size?: string
			tags?: string[]
			popular?: boolean
			url?: string
			downloads?: number
			updatedAtStr?: string
			createdAt?: Date
			likes?: number
			trendingScore?: number
		}> = []

		if (source === OllamaModelSearchSource.OLLAMA_DB) {
			const response = await fetch(`https://ollamadb.dev/api/v1/models?limit=25&search=${encodeURIComponent(search)}`)
			
			if (!response.ok) {
				throw new Error(`OllamaDB API error: ${response.status}`)
			}
			
			const data = await response.json()

			// console.log("OllamaDB response:", data)
			
			// Transform ollamadb.dev response to our format
			models = (data.models || []).map((model: any) => ({
				name: model.model_identifier || model.model_name,
				description: model.description,
				size: model.size,
				url: model.url,
				downloads: model.pulls,
				updatedAtStr: model.last_updated_str,
			}))
		} else if (source === OllamaModelSearchSource.HUGGING_FACE) {
			const response = await fetch(
				`https://huggingface.co/api/models?search=${encodeURIComponent(search)}&filter=gguf&limit=25&sort=trendingScore`
			)
			
			if (!response.ok) {
				throw new Error(`Hugging Face API error: ${response.status}`)
			}
			
			const data = await response.json()

			// console.log("Hugging Face response:", data)
			
			// Transform Hugging Face response to our format
			models = (data || []).map((model: any) => ({
				name: model.id || model.modelId,
				description: model.description || model.pipeline_tag,
				size: undefined, // Hugging Face doesn't provide size in search
				tags: model.tags || [],
				popular: model.likes > 100 || false,
				url: `https://hf.co/${model.id || model.modelId}`,
				createdAt: model.createdAt,
				downloads: model.downloads,
				likes: model.likes,
				trendingScore: model.trendingScore,
			}))
		}

		const res: Sockets.OllamaSearchAvailableModels.Response = {
			models
		}
		emitToUser("ollamaSearchAvailableModels", res)
	} catch (error: any) {
		console.error("Ollama search available models error:", error)
		const res: Sockets.OllamaSearchAvailableModels.Response = {
			models: [],
			error: "Failed to search available models"
		}
		emitToUser("ollamaSearchAvailableModels", res)
	}
}

export async function ollamaHuggingFaceSiblingsList(
	socket: any,
	message: Sockets.OllamaHuggingFaceSiblingsList.Call,
	emitToUser: (event: string, data: any) => void
) {
	try {
		const { modelId } = message
		
		// Fetch the model details from Hugging Face API
		const response = await fetch(`https://huggingface.co/api/models/${encodeURIComponent(modelId)}`)
		
		if (!response.ok) {
			throw new Error(`Hugging Face API error: ${response.status}`)
		}
		
		const modelData = await response.json()

		console.log("Hugging Face model data:", modelData)
		
		// Get siblings from the model data
		const siblings = modelData.siblings || []
		
		// Transform siblings to our format and extract quantization info
		const transformedSiblings = siblings.map((sibling: any) => {
			// Extract quantization level from filename if it's a GGUF file
			let quantization: string | undefined
			if (sibling.rfilename && sibling.rfilename.includes('.gguf')) {
				// Common quantization patterns: Q4_0, Q4_K_M, Q5_K_S, Q8_0, etc.
				const quantMatch = sibling.rfilename.match(/[Qq](\d+)(?:_[KkMmSs])?(?:_[MmSs])?/i)
				if (quantMatch) {
					quantization = quantMatch[0].toUpperCase()
				}
			}
			
			return {
				rfilename: sibling.rfilename,
				size: sibling.size,
				quantization: quantization
			}
		})
		
		// Filter to only include GGUF files
		const ggufSiblings = transformedSiblings.filter((sibling: any) => 
			sibling.rfilename && sibling.rfilename.toLowerCase().includes('.gguf') && !!sibling.quantization
		)
		
		const res: Sockets.OllamaHuggingFaceSiblingsList.Response = {
			baseUrl: `https://hf.com/${modelData.id || modelData.modelId}`,
			siblings: ggufSiblings
		}
		emitToUser("ollamaHuggingFaceSiblingsList", res)
	} catch (error: any) {
		console.error("Ollama Hugging Face siblings list error:", error)
		const res: Sockets.OllamaHuggingFaceSiblingsList.Response = {
			siblings: [],
			error: "Failed to fetch model siblings"
		}
		emitToUser("ollamaHuggingFaceSiblingsList", res)
	}
}

// Helper function to compare semantic versions
function compareVersions(version1: string, version2: string): number {
	const v1parts = version1.split('.').map(Number)
	const v2parts = version2.split('.').map(Number)
	
	const maxLength = Math.max(v1parts.length, v2parts.length)
	
	for (let i = 0; i < maxLength; i++) {
		const v1part = v1parts[i] || 0
		const v2part = v2parts[i] || 0
		
		if (v1part > v2part) return 1
		if (v1part < v2part) return -1
	}
	
	return 0
}


