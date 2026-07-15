import {
  SYMBOLS,
  type AstralSymbol,
  type Card,
  type MatchState,
  type PlayerId,
} from '@astral-veil/engine'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { ART_ASPECT, CARD_BACK } from '../game/cardArt'
import {
  playOutcomeFor,
  type RoundRevealFrame,
} from '../game/roundReveal'
import { symbolName } from '../game/symbols'
import {
  getActiveViewer,
  useGameStore,
  type MatchMode,
  type RevealStage,
} from '../game/store'
import { HandStack, PlayingCard, type CardOutcome } from './PlayingCard'
import { SymbolIcon } from './SymbolIcon'

interface CardBoardProps {
  match: MatchState
  mode: MatchMode
  revealStage: RevealStage
  revealFrame: RoundRevealFrame | null
  reducedMotion: boolean
  canCommit: boolean
}

function countSymbols(
  cards: readonly { symbol: AstralSymbol }[],
): Record<AstralSymbol, number> {
  const counts: Record<AstralSymbol, number> = { sun: 0, moon: 0, star: 0 }
  for (const card of cards) counts[card.symbol] += 1
  return counts
}

function playerLabel(player: PlayerId, mode: MatchMode): string {
  if (mode === 'solo') return player === 'player-1' ? 'You' : 'Veil AI'
  return player === 'player-1' ? 'Player One' : 'Player Two'
}

function HandCountBadge({
  label,
  count,
  align,
}: {
  label: string
  count: number
  align: 'left' | 'right'
}) {
  return (
    <div className={`hand-count-badge hand-count-${align}`}>
      <div>
        <span>{label}</span>
        <small>cards in hand</small>
      </div>
      <strong className="tabular">{count}</strong>
    </div>
  )
}

/** Slightly chaotic offsets so the pot reads as a loose pile, not a neat deck. */
const POT_LAYER_TRANSFORMS = [
  'translate(-10px, 6px) rotate(-11deg)',
  'translate(8px, -4px) rotate(7deg)',
  'translate(-4px, -8px) rotate(-4deg)',
  'translate(11px, 5px) rotate(12deg)',
  'translate(-7px, 2px) rotate(-8deg)',
  'translate(3px, -2px) rotate(3deg)',
] as const

