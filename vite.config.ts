import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { imagetools } from 'vite-imagetools'
import { fileURLToPath, URL } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface SnapshotRow { slug?: string }
interface ContentSnapshotFile {
  huecas?: SnapshotRow[]
  resenas?: SnapshotRow[]
  criticos?: SnapshotRow[]
}

/**
 * Slugs to prerender, sourced from the build-time Sanity snapshot
 * (`src/content-snapshot.json`) — the current source of truth. `build` runs
 * the snapshot script before `vite-ssg build`, so the JSON exists when this
 * config loads. Returns null when the snapshot is absent (e.g. `dev` before a
 * first `npm run snapshot`) so the caller falls back to the markdown glob.
 */
function slugsFromSnapshot(): { huecas: string[]; resenas: string[]; criticos: string[] } | null {
  try {
    const raw = readFileSync(resolve(__dirname, 'src/content-snapshot.json'), 'utf8')
    const data = JSON.parse(raw) as ContentSnapshotFile
    const pick = (rows?: SnapshotRow[]) =>
      (rows ?? []).map((r) => r.slug).filter((s): s is string => typeof s === 'string')
    return { huecas: pick(data.huecas), resenas: pick(data.resenas), criticos: pick(data.criticos) }
  } catch {
    return null
  }
}

/** Fallback: derive slugs from the legacy markdown seed (used only when the
 * snapshot is missing, e.g. during `dev`). Can be dropped once the seed is. */
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
      // blog-component's bundle imports the Anthropic SDK (default export),
      // which transitively pulls a Node-only agent toolset that cannot be
      // browser-bundled. We only use the library's PortableText RENDER surface
      // (BlogPostPreview), never the server-side AI authoring path, so alias the
      // SDK to an inert stub for the client/SSG build. See src/lib/anthropic-stub.ts.
      '@anthropic-ai/sdk': fileURLToPath(
        new URL('./src/lib/anthropic-stub.ts', import.meta.url),
      ),
    },
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    crittersOptions: false,
    includedRoutes(paths: string[]) {
      // Prefer the Sanity snapshot (source of truth); fall back to the markdown
      // seed only when no snapshot exists. This decouples prerendering from the
      // obsolete markdown seed so it can be deleted later.
      const snap = slugsFromSnapshot()
      const huecaSlugs = snap ? snap.huecas : listSlugs('src/content/huecas')
      const resenaSlugs = snap ? snap.resenas : listSlugs('src/content/resenas')
      const criticoSlugs = snap ? snap.criticos : listSlugs('src/content/criticos')
      const huecas = huecaSlugs.map((s) => `/huecas/${s}`)
      const resenas = resenaSlugs.map((s) => `/resenas/${s}`)
      const criticos = criticoSlugs.map((s) => `/criticos/${s}`)
      // Exclude /_dev playgrounds and /admin (meta.admin) routes from the prod
      // SSG crawl: they are client-only and must not be emitted as static HTML.
      const staticPaths = paths.filter(
        (p) => !p.includes(':') && !p.startsWith('/_dev') && !p.startsWith('/admin'),
      )
      return [...new Set([...staticPaths, ...huecas, ...resenas, ...criticos])]
    },
  },
} as any)
