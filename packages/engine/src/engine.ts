import { shuffle } from './rng.js'
import {
  SYMBOLS,
  type AstralSymbol,
  type Card,
  type MatchConfig,
  type MatchOutcome,
  type MatchState,
  type PlayerId,
  type PlayerState,
  type RoundResult,
} from './types.js'

export const PLAYER_IDS = ['player-1', 'player-2'] as const

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  centralCardsPerSymbol: 5,
  handCardsPerSymbol: 3,
}

export function getHotSeatCommitOrder(
  round: number,
): readonly [PlayerId, PlayerId] {
  if (!Number.isInteger(round) || round <= 0) {
    throw new Error('Round must be a positive integer')
  }
  return round % 2 === 1
    ? ['player-1', 'player-2']
    : ['player-2', 'player-1']
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === 'player-1' ? 'player-2' : 'player-1'
}

function validateCount(name: string, count: number): void {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
}

function createCards(
  zone: 'center' | PlayerId,
  countPerSymbol: number,
): Card[] {
  return SYMBOLS.flatMap((symbol) =>
    Array.from({ length: countPerSymbol }, (_, index) => ({
      id: `${zone}:${symbol}:${index + 1}`,
      symbol,
    })),
  )
}

function expectedCardIds(config: MatchConfig): Set<string> {
  return new Set([
    ...createCards('center', config.centralCardsPerSymbol),
    ...createCards('player-1', config.handCardsPerSymbol),
    ...createCards('player-2', config.handCardsPerSymbol),
  ].map((card) => card.id))
}

export function createMatch(
  seed: number,
  overrides: Partial<MatchConfig> = {},
): MatchState {
  const config: MatchConfig = {
    ...DEFAULT_MATCH_CONFIG,
    ...overrides,
  }
  validateCount('centralCardsPerSymbol', config.centralCardsPerSymbol)
  validateCount('handCardsPerSymbol', config.handCardsPerSymbol)

  const shuffled = shuffle(
    createCards('center', config.centralCardsPerSymbol),
    seed,
  ).items
  const currentCenter = shuffled[0]
  if (currentCenter === undefined) {
    throw new Error('A match requires at least one center card')
  }

  const playerOneHand = createCards('player-1', config.handCardsPerSymbol)
  const playerTwoHand = createCards('player-2', config.handCardsPerSymbol)

  return {
    config,
    phase: 'awaiting-selections',
    round: 1,
    centralDeck: shuffled.slice(1),
    currentCenter,
    players: {
      'player-1': {
        hand: playerOneHand,
        committed: null,
        consecutiveFallbacks: 0,
      },
      'player-2': {
        hand: playerTwoHand,
        committed: null,
        consecutiveFallbacks: 0,
      },
    },
    pot: [],
    discard: [],
    history: [],
    lastResult: null,
    outcome: null,
    totalCardCount:
      config.centralCardsPerSymbol * SYMBOLS.length +
      config.handCardsPerSymbol * SYMBOLS.length * PLAYER_IDS.length,
  }
}

function replacePlayer(
  players: MatchState['players'],
  playerId: PlayerId,
  player: PlayerState,
): MatchState['players'] {
  return {
    ...players,
    [playerId]: player,
  }
}

function scoreOutcome(
  players: MatchState['players'],
  reason: MatchOutcome['reason'] = 'score',
  forcedWinner?: PlayerId,
): MatchOutcome {
  const scores = {
    'player-1': players['player-1'].hand.length,
    'player-2': players['player-2'].hand.length,
  }
  let winner: PlayerId | null = forcedWinner ?? null
  if (forcedWinner === undefined) {
    if (scores['player-1'] < scores['player-2']) {
      winner = 'player-1'
    } else if (scores['player-2'] < scores['player-1']) {
      winner = 'player-2'
    }
  }
  return { winner, reason, scores }
}

function resolveCommittedRound(state: MatchState): MatchState {
  const center = state.currentCenter
  const playerOneCard = state.players['player-1'].committed
  const playerTwoCard = state.players['player-2'].committed
  if (center === null || playerOneCard === null || playerTwoCard === null) {
    throw new Error('Round resolution requires a center and two commitments')
  }

  const playerOneMatches = playerOneCard.symbol === center.symbol
  const playerTwoMatches = playerTwoCard.symbol === center.symbol
  const decisive = playerOneMatches !== playerTwoMatches
  const winner: PlayerId | null = decisive
    ? playerOneMatches
      ? 'player-1'
      : 'player-2'
    : null
  const recipient = winner === null ? null : opponentOf(winner)
  const currentPot = [
    ...state.pot,
    center,
    playerOneCard,
    playerTwoCard,
  ]

  let nextPot: readonly Card[] = currentPot
  let nextDiscard = state.discard
  let nextPlayers: MatchState['players'] = {
    'player-1': { ...state.players['player-1'], committed: null },
    'player-2': { ...state.players['player-2'], committed: null },
  }
  let transferredCardIds: readonly string[] = []
  let discardedCardId: string | null = null

  if (winner !== null && recipient !== null) {
    const discarded = winner === 'player-1' ? playerOneCard : playerTwoCard
    const transferred = currentPot.filter((card) => card.id !== discarded.id)
    nextPot = []
    nextDiscard = [...state.discard, discarded]
    discardedCardId = discarded.id
    transferredCardIds = transferred.map((card) => card.id)
    nextPlayers = replacePlayer(nextPlayers, recipient, {
      ...nextPlayers[recipient],
      hand: [...nextPlayers[recipient].hand, ...transferred],
    })
  }

  const kind: RoundResult['kind'] = decisive ? 'decisive' : 'standoff'
  const result: RoundResult = {
    round: state.round,
    kind,
    center,
    plays: {
      'player-1': playerOneCard,
      'player-2': playerTwoCard,
    },
    winner,
    recipient,
    transferredCardIds,
    discardedCardId,
    potSize: currentPot.length,
  }
  const history = [
    ...state.history,
    {
      round: state.round,
      center,
      plays: result.plays,
      kind,
      winner,
      potSizeBeforeResolution: currentPot.length,
    },
  ]
  const isTerminal =
    nextPlayers['player-1'].hand.length === 0 ||
    nextPlayers['player-2'].hand.length === 0 ||
    state.centralDeck.length === 0

  return {
    ...state,
    phase: isTerminal ? 'complete' : 'resolved',
    currentCenter: null,
    players: nextPlayers,
    pot: nextPot,
    discard: nextDiscard,
    history,
    lastResult: result,
    outcome: isTerminal ? scoreOutcome(nextPlayers) : null,
  }
}

