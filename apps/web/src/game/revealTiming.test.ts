import { describe, expect, it } from 'vitest'
import {
  REVEAL_MS,
  isCenterConcealed,
  isPreResultReveal,
  revealDelay,
  resultHoldMs,
} from './revealTiming'

describe('reveal timing', () => {
  it('keeps full-motion holds long enough to read each beat', () => {
    expect(revealDelay('player', false)).toBe(REVEAL_MS.playerHold)
    expect(revealDelay('opponent', false)).toBe(REVEAL_MS.opponentHold)
    expect(revealDelay('center', false)).toBe(REVEAL_MS.centerHold)
    expect(resultHoldMs(false)).toBeGreaterThanOrEqual(2000)
  })

  it('shortens holds when motion is reduced', () => {
    expect(revealDelay('player', true)).toBeLessThan(300)
    expect(resultHoldMs(true)).toBeLessThan(500)
  })

  it('classifies reveal stages for presentation feedback', () => {
    expect(isPreResultReveal('player')).toBe(true)
    expect(isPreResultReveal('result')).toBe(false)
    expect(isCenterConcealed('opponent')).toBe(true)
    expect(isCenterConcealed('center')).toBe(false)
  })
})
