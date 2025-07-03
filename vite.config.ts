import tailwindcss from "@tailwindcss/vite"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import pkg from "./package.json"

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__APP_VERSION_DISPLAY__: JSON.stringify(`v${pkg.version}-alpha`)
	},
	// Prevent Vite from analyzing native/binary modules that break import analysis
	ssr: {
		noExternal: [
			// Add native/binary modules here, e.g. 'better-sqlite3', 'node-gyp', etc.
		]
	},
	optimizeDeps: {
		exclude: [
			// Add native/binary modules here as well
		]
	}
})
