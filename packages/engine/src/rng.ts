import type { RandomStep } from './types.js'

const UINT32_RANGE = 4_294_967_296

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new Error('RNG seed must be a finite number')
  }
  return Math.trunc(seed) >>> 0
}

export function nextRandom(state: number): RandomStep {
  const nextState = (normalizeSeed(state) + 0x6d2b79f5) >>> 0
  let value = nextState
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return {
    value: ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE,
    state: nextState,
  }
}

export function randomIndex(state: number, length: number): {
  readonly index: number
  readonly state: number
} {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Random selection requires a positive integer length')
  }
  const step = nextRandom(state)
  return {
    index: Math.floor(step.value * length),
    state: step.state,
  }
}

export function shuffle<T>(
  items: readonly T[],
  seed: number,
): { readonly items: readonly T[]; readonly state: number } {
  const shuffled = [...items]
  let state = normalizeSeed(seed)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const step = randomIndex(state, index + 1)
    state = step.state
    const other = shuffled[step.index]
    const current = shuffled[index]
    if (other === undefined || current === undefined) {
      throw new Error('Shuffle reached an invalid array index')
    }
    shuffled[index] = other
    shuffled[step.index] = current
  }

  return { items: shuffled, state }
}
