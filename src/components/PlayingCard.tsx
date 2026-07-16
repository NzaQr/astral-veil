import type { AstralSymbol } from '@astral-veil/engine'
import { motion } from 'motion/react'
import { ART_ASPECT, CARD_ART, CARD_BACK } from '../game/cardArt'
import { symbolName } from '../game/symbols'

export type CardSize = 'xs' | 'sm' | 'md' | 'lg'
export type CardOutcome = 'winner' | 'loser' | null

interface PlayingCardProps {
  face: 'front' | 'back'
  symbol?: AstralSymbol
  size?: CardSize
  selected?: boolean
  interactive?: boolean
  disabled?: boolean
  count?: number
  outcome?: CardOutcome
  label?: string
  layoutId?: string
  reducedMotion?: boolean
  className?: string
  onClick?: () => void
  onDoubleClick?: () => void
}

export function PlayingCard({
  face,
  symbol,
  size = 'md',
  selected = false,
  interactive = false,
  disabled = false,
  count,
  outcome = null,
  label,
  layoutId,
  reducedMotion = false,
  className = '',
  onClick,
  onDoubleClick,
}: PlayingCardProps) {
  const isButton = interactive && onClick !== undefined
  const ariaLabel =
    label ??
    (face === 'front' && symbol !== undefined
      ? symbolName(symbol)
      : 'Facedown card')

  const classNames = [
    'playing-card',
    `playing-card-${size}`,
    face === 'back' ? 'is-back' : 'is-front',
    selected ? 'is-selected' : '',
    interactive ? 'is-interactive' : '',
    disabled ? 'is-disabled' : '',
    outcome === 'winner' ? 'is-winner' : '',
    outcome === 'loser' ? 'is-loser' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const spring = reducedMotion
    ? { duration: 0.01 }
    : { type: 'spring' as const, duration: 0.35, bounce: 0 }

  // Selected cards already lift via animate.y — hover must not change y
  // (that would drop the card from -16 toward -10).
  const hover =
    interactive && !disabled && !reducedMotion
      ? selected
        ? { filter: 'brightness(1.14)' }
        : { y: -10, scale: 1.04 }
      : undefined
  const tap =
    interactive && !disabled && !reducedMotion ? { scale: 0.96 } : undefined

  const inner = (
    <>
      <div className="playing-card-face" aria-hidden="true">
        {face === 'front' && symbol !== undefined ? (
          <img
            src={CARD_ART[symbol]}
            alt=""
            draggable={false}
            className="playing-card-art"
          />
        ) : (
          <img
            src={CARD_BACK}
            alt=""
            draggable={false}
            className="playing-card-art playing-card-back-art"
          />
        )}
        <span className="playing-card-sheen" />
      </div>
      {count !== undefined && count > 0 && (
        <span className="playing-card-count" aria-hidden="true">
          {count}
        </span>
      )}
      {selected && (
        <span className="playing-card-select-ring" aria-hidden="true" />
      )}
      {outcome === 'winner' && (
        <span className="playing-card-outcome winner" aria-hidden="true">
          Match
        </span>
      )}
      {outcome === 'loser' && (
        <span className="playing-card-outcome loser" aria-hidden="true">
          Miss
        </span>
      )}
    </>
  )

  if (isButton) {
    return (
      <motion.button
        type="button"
        layoutId={layoutId}
        className={classNames}
        style={{ aspectRatio: ART_ASPECT }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={selected}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        whileHover={hover}
        whileTap={tap}
        animate={{
          y: selected && !reducedMotion ? -16 : 0,
          scale: selected ? 1.05 : 1,
          filter: 'brightness(1)',
        }}
        transition={spring}
      >
        {inner}
      </motion.button>
    )
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={classNames}
      style={{ aspectRatio: ART_ASPECT }}
      role="img"
      aria-label={ariaLabel}
      animate={{
        y: selected && !reducedMotion ? -16 : 0,
        scale: selected ? 1.05 : 1,
      }}
      transition={spring}
    >
      {inner}
    </motion.div>
  )
}

interface CardStackProps {
  symbol: AstralSymbol
  count: number
  selected: boolean
  disabled: boolean
  reducedMotion: boolean
  onSelect: () => void
  onPlay: () => void
}

export function HandStack({
  symbol,
  count,
  selected,
  disabled,
  reducedMotion,
  onSelect,
  onPlay,
}: CardStackProps) {
  if (count === 0) {
    return (
      <div className="hand-stack is-empty" aria-hidden="true">
        <div
          className="hand-stack-ghost"
          style={{ aspectRatio: ART_ASPECT }}
        />
        <span className="hand-stack-label">{symbolName(symbol)}</span>
      </div>
    )
  }

  return (
    <div className={`hand-stack${selected ? ' is-selected' : ''}`}>
      <div className="hand-stack-depth" aria-hidden="true">
        {count > 1 && <span className="hand-stack-layer layer-2" />}
        {count > 2 && <span className="hand-stack-layer layer-3" />}
      </div>
      <PlayingCard
        face="front"
        symbol={symbol}
        size="md"
        count={count}
        selected={selected}
        interactive
        disabled={disabled}
        reducedMotion={reducedMotion}
        label={`${symbolName(symbol)}, ${count} in hand`}
        onClick={onSelect}
        onDoubleClick={() => {
          if (!disabled) onPlay()
        }}
      />
      <span className="hand-stack-label">{symbolName(symbol)}</span>
    </div>
  )
}
