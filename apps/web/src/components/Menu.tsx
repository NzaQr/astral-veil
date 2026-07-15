import type { AiDifficulty } from '@astral-veil/engine'
import { AnimatePresence, motion } from 'motion/react'
import { SymbolIcon } from './SymbolIcon'
import { useGameStore } from '../game/store'

const DIFFICULTIES: ReadonlyArray<{
  id: AiDifficulty
  name: string
  description: string
}> = [
  {
    id: 'easy',
    name: 'Easy',
    description: 'Mostly random legal choices. Best for learning the flow.',
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Weights choices by public center odds and its own hand.',
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Reads revealed patterns, pot pressure, and card scarcity.',
  },
]

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span className="brand-orbit" />
      <SymbolIcon symbol="star" size={32} />
    </div>
  )
}

function Home({ reducedMotion }: { reducedMotion: boolean }) {
  const setScreen = useGameStore((state) => state.setScreen)
  const startHotSeat = useGameStore((state) => state.startHotSeat)
  const openDialog = useGameStore((state) => state.openDialog)
  const itemMotion = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <motion.main
      key="home"
      className="menu-screen"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className="menu-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="menu-card">
        <motion.div {...itemMotion} transition={{ duration: 0.35 }}>
          <BrandMark />
        </motion.div>
        <motion.div
          className="title-lockup"
          {...itemMotion}
          transition={{ duration: 0.35, delay: reducedMotion ? 0 : 0.08 }}
        >
          <p className="eyebrow">A game of hidden alignment</p>
          <h1>Astral Veil</h1>
          <p className="menu-intro">
            Read the unseen. Break the pattern. Leave the table with the
            lighter hand.
          </p>
        </motion.div>
        <motion.nav
          className="menu-actions"
          aria-label="Main menu"
          {...itemMotion}
          transition={{ duration: 0.35, delay: reducedMotion ? 0 : 0.16 }}
        >
          <button
            className="primary-button"
            type="button"
            onClick={() => setScreen('difficulty')}
          >
            <span>Solo</span>
            <small>Face a fair AI</small>
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={startHotSeat}
          >
            <span>Hot Seat</span>
            <small>Two players, one device</small>
          </button>
          <button
            className="secondary-button online-button"
            type="button"
            disabled
            aria-describedby="online-note"
          >
            <span>Online</span>
            <small id="online-note">Arriving in the next slice</small>
          </button>
        </motion.nav>
        <motion.div
          className="menu-utility"
          {...itemMotion}
          transition={{ duration: 0.35, delay: reducedMotion ? 0 : 0.24 }}
        >
          <button type="button" onClick={() => openDialog('rules')}>
            How to Play
          </button>
          <span aria-hidden="true" />
          <button type="button" onClick={() => openDialog('settings')}>
            Settings
          </button>
        </motion.div>
      </section>
      <p className="menu-footnote">
        Each commitment is final <span aria-hidden="true">✦</span> Choose with
        intent
      </p>
    </motion.main>
  )
}

function Difficulty({ reducedMotion }: { reducedMotion: boolean }) {
  const setScreen = useGameStore((state) => state.setScreen)
  const startSolo = useGameStore((state) => state.startSolo)

  return (
    <motion.main
      key="difficulty"
      className="difficulty-screen"
      initial={reducedMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
    >
      <button
        type="button"
        className="back-button"
        onClick={() => setScreen('home')}
      >
        <span aria-hidden="true">←</span> Main menu
      </button>
      <section>
        <p className="eyebrow">Choose your opponent</p>
        <h1>How closely should the veil listen?</h1>
        <p className="difficulty-intro">
          Every opponent sees only public information and its own hand.
        </p>
        <div className="difficulty-grid">
          {DIFFICULTIES.map((difficulty, index) => (
            <motion.button
              key={difficulty.id}
              type="button"
              className={`difficulty-card difficulty-${difficulty.id}`}
              onClick={() => startSolo(difficulty.id)}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                duration: 0.3,
                bounce: 0,
                delay: reducedMotion ? 0 : index * 0.08,
              }}
              whileTap={reducedMotion ? undefined : { scale: 0.96 }}
            >
              <span className="difficulty-index">0{index + 1}</span>
              <span className="difficulty-name">{difficulty.name}</span>
              <span className="difficulty-description">
                {difficulty.description}
              </span>
              <span className="difficulty-choose">
                Begin match <span aria-hidden="true">↗</span>
              </span>
            </motion.button>
          ))}
        </div>
      </section>
    </motion.main>
  )
}

export function Menu({
  screen,
  reducedMotion,
}: {
  screen: 'home' | 'difficulty'
  reducedMotion: boolean
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {screen === 'home' ? (
        <Home key="home" reducedMotion={reducedMotion} />
      ) : (
        <Difficulty key="difficulty" reducedMotion={reducedMotion} />
      )}
    </AnimatePresence>
  )
}
