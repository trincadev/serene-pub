import { describe, it, expect } from 'vitest';
import { startPg } from '$lib/server/db/postgres';

describe('Integration DB setup/teardown', () => {
    it('should connect to the test database and have an empty users table', async () => {
		const { pglite: dbPg } = await startPg()
		try {
			await dbPg.query("SELECT 1")
			console.log("#SELECT_1_OK")
			const res = await dbPg.query('SELECT COUNT(*) FROM users')
			try {
				expect(Number(res.rows[0].count)).toBe(0)
				console.log("#EXPECT_OK!")
				await dbPg.close()
			} catch (error2) {
				console.error("#error2:", error2, "#")
				console.error("#res:", res, "#")
				console.error("#res.row:", res.rows, "#")
				throw error2;
			}
		} catch (error1) {
			console.error("#error1:", error1, "#")
			console.log("#pglite:", typeof dbPg, "#")
			console.log("#pglite.query:", typeof dbPg.query, dbPg.query, "#")
			console.log("#pglite.sql:", typeof dbPg.sql, dbPg.sql, "#")
			throw error1;
		}
    })
})
