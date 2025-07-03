// scripts/bundle-dist.js
// Bundles app and launcher for each OS into ./dist/serene-pub-<version>-<os>/

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import child_process from "child_process"

import pkg from "../package.json" assert { type: "json" }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const version = pkg.version
const distDir = path.resolve(__dirname, "../dist")
const buildDir = path.resolve(__dirname, "../build")
const staticDir = path.resolve(__dirname, "../static")
const filesToCopy = ["LICENSE", "README.md", "NOTICE.md"]

function copyRecursive(src, dest) {
	if (!fs.existsSync(src)) return
	if (fs.lstatSync(src).isDirectory()) {
		fs.mkdirSync(dest, { recursive: true })
		for (const file of fs.readdirSync(src)) {
			copyRecursive(path.join(src, file), path.join(dest, file))
		}
	} else {
		fs.copyFileSync(src, dest)
	}
}

// Whitelist for packages with UNKNOWN license but known to be MIT
const LICENSE_WHITELIST = [
	{ name: "json-bignum", version: "0.0.3" },
	{ name: "xmlhttprequest-ssl", version: "2.1.2" }
]

function isWhitelisted(name, version) {
	return LICENSE_WHITELIST.some(
		(pkg) => pkg.name === name && pkg.version === version
	)
}

// Acceptable licenses for redistribution with AGPL app
const ACCEPTABLE_LICENSES = [
	"mit",
	"isc",
	"bsd-2-clause",
	"bsd-3-clause",
	"0bsd",
	"wtfpl",
	"apache-2.0",
	"agpl-3.0",
	"agpl-3.0-only",
	"agpl-3.0-or-later",
	"bsd",
	"bsd-2-clause or mit or apache-2.0",
	"bsd-2-clause or mit",
	"bsd-3-clause or mit",
	"bsd-2-clause or mit or apache-2.0",
	"apache-2.0 or mit",
	"apache-2.0 or bsd-3-clause",
	"apache-2.0 or mit or bsd-3-clause",
	"apache-2.0 or mit or bsd-2-clause",
	"mit or wtfpl",
	"mit or bsd-2-clause",
	"mit or bsd-3-clause",
	"mit or apache-2.0",
	"mit or isc",
	"isc or mit",
	"0bsd or mit",
	"bsd-2-clause or mit or apache-2.0",
	"bsd-3-clause or mit or apache-2.0",
	"bsd-3-clause or mit or apache-2.0",
	"bsd-2-clause or mit or apache-2.0",
	"bsd-3-clause or mit or apache-2.0",
	"bsd-2-clause or mit",
	"bsd-3-clause or mit",
	"bsd-2-clause or apache-2.0",
	"bsd-3-clause or apache-2.0",
	"bsd-2-clause or bsd-3-clause",
	"bsd-3-clause or bsd-2-clause",
	"public domain",
	"unlicense",
	"cc0-1.0",
	"cc0",
	"0bsd",
	"bsd-2-clause-freebsd",
	"bsd-3-clause-clear",
	"bsd-3-clause-new",
	"bsd-3-clause-revised",
	"bsd-3-clause-simplified",
	"bsd-3-clause-modified",
	"bsd-3-clause",
	"bsd-2-clause",
	"bsd",
	"wtfpl",
	"isc",
	"mit",
	"apache-2.0",
	"agpl-3.0",
	"agpl-3.0-only",
	"agpl-3.0-or-later",
	"bsd-2-clause or mit or apache-2.0",
	"bsd-3-clause or mit or apache-2.0",
	"bsd-2-clause or mit",
	"bsd-3-clause or mit",
	"bsd-2-clause or apache-2.0",
	"bsd-3-clause or apache-2.0",
	"bsd-2-clause or bsd-3-clause",
	"bsd-3-clause or bsd-2-clause",
	"public domain",
	"unlicense",
	"cc0-1.0",
	"cc0",
	"0bsd",
	"bsd-2-clause-freebsd",
	"bsd-3-clause-clear",
	"bsd-3-clause-new",
	"bsd-3-clause-revised",
	"bsd-3-clause-simplified",
	"bsd-3-clause-modified",
	"bsd-3-clause",
	"bsd-2-clause",
	"bsd",
	"python-2.0"
]

