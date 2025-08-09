// SvelteKit endpoint to serve avatar files from the OS-agnostic app data directory
import type { RequestHandler } from "@sveltejs/kit"
import path from "path"
import fs from "fs/promises"
import { getAppDataDir } from "$lib/server/utils"

export const GET: RequestHandler = async ({ params }) => {
	const { reqPath } = params
	if (!reqPath) {
		return new Response("Not found", { status: 404 })
	}
	// reqPath is an array (SvelteKit catchall)
	const relPath = Array.isArray(reqPath) ? reqPath.join("/") : reqPath
	const appData = getAppDataDir()
	const filePath = path.join(appData, relPath)
	try {
		const data = await fs.readFile(filePath)
		// Guess content type from extension
		const ext = path.extname(filePath).toLowerCase()
		let type = "application/octet-stream"
		if (ext === ".png") type = "image/png"
		else if (ext === ".jpg" || ext === ".jpeg") type = "image/jpeg"
		else if (ext === ".webp") type = "image/webp"
		else if (ext === ".gif") type = "image/gif"
		// SvelteKit Response expects Uint8Array, not Buffer
		return new Response(new Uint8Array(data), {
			headers: {
				"Content-Type": type,
				"Cache-Control": "public, max-age=0"
			}
		})
	} catch (e) {
		return new Response("Not found", { status: 404 })
	}
}
