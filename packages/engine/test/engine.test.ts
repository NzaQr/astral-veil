import { describe, expect, it } from 'vitest'
import {
  abandonMatch,
  advanceRound,
  chooseFallbackCard,
  commitCard,
  commitFallback,
  createMatch,
  getHotSeatCommitOrder,
  projectForPlayer,
  validateConservation,
  type AstralSymbol,
  type Card,
  type MatchState,
  type PlayerId,
} from '../src/index.js'

function cardOf(
  state: MatchState,
  player: PlayerId,
  symbol: AstralSymbol,
): Card {
  const card = state.players[player].hand.find(
    (candidate) => candidate.symbol === symbol,
  )
  if (card === undefined) {
    throw new Error(`${player} has no ${symbol}`)
  }
  return card
}

function otherSymbol(symbol: AstralSymbol): AstralSymbol {
  return symbol === 'sun' ? 'moon' : 'sun'
}

function resolveWith(
  state: MatchState,
  playerOneSymbol: AstralSymbol,
  playerTwoSymbol: AstralSymbol,
): MatchState {
  const afterOne = commitCard(
    state,
    'player-1',
    cardOf(state, 'player-1', playerOneSymbol).id,
  )
  return commitCard(
    afterOne,
    'player-2',
    cardOf(state, 'player-2', playerTwoSymbol).id,
  )
}

