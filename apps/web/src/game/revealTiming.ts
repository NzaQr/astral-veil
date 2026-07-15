import type { RevealStage } from './store'

/** Full-motion reveal pacing (ms). Reduced-motion uses much shorter values. */
export const REVEAL_MS = {
  /** Player card settles at center before opponent appears. */
  playerHold: 1100,
  /** Both player cards visible before the center flips. */
  opponentHold: 2000,
  /** Center face-up reading time before outcome copy. */
  centerHold: 1400,
  /** Outcome visible before auto-advancing a resolved round. */
  resultHold: 2400,
} as const

export function revealDelay(
  stage: Exclude<RevealStage, 'choosing' | 'result'>,
  reducedMotion: boolean,
): number {
  if (reducedMotion) {
    if (stage === 'player') return 120
    if (stage === 'opponent') return 160
    return 180
  }
  if (stage === 'player') return REVEAL_MS.playerHold
  if (stage === 'opponent') return REVEAL_MS.opponentHold
  return REVEAL_MS.centerHold
}

export function resultHoldMs(reducedMotion: boolean): number {
  return reducedMotion ? 280 : REVEAL_MS.resultHold
}

/** Stages where pot/hand transfer feedback is still pending. */
export function isPreResultReveal(stage: RevealStage): boolean {
  return (
    stage === 'player' ||
    stage === 'opponent' ||
    stage === 'center'
  )
}

/** Center symbol still veiled from the HUD probability strip. */
export function isCenterConcealed(stage: RevealStage): boolean {
  return stage === 'player' || stage === 'opponent'
}
