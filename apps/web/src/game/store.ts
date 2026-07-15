import {
  advanceRound,
  chooseAiCard,
  commitCard,
  createMatch,
  getHotSeatCommitOrder,
  projectForPlayer,
  type AiDifficulty,
  type AstralSymbol,
  type MatchState,
  type PlayerId,
} from '@astral-veil/engine'
import { create } from 'zustand'
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware'

export type Screen = 'home' | 'difficulty' | 'match'
export type MatchMode = 'solo' | 'hot-seat'
export type RevealStage =
  | 'choosing'
  | 'player'
  | 'opponent'
  | 'center'
  | 'result'
export type DialogName = 'rules' | 'settings'
export type QualityPreference = 'auto' | 'high' | 'medium' | 'low'
export type MotionPreference = 'system' | 'reduce' | 'full'
export type RuntimeQuality = Exclude<QualityPreference, 'auto'>

interface GameStore {
  screen: Screen
  dialog: DialogName | null
  mode: MatchMode | null
  difficulty: AiDifficulty
  match: MatchState | null
  matchSeed: number
  aiRngState: number
  revealStage: RevealStage
  selectedSymbol: AstralSymbol | null
  hotSeatIndex: 0 | 1
  handoffAccepted: boolean
  quality: QualityPreference
  runtimeQuality: RuntimeQuality
  motion: MotionPreference
  setScreen: (screen: Screen) => void
  openDialog: (dialog: DialogName) => void
  closeDialog: () => void
  startSolo: (difficulty: AiDifficulty) => void
  startHotSeat: () => void
  acceptHandoff: () => void
  selectSymbol: (symbol: AstralSymbol) => void
  commitSelected: () => void
  commitSymbol: (symbol: AstralSymbol) => void
  performAiCommit: () => void
  setRevealStage: (stage: RevealStage) => void
  continueRound: () => void
  rematch: () => void
  exitMatch: () => void
  setQuality: (quality: QualityPreference) => void
  setRuntimeQuality: (quality: RuntimeQuality) => void
  setMotion: (motion: MotionPreference) => void
}

function randomSeeds(): readonly [number, number] {
  const source = new Uint32Array(2)
  globalThis.crypto.getRandomValues(source)
  return [source[0] ?? 0, source[1] ?? 1]
}

function activeHotSeatPlayer(match: MatchState, index: 0 | 1): PlayerId {
  return getHotSeatCommitOrder(match.round)[index]
}

function initialState() {
  return {
    screen: 'home' as Screen,
    dialog: null,
    mode: null,
    difficulty: 'medium' as AiDifficulty,
    match: null,
    matchSeed: 0,
    aiRngState: 1,
    revealStage: 'choosing' as RevealStage,
    selectedSymbol: null,
    hotSeatIndex: 0 as 0 | 1,
    handoffAccepted: false,
    quality: 'auto' as QualityPreference,
    runtimeQuality: 'medium' as RuntimeQuality,
    motion: 'system' as MotionPreference,
  }
}

