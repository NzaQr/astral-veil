import {
  getUnseenCenterCounts,
  type Card,
  type MatchState,
  type PlayerId,
  type RevealedRound,
  type RoundResult,
  type SymbolCounts,
} from '@astral-veil/engine'

export const REVEAL_BEATS = [
  'firstPlay',
  'secondPlay',
  'center',
  'result',
] as const

export type RevealBeat = (typeof REVEAL_BEATS)[number]

/** Full-motion reveal pacing (ms). Reduced-motion uses much shorter values. */
export const REVEAL_MS = {
  firstPlayHold: 1000,
  secondPlayHold: 1000,
  centerHold: 1200,
  resultHold: 2800,
} as const

export interface RoundRevealFrame {
  readonly beat: RevealBeat
  readonly hands: Readonly<Record<PlayerId, readonly Card[]>>
  readonly burdenSizes: Readonly<Record<PlayerId, number>>
  readonly pot: readonly Card[]
  readonly visiblePlays: Readonly<Partial<Record<PlayerId, Card>>>
  readonly center: Card | null
  readonly centerFaceUp: boolean
  readonly history: readonly RevealedRound[]
  readonly unseenCenterCounts: SymbolCounts
  readonly showOutcome: boolean
  readonly result: RoundResult
  readonly commitOrder: readonly [PlayerId, PlayerId]
}

export interface RoundRevealSequence {
  readonly commitOrder: readonly [PlayerId, PlayerId]
  readonly result: RoundResult
  readonly beats: readonly RevealBeat[]
  readonly frames: Readonly<Record<RevealBeat, RoundRevealFrame>>
}

function handWithoutPlay(
  before: MatchState,
  player: PlayerId,
  playId: string,
): readonly Card[] {
  const hand = before.players[player].hand
  return hand.some((card) => card.id === playId)
    ? hand.filter((card) => card.id !== playId)
    : hand
}

function frame(
  beat: RevealBeat,
  args: {
    commitOrder: readonly [PlayerId, PlayerId]
    result: RoundResult
    hands: Readonly<Record<PlayerId, readonly Card[]>>
    burdenSizes: Readonly<Record<PlayerId, number>>
    pot: readonly Card[]
    history: readonly RevealedRound[]
    unseenCenterCounts: SymbolCounts
    visibleCount: 0 | 1 | 2
    centerFaceUp: boolean
    showOutcome: boolean
  },
): RoundRevealFrame {
  const [first, second] = args.commitOrder
  const visiblePlays: Partial<Record<PlayerId, Card>> = {}
  if (args.visibleCount >= 1) visiblePlays[first] = args.result.plays[first]
  if (args.visibleCount >= 2) visiblePlays[second] = args.result.plays[second]

  return {
    beat,
    hands: args.hands,
    burdenSizes: args.burdenSizes,
    pot: args.pot,
    visiblePlays,
    center: args.centerFaceUp ? args.result.center : null,
    centerFaceUp: args.centerFaceUp,
    history: args.history,
    unseenCenterCounts: args.unseenCenterCounts,
    showOutcome: args.showOutcome,
    result: args.result,
    commitOrder: args.commitOrder,
  }
}

/**
 * Build an immutable round reveal from match states around the resolving commit.
 * `before` is the state immediately prior to that commit; `after` is the resolved match.
 */