describe('match creation and round resolution', () => {
  it('creates all 33 default cards in exactly one zone', () => {
    const state = createMatch(42)

    expect(state.totalCardCount).toBe(33)
    expect(state.currentCenter).not.toBeNull()
    expect(state.centralDeck).toHaveLength(14)
    expect(state.players['player-1'].hand).toHaveLength(9)
    expect(state.players['player-2'].hand).toHaveLength(9)
    expect(state.players['player-1'].burden).toHaveLength(0)
    expect(state.players['player-2'].burden).toHaveLength(0)
    expect(validateConservation(state)).toEqual({ valid: true, errors: [] })
  })

  it('uses a deterministic seeded Fisher-Yates shuffle', () => {
    const first = createMatch(123)
    const repeat = createMatch(123)
    const different = createMatch(124)
    const order = (state: MatchState) => [
      state.currentCenter?.id,
      ...state.centralDeck.map((card) => card.id),
    ]

    expect(order(first)).toEqual(order(repeat))
    expect(order(first)).not.toEqual(order(different))
  })

  it('resolves a player-one decisive round', () => {
    const initial = createMatch(1)
    const center = initial.currentCenter
    if (center === null) {
      throw new Error('Missing center')
    }
    const resolved = resolveWith(
      initial,
      center.symbol,
      otherSymbol(center.symbol),
    )

    expect(resolved.phase).toBe('resolved')
    expect(resolved.lastResult?.kind).toBe('decisive')
    expect(resolved.lastResult?.winner).toBe('player-1')
    expect(resolved.lastResult?.recipient).toBe('player-2')
    expect(resolved.lastResult?.transferredCardIds).toHaveLength(3)
    expect(resolved.players['player-1'].hand).toHaveLength(8)
    expect(resolved.players['player-2'].hand).toHaveLength(8)
    expect(resolved.players['player-1'].burden).toHaveLength(0)
    expect(resolved.players['player-2'].burden).toHaveLength(3)
    expect(resolved.pot).toHaveLength(0)
    expect(validateConservation(resolved).valid).toBe(true)
  })

  it('resolves a player-two decisive round', () => {
    const initial = createMatch(2)
    const center = initial.currentCenter
    if (center === null) {
      throw new Error('Missing center')
    }
    const resolved = resolveWith(
      initial,
      otherSymbol(center.symbol),
      center.symbol,
    )

    expect(resolved.lastResult?.winner).toBe('player-2')
    expect(resolved.lastResult?.recipient).toBe('player-1')
    expect(resolved.players['player-1'].hand).toHaveLength(8)
    expect(resolved.players['player-2'].hand).toHaveLength(8)
    expect(resolved.players['player-1'].burden).toHaveLength(3)
    expect(resolved.players['player-2'].burden).toHaveLength(0)
    expect(resolved.lastResult?.transferredCardIds).toEqual(
      expect.arrayContaining([
        resolved.lastResult?.plays['player-1'].id,
        resolved.lastResult?.plays['player-2'].id,
        resolved.lastResult?.center.id,
      ]),
    )
  })

  it('keeps all three cards in the pot when both match', () => {
    const initial = createMatch(3)
    const symbol = initial.currentCenter?.symbol
    if (symbol === undefined) {
      throw new Error('Missing center')
    }
    const resolved = resolveWith(initial, symbol, symbol)

    expect(resolved.lastResult?.kind).toBe('standoff')
    expect(resolved.lastResult?.winner).toBeNull()
    expect(resolved.pot).toHaveLength(3)
    expect(resolved.players['player-1'].hand).toHaveLength(8)
    expect(resolved.players['player-2'].hand).toHaveLength(8)
  })

  it('keeps all three cards in the pot when neither matches', () => {
    const initial = createMatch(4)
    const center = initial.currentCenter
    if (center === null) {
      throw new Error('Missing center')
    }
    const miss = otherSymbol(center.symbol)
    const resolved = resolveWith(initial, miss, miss)

    expect(resolved.lastResult?.kind).toBe('standoff')
    expect(resolved.pot).toHaveLength(3)
  })

  it('transfers an accumulated pot after a decisive round', () => {
    const initial = createMatch(5)
    const firstCenter = initial.currentCenter
    if (firstCenter === null) {
      throw new Error('Missing center')
    }
    const standoff = resolveWith(
      initial,
      firstCenter.symbol,
      firstCenter.symbol,
    )
    const next = advanceRound(standoff)
    const secondCenter = next.currentCenter
    if (secondCenter === null) {
      throw new Error('Missing next center')
    }
    const decisive = resolveWith(
      next,
      secondCenter.symbol,
      otherSymbol(secondCenter.symbol),
    )

    expect(decisive.lastResult?.potSize).toBe(6)
    expect(decisive.lastResult?.transferredCardIds).toHaveLength(6)
    expect(decisive.pot).toHaveLength(0)
    expect(decisive.players['player-1'].hand).toHaveLength(7)
    expect(decisive.players['player-2'].hand).toHaveLength(7)
    expect(decisive.players['player-2'].burden).toHaveLength(6)
    expect(validateConservation(decisive).valid).toBe(true)
  })

  it('leaves a terminal standoff pot unclaimed and scores a draw', () => {
    let state = createMatch(77, {
      centralCardsPerSymbol: 1,
      handCardsPerSymbol: 1,
    })

    while (state.phase !== 'complete') {
      if (state.phase === 'resolved') {
        state = advanceRound(state)
        continue
      }
      const symbol = state.currentCenter?.symbol
      if (symbol === undefined) {
        throw new Error('Missing center')
      }
      state = resolveWith(state, symbol, symbol)
    }

    expect(state.history).toHaveLength(3)
    expect(state.lastResult?.kind).toBe('standoff')
    expect(state.pot).toHaveLength(9)
    expect(state.players['player-1'].hand).toHaveLength(0)
    expect(state.players['player-2'].hand).toHaveLength(0)
    expect(state.outcome).toEqual({
      winner: null,
      reason: 'score',
      scores: { 'player-1': 0, 'player-2': 0 },
    })
    expect(validateConservation(state).valid).toBe(true)
  })

  it('requires an explicit advance before the next round', () => {
    const initial = createMatch(6)
    const center = initial.currentCenter
    if (center === null) {
      throw new Error('Missing center')
    }
    const resolved = resolveWith(
      initial,
      center.symbol,
      otherSymbol(center.symbol),
    )

    expect(resolved.phase).toBe('resolved')
    expect(resolved.currentCenter).toBeNull()
    expect(() =>
      commitCard(
        resolved,
        'player-1',
        resolved.players['player-1'].hand[0]?.id ?? '',
      ),
    ).toThrow(/awaiting selections/)
    const advanced = advanceRound(resolved)
    expect(advanced.phase).toBe('awaiting-selections')
    expect(advanced.round).toBe(2)
    expect(advanced.currentCenter).not.toBeNull()
    expect(advanced.lastResult).toBeNull()
  })

  it('alternates the first hot-seat player each round', () => {
    expect(getHotSeatCommitOrder(1)).toEqual(['player-1', 'player-2'])
    expect(getHotSeatCommitOrder(2)).toEqual(['player-2', 'player-1'])
    expect(getHotSeatCommitOrder(3)).toEqual(['player-1', 'player-2'])
  })
})