const memoryPreferences = new Map<string, string>()
const memoryStorage: StateStorage = {
  getItem: (name) => memoryPreferences.get(name) ?? null,
  setItem: (name, value) => {
    memoryPreferences.set(name, value)
  },
  removeItem: (name) => {
    memoryPreferences.delete(name)
  },
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState(),
      setScreen: (screen) => set({ screen }),
      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: null }),
      startSolo: (difficulty) => {
        const [matchSeed, aiSeed] = randomSeeds()
        set({
          screen: 'match',
          mode: 'solo',
          difficulty,
          match: createMatch(matchSeed),
          matchSeed,
          aiRngState: aiSeed,
          revealStage: 'choosing',
          selectedSymbol: null,
          hotSeatIndex: 0,
          handoffAccepted: true,
        })
      },
      startHotSeat: () => {
        const [matchSeed, aiSeed] = randomSeeds()
        set({
          screen: 'match',
          mode: 'hot-seat',
          match: createMatch(matchSeed),
          matchSeed,
          aiRngState: aiSeed,
          revealStage: 'choosing',
          selectedSymbol: null,
          hotSeatIndex: 0,
          handoffAccepted: false,
        })
      },
      acceptHandoff: () => set({ handoffAccepted: true }),
      selectSymbol: (symbol) => {
        const { match, mode, hotSeatIndex, handoffAccepted } = get()
        if (match === null || match.phase !== 'awaiting-selections') return
        if (mode === 'hot-seat' && !handoffAccepted) return
        const player =
          mode === 'hot-seat'
            ? activeHotSeatPlayer(match, hotSeatIndex)
            : 'player-1'
        if (match.players[player].committed !== null) return
        if (!match.players[player].hand.some((card) => card.symbol === symbol)) {
          return
        }
        set({ selectedSymbol: symbol })
      },
      commitSelected: () => {
        const symbol = get().selectedSymbol
        if (symbol !== null) get().commitSymbol(symbol)
      },
      commitSymbol: (symbol) => {
        const {
          match,
          mode,
          hotSeatIndex,
          handoffAccepted,
          revealStage,
        } = get()
        if (
          match === null ||
          mode === null ||
          match.phase !== 'awaiting-selections' ||
          revealStage !== 'choosing' ||
          (mode === 'hot-seat' && !handoffAccepted)
        ) {
          return
        }
        const player =
          mode === 'hot-seat'
            ? activeHotSeatPlayer(match, hotSeatIndex)
            : 'player-1'
        if (match.players[player].committed !== null) return
        const card = [...match.players[player].hand]
          .reverse()
          .find((candidate) => candidate.symbol === symbol)
        if (card === undefined) return

        const nextMatch = commitCard(match, player, card.id)
        if (mode === 'hot-seat' && hotSeatIndex === 0) {
          set({
            match: nextMatch,
            hotSeatIndex: 1,
            handoffAccepted: false,
            selectedSymbol: null,
          })
          return
        }
        set({
          match: nextMatch,
          handoffAccepted: mode === 'solo',
          selectedSymbol: null,
          revealStage:
            nextMatch.phase === 'resolved' || nextMatch.phase === 'complete'
              ? 'player'
              : 'choosing',
        })
      },
      performAiCommit: () => {
        const { match, mode, difficulty, aiRngState } = get()
        if (
          match === null ||
          mode !== 'solo' ||
          match.phase !== 'awaiting-selections' ||
          match.players['player-1'].committed === null ||
          match.players['player-2'].committed !== null
        ) {
          return
        }
        const choice = chooseAiCard(
          projectForPlayer(match, 'player-2'),
          difficulty,
          aiRngState,
        )
        const nextMatch = commitCard(match, 'player-2', choice.cardId)
        set({
          match: nextMatch,
          aiRngState: choice.rngState,
          revealStage: 'player',
        })
      },
      setRevealStage: (revealStage) => set({ revealStage }),
      continueRound: () => {
        const { match, mode, revealStage } = get()
        if (
          match === null ||
          match.phase !== 'resolved' ||
          revealStage !== 'result'
        ) {
          return
        }
        const nextMatch = advanceRound(match)
        set({
          match: nextMatch,
          revealStage: 'choosing',
          selectedSymbol: null,
          hotSeatIndex: 0,
          handoffAccepted: mode === 'solo',
        })
      },
      rematch: () => {
        const { mode, difficulty } = get()
        if (mode === 'solo') get().startSolo(difficulty)
        if (mode === 'hot-seat') get().startHotSeat()
      },
      exitMatch: () =>
        set({
          screen: 'home',
          mode: null,
          match: null,
          revealStage: 'choosing',
          selectedSymbol: null,
          handoffAccepted: false,
          dialog: null,
        }),
      setQuality: (quality) => set({ quality }),
      setRuntimeQuality: (runtimeQuality) => set({ runtimeQuality }),
      setMotion: (motion) => set({ motion }),
    }),
    {
      name: 'astral-veil-preferences',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? memoryStorage : localStorage,
      ),
      partialize: ({ quality, motion }) => ({ quality, motion }),
    },
  ),
)

export function getActiveViewer(
  match: MatchState,
  mode: MatchMode,
  hotSeatIndex: 0 | 1,
): PlayerId {
  return mode === 'hot-seat'
    ? activeHotSeatPlayer(match, hotSeatIndex)
    : 'player-1'
}

export function getAiDelay(rngState: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : 900 + (rngState % 400)
}
