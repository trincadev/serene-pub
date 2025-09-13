import { defineConfig } from 'vitest/config'
import { resolve } from "node:path"

export default defineConfig({
	test: {
		environment: "node",
		reporters: ["dot", "default"],
		include: [
			"tests/unit/**/*.test.ts",
			'tests/integration/**/*.test.ts'
		],
		alias: [
			{
				find: "@",
				replacement: resolve(__dirname, "src")
			},
			{
				find: "@tests",
				replacement: resolve(__dirname, "tests")
			},
			{
				find: "$lib",
				replacement: resolve(__dirname, "src/lib")
			}
		],
  		setupFiles: ['tests/setup.ts']
	}
})