function isAcceptableLicense(license, name, version) {
	if (!license) return false
	// Special case: whitelist
	if (isWhitelisted(name, version)) return true
	// Remove parentheses and whitespace, split on OR/AND/||/&&
	const cleaned = license.replace(/[()]/g, "").toLowerCase()
	const parts = cleaned
		.split(/\s*(or|and|\|\||&&|,|\/)\s*/i)
		.filter((s) => s && !["or", "and", "||", "&&", "/"].includes(s))
	// If all parts are in the allowlist, it's acceptable
	return (
		parts.length > 0 &&
		parts.every((l) => ACCEPTABLE_LICENSES.includes(l.trim()))
	)
}

function checkAllLicensesAcceptable(nodeModulesPath) {
	let problematic = []
	function checkDir(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true })
		for (const entry of entries) {
			if (entry.isDirectory()) {
				if (entry.name.startsWith("@")) {
					checkDir(path.join(dir, entry.name))
				} else {
					const pkgPath = path.join(dir, entry.name, "package.json")
					if (fs.existsSync(pkgPath)) {
						try {
							const pkgData = JSON.parse(
								fs.readFileSync(pkgPath, "utf8")
							)
							const license = (
								pkgData.license || ""
							).toLowerCase()
							const name = pkgData.name || entry.name
							const version = pkgData.version || ""
							if (license === "unknown" || !license) {
								if (
									!isAcceptableLicense(license, name, version)
								) {
									if (!isWhitelisted(name, version)) {
										// Print a warning, but do not fail; user must manually verify
										console.warn(
											`WARNING: ${name}@${version} has UNKNOWN license. Please verify manually. (${pkgPath})`
										)
									}
								}
							} else if (
								!isAcceptableLicense(license, name, version)
							) {
								problematic.push({
									name,
									version,
									license: pkgData.license || "UNKNOWN",
									path: pkgPath
								})
							}
						} catch (e) {
							problematic.push({
								name: entry.name,
								version: "",
								license: "PARSE_ERROR",
								path: pkgPath
							})
						}
					}
				}
			}
		}
	}
	checkDir(nodeModulesPath)
	return problematic
}

// Define all target OS/arch combinations
const targets = [
	{ name: "linux-x64", platform: "linux", arch: "x64" },
	{ name: "linux-arm64", platform: "linux", arch: "arm64" },
	{ name: "linux-arm", platform: "linux", arch: "arm" },
	{ name: "linux-ia32", platform: "linux", arch: "ia32" },
	{ name: "linux-ppc64", platform: "linux", arch: "ppc64" },
	{ name: "macos-x64", platform: "darwin", arch: "x64" },
	{ name: "macos-arm64", platform: "darwin", arch: "arm64" },
	{ name: "windows-x64", platform: "win32", arch: "x64" },
	{ name: "windows-arm64", platform: "win32", arch: "arm64" },
]

// Accept a single target as a command-line argument
const argTarget = process.argv[2]
if (!argTarget) {
	console.error("Usage: node bundle-dist.js <target>")
	console.error("Valid targets:", targets.map(t => t.name).join(", "))
	process.exit(1)
}
const target = targets.find(t => t.name === argTarget)
if (!target) {
	console.error(`Invalid target: ${argTarget}`)
	console.error("Valid targets:", targets.map(t => t.name).join(", "))
	process.exit(1)
}

