import {
  SYMBOLS,
  getHotSeatCommitOrder,
  type AstralSymbol,
  type Card,
  type MatchState,
  type PlayerId,
} from '@astral-veil/engine'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { GameScene } from '../scene/GameScene'
import { SymbolIcon } from './SymbolIcon'
import { symbolName } from '../game/symbols'
import {
  visibleCenterHistory,
  visibleHand,
  visiblePot,
  visibleUnseenCounts,
} from '../game/presentation'
import {
  getActiveViewer,
  getAiDelay,
  useGameStore,
  type MatchMode,
  type RuntimeQuality,
} from '../game/store'

function playerLabel(player: PlayerId, mode: MatchMode): string {
  if (mode === 'solo') return player === 'player-1' ? 'You' : 'Veil AI'
  return player === 'player-1' ? 'Player One' : 'Player Two'
}

function symbolCounts(cards: readonly { symbol: AstralSymbol }[]) {
  const counts: Record<AstralSymbol, number> = { sun: 0, moon: 0, star: 0 }
  for (const card of cards) counts[card.symbol] += 1
  return counts
}

function ScoreBadge({
  label,
  score,
  align,
}: {
  label: string
  score: number
  align: 'left' | 'right'
}) {
  return (
    <div className={`score-badge score-${align}`}>
      <div>
        <span>{label}</span>
        <small>cards in hand</small>
      </div>
      <strong>{score}</strong>
    </div>
  )
}

function ProbabilityPanel({
  match,
  stage,
}: {
  match: MatchState
  stage: ReturnType<typeof useGameStore.getState>['revealStage']
}) {
  const counts = visibleUnseenCounts(match, stage)
  const total = counts.sun + counts.moon + counts.star
  return (
    <details className="probability-panel" open>
      <summary>
        <span>
          Unseen center <small>includes the hidden card</small>
        </span>
        <strong>{total}</strong>
      </summary>
      <div className="probability-rows">
        {SYMBOLS.map((symbol) => {
          const percentage = Math.round(
            total === 0 ? 0 : (counts[symbol] / total) * 100,
          )
          return (
            <div key={symbol} className={`probability-row probability-${symbol}`}>
              <SymbolIcon symbol={symbol} size={20} />
              <span>{symbolName(symbol)}</span>
              <div className="probability-track" aria-hidden="true">
                <i style={{ width: `${percentage}%` }} />
              </div>
              <strong>{percentage}%</strong>
              <small>{counts[symbol]}</small>
            </div>
          )
        })}
      </div>
    </details>
  )
}

function PotPanel({ cards }: { cards: readonly Card[] }) {
  const [open, setOpen] = useState(false)
  const counts = useMemo(() => symbolCounts(cards), [cards])
  return (
    <div className="pot-panel">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="pot-button"
      >
        <span>Pot</span>
        <strong>{cards.length}</strong>
        <small>{open ? 'Hide symbols' : 'Inspect symbols'}</small>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="pot-popover"
            initial={{ opacity: 0, y: 7, scale: 0.98 }}
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
        )}
      </AnimatePresence>
    </div>
  )
}

