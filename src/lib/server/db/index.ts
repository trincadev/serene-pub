import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import envPaths from 'env-paths';

// if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const dataDir = envPaths("SerenePub", { suffix: "" });
const dbPath = `${dataDir.data}/data/main.db`;

const client = new Database(env.DATABASE_URL || dbPath);

export const db = drizzle(client, { schema });
