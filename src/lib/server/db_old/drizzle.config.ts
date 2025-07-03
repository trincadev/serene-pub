import { defineConfig } from "drizzle-kit"
import envPaths from "env-paths"
import { mkdirSync } from "fs"
import { existsSync } from "fs"

const isCI = process.env.CI === "true";
export const dataDir = isCI ? "~/SerenePubData" : (envPaths("SerenePub", { suffix: "" }).data + "/data")
export const dbPath = `${dataDir}/main.db`
export const migrationsDir = "./drizzle"
export const schemaDir = "./src/lib/server/db/schema.ts"

if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

console.log(`Checking sqlite database path (deprecated): ${dbPath}`)

// Create the data directory if it doesn't exist


export default defineConfig({
	schema: schemaDir,
	dialect: "sqlite",
	dbCredentials: { url: process.env.DATABASE_URL || dbPath },
	verbose: true,
	strict: true,
	out: migrationsDir
})
