import { chooseAiCard } from './ai.js'
import {
  advanceRound,
  commitCard,
  createMatch,
  validateConservation,
} from './engine.js'
import { projectForPlayer } from './projection.js'
import { nextRandom, normalizeSeed } from './rng.js'
import type {
  MatchState,
  PlayerId,
  SimulationOptions,
  SimulationReport,
} from './types.js'

function playMatch(
  seed: number,
  options: SimulationOptions,
): MatchState {
  let match = createMatch(seed, options.config)
  let playerOneRng = nextRandom(seed).state
  let playerTwoRng = nextRandom(playerOneRng).state

  while (match.phase !== 'complete') {
    if (match.phase === 'resolved') {
      match = advanceRound(match)
      continue
    }

    const playerOneChoice = chooseAiCard(
      projectForPlayer(match, 'player-1'),
      options.playerOne,
      playerOneRng,
    )
    const playerTwoChoice = chooseAiCard(
      projectForPlayer(match, 'player-2'),
      options.playerTwo,
      playerTwoRng,
    )
    playerOneRng = playerOneChoice.rngState
    playerTwoRng = playerTwoChoice.rngState
    match = commitCard(match, 'player-1', playerOneChoice.cardId)
    match = commitCard(match, 'player-2', playerTwoChoice.cardId)

    const conservation = validateConservation(match)
    if (!conservation.valid) {
      throw new Error(conservation.errors.join('; '))
    }
  }

  return match
}

export function runSimulation(options: SimulationOptions): SimulationReport {
  if (!Number.isInteger(options.matches) || options.matches <= 0) {
    throw new Error('Simulation matches must be a positive integer')
  }

  const wins: Record<PlayerId, number> = {
    'player-1': 0,
    'player-2': 0,
  }
  let draws = 0
  let totalRounds = 0
  let minRounds = Number.POSITIVE_INFINITY
  let maxRounds = 0
  let seedState = normalizeSeed(options.seed)

  for (let index = 0; index < options.matches; index += 1) {
    const seedStep = nextRandom(seedState)
    seedState = seedStep.state
    const match = playMatch(seedState, options)
    if (match.outcome === null) {
      throw new Error('A completed simulated match must have an outcome')
    }
    if (match.outcome.winner === null) {
      draws += 1
    } else {
      wins[match.outcome.winner] += 1
    }
    const rounds = match.history.length
    totalRounds += rounds
    minRounds = Math.min(minRounds, rounds)
    maxRounds = Math.max(maxRounds, rounds)
  }

  return {
    matches: options.matches,
    strategies: {
      'player-1': options.playerOne,
      'player-2': options.playerTwo,
    },
    wins,
    draws,
    totalRounds,
    averageRounds: totalRounds / options.matches,
    minRounds,
    maxRounds,
  }
}
