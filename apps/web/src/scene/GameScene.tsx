import {
  ContactShadows,
  Environment,
  Lightformer,
  PerformanceMonitor,
} from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import {
  Component,
  Suspense,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import {
  ACESFilmicToneMapping,
  MathUtils,
  SRGBColorSpace,
  type PerspectiveCamera,
} from 'three'
import {
  SYMBOLS,
  type AstralSymbol,
  type MatchState,
  type PlayerId,
} from '@astral-veil/engine'
import { CARD_THICKNESS, CardStack, SingleCard } from './CardMesh'
import { WinHighlight } from './RevealFx'
import { createTableTextures, springStep } from './proceduralTextures'
import {
  getActiveViewer,
  useGameStore,
  type MatchMode,
  type QualityPreference,
  type RevealStage,
  type RuntimeQuality,
} from '../game/store'
import {
  visibleCenterHistory,
  visibleHand,
  visiblePot,
} from '../game/presentation'

interface SceneProps {
  match: MatchState
  mode: MatchMode
  revealStage: RevealStage
  reducedMotion: boolean
  quality: RuntimeQuality
  qualityPreference: QualityPreference
}

/** Felt surface Y — cards sit just above this. */
const TABLE_Y = 0
const CARD_REST_Y = TABLE_Y + CARD_THICKNESS * 0.5 + 0.002

function countSymbols(
  cards: MatchState['players'][PlayerId]['hand'],
): Record<AstralSymbol, number> {
  const counts: Record<AstralSymbol, number> = { sun: 0, moon: 0, star: 0 }
  for (const card of cards) counts[card.symbol] += 1
  return counts
}

function TableSurface({ quality }: { quality: RuntimeQuality }) {
  const textures = useMemo(() => createTableTextures(quality), [quality])

  return (
    <group>
      {/* Pedestal body — well below the play surface */}
      <mesh receiveShadow position={[0, -0.22, 0]}>
        <cylinderGeometry args={[5.85, 6.0, 0.4, 64]} />
        <meshStandardMaterial
          color="#1c1814"
          metalness={0.35}
          roughness={0.55}
        />
      </mesh>

      {/* Single felt play surface at y = 0 */}
      <mesh
        receiveShadow
        position={[0, TABLE_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[5.45, 96]} />
        <meshStandardMaterial
          color="#0d1016"
          map={textures.map}
          roughnessMap={textures.roughnessMap}
          roughness={0.88}
          metalness={0.06}
          envMapIntensity={0.35}
        />
      </mesh>

      {/* Outer brass rim — raised slightly, no overlap with felt */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.45, 5.62, 96]} />
        <meshStandardMaterial
          color="#8a6b40"
          metalness={0.7}
          roughness={0.35}
          envMapIntensity={0.7}
        />
      </mesh>

      {/* Subtle center ring */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.42, 1.48, 64]} />
        <meshStandardMaterial
          color="#5a4632"
          metalness={0.55}
          roughness={0.42}
        />
      </mesh>
    </group>
  )
}

function CameraRig({
  revealStage,
  reducedMotion,
  selectedSymbol,
}: {
  revealStage: RevealStage
  reducedMotion: boolean
  selectedSymbol: AstralSymbol | null
}) {
  const { camera, pointer, size } = useThree()
  const look = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])

  useFrame((_, delta) => {
    const perspective = camera as PerspectiveCamera
    const mobile = size.width < 720
    const revealTight =
      !reducedMotion &&
      (revealStage === 'center' || revealStage === 'result')
    const selectionNudge =
      !reducedMotion && selectedSymbol !== null && revealStage === 'choosing'

    const baseZ = mobile ? (revealTight ? 8.5 : 9.0) : revealTight ? 7.6 : 8.2
    const baseY = mobile ? (revealTight ? 8.2 : 8.5) : revealTight ? 7.25 : 7.6
    const selectX =
      selectedSymbol === 'sun' ? -0.15 : selectedSymbol === 'star' ? 0.15 : 0
    const baseX = selectionNudge ? selectX : 0

    const parallaxAmp = reducedMotion || mobile ? 0 : 0.18
    perspective.position.x = springStep(
      perspective.position.x,
      baseX + pointer.x * parallaxAmp,
      delta,
      3,
    )
    perspective.position.y = springStep(
      perspective.position.y,
      baseY + pointer.y * parallaxAmp * 0.35,
      delta,
      3,
    )
    perspective.position.z = springStep(
      perspective.position.z,
      baseZ,
      delta,
      3,
    )

    look.x = springStep(look.x, pointer.x * parallaxAmp * 0.25, delta, 2.8)
    look.y = springStep(look.y, pointer.y * parallaxAmp * 0.1, delta, 2.8)
    perspective.lookAt(look.x, look.y, look.z)

    const targetFov = mobile ? 46 : revealTight ? 40 : 42
    perspective.fov = MathUtils.lerp(
      perspective.fov,
      targetFov,
      1 - Math.exp(-delta * 2.2),
    )
    perspective.updateProjectionMatrix()
  })

  return null
}