describe('fallbacks, abandonment, and secrecy', () => {
  it('chooses the most abundant fallback with sun-moon-star tie priority', () => {
    const tied: Card[] = [
      { id: 'star', symbol: 'star' },
      { id: 'moon', symbol: 'moon' },
      { id: 'sun', symbol: 'sun' },
    ]
    const moonHeavy: Card[] = [
      ...tied,
      { id: 'moon-2', symbol: 'moon' },
    ]

    expect(chooseFallbackCard(tied).symbol).toBe('sun')
    expect(chooseFallbackCard(moonHeavy).symbol).toBe('moon')
  })

  it('awards the opponent a forced win after two consecutive fallbacks', () => {
    let state = createMatch(88)
    state = commitFallback(state, 'player-1')
    const opponentCard = state.players['player-2'].hand[0]
    if (opponentCard === undefined) {
      throw new Error('Missing opponent card')
    }
    state = commitCard(state, 'player-2', opponentCard.id)
    state = advanceRound(state)
    state = commitFallback(state, 'player-1')

    expect(state.phase).toBe('complete')
    expect(state.outcome?.reason).toBe('abandonment')
    expect(state.outcome?.winner).toBe('player-2')
    expect(validateConservation(state).valid).toBe(true)
  })

  it('lets manual abandonment override current scores', () => {
    const state = createMatch(89)
    const abandoned = abandonMatch(state, 'player-2')

    expect(abandoned.outcome?.winner).toBe('player-1')
    expect(abandoned.outcome?.reason).toBe('abandonment')
  })

  it('redacts center order, opponent hand, burden cards, and opponent commitment', () => {
    const initial = createMatch(90)
    const opponentCard = initial.players['player-2'].hand[0]
    if (opponentCard === undefined || initial.currentCenter === null) {
      throw new Error('Missing test card')
    }
    const committed = commitCard(initial, 'player-2', opponentCard.id)
    const view = projectForPlayer(committed, 'player-1')
    const serialized = JSON.stringify(view)

    expect(view.players['player-2'].hasCommitted).toBe(true)
    expect(view.players['player-2'].handSize).toBe(8)
    expect(view.players['player-1'].burdenSize).toBe(0)
    expect(view.players['player-2'].burdenSize).toBe(0)
    expect(view.hand).toEqual(initial.players['player-1'].hand)
    expect(serialized).not.toContain(opponentCard.id)
    expect(serialized).not.toContain(initial.currentCenter.id)
    expect(serialized).not.toContain('"burden"')
    expect(serialized).not.toContain('centralDeck')
    expect(serialized).not.toContain('currentCenter')
    expect(view.unseenCenterTotal).toBe(15)
    expect(view.unseenCenterCounts).toEqual({ sun: 5, moon: 5, star: 5 })
  })

  it('scores the match from burden sizes, not hand sizes', () => {
    const initial = createMatch(92)
    const center = initial.currentCenter
    if (center === null) {
      throw new Error('Missing center')
    }
    const resolved = resolveWith(
      initial,
      center.symbol,
      otherSymbol(center.symbol),
    )
    expect(resolved.players['player-1'].hand).toHaveLength(8)
    expect(resolved.players['player-2'].hand).toHaveLength(8)
    expect(resolved.players['player-2'].burden).toHaveLength(3)

    const abandoned = abandonMatch(resolved, 'player-2')

    expect(abandoned.outcome).toEqual({
      winner: 'player-1',
      reason: 'abandonment',
      scores: { 'player-1': 0, 'player-2': 3 },
    })
  })

  it('makes revealed history and public pot composition visible', () => {
    const initial = createMatch(91)
    const symbol = initial.currentCenter?.symbol
    if (symbol === undefined) {
      throw new Error('Missing center')
    }
    const resolved = resolveWith(initial, symbol, symbol)
    const view = projectForPlayer(resolved, 'player-1')

    expect(view.history).toHaveLength(1)
    expect(view.pot).toHaveLength(3)
    expect(view.unseenCenterTotal).toBe(14)
    expect(
      view.unseenCenterCounts[view.history[0]?.center.symbol ?? 'sun'],
    ).toBe(4)
  })
})
