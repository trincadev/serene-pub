#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get the project root directory
const projectRoot = path.resolve(__dirname, "..")

// Lock configuration
const DEFAULT_LOCK_LENGTH = 5000 // 5 seconds in milliseconds
let lockUpdateInterval = null
let metaPath = null
let lockReleased = false

// Import the drizzle config to get the data directory
async function importDrizzleConfig() {
	try {
		const configPath = path.join(
			projectRoot,
			"src/lib/server/db/drizzle.config.ts"
		)

		return new Promise((resolve, reject) => {
			const child = spawn(
				"npx",
				[
					"tsx",
					"--eval",
					`
				import * as config from '${configPath}';
				console.log(JSON.stringify({ dataDir: config.dataDir }));
			`
				],
				{ stdio: ["pipe", "pipe", "pipe"] }
			)

			let output = ""
			child.stdout.on("data", (data) => {
				output += data.toString()
			})

			child.on("close", (code) => {
				if (code === 0) {
					try {
						const lines = output.trim().split("\n")
						const jsonLine = lines[lines.length - 1]
						const config = JSON.parse(jsonLine)
						resolve(config)
					} catch (error) {
						reject(
							new Error(
								`Failed to parse config output: ${error.message}`
							)
						)
					}
				} else {
					reject(
						new Error(
							`Failed to load drizzle config, exit code: ${code}`
						)
					)
				}
			})
		})
	} catch (error) {
		console.error("Failed to import drizzle config:", error.message)
		process.exit(1)
	}
}

function updateDatabaseLock() {
	try {
		// Read current meta.json
		let meta = { version: "0.0.0" }
		if (fs.existsSync(metaPath)) {
			meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
		}

		// Update lock
		meta.lock = {
			timestamp: Date.now(),
			lockLength: DEFAULT_LOCK_LENGTH
		}

		fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
	} catch (error) {
		console.error("Failed to update database lock:", error.message)
	}
}

function startLockUpdates() {
	// Update lock immediately
	updateDatabaseLock()
	console.log("Database locked for db operation.")

	// Set up interval to update lock every few seconds
	lockUpdateInterval = setInterval(() => {
		updateDatabaseLock()
	}, DEFAULT_LOCK_LENGTH - 1000) // Update 1 second before lock expires
}

function stopLockUpdates() {
	if (lockReleased) {
		return // Already cleaned up
	}
	lockReleased = true

	if (lockUpdateInterval) {
		clearInterval(lockUpdateInterval)
		lockUpdateInterval = null
	}

	// Clear the lock
	try {
		if (fs.existsSync(metaPath)) {
			const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
			delete meta.lock
			fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
			console.log("\nDatabase lock released.")
		}
	} catch (error) {
		console.error("Failed to clear database lock:", error.message)
	}
}

async function checkDatabaseLock() {
	try {
		const config = await importDrizzleConfig()
		metaPath = path.join(config.dataDir, "meta.json")

		// Check if meta.json exists
		if (!fs.existsSync(metaPath)) {
			console.log("meta.json does not exist. Continuing...")
			return
		}

		// Read meta.json
		let meta
		try {
			meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
		} catch (error) {
			console.error("Failed to read meta.json:", error.message)
			process.exit(1)
		}

		// Check if lock exists
		if (!meta.lock) {
			console.log("No database lock found. Continuing...")
			return
		}

		const currentTime = Date.now()
		const lockExpiry = meta.lock.timestamp + meta.lock.lockLength

		if (currentTime < lockExpiry) {
			// Lock is still active
			const remainingTime = Math.ceil((lockExpiry - currentTime) / 1000)
			console.error(
				`Database is currently locked. Lock expires in ${remainingTime} seconds.`
			)
			console.error(
				"Please wait for the lock to expire or stop the running application."
			)
			process.exit(1)
		} else {
			// Lock is stale
			console.log("Found stale database lock. Continuing...")
		}
	} catch (error) {
		console.error("Error checking database lock:", error.message)
		process.exit(1)
	}
}

async function runWithLock() {
	// Get command line arguments (everything after the script name)
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.error("No command provided to run with lock")
		process.exit(1)
	}

	try {
		// Check for existing lock first
		await checkDatabaseLock()

		// Start maintaining our lock
		startLockUpdates()

		// Set up cleanup handlers
		process.on("exit", stopLockUpdates)
		process.on("SIGINT", () => {
			stopLockUpdates()
			process.exit(0)
		})
		process.on("SIGTERM", () => {
			stopLockUpdates()
			process.exit(0)
		})

		// Run the actual command
		const command = args[0]
		const commandArgs = args.slice(1)

		console.log(`Running: ${command} ${commandArgs.join(" ")}`)

		const child = spawn(command, commandArgs, {
			stdio: "inherit",
			shell: true
		})

		child.on("close", (code) => {
			stopLockUpdates()
			process.exit(code)
		})

		child.on("error", (error) => {
			console.error("Failed to start command:", error.message)
			stopLockUpdates()
			process.exit(1)
		})
	} catch (error) {
		console.error("Error running command with lock:", error.message)
		stopLockUpdates()
		process.exit(1)
	}
}

// Run the command with lock
runWithLock()
