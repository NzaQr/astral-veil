import { SYMBOLS } from '@astral-veil/engine'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { SymbolIcon } from './SymbolIcon'
import { UiIcon } from './UiIcon'
import { symbolName } from '../game/symbols'
import { useGameStore, type MotionPreference } from '../game/store'

interface DialogFrameProps {
  title: string
  children: React.ReactNode
  reducedMotion: boolean
}

function DialogFrame({ title, children, reducedMotion }: DialogFrameProps) {
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
        initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.99 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={closeDialog}
            aria-label="Close dialog"
          >
            <UiIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  )
}

function Rules({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <DialogFrame title="How to Play" reducedMotion={reducedMotion}>
      <div className="rules-copy">
        <p className="rules-lead">
          Commit from a finite hand. Match the hidden center to force the pot
          onto your opponent. Lowest burden wins.
        </p>
        <ol className="rule-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Commit</h3>
              <p>
                A face-down center card is drawn. Each player secretly commits
                one Sun, Moon, or Star. Commitments are final.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Reveal</h3>
              <p>
                Reveal plays in commit order, then the center, then the outcome.
                All three cards enter the pot.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Resolve</h3>
              <p>
                One match is a decisive round: the non-matching player takes the
                entire pot into their burden (unplayable). Both match or neither
                is a standoff: the pot stays.
              </p>
            </div>
          </li>
        </ol>
        <div className="rules-symbols" aria-label="The three card symbols">
          {SYMBOLS.map((symbol) => (
            <div key={symbol}>
              <SymbolIcon symbol={symbol} size={26} />
              <span>{symbolName(symbol)}</span>
            </div>
          ))}
        </div>
        <div className="rule-note">
          <h3>End of match</h3>
          <p>
            After a resolved round, the match ends if a hand is empty or no
            center cards remain. Lower burden wins. Equal burdens draw. An
            unclaimed terminal pot stays unclaimed.
          </p>
        </div>
      </div>
    </DialogFrame>
  )
}

function Settings({ reducedMotion }: { reducedMotion: boolean }) {
  const motionPreference = useGameStore((state) => state.motion)
  const setMotion = useGameStore((state) => state.setMotion)

  return (
    <DialogFrame title="Settings" reducedMotion={reducedMotion}>
      <div className="settings-list">
        <fieldset>
          <legend>Motion</legend>
          <p>
            System follows your device. Reduced keeps only transitions needed to
            understand match state.
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
