import { defineConfig } from "drizzle-kit"
import envPaths from "env-paths"
import { mkdirSync } from "fs"
import { existsSync } from "fs"

const isCI = process.env.CI === "true";
export const dataDir = isCI ? "~/SerenePubData" : (envPaths("SerenePub", { suffix: "" }).data + "/data")
export const dbDataDir = `${dataDir}/pg_data`
export const baseUrl = process.env.DATABASE_URL || `localhost`
export const port: number = parseInt(process.env.DATABASE_PORT || "3002")
export const migrationsDir = "./drizzle"
export const schemaDir = "./src/lib/server/db/schema.ts"
export const user = process.env.POSTGRES_USER || "postgres"
export const password = process.env.POSTGRES_PASSWORD || "password"
export const postgresUrl = `postgresql://${user}:${password}@${baseUrl}:${port}`

if (!existsSync(dbDataDir)) {
	mkdirSync(dbDataDir, { recursive: true });
}

console.log(`Using postgres base url: ${baseUrl} and port: ${port}`);


export default defineConfig({
	schema: schemaDir,
	dialect: "postgresql",
	dbCredentials: { url: postgresUrl },
	verbose: true,
	strict: true,
	out: migrationsDir
})
