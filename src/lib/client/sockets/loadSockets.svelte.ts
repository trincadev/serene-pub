import { dev } from "$app/environment"
import axios from "axios"
import * as skio from "sveltekit-io"

export async function loadSocketsClient({domain}:{domain: string}) {

	const res = await axios.get("/api/sockets-endpoint")
	const domainUrl = new URL(domain) // Ensure domain is a valid URL
	const hostUrl = new URL(res.data.endpoint)
	hostUrl.protocol = domainUrl.protocol // Use the same protocol as the domain
	
	const io = await skio.setup(hostUrl, {
		cors: { origin: "*", credentials: false },
		maxHttpBufferSize: 1e8
	})

	if (typeof io.to !== "function") {
		io.to = () => ({ emit: () => {} })
	}

	if (dev) {
		console.log("Client socket initialized:", hostUrl.toString())
	}
}
