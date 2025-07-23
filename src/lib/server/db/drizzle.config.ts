import { defineConfig } from "drizzle-kit"
import envPaths from "env-paths"
import { mkdirSync } from "fs"
import { existsSync } from "fs"

const isCI = process.env.CI === "true"
export const dataDir = isCI
	? "~/SerenePubData"
	: envPaths("SerenePub", { suffix: "" }).data + "/data"
export const dbPath = `${dataDir}/serene-pub.db`
export const baseUrl = process.env.DATABASE_URL || `localhost`
export const port: number = parseInt(process.env.DATABASE_PORT || "3002")
export const migrationsDir = "./drizzle"
export const schemaDir = "./src/lib/server/db/schema.ts"
export const user = process.env.POSTGRES_USER || "postgres"
export const password = process.env.POSTGRES_PASSWORD || "password"
// PGlite uses a file path instead of a connection URL
export const postgresUrl = dbPath

if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true })
}

console.log(`Using PGlite database at: ${dbPath}`)

export default defineConfig({
	schema: schemaDir,
	dialect: "postgresql",
	dbCredentials: { url: dbPath },
	verbose: true,
	strict: true,
	out: migrationsDir,
	driver: "pglite"
})
