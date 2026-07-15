import { useReducedMotion } from 'motion/react'
import { lazy, Suspense, useEffect } from 'react'
import { Dialogs } from './components/Dialogs'
import { Menu } from './components/Menu'
import { useGameStore, type RuntimeQuality } from './game/store'

const MatchScreen = lazy(async () => {
  const module = await import('./components/GameHud')
  return { default: module.MatchScreen }
})

function detectQuality(): RuntimeQuality {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const limitedCpu =
    navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
  if (limitedCpu) return 'low'
  if (coarse || window.devicePixelRatio > 2) return 'medium'
  return 'high'
}

function App() {
  const screen = useGameStore((state) => state.screen)
  const match = useGameStore((state) => state.match)
  const mode = useGameStore((state) => state.mode)
  const quality = useGameStore((state) => state.quality)
  const runtimeQuality = useGameStore((state) => state.runtimeQuality)
  const motionPreference = useGameStore((state) => state.motion)
  const setRuntimeQuality = useGameStore((state) => state.setRuntimeQuality)
  const systemReducedMotion = useReducedMotion() ?? false
  const reducedMotion =
    motionPreference === 'reduce' ||
    (motionPreference === 'system' && systemReducedMotion)
  const effectiveQuality = quality === 'auto' ? runtimeQuality : quality

  useEffect(() => {
    if (quality === 'auto') setRuntimeQuality(detectQuality())
  }, [quality, setRuntimeQuality])

  return (
    <div className="app-shell" data-reduced-motion={reducedMotion}>
      {screen === 'match' && match !== null && mode !== null ? (
        <Suspense
          fallback={<div className="match-loading">Opening the astral table…</div>}
        >
          <MatchScreen
            match={match}
            mode={mode}
            reducedMotion={reducedMotion}
            effectiveQuality={effectiveQuality}
          />
        </Suspense>
      ) : (
        <Menu
          screen={screen === 'difficulty' ? 'difficulty' : 'home'}
          reducedMotion={reducedMotion}
        />
      )}
      <Dialogs reducedMotion={reducedMotion} />
    </div>
  )
}

export default App
