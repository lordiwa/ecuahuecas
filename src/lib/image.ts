export interface CompressedImage {
  blob: Blob
  url: string
  sha256: string
  width: number
  height: number
  originalSize: number
  compressedSize: number
  mime: 'image/webp' | 'image/jpeg'
}

export interface CompressOptions {
  maxDimension?: number
  targetMaxBytes?: number
  qualityStart?: number
  qualityFloor?: number
  qualityStep?: number
  preferWebp?: boolean
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1920,
  targetMaxBytes: 2 * 1024 * 1024,
  qualityStart: 0.85,
  qualityFloor: 0.55,
  qualityStep: 0.07,
  preferWebp: true,
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<CompressedImage> {
  const opts = { ...DEFAULTS, ...options }
  const bitmap = await loadBitmap(file)

  const { width, height } = fitWithin(bitmap.width, bitmap.height, opts.maxDimension)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

  const webpSupported = opts.preferWebp && (await canvasSupportsWebp())
  const mime: 'image/webp' | 'image/jpeg' = webpSupported ? 'image/webp' : 'image/jpeg'

  let quality = opts.qualityStart
  let blob = await canvasToBlob(canvas, mime, quality)
  while (blob.size > opts.targetMaxBytes && quality > opts.qualityFloor) {
    quality = Math.max(opts.qualityFloor, quality - opts.qualityStep)
    blob = await canvasToBlob(canvas, mime, quality)
  }

  const sha256 = await sha256Hex(blob)
  const url = URL.createObjectURL(blob)

  return {
    blob,
    url,
    sha256,
    width,
    height,
    originalSize: file.size,
    compressedSize: blob.size,
    mime,
  }
}

async function loadBitmap(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to <img> path
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`No se pudo cargar la imagen ${file.name}`))
    }
    img.src = objectUrl
  })
}

function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w >= h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob devolvió null'))),
      mime,
      quality,
    )
  })
}

let webpSupportCache: boolean | null = null
async function canvasSupportsWebp(): Promise<boolean> {
  if (webpSupportCache !== null) return webpSupportCache
  try {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 2
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob(resolve, 'image/webp', 0.8),
    )
    webpSupportCache = !!blob && blob.type === 'image/webp'
  } catch {
    webpSupportCache = false
  }
  return webpSupportCache
}

async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
