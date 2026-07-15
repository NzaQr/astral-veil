import {
  commitCard,
  createMatch,
  getUnseenCenterCounts,
  type MatchState,
  type PlayerId,
} from '@astral-veil/engine'
import { describe, expect, it } from 'vitest'
import {
  REVEAL_MS,
  advanceRevealBeat,
  buildRoundReveal,
  frameForBeat,
  revealDelay,
  resultHoldMs,
} from './roundReveal'

function commit(
  state: MatchState,
  player: PlayerId,
  symbol: 'sun' | 'moon' | 'star',
): MatchState {
  const card = state.players[player].hand.find((c) => c.symbol === symbol)
  if (card === undefined) throw new Error(`No ${symbol} for ${player}`)
  return commitCard(state, player, card.id)
}

function resolveWithOrder(
  first: PlayerId,
  second: PlayerId,
  firstSymbol: 'sun' | 'moon' | 'star',
  secondSymbol: 'sun' | 'moon' | 'star',
) {
  const start = createMatch(7)
  const afterFirst = commit(start, first, firstSymbol)
  const beforeSecond = afterFirst
  const after = commit(afterFirst, second, secondSymbol)
  const sequence = buildRoundReveal(beforeSecond, after, [first, second])
  return { beforeSecond, after, sequence, first, second }
}

function findDecisiveRound(maxSeed = 50) {
  for (let seed = 1; seed <= maxSeed; seed += 1) {
    let state = createMatch(seed)
    const p1Card = state.players['player-1'].hand[0]
    if (p1Card === undefined) continue
    state = commitCard(state, 'player-1', p1Card.id)
    const before = state
    const center = before.currentCenter
    if (center === null) continue
    const matchCard = before.players['player-2'].hand.find(
      (card) => card.symbol === center.symbol,
    )
    const missCard = before.players['player-2'].hand.find(
      (card) => card.symbol !== center.symbol,
    )
    // One matches, one doesn't → decisive. Prefer p2 matches when p1 doesn't.
    const p2Card =
      p1Card.symbol === center.symbol ? missCard : (matchCard ?? missCard)
    if (p2Card === undefined) continue
    const after = commitCard(before, 'player-2', p2Card.id)
    const result = after.lastResult
    if (result?.kind === 'decisive' && result.recipient !== null) {
      return { before, after, result }
    }
  }
  throw new Error('Could not find a decisive round for tests')
}

describe('buildRoundReveal', () => {
  it('builds four beats in chronological commit order', () => {
    const { sequence, first, second } = resolveWithOrder(
      'player-2',
      'player-1',
      'moon',
      'sun',
    )
    expect(sequence.commitOrder).toEqual(['player-2', 'player-1'])
    expect(sequence.beats).toEqual([
      'firstPlay',
      'secondPlay',
      'center',
      'result',
    ])

    const firstFrame = frameForBeat(sequence, 'firstPlay')
    expect(Object.keys(firstFrame.visiblePlays)).toEqual([first])
    expect(firstFrame.centerFaceUp).toBe(false)
    expect(firstFrame.showOutcome).toBe(false)

    const secondFrame = frameForBeat(sequence, 'secondPlay')
    expect(secondFrame.visiblePlays[first]).toBeDefined()
    expect(secondFrame.visiblePlays[second]).toBeDefined()
    expect(secondFrame.centerFaceUp).toBe(false)

    const centerFrame = frameForBeat(sequence, 'center')
    expect(centerFrame.centerFaceUp).toBe(true)
    expect(centerFrame.center?.id).toBe(sequence.result.center.id)
    expect(centerFrame.showOutcome).toBe(false)

    const resultFrame = frameForBeat(sequence, 'result')
    expect(resultFrame.showOutcome).toBe(true)
    expect(resultFrame.centerFaceUp).toBe(true)
  })

  it('keeps pre-result pot and hands from the kickoff snapshot', () => {
    const { beforeSecond, after, sequence } = resolveWithOrder(
      'player-1',
      'player-2',
      'sun',
      'moon',
    )
    const result = after.lastResult
    if (result === null) throw new Error('expected result')

    const pre = frameForBeat(sequence, 'firstPlay')
    expect(pre.pot).toEqual(beforeSecond.pot)
    expect(
      pre.hands['player-1'].some((c) => c.id === result.plays['player-1'].id),
    ).toBe(false)
    expect(
      pre.hands['player-2'].some((c) => c.id === result.plays['player-2'].id),
    ).toBe(false)

    const settled = frameForBeat(sequence, 'result')
    expect(settled.pot).toEqual(after.pot)
    expect(settled.hands['player-1']).toEqual(after.players['player-1'].hand)
    expect(settled.hands['player-2']).toEqual(after.players['player-2'].hand)
  })

  it('conceals the new center in history and unseen counts until the center beat', () => {
    const { beforeSecond, after, sequence } = resolveWithOrder(
      'player-1',
      'player-2',
      'star',
      'star',
    )
    const concealed = frameForBeat(sequence, 'secondPlay')
    expect(concealed.history).toEqual(beforeSecond.history)
    expect(concealed.unseenCenterCounts).toEqual(
      getUnseenCenterCounts(beforeSecond),
    )

    const revealed = frameForBeat(sequence, 'center')
    expect(revealed.history).toEqual(after.history)
    expect(revealed.unseenCenterCounts).toEqual(getUnseenCenterCounts(after))
  })

  it('withholds transferred cards from the recipient hand until result', () => {
    const { before, after, result } = findDecisiveRound()
    const sequence = buildRoundReveal(before, after, [
      'player-1',
      'player-2',
    ])
    const recipient = result.recipient
    if (recipient === null) throw new Error('expected recipient')

    const preHand = frameForBeat(sequence, 'center').hands[recipient]
    const postHand = frameForBeat(sequence, 'result').hands[recipient]
    expect(postHand.length).toBeGreaterThan(preHand.length)
    for (const id of result.transferredCardIds) {
      expect(preHand.some((card) => card.id === id)).toBe(false)
      expect(postHand.some((card) => card.id === id)).toBe(true)
    }
  })
})

describe('reveal pacing', () => {
  it('advances beats until result, then stops', () => {
    expect(advanceRevealBeat('firstPlay')).toBe('secondPlay')
    expect(advanceRevealBeat('secondPlay')).toBe('center')
    expect(advanceRevealBeat('center')).toBe('result')
    expect(advanceRevealBeat('result')).toBeNull()
  })

  it('keeps full-motion holds long enough to read each beat', () => {
    expect(revealDelay('firstPlay', false)).toBe(REVEAL_MS.firstPlayHold)
    expect(revealDelay('secondPlay', false)).toBe(REVEAL_MS.secondPlayHold)
    expect(revealDelay('center', false)).toBe(REVEAL_MS.centerHold)
    expect(resultHoldMs(false)).toBeGreaterThanOrEqual(2000)
  })

  it('shortens holds when motion is reduced', () => {
    expect(revealDelay('firstPlay', true)).toBeLessThan(300)
    expect(resultHoldMs(true)).toBeLessThan(500)
  })
})
