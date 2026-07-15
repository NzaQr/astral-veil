export const SYMBOLS = ['sun', 'moon', 'star'] as const

export type AstralSymbol = (typeof SYMBOLS)[number]
export type PlayerId = 'player-1' | 'player-2'
export type MatchPhase = 'awaiting-selections' | 'resolved' | 'complete'
export type ResolutionKind = 'decisive' | 'standoff'
export type AiDifficulty = 'easy' | 'medium' | 'hard'

export interface Card {
  readonly id: string
  readonly symbol: AstralSymbol
}

export interface MatchConfig {
  readonly centralCardsPerSymbol: number
  readonly handCardsPerSymbol: number
}

export interface PlayerState {
  readonly hand: readonly Card[]
  readonly burden: readonly Card[]
  readonly committed: Card | null
  readonly consecutiveFallbacks: number
}

export interface RevealedRound {
  readonly round: number
  readonly center: Card
  readonly plays: Readonly<Record<PlayerId, Card>>
  readonly kind: ResolutionKind
  readonly winner: PlayerId | null
  readonly potSizeBeforeResolution: number
}

export interface RoundResult {
  readonly round: number
  readonly kind: ResolutionKind
  readonly center: Card
  readonly plays: Readonly<Record<PlayerId, Card>>
  readonly winner: PlayerId | null
  readonly recipient: PlayerId | null
  readonly transferredCardIds: readonly string[]
  readonly potSize: number
}

export interface MatchOutcome {
  readonly winner: PlayerId | null
  readonly reason: 'score' | 'abandonment'
  readonly scores: Readonly<Record<PlayerId, number>>
}

export interface MatchState {
  readonly config: MatchConfig
  readonly phase: MatchPhase
  readonly round: number
  readonly centralDeck: readonly Card[]
  readonly currentCenter: Card | null
  readonly players: Readonly<Record<PlayerId, PlayerState>>
  readonly pot: readonly Card[]
  readonly history: readonly RevealedRound[]
  readonly lastResult: RoundResult | null
  readonly outcome: MatchOutcome | null
  readonly totalCardCount: number
}

export interface SymbolCounts {
  readonly sun: number
  readonly moon: number
  readonly star: number
}

export interface SymbolProbabilities {
  readonly sun: number
  readonly moon: number
  readonly star: number
}

export interface PublicMatchView {
  readonly phase: MatchPhase
  readonly round: number
  readonly config: MatchConfig
  readonly players: Readonly<
    Record<
      PlayerId,
      {
        readonly handSize: number
        readonly burdenSize: number
        readonly hasCommitted: boolean
        readonly consecutiveFallbacks: number
      }
    >
  >
  readonly pot: readonly Card[]
  readonly history: readonly RevealedRound[]
  readonly lastResult: RoundResult | null
  readonly outcome: MatchOutcome | null
  readonly unseenCenterCounts: SymbolCounts
  readonly unseenCenterProbabilities: SymbolProbabilities
  readonly unseenCenterTotal: number
}

export interface PlayerMatchView extends PublicMatchView {
  readonly viewer: PlayerId
  readonly hand: readonly Card[]
  readonly committedCard: Card | null
}

export interface RandomStep {
  readonly value: number
  readonly state: number
}

export interface AiChoice {
  readonly cardId: string
  readonly symbol: AstralSymbol
  readonly rngState: number
  readonly explanation: string
}

export interface SimulationOptions {
  readonly matches: number
  readonly playerOne: AiDifficulty
  readonly playerTwo: AiDifficulty
  readonly seed: number
  readonly config?: Partial<MatchConfig>
}

export interface SimulationReport {
  readonly matches: number
  readonly strategies: Readonly<Record<PlayerId, AiDifficulty>>
  readonly wins: Readonly<Record<PlayerId, number>>
  readonly draws: number
  readonly totalRounds: number
  readonly averageRounds: number
  readonly minRounds: number
  readonly maxRounds: number
}
