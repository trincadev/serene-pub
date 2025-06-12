import { loadSockets } from "$lib/server/sockets/loadSockets"
import type { RequestHandler } from "@sveltejs/kit"

let socketsLoaded = false

export const GET: RequestHandler = async () => {

  if (!socketsLoaded) {
    socketsLoaded = true
    await loadSockets()
  }

	const endpoint = process.env.PUBLIC_SOCKETS_ENDPOINT || ""
	return new Response(JSON.stringify({ endpoint }), {
		headers: { "Content-Type": "application/json" }
	})
}
