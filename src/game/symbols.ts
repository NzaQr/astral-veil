import type { AstralSymbol } from '@astral-veil/engine'

const SYMBOL_NAMES: Record<AstralSymbol, string> = {
  sun: 'Sun',
  moon: 'Moon',
  star: 'Star',
}

export function symbolName(symbol: AstralSymbol): string {
  return SYMBOL_NAMES[symbol]
}
