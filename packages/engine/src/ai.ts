import { nextRandom, randomIndex } from './rng.js'
import {
  SYMBOLS,
  type AiChoice,
  type AiDifficulty,
  type AstralSymbol,
  type Card,
  type PlayerId,
  type PlayerMatchView,
  type SymbolProbabilities,
} from './types.js'

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === 'player-1' ? 'player-2' : 'player-1'
}

function countHand(hand: readonly Card[]): Record<AstralSymbol, number> {
  const counts: Record<AstralSymbol, number> = { sun: 0, moon: 0, star: 0 }
  for (const card of hand) {
    counts[card.symbol] += 1
  }
  return counts
}

function chooseCardForSymbol(
  hand: readonly Card[],
  symbol: AstralSymbol,
  rngState: number,
): { readonly card: Card; readonly rngState: number } {
  const cards = hand.filter((card) => card.symbol === symbol)
  const step = randomIndex(rngState, cards.length)
  const card = cards[step.index]
  if (card === undefined) {
    throw new Error(`No ${symbol} card is available`)
  }
  return { card, rngState: step.state }
}

function weightedSymbol(
  weights: Readonly<Record<AstralSymbol, number>>,
  rngState: number,
): { readonly symbol: AstralSymbol; readonly rngState: number } {
  const total = SYMBOLS.reduce((sum, symbol) => sum + weights[symbol], 0)
  if (total <= 0) {
    throw new Error('At least one AI symbol weight must be positive')
  }
  const step = nextRandom(rngState)
  let cursor = step.value * total
  for (const symbol of SYMBOLS) {
    cursor -= weights[symbol]
    if (cursor < 0 && weights[symbol] > 0) {
      return { symbol, rngState: step.state }
    }
  }
  const lastAvailable = [...SYMBOLS]
    .reverse()
    .find((symbol) => weights[symbol] > 0)
  if (lastAvailable === undefined) {
    throw new Error('Weighted selection failed')
  }
  return { symbol: lastAvailable, rngState: step.state }
}

function easyChoice(view: PlayerMatchView, rngState: number): AiChoice {
  const step = randomIndex(rngState, view.hand.length)
  const card = view.hand[step.index]
  if (card === undefined) {
    throw new Error('Easy AI could not select a legal card')
  }
  return {
    cardId: card.id,
    symbol: card.symbol,
    rngState: step.state,
    explanation: 'Random legal choice',
  }
}

function mediumChoice(view: PlayerMatchView, rngState: number): AiChoice {
  const handCounts = countHand(view.hand)
  const weights: Record<AstralSymbol, number> = {
    sun: view.unseenCenterProbabilities.sun * handCounts.sun,
    moon: view.unseenCenterProbabilities.moon * handCounts.moon,
    star: view.unseenCenterProbabilities.star * handCounts.star,
  }
  if (weights.sun + weights.moon + weights.star === 0) {
    for (const symbol of SYMBOLS) {
      weights[symbol] = handCounts[symbol]
    }
  }
  const symbolChoice = weightedSymbol(weights, rngState)
  const cardChoice = chooseCardForSymbol(
    view.hand,
    symbolChoice.symbol,
    symbolChoice.rngState,
  )
  return {
    cardId: cardChoice.card.id,
    symbol: cardChoice.card.symbol,
    rngState: cardChoice.rngState,
    explanation: `Sampled ${cardChoice.card.symbol} from public unseen-center odds and hand availability`,
  }
}

function opponentModel(view: PlayerMatchView): SymbolProbabilities {
  const opponent = opponentOf(view.viewer)
  const counts: Record<AstralSymbol, number> = { sun: 1, moon: 1, star: 1 }
  for (const round of view.history) {
    counts[round.plays[opponent].symbol] += 1
  }
  const total = counts.sun + counts.moon + counts.star
  return {
    sun: counts.sun / total,
    moon: counts.moon / total,
    star: counts.star / total,
  }
}

function hardChoice(view: PlayerMatchView, rngState: number): AiChoice {
  const handCounts = countHand(view.hand)
  const opponent = opponentModel(view)
  const center = view.unseenCenterProbabilities
  const stake = view.pot.length + 2
  const ownRecent = view.history
    .slice(-2)
    .map((round) => round.plays[view.viewer].symbol)
  const repeatedPattern =
    ownRecent.length === 2 && ownRecent[0] === ownRecent[1]

  let state = rngState
  let bestSymbol: AstralSymbol | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const symbol of SYMBOLS) {
    if (handCounts[symbol] === 0) {
      continue
    }
    const selfWins = center[symbol] * (1 - opponent[symbol])
    const selfLoses = SYMBOLS.reduce(
      (sum, centerSymbol) =>
        centerSymbol === symbol
          ? sum
          : sum + center[centerSymbol] * opponent[centerSymbol],
      0,
    )
    const availability = handCounts[symbol] / view.hand.length
    const scarcityPenalty = handCounts[symbol] === 1 ? 0.04 : 0
    const patternPenalty =
      repeatedPattern && ownRecent[0] === symbol ? 0.18 : 0
    const jitter = nextRandom(state)
    state = jitter.state
    const score =
      (selfWins - selfLoses) * stake +
      availability * 0.08 -
      scarcityPenalty -
      patternPenalty +
      jitter.value * 0.02
    if (score > bestScore) {
      bestScore = score
      bestSymbol = symbol
    }
  }
  if (bestSymbol === null) {
    throw new Error('Hard AI could not find a legal symbol')
  }
  const cardChoice = chooseCardForSymbol(view.hand, bestSymbol, state)
  return {
    cardId: cardChoice.card.id,
    symbol: cardChoice.card.symbol,
    rngState: cardChoice.rngState,
    explanation:
      `Chose ${bestSymbol} from center odds, revealed opponent patterns, ` +
      `pot stake, scarcity, and seeded pattern breaking`,
  }
}

export function chooseAiCard(
  view: PlayerMatchView,
  difficulty: AiDifficulty,
  rngState: number,
): AiChoice {
  if (view.phase !== 'awaiting-selections') {
    throw new Error('AI can only choose while awaiting selections')
  }
  if (view.committedCard !== null) {
    throw new Error('AI has already committed this round')
  }
  if (view.hand.length === 0) {
    throw new Error('AI cannot choose from an empty hand')
  }

  switch (difficulty) {
    case 'easy':
      return easyChoice(view, rngState)
    case 'medium':
      return mediumChoice(view, rngState)
    case 'hard':
      return hardChoice(view, rngState)
  }
}
