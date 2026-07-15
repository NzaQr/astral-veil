import { SYMBOLS } from '@astral-veil/engine'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { SymbolIcon } from './SymbolIcon'
import { symbolName } from '../game/symbols'
import {
  useGameStore,
  type MotionPreference,
  type QualityPreference,
} from '../game/store'

interface DialogFrameProps {
  title: string
  eyebrow: string
  children: React.ReactNode
  reducedMotion: boolean
}

function DialogFrame({
  title,
  eyebrow,
  children,
  reducedMotion,
}: DialogFrameProps) {
  const closeDialog = useGameStore((state) => state.closeDialog)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeDialog])

  return (
    <motion.div
      className="dialog-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeDialog()
      }}
    >
      <motion.section
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="dialog-title">{title}</h2>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={closeDialog}
            aria-label="Close dialog"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  )
}

function Rules({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <DialogFrame
      title="How to Play"
      eyebrow="The rules of the veil"
      reducedMotion={reducedMotion}
    >
      <div className="rules-copy">
        <p className="rules-lead">
          Read the center deck, manage a finite hand, and finish with fewer
          cards than your opponent.
        </p>
        <ol className="rule-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Commit in secret</h3>
              <p>
                A hidden center card is drawn. Both players irreversibly commit
                one Sun, Moon, or Star from their hand.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Reveal the three cards</h3>
              <p>
                Both played cards are revealed together, followed by the center
                card. All three enter the public pot.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Resolve the omen</h3>
              <p>
                Exactly one match is a decisive round. The matching card is
                discarded; the other player takes every remaining card in the
                accumulated pot. If both or neither match, it is a standoff and
                the pot stays.
              </p>
            </div>
          </li>
        </ol>
        <div className="rules-symbols" aria-label="The three card symbols">
          {SYMBOLS.map((symbol) => (
            <div key={symbol}>
              <SymbolIcon symbol={symbol} size={30} />
              <span>{symbolName(symbol)}</span>
            </div>
          ))}
        </div>
        <div className="rule-note">
          <h3>How a match ends</h3>
          <p>
            After a resolved round, the match ends if either hand is empty or
            no future center cards remain. Only cards still in hand count:
            lower score wins, equal scores draw. A terminal unclaimed pot stays
            unclaimed.
          </p>
        </div>
      </div>
    </DialogFrame>
  )
}

function Settings({ reducedMotion }: { reducedMotion: boolean }) {
  const quality = useGameStore((state) => state.quality)
  const motionPreference = useGameStore((state) => state.motion)
  const setQuality = useGameStore((state) => state.setQuality)
  const setMotion = useGameStore((state) => state.setMotion)

  return (
    <DialogFrame
      title="Settings"
      eyebrow="Display preferences"
      reducedMotion={reducedMotion}
    >
      <div className="settings-list">
        <fieldset>
          <legend>3D quality</legend>
          <p>
            Auto adapts to pixel density, input type, and live rendering
            performance.
          </p>
          <SegmentedControl<QualityPreference>
            value={quality}
            options={['auto', 'high', 'medium', 'low']}
            onChange={setQuality}
          />
        </fieldset>
        <fieldset>
          <legend>Motion</legend>
          <p>
            System follows your device. Reduced keeps only transitions needed
            to understand match state.
          </p>
          <SegmentedControl<MotionPreference>
            value={motionPreference}
            options={['system', 'reduce', 'full']}
            onChange={setMotion}
          />
        </fieldset>
      </div>
    </DialogFrame>
  )
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={value === option ? 'is-active' : ''}
          onClick={() => onChange(option)}
          aria-pressed={value === option}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function Dialogs({ reducedMotion }: { reducedMotion: boolean }) {
  const dialog = useGameStore((state) => state.dialog)

  return (
    <AnimatePresence initial={false}>
      {dialog === 'rules' && (
        <Rules key="rules" reducedMotion={reducedMotion} />
      )}
      {dialog === 'settings' && (
        <Settings key="settings" reducedMotion={reducedMotion} />
      )}
    </AnimatePresence>
  )
}
