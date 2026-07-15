import type { AstralSymbol } from '@astral-veil/engine'

interface SymbolIconProps {
  symbol: AstralSymbol
  size?: number
  label?: boolean
}

const LABELS: Record<AstralSymbol, string> = {
  sun: 'Sun',
  moon: 'Moon',
  star: 'Star',
}

export function SymbolIcon({
  symbol,
  size = 24,
  label = false,
}: SymbolIconProps) {
  return (
    <span
      className={`symbol-icon symbol-${symbol}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label ? LABELS[symbol] : undefined}
      aria-hidden={label ? undefined : true}
    >
      {symbol === 'sun' && (
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="6.25" />
          {Array.from({ length: 8 }, (_, index) => (
            <path
              key={index}
              d="M16 2.5v5"
              transform={`rotate(${index * 45} 16 16)`}
            />
          ))}
        </svg>
      )}
      {symbol === 'moon' && (
        <svg viewBox="0 0 32 32">
          <path d="M22.8 25.2A12 12 0 1 1 18.2 4.5c-5 2.4-7 8.3-4.7 13.2 1.8 3.8 5.5 6.2 9.3 7.5Z" />
        </svg>
      )}
      {symbol === 'star' && (
        <svg viewBox="0 0 32 32">
          <path d="m16 2.8 3.6 8.1 8.8.9-6.6 5.9 1.9 8.7-7.7-4.5-7.7 4.5 1.9-8.7-6.6-5.9 8.8-.9L16 2.8Z" />
        </svg>
      )}
    </span>
  )
}
