import { useLayoutEffect } from 'react'
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { useTexture } from '@react-three/drei'
import type { AstralSymbol } from '@astral-veil/engine'
import sunArt from '../assets/cards/sun.jpg'
import moonArt from '../assets/cards/moon.jpg'
import starArt from '../assets/cards/star.jpg'

/** Native artwork aspect (~640×1024). Card mesh must match exactly. */
export const ART_ASPECT = 640 / 1024

export const CARD_ART: Record<AstralSymbol, string> = {
  sun: sunArt,
  moon: moonArt,
  star: starArt,
}

export function useCardArtTextures(): Record<AstralSymbol, Texture> {
  const [sun, moon, star] = useTexture([
    CARD_ART.sun,
    CARD_ART.moon,
    CARD_ART.star,
  ]) as [Texture, Texture, Texture]

  useLayoutEffect(() => {
    for (const texture of [sun, moon, star]) {
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = 8
      texture.generateMipmaps = true
      texture.minFilter = LinearMipmapLinearFilter
      texture.magFilter = LinearFilter
      texture.needsUpdate = true
    }
  }, [sun, moon, star])

  return { sun, moon, star }
}

export function configureCardTexture(texture: Texture, anisotropy = 8): Texture {
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}
