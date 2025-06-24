import { dev } from "$app/environment"
import axios from "axios"
import * as skio from "sveltekit-io"

const socketCtx = $state({
	socketReady: false
})

// createContext('socketCtx', socketsCtx)

export async function loadSocketsClient() {
	const res = await axios.get("/api/sockets-endpoint")
	const host = res.data.endpoint

	const io = await skio.setup(host, {
		cors: { origin: "*", credentials: false },
		maxHttpBufferSize: 1e8
	})

	if (typeof io.to !== "function") {
		io.to = () => ({ emit: () => {} })
	}

	if (dev) {
		console.log("Client sockets initialized:", host)
	}
}
