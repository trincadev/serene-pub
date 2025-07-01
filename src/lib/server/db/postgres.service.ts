import * as dbConfig from "./drizzle.config"
import fs from "fs"
import EmbeddedPostgres from "embedded-postgres"

const GLOBAL_PG_KEY = Symbol.for("serene-pub.embedded-postgres")

type PgGlobal = { pg?: EmbeddedPostgres }

// Check if already initialized
const globalPg = globalThis as unknown as PgGlobal

export async function startPg(): Promise<boolean> {
	let firstInit = false
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

		// Check the path to the data directory and if postgresql.conf exists
		const pgDataExists = fs.existsSync(`${dbConfig.dbDataDir}/postgresql.conf`)

		if (!pgDataExists) {
			try {
				await pg.initialise()
				firstInit = true
			} catch (error) {
				console.error("Error initializing PostgreSQL:", error)
			}
		}

		await pg.start()

		// Only start if not already present
		if (!globalPg.pg) {
			globalPg.pg = pg
		}
	} catch (error) {
		console.error("Failed to start PostgreSQL server:", error)
		// throw new Error("Failed to start PostgreSQL server. Please check the configuration and ensure PostgreSQL is not already running.")
	}
	return firstInit
}

export let pg = globalPg.pg
