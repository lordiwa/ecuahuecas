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
      // Exclude /_dev playgrounds and /admin (meta.admin) routes from the prod
      // SSG crawl: they are client-only and must not be emitted as static HTML.
      const staticPaths = paths.filter(
        (p) => !p.includes(':') && !p.startsWith('/_dev') && !p.startsWith('/admin'),
      )
      return [...new Set([...staticPaths, ...huecas, ...resenas, ...criticos])]
    },
  },
} as any)
