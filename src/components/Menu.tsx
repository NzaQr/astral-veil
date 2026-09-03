import type { AiDifficulty } from '@astral-veil/engine'
import {
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  BookOpen01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import { SymbolIcon } from './SymbolIcon'
import { UiIcon } from './UiIcon'
import { CARD_ART, CARD_BACK } from '../game/cardArt'
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
      <SymbolIcon symbol="star" size={24} />
    </div>
  )
}

function CardConstellation({ reducedMotion }: { reducedMotion: boolean }) {
  const cards = [
    { src: CARD_ART.sun, className: 'menu-card-sun' },
    { src: CARD_ART.moon, className: 'menu-card-moon' },
    { src: CARD_ART.star, className: 'menu-card-star' },
  ] as const

  return (
    <div className="menu-card-constellation" aria-hidden="true">
      <motion.img
        src={CARD_BACK}
        alt=""
        draggable={false}
        className="menu-card menu-card-back"
        initial={reducedMotion ? false : { opacity: 0, x: 18, rotate: 9 }}
        animate={{ opacity: 1, x: 0, rotate: 6 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      />
      {cards.map((card, index) => (
        <motion.img
          key={card.className}
          src={card.src}
          alt=""
          draggable={false}
          className={`menu-card ${card.className}`}
          initial={
            reducedMotion
              ? false
              : { opacity: 0, y: 18, rotate: index * 7 - 7 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.46,
            ease: [0.2, 0, 0, 1],
            delay: reducedMotion ? 0 : 0.08 + index * 0.07,
          }}
        />
      ))}
    </div>
  )
}

function Home({ reducedMotion }: { reducedMotion: boolean }) {
  const setScreen = useGameStore((state) => state.setScreen)
  const startHotSeat = useGameStore((state) => state.startHotSeat)
  const openDialog = useGameStore((state) => state.openDialog)
  const itemMotion = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

  return (
    <motion.main
      key="home"
      className="menu-screen"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="menu-felt" aria-hidden="true" />
      <section className="menu-stage">
        <div className="menu-copy">
          <motion.div
            {...itemMotion}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <BrandMark />
          </motion.div>
          <motion.div
            className="title-lockup"
            {...itemMotion}
            transition={{
              duration: 0.28,
              ease: 'easeOut',
              delay: reducedMotion ? 0 : 0.06,
            }}
          >
            <h1>
              <span>Astral</span>
              <span>Veil</span>
            </h1>
            <p className="menu-intro">
              Commit from a finite hand. Match the center. Leave with the lighter
              burden.
            </p>
          </motion.div>
          <motion.nav
            className="menu-actions"
            aria-label="Main menu"
            {...itemMotion}
            transition={{
              duration: 0.28,
              ease: 'easeOut',
              delay: reducedMotion ? 0 : 0.12,
            }}
          >
            <button
              className="primary-button"
              type="button"
              onClick={() => setScreen('difficulty')}
            >
              <span className="menu-action-label">
                <strong>Solo match</strong>
                <small>Face a fair AI</small>
              </span>
              <UiIcon icon={ArrowUpRight01Icon} size={18} />
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={startHotSeat}
            >
              <span className="menu-action-label">
                <strong>Hot-seat match</strong>
                <small>Two players, one device</small>
              </span>
              <UiIcon icon={ArrowUpRight01Icon} size={18} />
            </button>
          </motion.nav>
          <motion.div
            className="menu-utility"
            {...itemMotion}
            transition={{
              duration: 0.28,
              ease: 'easeOut',
              delay: reducedMotion ? 0 : 0.18,
            }}
          >
            <button type="button" onClick={() => openDialog('rules')}>
              <UiIcon icon={BookOpen01Icon} size={16} />
              How to Play
            </button>
            <button type="button" onClick={() => openDialog('settings')}>
              <UiIcon icon={Settings01Icon} size={16} />
              Settings
            </button>
          </motion.div>
        </div>
        <motion.div
          className="menu-visual"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0, 0, 1], delay: 0.08 }}
        >
          <CardConstellation reducedMotion={reducedMotion} />
        </motion.div>
      </section>
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
      initial={reducedMotion ? false : { opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <button
        type="button"
        className="back-button"
        onClick={() => setScreen('home')}
      >
        <UiIcon icon={ArrowLeft01Icon} size={18} />
        Main menu
      </button>
      <section className="difficulty-stage">
        <div className="difficulty-copy">
          <h1>Choose your opponent</h1>
          <p className="difficulty-intro">
            Every opponent sees only public information and its own hand.
          </p>
          <div className="difficulty-list">
            {DIFFICULTIES.map((difficulty, index) => (
              <motion.button
                key={difficulty.id}
                type="button"
                className={`difficulty-option difficulty-${difficulty.id}`}
                onClick={() => startSolo(difficulty.id)}
                initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.24,
                  ease: [0.2, 0, 0, 1],
                  delay: reducedMotion ? 0 : index * 0.06,
                }}
                whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              >
                <span className="difficulty-name">{difficulty.name}</span>
                <span className="difficulty-description">
                  {difficulty.description}
                </span>
                <span className="difficulty-choose">
                  Begin match
                  <UiIcon icon={ArrowUpRight01Icon} size={16} />
                </span>
              </motion.button>
            ))}
          </div>
        </div>
        <div className="difficulty-visual" aria-hidden="true">
          <motion.img
            src={CARD_BACK}
            alt=""
            draggable={false}
            initial={reducedMotion ? false : { opacity: 0, y: 14, rotate: 4 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ duration: 0.42, ease: [0.2, 0, 0, 1] }}
          />
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
