import * as dbConfig from "./drizzle.config"
import { PGlite } from "@electric-sql/pglite"

const GLOBAL_PGLITE_KEY = Symbol.for("serene-pub.pglite")

type PgliteGlobal = { pglite?: PGlite }

// Check if already initialized
const globalPglite = globalThis as unknown as PgliteGlobal

export async function startPg(): Promise<{ firstInit: boolean; pglite: PGlite }> {
	let firstInit = false
	try {
		console.log("Starting PGlite database...")
		
		// Return existing instance if available
		if (globalPglite.pglite) {
			return { firstInit: false, pglite: globalPglite.pglite }
		}
		
		// Create the PGlite instance
		const pglite = new PGlite(dbConfig.dbPath)
		
		// Check if this is the first initialization
		// PGlite creates the database file automatically, so we check if it's new
		try {
			await pglite.query("SELECT 1")
			console.log("PGlite database connected successfully.")
		} catch (error) {
			console.log("Initializing new PGlite database...")
			firstInit = true
		}

		// Set global reference
		globalPglite.pglite = pglite
		
		console.log(`PGlite database ready at: ${dbConfig.dbPath}`)
		return { firstInit, pglite }
	} catch (error) {
		console.error("Failed to start PGlite database:", error)
		throw new Error("Failed to start PGlite database.")
	}
}

export function getPg(): PGlite | undefined {
	return globalPglite.pglite
}
