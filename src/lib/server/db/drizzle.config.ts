import { defineConfig } from "drizzle-kit"
import envPaths from "env-paths"

export const dataDir = envPaths("SerenePub", { suffix: "" })
export const dbPath = `${dataDir.data}/data/main.db`
export const migrationsDir = "./src/lib/server/db/drizzle"
export const schemaDir = "./src/lib/server/db/schema.ts"

console.log(`Using database path: ${dbPath}`)

// Create the data directory if it doesn't exist
import { mkdirSync } from "fs"
import { existsSync } from "fs"
if (!existsSync(dataDir.data)) {
	mkdirSync(dataDir.data, { recursive: true })
}

export default defineConfig({
	schema: schemaDir,
	dialect: "sqlite",
	dbCredentials: { url: process.env.DATABASE_URL || dbPath },
	verbose: true,
	strict: true,
	out: migrationsDir
})
