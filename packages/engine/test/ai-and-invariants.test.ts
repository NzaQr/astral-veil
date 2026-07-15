import { describe, expect, it } from 'vitest'
import {
  advanceRound,
  chooseAiCard,
  commitCard,
  createMatch,
  nextRandom,
  projectForPlayer,
  randomIndex,
  runSimulation,
  validateConservation,
  type AiDifficulty,
  type MatchState,
} from '../src/index.js'

describe('fair deterministic AI', () => {
  const difficulties: readonly AiDifficulty[] = ['easy', 'medium', 'hard']

  for (const difficulty of difficulties) {
    it(`${difficulty} returns a legal deterministic choice`, () => {
      const state = createMatch(101)
      const view = projectForPlayer(state, 'player-1')
      const first = chooseAiCard(view, difficulty, 555)
      const repeat = chooseAiCard(view, difficulty, 555)

      expect(repeat).toEqual(first)
      expect(view.hand.some((card) => card.id === first.cardId)).toBe(true)
      expect(
        view.hand.find((card) => card.id === first.cardId)?.symbol,
      ).toBe(first.symbol)
    })
  }

  it('depends only on the player projection, not hidden center state', () => {
    const original = createMatch(202)
    const firstFuture = original.centralDeck[0]
    if (original.currentCenter === null || firstFuture === undefined) {
      throw new Error('Missing hidden cards')
    }
    const hiddenVariant: MatchState = {
      ...original,
      currentCenter: firstFuture,
      centralDeck: [original.currentCenter, ...original.centralDeck.slice(1)],
    }
    const originalView = projectForPlayer(original, 'player-1')
    const variantView = projectForPlayer(hiddenVariant, 'player-1')

    expect(variantView).toEqual(originalView)
    for (const difficulty of difficulties) {
      expect(chooseAiCard(variantView, difficulty, 999)).toEqual(
        chooseAiCard(originalView, difficulty, 999),
      )
    }
  })

  it('does not mutate its projected input', () => {
    const view = projectForPlayer(createMatch(303), 'player-2')
    const before = JSON.stringify(view)

    chooseAiCard(view, 'hard', 1234)

    expect(JSON.stringify(view)).toBe(before)
  })
})

describe('simulation and conservation', () => {
  it('runs thousands of matches with reproducible aggregate metrics', () => {
    const options = {
      matches: 1_000,
      playerOne: 'medium' as const,
      playerTwo: 'hard' as const,
      seed: 404,
    }
    const first = runSimulation(options)
    const repeat = runSimulation(options)

    expect(repeat).toEqual(first)
    expect(
      first.wins['player-1'] + first.wins['player-2'] + first.draws,
    ).toBe(options.matches)
    expect(first.minRounds).toBeGreaterThan(0)
    expect(first.maxRounds).toBeLessThanOrEqual(15)
  })

  it('preserves every physical card through many randomized matches', () => {
    let rngState = 505

    for (let matchIndex = 0; matchIndex < 250; matchIndex += 1) {
      const seedStep = nextRandom(rngState)
      rngState = seedStep.state
      let state = createMatch(rngState)

      while (state.phase !== 'complete') {
        expect(validateConservation(state)).toEqual({
          valid: true,
          errors: [],
        })
        if (state.phase === 'resolved') {
          state = advanceRound(state)
          continue
        }

        const playerOneStep = randomIndex(
          rngState,
          state.players['player-1'].hand.length,
        )
        rngState = playerOneStep.state
        const playerTwoStep = randomIndex(
          rngState,
          state.players['player-2'].hand.length,
        )
        rngState = playerTwoStep.state
        const playerOneCard =
          state.players['player-1'].hand[playerOneStep.index]
        const playerTwoCard =
          state.players['player-2'].hand[playerTwoStep.index]
        if (playerOneCard === undefined || playerTwoCard === undefined) {
          throw new Error('Randomized test chose an invalid card')
        }
        state = commitCard(state, 'player-1', playerOneCard.id)
        expect(validateConservation(state).valid).toBe(true)
        state = commitCard(state, 'player-2', playerTwoCard.id)
      }

      expect(validateConservation(state)).toEqual({
        valid: true,
        errors: [],
      })
    }
  })

  it('keeps authoritative match state JSON-serializable', () => {
    const state = createMatch(606)
    const restored = JSON.parse(JSON.stringify(state)) as MatchState

    expect(restored).toEqual(state)
    expect(validateConservation(restored).valid).toBe(true)
  })
})
