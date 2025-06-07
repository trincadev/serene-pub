import { defineConfig } from 'drizzle-kit';
import envPaths from 'env-paths';

const dataDir = envPaths("SerenePub", { suffix: "" });
const dbPath = `${dataDir.data}/data/main.db`;

console.log(`Using database path: ${dbPath}`);

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: process.env.DATABASE_URL || dbPath },
	verbose: true,
	strict: true
});
