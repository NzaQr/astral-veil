import { getHotSeatCommitOrder } from '@astral-veil/engine'
import { beforeEach, describe, expect, it } from 'vitest'
import { frameForBeat } from './roundReveal'
import { useGameStore } from './store'

describe('game session orchestration', () => {
  beforeEach(() => {
    useGameStore.getState().exitMatch()
  })

  it('conceals each hot-seat choice and kicks off a round reveal', () => {
    useGameStore.getState().startHotSeat()
    let state = useGameStore.getState()
    expect(state.handoffAccepted).toBe(false)
    expect(getHotSeatCommitOrder(state.match?.round ?? 0)[0]).toBe('player-1')

    state.acceptHandoff()
    useGameStore.getState().commitSymbol('sun')
    state = useGameStore.getState()
    expect(state.hotSeatIndex).toBe(1)
    expect(state.handoffAccepted).toBe(false)
    expect(state.match?.players['player-1'].committed?.symbol).toBe('sun')

    state.acceptHandoff()
    useGameStore.getState().commitSymbol('moon')
    state = useGameStore.getState()
    expect(state.match?.phase).toBe('resolved')
    expect(state.revealStage).toBe('firstPlay')
    expect(state.revealSequence).not.toBeNull()
    const sequence = state.revealSequence
    if (sequence === null) throw new Error('Expected a reveal sequence')
    const firstFrame = frameForBeat(sequence, 'firstPlay')
    expect(
      firstFrame.unseenCenterCounts.sun +
        firstFrame.unseenCenterCounts.moon +
        firstFrame.unseenCenterCounts.star,
    ).toBe(15)
    expect(firstFrame.history).toHaveLength(0)
    expect(sequence.commitOrder).toEqual(['player-1', 'player-2'])

    state.advanceReveal()
    state.advanceReveal()
    state.advanceReveal()
    state = useGameStore.getState()
    expect(state.revealStage).toBe('result')
    state.continueRound()
    state = useGameStore.getState()
    expect(state.match?.round).toBe(2)
    expect(getHotSeatCommitOrder(state.match?.round ?? 0)[0]).toBe('player-2')
    expect(state.handoffAccepted).toBe(false)
    expect(state.revealSequence).toBeNull()
  })

  it('guards solo AI commitment against duplicate effects', () => {
    useGameStore.getState().startSolo('hard')
    useGameStore.getState().commitSymbol('star')
    const rngBefore = useGameStore.getState().aiRngState

    useGameStore.getState().performAiCommit()
    const afterFirst = useGameStore.getState()
    useGameStore.getState().performAiCommit()
    const afterSecond = useGameStore.getState()

    expect(afterFirst.match?.history).toHaveLength(1)
    expect(afterSecond.match?.history).toHaveLength(1)
    expect(afterSecond.match).toBe(afterFirst.match)
    expect(afterFirst.aiRngState).not.toBe(rngBefore)
    expect(afterFirst.revealStage).toBe('firstPlay')
    expect(afterFirst.revealSequence?.commitOrder).toEqual([
      'player-1',
      'player-2',
    ])
  })
})