export function buildRoundReveal(
  before: MatchState,
  after: MatchState,
  commitOrder: readonly [PlayerId, PlayerId],
): RoundRevealSequence {
  const result = after.lastResult
  if (result === null) {
    throw new Error('Round reveal requires a resolved match with lastResult')
  }

  const preHands: Record<PlayerId, readonly Card[]> = {
    'player-1': handWithoutPlay(before, 'player-1', result.plays['player-1'].id),
    'player-2': handWithoutPlay(before, 'player-2', result.plays['player-2'].id),
  }
  const postHands: Record<PlayerId, readonly Card[]> = {
    'player-1': after.players['player-1'].hand,
    'player-2': after.players['player-2'].hand,
  }
  const preBurdenSizes: Record<PlayerId, number> = {
    'player-1': before.players['player-1'].burden.length,
    'player-2': before.players['player-2'].burden.length,
  }
  const postBurdenSizes: Record<PlayerId, number> = {
    'player-1': after.players['player-1'].burden.length,
    'player-2': after.players['player-2'].burden.length,
  }
  const concealedHistory = before.history
  const revealedHistory = after.history
  const concealedUnseen = getUnseenCenterCounts(before)
  const revealedUnseen = getUnseenCenterCounts(after)

  const shared = {
    commitOrder,
    result,
  }

  const frames: Record<RevealBeat, RoundRevealFrame> = {
    firstPlay: frame('firstPlay', {
      ...shared,
      hands: preHands,
      burdenSizes: preBurdenSizes,
      pot: before.pot,
      history: concealedHistory,
      unseenCenterCounts: concealedUnseen,
      visibleCount: 1,
      centerFaceUp: false,
      showOutcome: false,
    }),
    secondPlay: frame('secondPlay', {
      ...shared,
      hands: preHands,
      burdenSizes: preBurdenSizes,
      pot: before.pot,
      history: concealedHistory,
      unseenCenterCounts: concealedUnseen,
      visibleCount: 2,
      centerFaceUp: false,
      showOutcome: false,
    }),
    center: frame('center', {
      ...shared,
      hands: preHands,
      burdenSizes: preBurdenSizes,
      pot: before.pot,
      history: revealedHistory,
      unseenCenterCounts: revealedUnseen,
      visibleCount: 2,
      centerFaceUp: true,
      showOutcome: false,
    }),
    result: frame('result', {
      ...shared,
      hands: postHands,
      burdenSizes: postBurdenSizes,
      pot: after.pot,
      history: revealedHistory,
      unseenCenterCounts: revealedUnseen,
      visibleCount: 2,
      centerFaceUp: true,
      showOutcome: true,
    }),
  }

  return {
    commitOrder,
    result,
    beats: REVEAL_BEATS,
    frames,
  }
}

export function frameForBeat(
  sequence: RoundRevealSequence,
  beat: RevealBeat,
): RoundRevealFrame {
  return sequence.frames[beat]
}

const NEXT_BEAT: Record<RevealBeat, RevealBeat | null> = {
  firstPlay: 'secondPlay',
  secondPlay: 'center',
  center: 'result',
  result: null,
}

const HOLD_MS: Record<Exclude<RevealBeat, 'result'>, number> = {
  firstPlay: REVEAL_MS.firstPlayHold,
  secondPlay: REVEAL_MS.secondPlayHold,
  center: REVEAL_MS.centerHold,
}

const REDUCED_HOLD_MS: Record<Exclude<RevealBeat, 'result'>, number> = {
  firstPlay: 120,
  secondPlay: 160,
  center: 180,
}

export function advanceRevealBeat(beat: RevealBeat): RevealBeat | null {
  return NEXT_BEAT[beat]
}

export function revealDelay(
  beat: Exclude<RevealBeat, 'result'>,
  reducedMotion: boolean,
): number {
  return reducedMotion ? REDUCED_HOLD_MS[beat] : HOLD_MS[beat]
}

export function resultHoldMs(reducedMotion: boolean): number {
  return reducedMotion ? 280 : REVEAL_MS.resultHold
}

export function playOutcomeFor(
  frame: RoundRevealFrame,
  player: PlayerId,
): 'winner' | 'loser' | null {
  if (!frame.showOutcome) return null
  const result = frame.result
  const matched = result.plays[player].symbol === result.center.symbol
  if (result.kind === 'decisive') {
    return result.winner === player ? 'winner' : 'loser'
  }
  return matched ? 'winner' : 'loser'
}
