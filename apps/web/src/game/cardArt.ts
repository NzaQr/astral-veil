import type { AstralSymbol } from '@astral-veil/engine'
import backArt from '../assets/cards/back.png'
import sunArt from '../assets/cards/sun.jpg'
import moonArt from '../assets/cards/moon.jpg'
import starArt from '../assets/cards/star.jpg'

/** Native artwork aspect (~640×1024). Cards must preserve this ratio. */
export const ART_ASPECT = 640 / 1024

export const CARD_BACK = backArt

export const CARD_ART: Record<AstralSymbol, string> = {
  sun: sunArt,
  moon: moonArt,
  star: starArt,
}
