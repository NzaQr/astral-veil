import { getHotSeatCommitOrder } from '@astral-veil/engine'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  visibleCenterHistory,
  visibleUnseenCounts,
} from './presentation'
import { useGameStore } from './store'

describe('game session orchestration', () => {
  beforeEach(() => {
    useGameStore.getState().exitMatch()
  })

  it('conceals each hot-seat choice and alternates first chooser', () => {
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
    expect(state.revealStage).toBe('players')
    const resolvedMatch = state.match
    if (resolvedMatch === null) throw new Error('Expected a resolved match')
    const concealedCounts = visibleUnseenCounts(resolvedMatch, 'players')
    expect(
      concealedCounts.sun + concealedCounts.moon + concealedCounts.star,
    ).toBe(15)
    expect(visibleCenterHistory(resolvedMatch, 'players')).toHaveLength(0)

    state.setRevealStage('result')
    state.continueRound()
    state = useGameStore.getState()
    expect(state.match?.round).toBe(2)
    expect(getHotSeatCommitOrder(state.match?.round ?? 0)[0]).toBe('player-2')
    expect(state.handoffAccepted).toBe(false)
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
    expect(afterFirst.revealStage).toBe('players')
  })
})