function CenterHistory({
  match,
  stage,
}: {
  match: MatchState
  stage: ReturnType<typeof useGameStore.getState>['revealStage']
}) {
  const history = visibleCenterHistory(match, stage)
  return (
    <div className="center-history" aria-label="Revealed center symbols">
      <span>Center history</span>
      <div>
        {history.length === 0 ? (
          <small>None yet</small>
        ) : (
          history.map((round) => (
            <span
              key={round.round}
              title={`Round ${round.round}: ${symbolName(round.center.symbol)}`}
            >
              <SymbolIcon symbol={round.center.symbol} size={19} label />
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function AccessibleCommit({
  match,
  viewer,
  disabled,
}: {
  match: MatchState
  viewer: PlayerId
  disabled: boolean
}) {
  const selected = useGameStore((state) => state.selectedSymbol)
  const selectSymbol = useGameStore((state) => state.selectSymbol)
  const commitSelected = useGameStore((state) => state.commitSelected)
  const counts = useMemo(
    () => symbolCounts(match.players[viewer].hand),
    [match.players, viewer],
  )

  return (
    <div className="commit-controls">
      <p>
        {disabled
          ? 'Commitment sealed'
          : 'Choose a stack, then play its top card'}
      </p>
      <div className="symbol-actions" role="group" aria-label="Choose a symbol">
        {SYMBOLS.map((symbol) => (
          <button
            key={symbol}
            type="button"
            disabled={disabled || counts[symbol] === 0}
            className={selected === symbol ? 'is-selected' : ''}
            onClick={() => selectSymbol(symbol)}
            aria-pressed={selected === symbol}
          >
            <SymbolIcon symbol={symbol} size={24} />
            <span>{symbolName(symbol)}</span>
            <strong>{counts[symbol]}</strong>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="play-card-button"
        disabled={disabled || selected === null}
        onClick={commitSelected}
      >
        {selected === null ? 'Select a symbol' : `Play ${symbolName(selected)}`}
      </button>
    </div>
  )
}

function ResolutionBanner({
  match,
  mode,
  reducedMotion,
}: {
  match: MatchState
  mode: MatchMode
  reducedMotion: boolean
}) {
  const stage = useGameStore((state) => state.revealStage)
  const continueRound = useGameStore((state) => state.continueRound)
  const result = match.lastResult
  if (result === null || stage === 'choosing') return null

  let title = 'Commitments revealed'
  let detail = 'The center remains behind the veil.'
  if (stage === 'center') {
    title = `${symbolName(result.center.symbol)} at the center`
    detail = 'The alignment is now known.'
  }
  if (stage === 'result') {
    if (result.kind === 'standoff') {
      const playerOneMatch =
        result.plays['player-1'].symbol === result.center.symbol
      title = 'Standoff'
      detail = playerOneMatch
        ? `Both players aligned. The ${result.potSize}-card pot remains.`
        : `Neither player aligned. The ${result.potSize}-card pot remains.`
    } else if (result.winner !== null && result.recipient !== null) {
      title = 'Decisive round'
      detail = `${playerLabel(result.winner, mode)} aligned; ${playerLabel(
        result.recipient,
        mode,
      )} receives ${result.transferredCardIds.length} card${
        result.transferredCardIds.length === 1 ? '' : 's'
      }.`
    }
  }

  return (
    <motion.div
      className={`resolution-banner stage-${stage}`}
      key={stage}
      initial={reducedMotion ? false : { opacity: 0, y: -9, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
      role="status"
      aria-live="polite"
    >
      <span className="resolution-kicker">Round {result.round}</span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {stage === 'result' && match.phase === 'resolved' && (
        <button type="button" onClick={continueRound}>
          Continue to round {match.round + 1}
        </button>
      )}
    </motion.div>
  )
}

function MatchResult({
  match,
  mode,
  reducedMotion,
}: {
  match: MatchState
  mode: MatchMode
  reducedMotion: boolean
}) {
  const stage = useGameStore((state) => state.revealStage)
  const rematch = useGameStore((state) => state.rematch)
  const exitMatch = useGameStore((state) => state.exitMatch)
  const outcome = match.outcome
  if (match.phase !== 'complete' || outcome === null || stage !== 'result') {
    return null
  }

  const draw = outcome.winner === null
  const humanWon = outcome.winner === 'player-1'
  const title =
    mode === 'solo'
      ? draw
        ? 'The veil holds'
        : humanWon
          ? 'You prevail'
          : 'The veil prevails'
      : draw
        ? 'The match is a draw'
        : `${playerLabel(outcome.winner, mode)} prevails`
  const verdict =
    mode === 'solo'
      ? draw
        ? 'Draw'
        : humanWon
          ? 'Win'
          : 'Loss'
      : draw
        ? 'Draw'
        : 'Match complete'

  return (
    <div className="result-backdrop">
      <motion.section
        className="result-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
      >
        <p className="eyebrow">{verdict}</p>
        <h2 id="result-title">{title}</h2>
        <p>
          Lower hand wins. Final score{' '}
          <strong>{outcome.scores['player-1']}</strong>
          <span> — </span>
          <strong>{outcome.scores['player-2']}</strong>
        </p>
        {match.pot.length > 0 && (
          <small>
            The terminal {match.pot.length}-card pot remains unclaimed.
          </small>
        )}
        <div className="result-actions">
          <button className="primary-button" type="button" onClick={rematch}>
            Rematch
          </button>
          <button className="secondary-button" type="button" onClick={exitMatch}>
            Main menu
          </button>
        </div>
      </motion.section>
    </div>
  )
}

function Handoff({
  match,
  mode,
  reducedMotion,
}: {
  match: MatchState
  mode: MatchMode
  reducedMotion: boolean
}) {
  const hotSeatIndex = useGameStore((state) => state.hotSeatIndex)
  const accepted = useGameStore((state) => state.handoffAccepted)
  const accept = useGameStore((state) => state.acceptHandoff)
  if (mode !== 'hot-seat' || accepted || match.phase !== 'awaiting-selections') {
    return null
  }
  const player = getHotSeatCommitOrder(match.round)[hotSeatIndex]
  return (
    <motion.div
      className="handoff-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handoff-title"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="handoff-sigil" aria-hidden="true">
        <SymbolIcon symbol="moon" size={42} />
      </div>
      <p className="eyebrow">Privacy handoff</p>
      <h2 id="handoff-title">Pass to {playerLabel(player, mode)}</h2>
      <p>
        The previous choice is concealed. Continue only when no one else can
        see the screen.
      </p>
      <button className="primary-button" type="button" onClick={accept}>
        I’m ready
      </button>
    </motion.div>
  )
}

interface MatchScreenProps {
  match: MatchState
  mode: MatchMode
  reducedMotion: boolean
  effectiveQuality: RuntimeQuality
}

export function MatchScreen({
  match,
  mode,
  reducedMotion,
  effectiveQuality,
}: MatchScreenProps) {
  const revealStage = useGameStore((state) => state.revealStage)
  const hotSeatIndex = useGameStore((state) => state.hotSeatIndex)
  const handoffAccepted = useGameStore((state) => state.handoffAccepted)
  const performAiCommit = useGameStore((state) => state.performAiCommit)
  const setRevealStage = useGameStore((state) => state.setRevealStage)
  const exitMatch = useGameStore((state) => state.exitMatch)
  const openDialog = useGameStore((state) => state.openDialog)
  const qualityPreference = useGameStore((state) => state.quality)
  const viewer = getActiveViewer(match, mode, hotSeatIndex)
  const opponent: PlayerId =
    viewer === 'player-1' ? 'player-2' : 'player-1'
  const handoffVisible =
    mode === 'hot-seat' &&
    !handoffAccepted &&
    match.phase === 'awaiting-selections'
  const canCommit =
    match.phase === 'awaiting-selections' &&
    match.players[viewer].committed === null &&
    revealStage === 'choosing' &&
    !handoffVisible
  const viewerHand = visibleHand(match, viewer, revealStage)
  const opponentHand = visibleHand(match, opponent, revealStage)
  const presentedPot = visiblePot(match, revealStage)
  const unseenCounts = visibleUnseenCounts(match, revealStage)
  const unseenTotal =
    unseenCounts.sun + unseenCounts.moon + unseenCounts.star

  useEffect(() => {
    if (
      mode !== 'solo' ||
      match.phase !== 'awaiting-selections' ||
      match.players['player-1'].committed === null ||
      match.players['player-2'].committed !== null
    ) {
      return
    }
    const timer = window.setTimeout(
      performAiCommit,
      getAiDelay(useGameStore.getState().aiRngState, reducedMotion),
    )
    return () => window.clearTimeout(timer)
  }, [match, mode, performAiCommit, reducedMotion])

  useEffect(() => {
    if (revealStage !== 'players') return
    const timer = window.setTimeout(
      () => setRevealStage('center'),
      reducedMotion ? 160 : 720,
    )
    return () => window.clearTimeout(timer)
  }, [reducedMotion, revealStage, setRevealStage])

  useEffect(() => {
    if (revealStage !== 'center') return
    const timer = window.setTimeout(
      () => setRevealStage('result'),
      reducedMotion ? 180 : 860,
    )
    return () => window.clearTimeout(timer)
  }, [reducedMotion, revealStage, setRevealStage])

  return (
    <main className="match-screen">
      <div
        className="match-content"
        aria-hidden={handoffVisible}
        inert={handoffVisible ? true : undefined}
      >
        <header className="match-header">
          <button className="match-exit" type="button" onClick={exitMatch}>
            <span aria-hidden="true">←</span> Exit
          </button>
          <div className="round-marker">
            <small>{mode === 'solo' ? 'Solo match' : 'Hot-seat match'}</small>
            <strong>Round {match.round}</strong>
          </div>
          <button
            className="match-rules"
            type="button"
            onClick={() => openDialog('rules')}
          >
            Rules
          </button>
        </header>
        <div className="score-row">
          <ScoreBadge
            label={playerLabel(viewer, mode)}
            score={viewerHand.length}
            align="left"
          />
          <div className="center-deck-count">
            <span>Unseen</span>
            <strong>{unseenTotal}</strong>
          </div>
          <ScoreBadge
            label={playerLabel(opponent, mode)}
            score={opponentHand.length}
            align="right"
          />
        </div>
        <section className="table-region" aria-label="Astral Veil table">
          <GameScene
            match={match}
            mode={mode}
            revealStage={revealStage}
            reducedMotion={reducedMotion}
            quality={effectiveQuality}
            qualityPreference={qualityPreference}
          />
          <div className="table-overlays">
            <ProbabilityPanel match={match} stage={revealStage} />
            <PotPanel cards={presentedPot} />
            <CenterHistory match={match} stage={revealStage} />
          </div>
          <ResolutionBanner
            match={match}
            mode={mode}
            reducedMotion={reducedMotion}
          />
        </section>
        <AccessibleCommit
          match={match}
          viewer={viewer}
          disabled={!canCommit}
        />
      </div>
      <AnimatePresence initial={false}>
        {handoffVisible && (
          <Handoff
            key={`${match.round}-${hotSeatIndex}`}
            match={match}
            mode={mode}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
      <MatchResult
        match={match}
        mode={mode}
        reducedMotion={reducedMotion}
      />
    </main>
  )
}
