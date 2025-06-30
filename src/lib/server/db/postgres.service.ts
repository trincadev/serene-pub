import * as dbConfig from "./drizzle.config"
import fs from "fs"
import EmbeddedPostgres from "embedded-postgres"

const GLOBAL_PG_KEY = Symbol.for("serene-pub.embedded-postgres")

type PgGlobal = { pg?: EmbeddedPostgres }

// Check if already initialized
const globalPg = globalThis as unknown as PgGlobal

export async function startPg(): Promise<void> {
	try {
		console.log("Starting PostgreSQL server...")
		// Create the object
		const pg = new EmbeddedPostgres({
			databaseDir: dbConfig.dbDataDir,
			user: dbConfig.user,
			password: dbConfig.password,
			port: dbConfig.port,
			persistent: true
		})

		// Check the path to the data directory
		const pgDataDirExists = fs.existsSync(dbConfig.dbDataDir)

		if (!pgDataDirExists) {
			await pg.initialise()
		}

		await pg.start()

		// Only start if not already present
		if (!globalPg.pg) {
			globalPg.pg = pg
		}
	} catch (error) {
		console.error("Error starting PostgreSQL server:", error)
		throw error
	}
}

export let pg = globalPg.pg
