import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import * as schema from "./schema"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as dbConfig from "./drizzle.config"
import type { MigrationConfig } from "drizzle-orm/migrator"

// if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
// import drizzle.config.ts from 'drizzle.config.ts';

const client = new Database(process.env.DATABASE_URL || dbConfig.dbPath)

export const db = drizzle(client, { schema })

async function runMigrations() {
	migrate(db, {
		migrationsFolder: dbConfig.migrationsDir
	} as MigrationConfig)
	console.log("Migrations applied.")
}

// Run migrations if in production environment
if (process.env.NODE_ENV === 'production') {
	runMigrations().catch((err) => {
		console.error("Failed to run migrations:", err)
	})
}