function commitWithoutResolution(
  state: MatchState,
  playerId: PlayerId,
  cardId: string,
  fallback: boolean,
): MatchState {
  if (state.phase !== 'awaiting-selections') {
    throw new Error('Cards can only be committed while awaiting selections')
  }
  const player = state.players[playerId]
  if (player.committed !== null) {
    throw new Error(`${playerId} has already committed this round`)
  }
  const card = player.hand.find((candidate) => candidate.id === cardId)
  if (card === undefined) {
    throw new Error(`${cardId} is not in ${playerId}'s hand`)
  }
  const nextPlayer: PlayerState = {
    hand: player.hand.filter((candidate) => candidate.id !== cardId),
    committed: card,
    consecutiveFallbacks: fallback ? player.consecutiveFallbacks + 1 : 0,
  }
  return {
    ...state,
    players: replacePlayer(state.players, playerId, nextPlayer),
  }
}

export function commitCard(
  state: MatchState,
  playerId: PlayerId,
  cardId: string,
): MatchState {
  const committed = commitWithoutResolution(state, playerId, cardId, false)
  return committed.players['player-1'].committed !== null &&
    committed.players['player-2'].committed !== null
    ? resolveCommittedRound(committed)
    : committed
}

export function chooseFallbackCard(hand: readonly Card[]): Card {
  if (hand.length === 0) {
    throw new Error('Cannot choose a fallback from an empty hand')
  }
  const counts: Record<AstralSymbol, number> = {
    sun: 0,
    moon: 0,
    star: 0,
  }
  for (const card of hand) {
    counts[card.symbol] += 1
  }
  const symbol = SYMBOLS.reduce((best, candidate) =>
    counts[candidate] > counts[best] ? candidate : best,
  )
  const card = hand.find((candidate) => candidate.symbol === symbol)
  if (card === undefined) {
    throw new Error('Fallback selection failed to find the chosen symbol')
  }
  return card
}

export function commitFallback(
  state: MatchState,
  playerId: PlayerId,
): MatchState {
  const card = chooseFallbackCard(state.players[playerId].hand)
  const committed = commitWithoutResolution(state, playerId, card.id, true)
  if (committed.players[playerId].consecutiveFallbacks >= 2) {
    return {
      ...committed,
      phase: 'complete',
      outcome: scoreOutcome(
        committed.players,
        'abandonment',
        opponentOf(playerId),
      ),
    }
  }
  return committed.players['player-1'].committed !== null &&
    committed.players['player-2'].committed !== null
    ? resolveCommittedRound(committed)
    : committed
}

export function advanceRound(state: MatchState): MatchState {
  if (state.phase !== 'resolved') {
    throw new Error('Only a resolved nonterminal round can be advanced')
  }
  const nextCenter = state.centralDeck[0]
  if (nextCenter === undefined) {
    throw new Error('No future center card is available')
  }
  return {
    ...state,
    phase: 'awaiting-selections',
    round: state.round + 1,
    centralDeck: state.centralDeck.slice(1),
    currentCenter: nextCenter,
    lastResult: null,
  }
}

export function abandonMatch(
  state: MatchState,
  abandoningPlayer: PlayerId,
): MatchState {
  if (state.phase === 'complete') {
    throw new Error('A completed match cannot be abandoned')
  }
  return {
    ...state,
    phase: 'complete',
    outcome: scoreOutcome(
      state.players,
      'abandonment',
      opponentOf(abandoningPlayer),
    ),
  }
}

export function validateConservation(state: MatchState): {
  readonly valid: boolean
  readonly errors: readonly string[]
} {
  const cards = [
    ...state.centralDeck,
    ...(state.currentCenter === null ? [] : [state.currentCenter]),
    ...state.players['player-1'].hand,
    ...(state.players['player-1'].committed === null
      ? []
      : [state.players['player-1'].committed]),
    ...state.players['player-2'].hand,
    ...(state.players['player-2'].committed === null
      ? []
      : [state.players['player-2'].committed]),
    ...state.pot,
    ...state.discard,
  ]
  const errors: string[] = []
  const actualIds = cards.map((card) => card.id)
  const uniqueIds = new Set(actualIds)
  const expectedIds = expectedCardIds(state.config)

  if (cards.length !== state.totalCardCount) {
    errors.push(
      `Expected ${state.totalCardCount} cards in zones, found ${cards.length}`,
    )
  }
  if (uniqueIds.size !== actualIds.length) {
    errors.push('At least one physical card appears in multiple zones')
  }
  for (const expectedId of expectedIds) {
    if (!uniqueIds.has(expectedId)) {
      errors.push(`Missing physical card ${expectedId}`)
    }
  }
  for (const actualId of uniqueIds) {
    if (!expectedIds.has(actualId)) {
      errors.push(`Unknown physical card ${actualId}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
