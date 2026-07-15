import { runSimulation } from './simulation.js'
import type { AiDifficulty } from './types.js'

function parseDifficulty(value: string | undefined, fallback: AiDifficulty): AiDifficulty {
  if (value === undefined) {
    return fallback
  }
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value
  }
  throw new Error(`Unknown AI difficulty: ${value}`)
}

const matches = Number.parseInt(process.argv[2] ?? '5000', 10)
const playerOne = parseDifficulty(process.argv[3], 'medium')
const playerTwo = parseDifficulty(process.argv[4], 'hard')
const seed = Number.parseInt(process.argv[5] ?? '20260714', 10)
const report = runSimulation({ matches, playerOne, playerTwo, seed })

console.log(`Astral Veil simulation (${report.matches} matches)`)
console.log(`player-1 (${playerOne}) wins: ${report.wins['player-1']}`)
console.log(`player-2 (${playerTwo}) wins: ${report.wins['player-2']}`)
console.log(`draws: ${report.draws}`)
console.log(
  `rounds: avg ${report.averageRounds.toFixed(2)}, min ${report.minRounds}, max ${report.maxRounds}`,
)
