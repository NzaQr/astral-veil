import {
  SYMBOLS,
  type MatchState,
  type PlayerId,
  type PlayerMatchView,
  type PublicMatchView,
  type SymbolCounts,
  type SymbolProbabilities,
} from './types.js'

export function getUnseenCenterCounts(state: MatchState): SymbolCounts {
  const counts: Record<(typeof SYMBOLS)[number], number> = {
    sun: state.config.centralCardsPerSymbol,
    moon: state.config.centralCardsPerSymbol,
    star: state.config.centralCardsPerSymbol,
  }
  for (const round of state.history) {
    counts[round.center.symbol] -= 1
  }
  return counts
}

function getProbabilities(counts: SymbolCounts): SymbolProbabilities {
  const total = counts.sun + counts.moon + counts.star
  if (total === 0) {
    return { sun: 0, moon: 0, star: 0 }
  }
  return {
    sun: counts.sun / total,
    moon: counts.moon / total,
    star: counts.star / total,
  }
}

function publicView(state: MatchState): PublicMatchView {
  const unseenCenterCounts = getUnseenCenterCounts(state)
  const unseenCenterTotal =
    unseenCenterCounts.sun + unseenCenterCounts.moon + unseenCenterCounts.star
  return {
    phase: state.phase,
    round: state.round,
    config: state.config,
    players: {
      'player-1': {
        handSize: state.players['player-1'].hand.length,
        hasCommitted: state.players['player-1'].committed !== null,
        consecutiveFallbacks:
          state.players['player-1'].consecutiveFallbacks,
      },
      'player-2': {
        handSize: state.players['player-2'].hand.length,
        hasCommitted: state.players['player-2'].committed !== null,
        consecutiveFallbacks:
          state.players['player-2'].consecutiveFallbacks,
      },
    },
    pot: state.pot,
    discard: state.discard,
    history: state.history,
    lastResult: state.lastResult,
    outcome: state.outcome,
    unseenCenterCounts,
    unseenCenterProbabilities: getProbabilities(unseenCenterCounts),
    unseenCenterTotal,
  }
}

export function projectForPlayer(
  state: MatchState,
  viewer: PlayerId,
): PlayerMatchView {
  return {
    ...publicView(state),
    viewer,
    hand: state.players[viewer].hand,
    committedCard: state.players[viewer].committed,
  }
}
