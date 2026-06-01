#!/usr/bin/env node
/**
 * One-off, idempotent brand-asset generator (TASK-014).
 *
 * Reads the single high-res mascot source (`brand/gallinazo-source.png`, ~5.8MB,
 * kept OUT of public/ so it never ships) and writes the full optimized favicon /
 * PWA-icon / social-card set into public/. The outputs are COMMITTED build inputs
 * (vite-ssg copies public/ verbatim into dist/), so re-running this script must
 * be deterministic.
 *
 * Run:  npm run assets
 *
 * Outputs (all under public/):
 *   favicon-16x16.png, favicon-32x32.png
 *   apple-touch-icon.png            (180x180, on brand background — iOS shows no transparency)
 *   android-chrome-192x192.png, android-chrome-512x512.png  (PWA / manifest)
 *   favicon.ico                     (multi-size 16/32/48, via png-to-ico)
 *   logo-72.png                     (small optimized header logo; src/App.vue uses it)
 *   og-default.png                  (1200x630 branded social card: mascot + "EcuaHuecas")
 *
 * Brand palette (from src/styles): amarillo #FFCB05, azul #034EA2, rojo #ED1C24,
 * tinta #1A1A1A, papel/crema #FFF8E7.
 */
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'brand/gallinazo-source.png')
const PUB = resolve(ROOT, 'public')

const AMARILLO = '#FFCB05'
const TINTA = '#1A1A1A'

const out = (name) => resolve(PUB, name)

/** A square icon: the transparent mascot centered (contain) on transparent. */
async function squareIcon(size) {
  return sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** A square icon on a solid brand background (for iOS apple-touch, no alpha). */
async function squareOnBg(size, bg) {
  const pad = Math.round(size * 0.1)
  const inner = size - pad * 2
  const mascot = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: mascot, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  await mkdir(PUB, { recursive: true })

  // --- Favicons (transparent) ---
  await writeFile(out('favicon-16x16.png'), await squareIcon(16))
  await writeFile(out('favicon-32x32.png'), await squareIcon(32))

  // --- PWA / Android (transparent, used by the manifest) ---
  await writeFile(out('android-chrome-192x192.png'), await squareIcon(192))
  await writeFile(out('android-chrome-512x512.png'), await squareIcon(512))

  // --- Apple touch icon: solid brand bg (iOS ignores transparency) ---
  await writeFile(out('apple-touch-icon.png'), await squareOnBg(180, AMARILLO))

  // --- favicon.ico (multi-size 16/32/48) ---
  const ico16 = await squareIcon(16)
  const ico32 = await squareIcon(32)
  const ico48 = await squareIcon(48)
  await writeFile(out('favicon.ico'), await pngToIco([ico16, ico32, ico48]))

  // --- Small optimized header logo (src/App.vue, ~36px @2x → 72px) ---
  await writeFile(
    out('logo-72.png'),
    await sharp(SRC)
      .resize(72, 72, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer(),
  )

  // --- Static OG fallback card: 1200x630, branded ---
  // Mascot on the right, "EcuaHuecas" wordmark on the left, amarillo background
  // with a tinta footer strip. Text drawn via an SVG overlay through sharp.
  const W = 1200
  const H = 630
  const mascotH = 500
  const mascot = await sharp(SRC)
    .resize({ height: mascotH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  const mascotMeta = await sharp(mascot).metadata()
  const mascotW = mascotMeta.width ?? 420

  // Wordmark sized to fit the left column (≈ W - mascotW - margins). "EcuaHuecas"
  // is 10 glyphs; at font-size 88 in Arial Black it fits comfortably in ~640px.
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${AMARILLO}"/>
  <rect y="${H - 16}" width="${W}" height="16" fill="${TINTA}"/>
  <text x="72" y="300" font-family="Arial Black, Arial, sans-serif" font-weight="900"
        font-size="88" fill="${TINTA}">EcuaHuecas</text>
  <text x="76" y="356" font-family="Arial, sans-serif" font-weight="700"
        font-size="34" fill="${TINTA}" opacity="0.85">Comida de calle, sin filtros</text>
</svg>`

  await writeFile(
    out('og-default.png'),
    await sharp(Buffer.from(svg))
      .composite([
        {
          input: mascot,
          top: Math.round((H - mascotH) / 2),
          left: W - mascotW - 70,
        },
      ])
      .png({ compressionLevel: 9 })
      .toBuffer(),
  )

  console.log('[gen-assets] wrote favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png,')
  console.log('[gen-assets] android-chrome-{192,512}.png, favicon.ico, logo-72.png, og-default.png')
}

main().catch((err) => {
  console.error('[gen-assets] failed:', err)
  process.exit(1)
})
