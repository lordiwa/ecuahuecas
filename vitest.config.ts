import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // The vue plugin compiles single-file components so component render tests
  // (e.g. src/components/Foto.test.ts) can import `.vue` files directly.
  // @vue/test-utils is intentionally NOT a dependency; component tests mount via
  // Vue's own createSSRApp + @vue/server-renderer renderToString instead.
  plugins: [vue()],
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
