import {
  getHotSeatCommitOrder,
  getUnseenCenterCounts,
  type MatchState,
  type PlayerId,
} from '@astral-veil/engine'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { CardBoard } from './CardBoard'
import { SymbolIcon } from './SymbolIcon'
import { symbolName } from '../game/symbols'
import {
  advanceRevealBeat,
  frameForBeat,
  revealDelay,
  resultHoldMs,
  type RoundRevealFrame,
} from '../game/roundReveal'
import {
  getActiveViewer,
  getAiDelay,
  useGameStore,
  type MatchMode,
  type RevealStage,
} from '../game/store'

function playerLabel(player: PlayerId, mode: MatchMode): string {
  if (mode === 'solo') return player === 'player-1' ? 'You' : 'Veil AI'
  return player === 'player-1' ? 'Player One' : 'Player Two'
}

function CenterHistory({ frame, match }: { frame: RoundRevealFrame | null; match: MatchState }) {
  const history = frame?.history ?? match.history
  return (
    <details className="center-history">
      <summary>
        <span>History</span>
        <strong className="tabular">{history.length}</strong>
      </summary>
      <div className="center-history-body">
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
    </details>
  )
}

function ResolutionBanner({
  match,
  mode,
  stage,
  frame,
  reducedMotion,
}: {
  match: MatchState
  mode: MatchMode
  stage: RevealStage
  frame: RoundRevealFrame | null
  reducedMotion: boolean
}) {
  const continueRound = useGameStore((state) => state.continueRound)
  if (frame === null || stage === 'choosing') return null
  const result = frame.result

  let title = 'A card is on the table'
  let detail = 'Wait for the next commitment.'
  if (stage === 'secondPlay') {
    title = 'Both plays are visible'
    detail = 'Read the commitments before the center lifts.'
  }
  if (stage === 'center') {
    title = `${symbolName(result.center.symbol)} at the center`
    detail = 'Compare each play to the revealed center.'
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
          Continue now
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
          <button
            className="secondary-button"
            type="button"
            onClick={exitMatch}
          >
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
  if (
    mode !== 'hot-seat' ||
    accepted ||
    match.phase !== 'awaiting-selections'
  ) {
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
        The previous choice is concealed. Continue only when no one else can see
        the screen.
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
}

export function MatchScreen({ match, mode, reducedMotion }: MatchScreenProps) {
  const revealStage = useGameStore((state) => state.revealStage)
  const revealSequence = useGameStore((state) => state.revealSequence)
  const hotSeatIndex = useGameStore((state) => state.hotSeatIndex)
  const handoffAccepted = useGameStore((state) => state.handoffAccepted)
  const performAiCommit = useGameStore((state) => state.performAiCommit)
  const advanceReveal = useGameStore((state) => state.advanceReveal)
  const continueRound = useGameStore((state) => state.continueRound)
  const exitMatch = useGameStore((state) => state.exitMatch)
  const openDialog = useGameStore((state) => state.openDialog)
  const viewer = getActiveViewer(match, mode, hotSeatIndex)
  const handoffVisible =
    mode === 'hot-seat' &&
    !handoffAccepted &&
    match.phase === 'awaiting-selections'
  const canCommit =
    match.phase === 'awaiting-selections' &&
    match.players[viewer].committed === null &&
    revealStage === 'choosing' &&
    !handoffVisible
  const revealFrame =
    revealSequence !== null && revealStage !== 'choosing'
      ? frameForBeat(revealSequence, revealStage)
      : null
  const unseenCounts =
    revealFrame?.unseenCenterCounts ?? getUnseenCenterCounts(match)
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
    if (revealStage === 'choosing' || revealStage === 'result') return
    const next = advanceRevealBeat(revealStage)
    if (next === null) return
    const timer = window.setTimeout(
      () => advanceReveal(),
      revealDelay(revealStage, reducedMotion),
    )
    return () => window.clearTimeout(timer)
  }, [advanceReveal, reducedMotion, revealStage])

  useEffect(() => {
    if (revealStage !== 'result' || match.phase !== 'resolved') return
    const timer = window.setTimeout(
      () => continueRound(),
      resultHoldMs(reducedMotion),
    )
    return () => window.clearTimeout(timer)
  }, [continueRound, match.phase, reducedMotion, revealStage])

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
          <div className="center-deck-count">
            <span>Unseen</span>
            <strong>{unseenTotal}</strong>
          </div>
        </div>
        <section className="table-region" aria-label="Astral Veil table">
          <CardBoard
            match={match}
            mode={mode}
            revealStage={revealStage}
            revealFrame={revealFrame}
            reducedMotion={reducedMotion}
            canCommit={canCommit}
          />
          <div className="table-overlays">
            <CenterHistory frame={revealFrame} match={match} />
          </div>
          <ResolutionBanner
            match={match}
            mode={mode}
            stage={revealStage}
            frame={revealFrame}
            reducedMotion={reducedMotion}
          />
        </section>
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
      <MatchResult match={match} mode={mode} reducedMotion={reducedMotion} />
    </main>
  )
}
