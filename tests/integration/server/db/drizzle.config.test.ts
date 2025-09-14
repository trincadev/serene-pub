import { describe, it, expect } from 'vitest';
import { startPg } from '$lib/server/db/postgres';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { dataDir } from '$lib/server/db/drizzle.config';

const metaPath = path.join(dataDir, 'meta.json');

function getMetaLock() {
    if (!existsSync(metaPath)) return undefined;
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    return meta.lock;
}

function setMetaLock(lock: { timestamp: number; lockLength: number }) {
    let meta = { version: '0.0.0' };
    if (existsSync(metaPath)) {
        meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    }
    meta.lock = lock;
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

describe('Integration DB setup/teardown', () => {
    it('should connect to the test database and have an empty users table', async () => {
        const { pglite: dbPg } = await startPg();
        try {
            await dbPg.query('SELECT 1');
            const res = await dbPg.query('SELECT COUNT(*) FROM users');
            const rows = (res.rows as { count: string }[]) || [];
            expect(Number(rows[0].count)).toBe(0);
            await dbPg.close();
        } catch (error) {
			console.error("#error:", error, "#")
			console.log("#pglite:", typeof dbPg, "#")
			console.log("#pglite.query:", typeof dbPg.query, dbPg.query, "#")
			console.log("#pglite.sql:", typeof dbPg.sql, dbPg.sql, "#")
            throw error;
        }
    });
});

describe('Database lock meta.json', () => {
    it('should create a lock in meta.json and expire it', async () => {
        const lockLength = 2000;
        const now = Date.now();
        setMetaLock({ timestamp: now, lockLength });
        const lock = getMetaLock();
        expect(lock).toBeDefined();
        expect(lock.lockLength).toBe(lockLength);

        // Simulate waiting for lock to expire
        await new Promise((r) => setTimeout(r, lockLength + 100));
        const expired = Date.now() > lock.timestamp + lock.lockLength;
        expect(expired).toBe(true);
    });

    it('should prevent concurrent lock if not expired', async () => {
        const lockLength = 5000;
        const now = Date.now();
        setMetaLock({ timestamp: now, lockLength });

        // Simulate checkDatabaseLock logic
        const lock = getMetaLock();
        const currentTime = Date.now();
        const lockExpiry = lock.timestamp + lock.lockLength;
        const isLocked = currentTime < lockExpiry;
        expect(isLocked).toBe(true);
    });

    it('should allow lock if previous is stale', async () => {
        const lockLength = 1000;
        const now = Date.now() - 2000; // stale lock
        setMetaLock({ timestamp: now, lockLength });

        const lock = getMetaLock();
        const currentTime = Date.now();
        const lockExpiry = lock.timestamp + lock.lockLength;
        const isLocked = currentTime < lockExpiry;
        expect(isLocked).toBe(false);
    });
});

describe('Database lock script integration', () => {
    it('should run check-db-lock.js and update meta.json', async () => {
        const scriptPath = path.resolve(__dirname, '../../../../scripts/check-db-lock.js');
        const child = spawn('node', [scriptPath], { env: { ...process.env } });

        let exited = false;
        await new Promise((resolve) => {
            child.on('exit', (code) => {
                exited = true;
                resolve(undefined);
            });
        });
        expect(exited).toBe(true);

        // After running, meta.json should exist and have a lock
        const lock = getMetaLock();
        expect(lock).toBeDefined();
        expect(typeof lock.timestamp).toBe('number');
        expect(typeof lock.lockLength).toBe('number');
    });
});