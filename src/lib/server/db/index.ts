import * as schema from "./schema"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as dbConfig from "./drizzle.config"
import type { MigrationConfig } from "drizzle-orm/migrator"
import fs from "fs"
import { dev } from "$app/environment"
import { drizzle } from "drizzle-orm/pglite"
import { sync } from "./defaults"

// Database lock interface
interface DbLock {
	timestamp: number
	lockLength: number // in milliseconds
}

interface MetaFile {
	version: string
	lock?: DbLock
}

// Move meta.json handling to the beginning
const metaPath = dbConfig.dataDir + "/meta.json"

// Ensure meta.json exists
if (!fs.existsSync(metaPath)) {
	fs.writeFileSync(
		metaPath,
		JSON.stringify({ version: "0.0.0" }, null, 2)
	)
}

// Read meta.json
let meta: MetaFile = JSON.parse(fs.readFileSync(metaPath, "utf-8"))

// Database lock functions
const DEFAULT_LOCK_LENGTH = 5000 // 5 seconds in milliseconds

async function checkDatabaseLock(): Promise<void> {
	// Refresh meta from file
	meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
	
	if (!meta.lock) {
		// No lock exists, continue
		return
	}

	const currentTime = Date.now()
	const lockExpiry = meta.lock.timestamp + meta.lock.lockLength
	
	if (currentTime < lockExpiry) {
		// Lock is still active, wait for it to expire
		const waitTime = lockExpiry - currentTime
		console.log(`Database locked, waiting ${waitTime}ms for lock to expire...`)
		
		await new Promise(resolve => setTimeout(resolve, waitTime))
		
		// Check again after waiting
		meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
		
		if (meta.lock && Date.now() < meta.lock.timestamp + meta.lock.lockLength) {
			// Still locked after waiting, exit application
			console.error("Database remains locked after waiting. Exiting application.")
			process.exit(1)
		}
	}
	
	// Lock is stale or doesn't exist, continue
}

function updateDatabaseLock(): void {
	try {
		// Refresh meta from file
		meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
		
		meta.lock = {
			timestamp: Date.now(),
			lockLength: DEFAULT_LOCK_LENGTH
		}
		
		fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
	} catch (error) {
		console.error("Failed to update database lock:", error)
	}
}

// Background lock update function
let lockUpdateInterval: NodeJS.Timeout | null = null

function startLockUpdates(): void {
	// Update lock immediately
	updateDatabaseLock()
	
	// Set up interval to update lock every few seconds
	lockUpdateInterval = setInterval(() => {
		updateDatabaseLock()
	}, DEFAULT_LOCK_LENGTH - 1000) // Update 1 second before lock expires
}

function stopLockUpdates(): void {
	if (lockUpdateInterval) {
		clearInterval(lockUpdateInterval)
		lockUpdateInterval = null
	}
	
	// Clear the lock when stopping
	try {
		meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
		delete meta.lock
		fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
	} catch (error) {
		console.error("Failed to clear database lock:", error)
	}
}

// Clean up lock on process exit
process.on('exit', stopLockUpdates)
process.on('SIGINT', () => {
	stopLockUpdates()
	process.exit(0)
})
process.on('SIGTERM', () => {
	stopLockUpdates()
	process.exit(0)
})

// Check database lock before proceeding
await checkDatabaseLock()

// Start lock updates
startLockUpdates()

// const { firstInit, pglite } = await startPg()

export let db = drizzle(dbConfig.dbPath, { schema })
export { schema }

// Compare two version strings in '0.0.0' format
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
	const pa = a.split(".").map(Number)
	const pb = b.split(".").map(Number)
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const na = pa[i] || 0
		const nb = pb[i] || 0
		if (na < nb) return -1
		if (na > nb) return 1
	}
	return 0
}

async function runMigrations() {
	// TODO: Update this in 0.4.0 to perform pg backups. Not needed for 0.3.0

	await migrate(db, {
		migrationsFolder: dbConfig.migrationsDir
	} as MigrationConfig)
	console.log("Migrations applied.")
	await sync()
}

// Check if database has been initialized by looking for a specific table
let hasTables = false
try {
	// Try to query a table that should exist after migrations
	await db.execute("SELECT 1 FROM users LIMIT 1")
	hasTables = true
} catch (error) {
	// Table doesn't exist, database needs initialization
	hasTables = false
}

// Run migrations if in production environment
if (!dev || !hasTables) {
	// @ts-ignore
	const appVersion = __APP_VERSION__
	if (!appVersion) {
		throw new Error(
			"App version is not defined. Please set __APP_VERSION__."
		)
	}
	const versionCompare = compareVersions(meta.version, appVersion)

	switch (versionCompare) {
		case 0:
			console.log("No migration needed, versions match.")
			break
		case -1:
			console.log("Running migrations to update database schema...")
			await runMigrations()
			meta.version = appVersion
			fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
			console.log(`Updated meta.json to version ${appVersion}.`)
			break
		case 1:
			console.warn(
				`Warning: Database version (${meta.version}) is newer than app version (${appVersion}).`
			)
			// This could happen if the app version is rolled back or if the database was manually updated
			// Handle this case as needed, e.g., notify the user or log an error
			throw new Error(
				`Database version (${meta.version}) is newer than app version (${appVersion}). Please check your database integrity.`
			)
		default:
			console.error(
				"Unexpected version comparison result:",
				versionCompare
			)
			throw new Error("Unexpected version comparison result")
	}
} else {
	await runMigrations()
	await sync()
}
