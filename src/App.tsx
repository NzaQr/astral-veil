import { useReducedMotion } from 'motion/react'
import { lazy, Suspense } from 'react'
import { Dialogs } from './components/Dialogs'
import { Menu } from './components/Menu'
import { useGameStore } from './game/store'

const MatchScreen = lazy(async () => {
  const module = await import('./components/GameHud')
  return { default: module.MatchScreen }
})

function App() {
  const screen = useGameStore((state) => state.screen)
  const match = useGameStore((state) => state.match)
  const mode = useGameStore((state) => state.mode)
  const motionPreference = useGameStore((state) => state.motion)
  const systemReducedMotion = useReducedMotion() ?? false
  const reducedMotion =
    motionPreference === 'reduce' ||
    (motionPreference === 'system' && systemReducedMotion)

  return (
    <div className="app-shell" data-reduced-motion={reducedMotion}>
      {screen === 'match' && match !== null && mode !== null ? (
        <Suspense
          fallback={<div className="match-loading">Opening the table…</div>}
        >
          <MatchScreen
            match={match}
            mode={mode}
            reducedMotion={reducedMotion}
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
