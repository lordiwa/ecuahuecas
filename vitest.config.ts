import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Client unit tests live under src/; the Cloud Functions' PURE modules carry
    // co-located specs under functions/ that import the ESM module directly (no
    // firebase/anthropic/sanity SDKs are pulled in).
    include: ['src/**/*.test.ts', 'functions/**/*.test.ts'],
  },
})