function SceneLighting({ quality }: { quality: RuntimeQuality }) {
  return (
    <>
      <hemisphereLight args={['#7a8498', '#1a1612', 0.45]} />
      <ambientLight intensity={0.35} color="#d8d0c4" />
      <directionalLight
        position={[-3.5, 9, 4]}
        color="#f2e2c4"
        intensity={quality === 'low' ? 1.4 : 1.85}
        castShadow={quality !== 'low'}
        shadow-mapSize={quality === 'high' ? 2048 : 1024}
        shadow-bias={-0.00015}
        shadow-normalBias={0.04}
        shadow-camera-near={2}
        shadow-camera-far={24}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <pointLight
        position={[3.5, 3.2, -2.2]}
        color="#6a78b8"
        intensity={8}
        distance={12}
        decay={2}
      />
      <Environment resolution={quality === 'high' ? 128 : 64}>
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#e0c49a"
          position={[-3, 4, 2]}
          scale={[3.5, 2.5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.7}
          color="#8890c0"
          position={[4, 2, -3]}
          scale={[2.5, 2, 1]}
        />
      </Environment>
    </>
  )
}

function SceneContent({
  match,
  mode,
  revealStage,
  reducedMotion,
  quality,
  qualityPreference,
}: SceneProps) {
  const selected = useGameStore((state) => state.selectedSymbol)
  const hotSeatIndex = useGameStore((state) => state.hotSeatIndex)
  const handoffAccepted = useGameStore((state) => state.handoffAccepted)
  const selectSymbol = useGameStore((state) => state.selectSymbol)
  const commitSymbol = useGameStore((state) => state.commitSymbol)
  const setRuntimeQuality = useGameStore((state) => state.setRuntimeQuality)
  const viewer = getActiveViewer(match, mode, hotSeatIndex)
  const opponent: PlayerId =
    viewer === 'player-1' ? 'player-2' : 'player-1'
  const viewerHand = visibleHand(match, viewer, revealStage)
  const opponentHand = visibleHand(match, opponent, revealStage)
  const presentedPot = visiblePot(match, revealStage)
  const handCounts = useMemo(
    () => countSymbols(viewerHand),
    [viewerHand],
  )
  const canCommit =
    match.phase === 'awaiting-selections' &&
    match.players[viewer].committed === null &&
    revealStage === 'choosing' &&
    (mode === 'solo' || handoffAccepted)
  const result = match.lastResult
  const isReveal = revealStage !== 'choosing' && result !== null
  const centerFaceUp =
    revealStage === 'center' || revealStage === 'result'
  const visibleHistory = visibleCenterHistory(match, revealStage)
  const historicalCenters = (
    isReveal ? visibleHistory.slice(0, -1) : visibleHistory
  ).slice(-5)

  const winnerSide =
    result?.kind === 'decisive' && revealStage === 'result'
      ? result.recipient === 'player-1'
        ? 'left'
        : 'right'
      : null

  return (
    <>
      <color attach="background" args={['#06080c']} />
      <fog attach="fog" args={['#06080c', 14, 28]} />
      <SceneLighting quality={quality} />
      <CameraRig
        revealStage={revealStage}
        reducedMotion={reducedMotion}
        selectedSymbol={selected}
      />
      <TableSurface quality={quality} />

      {SYMBOLS.map((symbol, index) => (
        <CardStack
          key={`${viewer}-${symbol}`}
          symbol={symbol}
          count={handCounts[symbol]}
          position={[(index - 1) * 1.35, CARD_REST_Y, 2.55]}
          interactive={canCommit}
          selected={selected === symbol}
          reducedMotion={reducedMotion}
          textureQuality={quality}
          onSelect={() => selectSymbol(symbol)}
          onCommit={() => commitSymbol(symbol)}
        />
      ))}

      <CardStack
        symbol="moon"
        count={opponentHand.length}
        position={[0, CARD_REST_Y, -2.65]}
        faceUp={false}
        textureQuality={quality}
      />

      {!isReveal && match.currentCenter !== null && (
        <SingleCard
          symbol="star"
          position={[0, CARD_REST_Y, -0.05]}
          faceUp={false}
          reducedMotion={reducedMotion}
          textureQuality={quality}
        />
      )}

      {isReveal && result !== null && (
        <>
          <SingleCard
            symbol={result.plays['player-1'].symbol}
            position={[-1.0, CARD_REST_Y + 0.01, 0.25]}
            faceUp
            fromPosition={[-1.5, CARD_REST_Y + 0.25, 1.6]}
            reducedMotion={reducedMotion}
            textureQuality={quality}
            highlighted={winnerSide === 'left'}
          />
          <SingleCard
            symbol={result.center.symbol}
            position={[0, CARD_REST_Y + 0.02, -0.15]}
            faceUp={centerFaceUp}
            fromPosition={[0, CARD_REST_Y + 0.35, -0.15]}
            reducedMotion={reducedMotion}
            textureQuality={quality}
            highlighted={revealStage === 'center' || revealStage === 'result'}
          />
          <SingleCard
            symbol={result.plays['player-2'].symbol}
            position={[1.0, CARD_REST_Y + 0.01, 0.25]}
            faceUp
            fromPosition={[1.5, CARD_REST_Y + 0.25, 1.6]}
            reducedMotion={reducedMotion}
            textureQuality={quality}
            highlighted={winnerSide === 'right'}
          />
          <WinHighlight
            active={winnerSide !== null}
            recipientSide={winnerSide}
            reducedMotion={reducedMotion}
          />
        </>
      )}

      {presentedPot.length > 0 && (
        <CardStack
          symbol="sun"
          count={presentedPot.length}
          position={[-2.15, CARD_REST_Y, -0.15]}
          faceUp={false}
          textureQuality={quality}
        />
      )}

      {historicalCenters.map((round, index) => (
        <group
          key={round.center.id}
          position={[-3.7 + index * 0.68, CARD_REST_Y, -1.2]}
          scale={0.42}
        >
          <SingleCard
            symbol={round.center.symbol}
            position={[0, 0, 0]}
            faceUp
            reducedMotion={reducedMotion}
            textureQuality={quality}
          />
        </group>
      ))}

      {quality !== 'low' && (
        <ContactShadows
          position={[0, TABLE_Y + 0.001, 0]}
          opacity={0.45}
          scale={10}
          blur={2.2}
          far={2.8}
          frames={1}
          color="#000000"
        />
      )}

      <PerformanceMonitor
        flipflops={3}
        onDecline={() => {
          if (qualityPreference === 'auto') setRuntimeQuality('low')
        }}
        onIncline={() => {
          if (qualityPreference === 'auto') setRuntimeQuality('high')
        }}
        onFallback={() => {
          if (qualityPreference === 'auto') setRuntimeQuality('medium')
        }}
      />

      {quality === 'high' ? (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom
            intensity={0.12}
            luminanceThreshold={0.92}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.35} darkness={0.4} />
        </EffectComposer>
      ) : quality === 'medium' ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Vignette eskil={false} offset={0.4} darkness={0.35} />
        </EffectComposer>
      ) : null}
    </>
  )
}

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Astral Veil 3D scene failed', error, info)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function WebGlMessage() {
  return (
    <div className="webgl-message" role="alert">
      <span aria-hidden="true">◇</span>
      <strong>The astral table could not be drawn.</strong>
      <p>
        Astral Veil needs a modern browser with WebGL2 enabled. Your match is
        safe; try reloading after enabling hardware acceleration.
      </p>
    </div>
  )
}

