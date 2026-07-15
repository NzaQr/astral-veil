import {
  ContactShadows,
  Environment,
  Lightformer,
  PerformanceMonitor,
} from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
      <mesh receiveShadow position={[0, -0.22, 0]}>
        <cylinderGeometry args={[5.85, 6.0, 0.4, 64]} />
        <meshStandardMaterial
          color="#3a3228"
          metalness={0.2}
          roughness={0.62}
        />
      </mesh>

      <mesh
        receiveShadow
        position={[0, TABLE_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[5.45, 96]} />
        <meshStandardMaterial
          color="#3a4552"
          map={textures.map}
          roughnessMap={textures.roughnessMap}
          roughness={0.82}
          metalness={0.04}
          envMapIntensity={0.45}
        />
      </mesh>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.45, 5.62, 96]} />
        <meshStandardMaterial
          color="#b08a52"
          metalness={0.55}
          roughness={0.4}
          envMapIntensity={0.6}
        />
      </mesh>

      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.42, 1.48, 64]} />
        <meshStandardMaterial
          color="#8a7050"
          metalness={0.4}
          roughness={0.48}
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
      (revealStage === 'opponent' ||
        revealStage === 'center' ||
        revealStage === 'result')
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
      <hemisphereLight args={['#c8d0e0', '#4a3c30', 0.85]} />
      <ambientLight intensity={0.95} color="#f2ebe0" />
      <directionalLight
        position={[0, 10, 2]}
        color="#fff4e4"
        intensity={quality === 'low' ? 1.6 : 2.1}
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
      <directionalLight
        position={[-4, 6, 3]}
        color="#ffe2b8"
        intensity={0.55}
      />
      <pointLight
        position={[3.2, 2.8, 1.5]}
        color="#d8e0ff"
        intensity={14}
        distance={14}
        decay={2}
      />
      <pointLight
        position={[-2.8, 2.4, 2.2]}
        color="#ffd4a0"
        intensity={10}
        distance={12}
        decay={2}
      />
      <Environment resolution={quality === 'high' ? 128 : 64}>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#ffe6c4"
          position={[0, 5, 1]}
          scale={[6, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#c8d2f0"
          position={[4, 2, -2]}
          scale={[3, 2, 1]}
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
  const showPlayerOne =
    isReveal &&
    (revealStage === 'player' ||
      revealStage === 'opponent' ||
      revealStage === 'center' ||
      revealStage === 'result')
  const showPlayerTwo =
    isReveal &&
    (revealStage === 'opponent' ||
      revealStage === 'center' ||
      revealStage === 'result')
  const centerFaceUp =
    revealStage === 'center' || revealStage === 'result'
  const visibleHistory = visibleCenterHistory(match, revealStage)
  const historicalCenters = (
    isReveal ? visibleHistory.slice(0, -1) : visibleHistory
  ).slice(-5)

  const winnerSide =
    result?.kind === 'decisive' &&
    revealStage === 'result' &&
    result.winner !== null
      ? result.winner === 'player-1'
        ? 'left'
        : 'right'
      : null
  const loserSide =
    winnerSide === 'left' ? 'right' : winnerSide === 'right' ? 'left' : null

  return (
    <>
      <color attach="background" args={['#1a1e26']} />
      <fog attach="fog" args={['#1a1e26', 18, 36]} />
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
          position={[(index - 1) * 1.1, CARD_REST_Y, 2.45]}
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
        position={[0, CARD_REST_Y, -2.55]}
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

      {showPlayerOne && result !== null && (
        <SingleCard
          symbol={result.plays['player-1'].symbol}
          position={[-0.95, CARD_REST_Y + 0.01, 0.28]}
          faceUp
          fromPosition={[-1.4, CARD_REST_Y + 0.2, 1.5]}
          reducedMotion={reducedMotion}
          textureQuality={quality}
          highlighted={winnerSide === 'left'}
          dimmed={loserSide === 'left'}
        />
      )}

      {isReveal && result !== null && (
        <SingleCard
          symbol={result.center.symbol}
          position={[0, CARD_REST_Y + 0.015, -0.12]}
          faceUp={centerFaceUp}
          fromPosition={[0, CARD_REST_Y + 0.28, -0.12]}
          reducedMotion={reducedMotion}
          textureQuality={quality}
          highlighted={centerFaceUp}
        />
      )}

      {showPlayerTwo && result !== null && (
        <SingleCard
          symbol={result.plays['player-2'].symbol}
          position={[0.95, CARD_REST_Y + 0.01, 0.28]}
          faceUp
          fromPosition={[1.4, CARD_REST_Y + 0.2, 1.5]}
          reducedMotion={reducedMotion}
          textureQuality={quality}
          highlighted={winnerSide === 'right'}
          dimmed={loserSide === 'right'}
        />
      )}

      {winnerSide !== null && (
        <WinHighlight
          active
          recipientSide={winnerSide}
          reducedMotion={reducedMotion}
        />
      )}

      {presentedPot.length > 0 && (
        <CardStack
          symbol="sun"
          count={presentedPot.length}
          position={[-2.05, CARD_REST_Y, -0.12]}
          faceUp={false}
          textureQuality={quality}
        />
      )}

      {historicalCenters.map((round, index) => (
        <group
          key={round.center.id}
          position={[-3.5 + index * 0.62, CARD_REST_Y, -1.15]}
          scale={0.4}
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
          opacity={0.28}
          scale={10}
          blur={1.8}
          far={2.2}
          frames={1}
          color="#1a1410"
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
            toneMappingExposure: 1.15,
            outputColorSpace: SRGBColorSpace,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = 1.15
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
