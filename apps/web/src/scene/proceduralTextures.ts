import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

export type TextureQuality = 'high' | 'medium' | 'low'

function sizeFor(quality: TextureQuality): number {
  if (quality === 'high') return 256
  if (quality === 'medium') return 128
  return 64
}

function hash(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash(x0, y0, seed)
  const b = hash(x0 + 1, y0, seed)
  const c = hash(x0, y0 + 1, seed)
  const d = hash(x0 + 1, y0 + 1, seed)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

/** Fractal Brownian motion value in [0, 1]. */
export function fbm(
  x: number,
  y: number,
  seed = 1,
  octaves = 4,
): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i += 1) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, seed + i)
    amplitude *= 0.5
    frequency *= 2
  }
  return value
}

function fillCanvas(
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('2D canvas context unavailable')
  paint(ctx, size)
  return canvas
}

function toTexture(
  canvas: HTMLCanvasElement,
  options?: { srgb?: boolean; repeat?: number },
): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  if (options?.srgb) texture.colorSpace = SRGBColorSpace
  if (options?.repeat !== undefined) {
    texture.repeat.set(options.repeat, options.repeat)
  }
  texture.needsUpdate = true
  return texture
}

export interface CardImperfections {
  roughnessMap: CanvasTexture
  normalMap: CanvasTexture
}

const cardCache = new Map<string, CardImperfections>()
const tableCache = new Map<
  string,
  { map: CanvasTexture; roughnessMap: CanvasTexture }
>()

function buildCardImperfections(quality: TextureQuality): CardImperfections {
  const size = sizeFor(quality)

  const roughness = fillCanvas(size, (ctx, s) => {
    const image = ctx.createImageData(s, s)
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const u = x / s
        const v = y / s
        const edge = Math.min(u, v, 1 - u, 1 - v)
        const wear = Math.max(0, 0.18 - edge) * 4.2
        const grain = fbm(u * 9, v * 12, 3.1, 5)
        const value = Math.min(255, Math.floor((0.28 + grain * 0.42 + wear) * 255))
        const i = (y * s + x) * 4
        image.data[i] = value
        image.data[i + 1] = value
        image.data[i + 2] = value
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  })

  const normal = fillCanvas(size, (ctx, s) => {
    const image = ctx.createImageData(s, s)
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const u = x / s
        const v = y / s
        const heightL = fbm(u - 1 / s, v, 7.2, 4)
        const heightR = fbm(u + 1 / s, v, 7.2, 4)
        const heightD = fbm(u, v - 1 / s, 7.2, 4)
        const heightU = fbm(u, v + 1 / s, 7.2, 4)
        const dx = (heightL - heightR) * 1.1
        const dy = (heightD - heightU) * 1.1
        const i = (y * s + x) * 4
        image.data[i] = Math.floor((dx * 0.5 + 0.5) * 255)
        image.data[i + 1] = Math.floor((dy * 0.5 + 0.5) * 255)
        image.data[i + 2] = 255
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  })

  return {
    roughnessMap: toTexture(roughness),
    normalMap: toTexture(normal),
  }
}

/** Soft grain + edge wear for card face / rim PBR maps. Shared per quality tier. */
export function createCardImperfections(
  quality: TextureQuality,
): CardImperfections {
  const key = `card-v2-${quality}`
  const cached = cardCache.get(key)
  if (cached !== undefined) return cached
  const maps = buildCardImperfections(quality)
  cardCache.set(key, maps)
  return maps
}

function buildTableTextures(quality: TextureQuality): {
  map: CanvasTexture
  roughnessMap: CanvasTexture
} {
  const size = sizeFor(quality === 'low' ? 'low' : 'medium')

  const albedo = fillCanvas(size, (ctx, s) => {
    const image = ctx.createImageData(s, s)
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const u = x / s
        const v = y / s
        const fiber = fbm(u * 18, v * 22, 2.4, 4)
        const swirl = fbm(u * 3.2, v * 3.2, 9.1, 3)
        const shade = 10 + fiber * 18 + swirl * 10
        const i = (y * s + x) * 4
        image.data[i] = Math.floor(shade * 0.55)
        image.data[i + 1] = Math.floor(shade * 0.72)
        image.data[i + 2] = Math.floor(shade * 0.78)
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  })

  const roughness = fillCanvas(size, (ctx, s) => {
    const image = ctx.createImageData(s, s)
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const u = x / s
        const v = y / s
        const grain = fbm(u * 14, v * 14, 4.6, 4)
        const value = Math.floor((0.55 + grain * 0.35) * 255)
        const i = (y * s + x) * 4
        image.data[i] = value
        image.data[i + 1] = value
        image.data[i + 2] = value
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  })

  return {
    map: toTexture(albedo, { srgb: true, repeat: 3 }),
    roughnessMap: toTexture(roughness, { repeat: 3 }),
  }
}

/** Dark velvet tabletop albedo + roughness. Shared per quality tier. */
export function createTableTextures(quality: TextureQuality): {
  map: CanvasTexture
  roughnessMap: CanvasTexture
} {
  const key = `table-v2-${quality}`
  const cached = tableCache.get(key)
  if (cached !== undefined) return cached
  const maps = buildTableTextures(quality)
  tableCache.set(key, maps)
  return maps
}

/** Soft spring toward a target — shared by card / camera motion. */
export function springStep(
  current: number,
  target: number,
  delta: number,
  stiffness = 14,
): number {
  const speed = 1 - Math.exp(-delta * stiffness)
  return current + (target - current) * speed
}