function supportsWebGl2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
}

export function GameScene(props: SceneProps) {
  const [contextLost, setContextLost] = useState(false)
  const supported = useMemo(supportsWebGl2, [])
  if (!supported) return <WebGlMessage />

  const maxDpr =
    props.quality === 'high' ? 2 : props.quality === 'medium' ? 1.75 : 1.25

  return (
    <SceneErrorBoundary fallback={<WebGlMessage />}>
      <div className="scene-shell" aria-hidden={contextLost}>
        <Canvas
          shadows={props.quality !== 'low'}
          dpr={[1, maxDpr]}
          camera={{
            position: [0, 7.6, 8.2],
            fov: 42,
            near: 0.5,
            far: 50,
          }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            outputColorSpace: SRGBColorSpace,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = 1.0
            gl.outputColorSpace = SRGBColorSpace
            const canvas = gl.domElement
            const lost = (event: Event) => {
              event.preventDefault()
              setContextLost(true)
            }
            const restored = () => setContextLost(false)
            canvas.addEventListener('webglcontextlost', lost, false)
            canvas.addEventListener('webglcontextrestored', restored, false)
          }}
        >
          <Suspense fallback={null}>
            <SceneContent {...props} />
          </Suspense>
        </Canvas>
        {contextLost && <WebGlMessage />}
      </div>
    </SceneErrorBoundary>
  )
}