function PotPile({
  cards,
  reducedMotion,
}: {
  cards: readonly Card[]
  reducedMotion: boolean
}) {
  const [open, setOpen] = useState(false)
  const counts = useMemo(() => countSymbols(cards), [cards])
  const layerCount = Math.min(
    Math.max(cards.length, 0),
    POT_LAYER_TRANSFORMS.length,
  )
  const empty = cards.length === 0

  return (
    <div className={`pot-pile${empty ? ' is-empty' : ''}`}>
      <button
        type="button"
        className="pot-pile-button"
        aria-expanded={open}
        aria-label={`Pot, ${cards.length} cards. ${open ? 'Hide' : 'Inspect'} symbols`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="pot-pile-stack" style={{ aspectRatio: ART_ASPECT }}>
          {empty ? (
            <span className="pot-pile-ghost" aria-hidden="true" />
          ) : (
            Array.from({ length: layerCount }, (_, index) => (
              <img
                key={index}
                src={CARD_BACK}
                alt=""
                draggable={false}
                className="pot-pile-layer"
                style={{ transform: POT_LAYER_TRANSFORMS[index] }}
                aria-hidden="true"
              />
            ))
          )}
        </span>
        <span className="pot-pile-meta">
          <span>Pot</span>
          <strong className="tabular">{cards.length}</strong>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <div className="pot-popover-anchor">
            <motion.div
              className="pot-popover"
              initial={
                reducedMotion ? false : { opacity: 0, y: 7, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.99 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            >
              {SYMBOLS.map((symbol) => (
                <span key={symbol}>
                  <SymbolIcon symbol={symbol} size={18} />
                  {counts[symbol]}
                </span>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RevealSlot({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`reveal-slot${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      <div className="reveal-slot-stage">{children}</div>
    </div>
  )
}

export function CardBoard({
  match,
  mode,
  revealStage,
  revealFrame,
  reducedMotion,
  canCommit,
}: CardBoardProps) {
  const hotSeatIndex = useGameStore((state) => state.hotSeatIndex)
  const selectedSymbol = useGameStore((state) => state.selectedSymbol)
  const selectSymbol = useGameStore((state) => state.selectSymbol)
  const commitSelected = useGameStore((state) => state.commitSelected)
  const commitSymbol = useGameStore((state) => state.commitSymbol)

  const viewer = getActiveViewer(match, mode, hotSeatIndex)
  const opponent: PlayerId = viewer === 'player-1' ? 'player-2' : 'player-1'
  const showingReveal = revealFrame !== null

  const viewerHand = showingReveal
    ? revealFrame.hands[viewer]
    : match.players[viewer].hand
  const opponentHand = showingReveal
    ? revealFrame.hands[opponent]
    : match.players[opponent].hand
  const handCounts = useMemo(() => countSymbols(viewerHand), [viewerHand])
  const opponentCount = opponentHand.length
  const presentedPot = showingReveal ? revealFrame.pot : match.pot

  const viewerPlay = showingReveal
    ? (revealFrame.visiblePlays[viewer] ?? null)
    : null
  const opponentPlay = showingReveal
    ? (revealFrame.visiblePlays[opponent] ?? null)
    : null
  const centerCard = showingReveal ? revealFrame.center : null
  const showCenterBack =
    match.phase === 'awaiting-selections' ||
    (showingReveal && !revealFrame.centerFaceUp)
  const viewerOutcome: CardOutcome = showingReveal
    ? playOutcomeFor(revealFrame, viewer)
    : null
  const opponentOutcome: CardOutcome = showingReveal
    ? playOutcomeFor(revealFrame, opponent)
    : null
  const waitingOnOpponent =
    showingReveal && opponentPlay === null && viewerPlay !== null

  const spring = reducedMotion
    ? { duration: 0.01 }
    : { type: 'spring' as const, duration: 0.45, bounce: 0 }

  return (
    <div
      className={`card-board${showingReveal ? ' is-revealing' : ''}`}
      aria-label="Astral Veil table"
    >
      <div className="board-atmosphere" aria-hidden="true">
        <span className="board-glow board-glow-a" />
        <span className="board-glow board-glow-b" />
        <span className="board-vignette" />
        <span className="board-grain" />
      </div>

      <section className="opponent-zone" aria-label="Opponent hand">
        <div className="hand-cluster">
          <div className="opponent-stack">
            {opponentCount > 0 ? (
              <>
                {opponentCount > 1 && (
                  <span className="facedown-layer layer-b" aria-hidden="true" />
                )}
                {opponentCount > 2 && (
                  <span className="facedown-layer layer-c" aria-hidden="true" />
                )}
                <PlayingCard
                  face="back"
                  size="sm"
                  count={opponentCount}
                  reducedMotion={reducedMotion}
                  label={`${opponentCount} facedown cards`}
                />
              </>
            ) : (
              <div className="hand-stack-ghost is-sm" aria-hidden="true" />
            )}
          </div>
          <HandCountBadge
            label={playerLabel(opponent, mode)}
            count={opponentCount}
            align="right"
          />
        </div>
      </section>

      <section className="reveal-arena" aria-live="polite">
        <RevealSlot label={playerLabel(viewer, mode)}>
          <AnimatePresence mode="popLayout">
            {viewerPlay !== null ? (
              <motion.div
                key={`viewer-${viewerPlay.id}`}
                className="reveal-card"
                initial={
                  reducedMotion ? false : { opacity: 0, y: 36, scale: 0.92 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={spring}
              >
                <PlayingCard
                  face="front"
                  symbol={viewerPlay.symbol}
                  size="lg"
                  outcome={viewerOutcome}
                  reducedMotion={reducedMotion}
                  label={`Your play: ${symbolName(viewerPlay.symbol)}`}
                />
              </motion.div>
            ) : (
              <motion.div
                key="viewer-empty"
                className="reveal-placeholder"
                initial={false}
                animate={{ opacity: 0.55 }}
              />
            )}
          </AnimatePresence>
        </RevealSlot>

        <div className="center-column">
          <PotPile cards={presentedPot} reducedMotion={reducedMotion} />
          <RevealSlot label="Center" className="center-slot">
            <AnimatePresence mode="wait">
              {centerCard !== null ? (
                <motion.div
                  key={`center-${centerCard.id}`}
                  className="reveal-card"
                  initial={
                    reducedMotion
                      ? false
                      : { opacity: 0, rotateY: -70, scale: 0.9 }
                  }
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={spring}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <PlayingCard
                    face="front"
                    symbol={centerCard.symbol}
                    size="lg"
                    className="is-center-reveal"
                    reducedMotion={reducedMotion}
                    label={`Center: ${symbolName(centerCard.symbol)}`}
                  />
                </motion.div>
              ) : showCenterBack ? (
                <motion.div
                  key="center-back"
                  className="reveal-card"
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    reducedMotion
                      ? undefined
                      : { opacity: 0, scale: 1.04, filter: 'blur(4px)' }
                  }
                  transition={spring}
                >
                  <PlayingCard
                    face="back"
                    size="lg"
                    reducedMotion={reducedMotion}
                    label="Hidden center card"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="center-empty"
                  className="reveal-placeholder"
                  initial={false}
                />
              )}
            </AnimatePresence>
          </RevealSlot>
        </div>

        <RevealSlot label={playerLabel(opponent, mode)}>
          <AnimatePresence mode="popLayout">
            {opponentPlay !== null ? (
              <motion.div
                key={`opponent-${opponentPlay.id}`}
                className="reveal-card"
                initial={
                  reducedMotion ? false : { opacity: 0, y: -36, scale: 0.92 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={spring}
              >
                <PlayingCard
                  face="front"
                  symbol={opponentPlay.symbol}
                  size="lg"
                  outcome={opponentOutcome}
                  reducedMotion={reducedMotion}
                  label={`Opponent play: ${symbolName(opponentPlay.symbol)}`}
                />
              </motion.div>
            ) : waitingOnOpponent ? (
              <motion.div
                key="opponent-waiting"
                className="reveal-card"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <PlayingCard
                  face="back"
                  size="lg"
                  reducedMotion={reducedMotion}
                  label="Opponent card pending"
                />
              </motion.div>
            ) : (
              <motion.div
                key="opponent-empty"
                className="reveal-placeholder"
                initial={false}
                animate={{ opacity: 0.55 }}
              />
            )}
          </AnimatePresence>
        </RevealSlot>
      </section>

      <section className="player-zone" aria-label="Your hand">
        <div className="hand-cluster player-hand-cluster">
          <HandCountBadge
            label={playerLabel(viewer, mode)}
            count={viewerHand.length}
            align="left"
          />
          <div className="hand-row" role="group" aria-label="Choose a symbol">
            {SYMBOLS.map((symbol) => (
              <HandStack
                key={symbol}
                symbol={symbol}
                count={handCounts[symbol]}
                selected={selectedSymbol === symbol}
                disabled={!canCommit || handCounts[symbol] === 0}
                reducedMotion={reducedMotion}
                onSelect={() => selectSymbol(symbol)}
                onPlay={() => {
                  selectSymbol(symbol)
                  commitSymbol(symbol)
                }}
              />
            ))}
          </div>
        </div>
        <div className="hand-actions">
          <p>
            {canCommit
              ? selectedSymbol === null
                ? 'Select a card, then play it to the center'
                : `Ready to play ${symbolName(selectedSymbol)}`
              : revealStage === 'choosing'
                ? 'Waiting for the opposing commitment'
                : 'Reading the round'}
          </p>
          <button
            type="button"
            className="play-card-button"
            disabled={!canCommit || selectedSymbol === null}
            onClick={commitSelected}
          >
            {selectedSymbol === null
              ? 'Select a card'
              : `Play ${symbolName(selectedSymbol)}`}
          </button>
        </div>
      </section>
    </div>
  )
}
