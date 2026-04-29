import { defineConfig } from 'vitest/config'

// Node 25's v8 serialization protocol breaks Vitest's default `forks` worker IPC
// (v8 cloned-data version mismatch). Use the threads pool until upstream Vitest
// adopts a Node-25-compatible IPC. See: vitest issue tracker for similar reports.
export default defineConfig({
	test: {
		pool: 'threads',
		include: ['src/**/*.{test,spec}.ts'],
		testTimeout: 30_000
	}
})
