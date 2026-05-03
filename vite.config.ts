import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { imagetools } from 'vite-imagetools'
import { fileURLToPath, URL } from 'node:url'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

function listSlugs(dir: string): string[] {
  try {
    return readdirSync(resolve(__dirname, dir))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
  } catch {
    return []
  }
}

export default defineConfig({
  plugins: [vue(), imagetools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    crittersOptions: false,
    includedRoutes(paths: string[]) {
      const huecas = listSlugs('src/content/huecas').map((s) => `/huecas/${s}`)
      const resenas = listSlugs('src/content/resenas').map((s) => `/resenas/${s}`)
      const criticos = listSlugs('src/content/criticos').map((s) => `/criticos/${s}`)
      const staticPaths = paths.filter((p) => !p.includes(':'))
      return [...new Set([...staticPaths, ...huecas, ...resenas, ...criticos])]
    },
  },
} as any)