;(async () => {
	try {
		// 1. Create a temp dir and run npm install for this platform/arch
		const tempDir = path.join(__dirname, `../.tmp-bundle-dist-${target.name}`)
		if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })
		fs.mkdirSync(tempDir)
		fs.writeFileSync(
			path.join(tempDir, "package.json"),
			JSON.stringify(pkg, null, 2)
		)
		// Run npm install for this platform/arch
		console.log(`Installing node_modules for ${target.name}...`)
		child_process.execSync("npm install --production", {
			cwd: tempDir,
			stdio: "inherit",
			env: { ...process.env, npm_config_platform: target.platform, npm_config_arch: target.arch }
		})
		// Clean node_modules with modclean, preserving license files
		console.log(`Cleaning node_modules with modclean for ${target.name}...`)
		child_process.execSync(
			'npx modclean --run --patterns="default:safe,default:caution,default:danger" --ignore="**/LICENSE,**/COPYING,**/NOTICE,**/README*,**/COPYRIGHT,**/AUTHORS,**/CONTRIBUTORS"',
			{ cwd: tempDir, stdio: "inherit", env: { ...process.env, npm_config_platform: target.platform, npm_config_arch: target.arch } }
		)

		// 2. License check
		console.log("Checking licenses...")
		const problematic = checkAllLicensesAcceptable(
			path.join(tempDir, "node_modules")
		)
		if (problematic.length > 0) {
			console.error("Unacceptable licenses found:")
			for (const p of problematic) {
				console.error(
					`  ${p.name}@${p.version}: ${p.license} (${p.path})`
				)
			}
			process.exit(1)
		}

		// 3. Create dist bundle
		const outDir = path.join(distDir, `serene-pub-${version}-${target.name}`)
		if (fs.existsSync(outDir))
			fs.rmSync(outDir, { recursive: true, force: true })
		fs.mkdirSync(outDir, { recursive: true })
		// Copy build and static
		copyRecursive(buildDir, path.join(outDir, "build"))
		copyRecursive(staticDir, path.join(outDir, "static"))
		// Copy node_modules for this target
		copyRecursive(
			path.join(tempDir, "node_modules"),
			path.join(outDir, "node_modules")
		)
		// Copy LICENSE, README, etc.
		for (const file of filesToCopy) {
			if (fs.existsSync(path.resolve(__dirname, "..", file))) {
				fs.copyFileSync(
					path.resolve(__dirname, "..", file),
					path.join(outDir, file)
				)
			}
		}
		// Copy platform-specific instructions
		const instrFile = path.resolve(
			__dirname,
			`../dist-assets/${target.name.split("-")[0]}/INSTRUCTIONS.txt`
		)
		if (fs.existsSync(instrFile)) {
			fs.copyFileSync(instrFile, path.join(outDir, "INSTRUCTIONS.txt"))
		}
		// Copy all run files from dist-assets/<os>/
		const runFiles = fs
			.readdirSync(path.resolve(__dirname, `../dist-assets/${target.name.split("-")[0]}`))
			.filter((f) => f.startsWith("run."))
		for (const runFile of runFiles) {
			const src = path.resolve(__dirname, `../dist-assets/${target.name.split("-")[0]}/${runFile}`)
			const dest = path.join(outDir, runFile)
			fs.copyFileSync(src, dest)
			if (target.platform !== "win32" && runFile.endsWith(".sh")) {
				fs.chmodSync(dest, 0o755)
			}
		}
		// Copy drizzle migrations folder
		copyRecursive(path.resolve(__dirname, '../drizzle'), path.join(outDir, 'drizzle'))
		// Write minimal package.json
		fs.writeFileSync(
			path.join(outDir, "package.json"),
			JSON.stringify(
				{
					type: "module",
					name: pkg.name,
					version: pkg.version,
					description: pkg.description,
					license: pkg.license
				},
				null,
				2
			)
		)

		// 4. Clean up temp dir
		fs.rmSync(tempDir, { recursive: true, force: true })
		console.log(`Distributable generated in dist/${path.basename(outDir)}`)
	} catch (err) {
		console.error("Bundle process failed:", err)
		process.exit(1)
	}
})()
