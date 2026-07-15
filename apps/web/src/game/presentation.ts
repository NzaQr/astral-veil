import {
  getUnseenCenterCounts,
  type Card,
  type MatchState,
  type PlayerId,
  type RevealedRound,
  type SymbolCounts,
} from '@astral-veil/engine'
import type { RevealStage } from './store'

function beforeResolutionFeedback(stage: RevealStage): boolean {
  return stage === 'players' || stage === 'center'
}

export function visibleHand(
  match: MatchState,
  player: PlayerId,
  stage: RevealStage,
): readonly Card[] {
  const result = match.lastResult
  const hand = match.players[player].hand
  if (
    result === null ||
    !beforeResolutionFeedback(stage) ||
    result.recipient !== player
  ) {
    return hand
  }
  const transferred = new Set(result.transferredCardIds)
  return hand.filter((card) => !transferred.has(card.id))
}

export function visiblePot(
  match: MatchState,
  stage: RevealStage,
): readonly Card[] {
  const result = match.lastResult
  if (result === null || !beforeResolutionFeedback(stage)) return match.pot

  const roundCardIds = new Set([
    result.center.id,
    result.plays['player-1'].id,
    result.plays['player-2'].id,
  ])
  if (result.kind === 'standoff') {
    return match.pot.filter((card) => !roundCardIds.has(card.id))
  }

  const transferred = new Set(result.transferredCardIds)
  return [
    ...match.players['player-1'].hand,
    ...match.players['player-2'].hand,
    ...match.pot,
    ...match.discard,
  ].filter(
    (card) => transferred.has(card.id) && !roundCardIds.has(card.id),
  )
}

export function visibleCenterHistory(
  match: MatchState,
  stage: RevealStage,
): readonly RevealedRound[] {
  if (stage === 'players' && match.lastResult !== null) {
    return match.history.slice(0, -1)
  }
  return match.history
}

export function visibleUnseenCounts(
  match: MatchState,
  stage: RevealStage,
): SymbolCounts {
  const counts = getUnseenCenterCounts(match)
  const result = match.lastResult
  if (stage !== 'players' || result === null) return counts
  return {
    ...counts,
    [result.center.symbol]: counts[result.center.symbol] + 1,
  }
}
