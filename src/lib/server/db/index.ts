import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import * as schema from "./schema"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as dbConfig from "./drizzle.config"
import type { MigrationConfig } from "drizzle-orm/migrator"
import { copyFileSync } from "fs"
import { basename, dirname, extname } from "path"

// if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
// import drizzle.config.ts from 'drizzle.config.ts';

const client = new Database(process.env.DATABASE_URL || dbConfig.dbPath)

export const db = drizzle(client, { schema })

async function runMigrations() {
	// Backup database before migration in production
	const dbFile = process.env.DATABASE_URL || dbConfig.dbPath
	const dir = dirname(dbFile)
	const base = basename(dbFile, extname(dbFile))
	const ext = extname(dbFile)
	const timestamp = new Date()
		.toISOString()
		.replace(/[-:T.]/g, "")
		.slice(0, 14)
	const backupFile = `${dir}/${base}_backup_${timestamp}${ext}`
	try {
		copyFileSync(dbFile, backupFile)
		console.log(`Database backup created: ${backupFile}`)
	} catch (err) {
		console.error("Failed to create database backup:", err)
	}
	migrate(db, {
		migrationsFolder: dbConfig.migrationsDir
	} as MigrationConfig)
	console.log("Migrations applied.")
}

// Run migrations if in production environment
if (true) {
	//process.env.NODE_ENV === 'production') {
	runMigrations().catch((err) => {
		console.error("Failed to run migrations:", err)
	})
}
