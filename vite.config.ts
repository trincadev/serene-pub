import tailwindcss from "@tailwindcss/vite"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import pkg from "./package.json"

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify("0.1.0"), //JSON.stringify(pkg.version)
		__APP_VERSION_DISPLAY__: JSON.stringify("v0.1.0-alpha") //JSON.stringify(`v${pkg.version}-alpha`)
	}
})
