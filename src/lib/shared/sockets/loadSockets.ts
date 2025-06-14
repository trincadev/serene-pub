import * as skio from "sveltekit-io"
import axios from "axios"

let socketsHost: string | undefined = undefined

export async function loadSockets() {
	const res = await axios.get("/api/sockets-endpoint")
	socketsHost = res.data.endpoint

	if (!socketsHost) {
		console.error("socketsHost is undefined, cannot initialize sockets.")
		return
	}

	skio.setup(socketsHost, {
		cors: {
			origin: "*",
			credentials: false
		},
		maxHttpBufferSize: 1e8
	}).then((io: any) => {
		if (typeof io.to !== "function") {
			io.to = () => ({ emit: () => {} })
		}
		console.log(
			"Sockets initialized with endpoint:",
			process.env.PUBLIC_SOCKETS_ENDPOINT
		)
	})
}
