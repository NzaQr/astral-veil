import { describe, expect, it } from 'vitest'
import { fbm, springStep } from './proceduralTextures'

describe('proceduralTextures helpers', () => {
  it('keeps fbm within a stable 0–1 band', () => {
    const samples = [
      fbm(0, 0),
      fbm(0.25, 0.75, 2),
      fbm(1.4, 2.1, 5, 5),
      fbm(8.2, 3.3, 9, 3),
    ]
    for (const sample of samples) {
      expect(sample).toBeGreaterThanOrEqual(0)
      expect(sample).toBeLessThanOrEqual(1)
    }
  })

  it('springs toward the target without overshooting past it in one step', () => {
    const next = springStep(0, 1, 1 / 60, 14)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(1)
    const settled = springStep(0.999, 1, 1, 14)
    expect(settled).toBeCloseTo(1, 5)
  })
})
