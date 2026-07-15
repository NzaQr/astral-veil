import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  PerformanceMonitor,
} from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  N8AO,
  Vignette,
} from '@react-three/postprocessing'
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
import { CardStack, SingleCard } from './CardMesh'
import {
  Atmosphere,
  CinematicFocus,
  PotAura,
  RevealBurst,
  WinHighlight,
} from './RevealFx'
import {
  createTableTextures,
  springStep,
} from './proceduralTextures'
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

function countSymbols(
  cards: MatchState['players'][PlayerId]['hand'],
): Record<AstralSymbol, number> {
  const counts: Record<AstralSymbol, number> = { sun: 0, moon: 0, star: 0 }
  for (const card of cards) counts[card.symbol] += 1
  return counts
}

function TableSurface({ quality }: { quality: RuntimeQuality }) {
  const textures = useMemo(() => createTableTextures(quality), [quality])

  const reflectorResolution = quality === 'high' ? 512 : quality === 'medium' ? 256 : 128

  return (
    <group>
      <mesh receiveShadow position={[0, -0.17, 0]}>
        <cylinderGeometry args={[5.9, 6.05, 0.3, 64]} />
        <meshPhysicalMaterial
          color="#2a221a"
          metalness={0.82}
          roughness={0.28}
          clearcoat={0.45}
          clearcoatRoughness={0.35}
          envMapIntensity={0.9}
        />
      </mesh>

      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.5, 96]} />
        {quality === 'low' ? (
          <meshStandardMaterial
            color="#0a0c10"
            map={textures.map}
            roughnessMap={textures.roughnessMap}
            roughness={0.72}
            metalness={0.18}
          />
        ) : (
          <MeshReflectorMaterial
            color="#0c0e12"
            map={textures.map}
            roughnessMap={textures.roughnessMap}
            metalness={0.22}
            roughness={0.82}
            blur={quality === 'high' ? [280, 80] : [180, 50]}
            resolution={reflectorResolution}
            mixBlur={0.85}
            mixStrength={quality === 'high' ? 1.35 : 0.85}
            mixContrast={1.05}
            depthScale={0.6}
            minDepthThreshold={0.75}
            maxDepthThreshold={1.25}
            mirror={0.18}
            reflectorOffset={0.02}
          />
        )}
      </mesh>

      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.31, 5.43, 96]} />
        <meshPhysicalMaterial
          color="#8a6b40"
          metalness={0.92}
          roughness={0.22}
          clearcoat={0.65}
          clearcoatRoughness={0.18}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.46, 1.485, 64]} />
        <meshPhysicalMaterial
          color="#6a5234"
          metalness={0.88}
          roughness={0.28}
          clearcoat={0.4}
          clearcoatRoughness={0.25}
        />
      </mesh>
      {Array.from({ length: 32 }, (_, index) => {
        const angle = (index / 32) * Math.PI * 2
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 5.37, 0.047, Math.sin(angle) * 5.37]}
            rotation={[-Math.PI / 2, 0, -angle]}
          >
            <planeGeometry args={[0.035, 0.16]} />
            <meshPhysicalMaterial
              color={index % 4 === 0 ? '#c49a58' : '#564531'}
              metalness={0.92}
              roughness={0.22}
              clearcoat={0.5}
              clearcoatRoughness={0.2}
            />
          </mesh>
        )
      })}
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

    const baseZ = mobile ? (revealTight ? 8.4 : 8.9) : revealTight ? 7.45 : 8.05
    const baseY = mobile
      ? revealTight
        ? 8.1
        : 8.45
      : revealTight
        ? 7.15
        : selectionNudge
          ? 7.35
          : 7.55
    const selectX =
      selectedSymbol === 'sun' ? -0.22 : selectedSymbol === 'star' ? 0.22 : 0
    const baseX = selectionNudge ? selectX : 0

    const parallaxAmp = reducedMotion || mobile ? 0 : 0.28
    const targetX = baseX + pointer.x * parallaxAmp
    const targetY = baseY + pointer.y * parallaxAmp * 0.45
    const targetZ = baseZ - (selectionNudge ? 0.18 : 0)

    perspective.position.x = springStep(perspective.position.x, targetX, delta, 3.2)
    perspective.position.y = springStep(perspective.position.y, targetY, delta, 3.2)
    perspective.position.z = springStep(perspective.position.z, targetZ, delta, 3.2)

    look.x = springStep(
      look.x,
      pointer.x * parallaxAmp * 0.35 + (selectionNudge ? selectX * 0.4 : 0),
      delta,
      3,
    )
    look.y = springStep(look.y, pointer.y * parallaxAmp * 0.15, delta, 3)
    perspective.lookAt(look.x, look.y, look.z)

    const targetFov = mobile ? (revealTight ? 44 : 46) : revealTight ? 38 : 42
    perspective.fov = MathUtils.lerp(
      perspective.fov,
      targetFov,
      1 - Math.exp(-delta * 2.5),
    )
    perspective.updateProjectionMatrix()
  })

  return null
}

function SceneLighting({ quality }: { quality: RuntimeQuality }) {
  return (
    <>
      <hemisphereLight args={['#6a7394', '#1a1410', quality === 'low' ? 0.55 : 0.32]} />
      <ambientLight intensity={quality === 'low' ? 0.42 : 0.22} color="#c8c0b4" />
      <directionalLight
        position={[-3.8, 8.2, 3.4]}
        color="#f3d3a0"
        intensity={quality === 'low' ? 1.7 : 2.45}
        castShadow={quality !== 'low'}
        shadow-mapSize={quality === 'high' ? 2048 : 1024}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
        shadow-camera-near={1}
        shadow-camera-far={22}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <spotLight
        position={[0, 9.5, 1.2]}
        angle={0.55}
        penumbra={0.65}
        intensity={quality === 'low' ? 18 : 32}
        color="#ffe6c2"
        distance={22}
        castShadow={quality === 'high'}
        shadow-mapSize={1024}
      />
      <pointLight
        position={[3.8, 3.4, -2.6]}
        color="#6a78d8"
        intensity={quality === 'low' ? 12 : 20}
        distance={11}
        decay={2}
      />
      <pointLight
        position={[-4.2, 2.4, 2.8]}
        color="#c99052"
        intensity={quality === 'low' ? 6 : 10}
        distance={9}
        decay={2}
      />
      <Environment resolution={quality === 'high' ? 256 : 64}>
        <Lightformer
          form="rect"
          intensity={2.8}
          color="#e0b46a"
          position={[-3.2, 4.5, 2]}
          scale={[4, 3, 1]}
        />
        <Lightformer
          form="ring"
          intensity={1.4}
          color="#7a84d0"
          position={[4.2, 2.2, -4]}
          scale={3.5}
        />
        <Lightformer
          form="circle"
          intensity={0.9}
          color="#f2e6d2"
          position={[0, 6, 0]}
          scale={2.2}
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

  const textureQuality = quality

  return (
    <>
      <color attach="background" args={['#040507']} />
      <fog attach="fog" args={['#040507', 9.5, 18]} />
      <SceneLighting quality={quality} />
      <CameraRig
        revealStage={revealStage}
        reducedMotion={reducedMotion}
        selectedSymbol={selected}
      />
      <TableSurface quality={quality} />
      <Atmosphere quality={quality} />
      <CinematicFocus
        revealStage={revealStage}
        reducedMotion={reducedMotion}
      />

      {SYMBOLS.map((symbol, index) => (
        <CardStack
          key={`${viewer}-${symbol}`}
          symbol={symbol}
          count={handCounts[symbol]}
          position={[(index - 1) * 1.55, 0.1, 2.65]}
          interactive={canCommit}
          selected={selected === symbol}
          reducedMotion={reducedMotion}
          textureQuality={textureQuality}
          onSelect={() => selectSymbol(symbol)}
          onCommit={() => commitSymbol(symbol)}
        />
      ))}

      <CardStack
        symbol="moon"
        count={opponentHand.length}
        position={[0, 0.08, -2.8]}
        faceUp={false}
        textureQuality={textureQuality}
      />

      {!isReveal && match.currentCenter !== null && (
        <SingleCard
          symbol="star"
          position={[0, 0.11, -0.05]}
          faceUp={false}
          reducedMotion={reducedMotion}
          textureQuality={textureQuality}
        />
      )}

      {isReveal && result !== null && (
        <>
          <SingleCard
            symbol={result.plays['player-1'].symbol}
            position={[-1.03, 0.14, 0.28]}
            faceUp
            fromPosition={[-1.6, 0.4, 1.8]}
            reducedMotion={reducedMotion}
            textureQuality={textureQuality}
            highlighted={winnerSide === 'left'}
          />
          <SingleCard
            symbol={result.center.symbol}
            position={[0, 0.18, -0.18]}
            faceUp={centerFaceUp}
            fromPosition={[0, 0.55, -0.18]}
            reducedMotion={reducedMotion}
            textureQuality={textureQuality}
            highlighted={revealStage === 'center' || revealStage === 'result'}
          />
          <SingleCard
            symbol={result.plays['player-2'].symbol}
            position={[1.03, 0.14, 0.28]}
            faceUp
            fromPosition={[1.6, 0.4, 1.8]}
            reducedMotion={reducedMotion}
            textureQuality={textureQuality}
            highlighted={winnerSide === 'right'}
          />
          <RevealBurst
            active={revealStage === 'center' || revealStage === 'result'}
            symbol={result.center.symbol}
            reducedMotion={reducedMotion}
          />
          <WinHighlight
            active={winnerSide !== null}
            recipientSide={winnerSide}
            reducedMotion={reducedMotion}
          />
        </>
      )}

      {presentedPot.length > 0 && (
        <>
          <CardStack
            symbol="sun"
            count={presentedPot.length}
            position={[-2.25, 0.08, -0.18]}
            faceUp={false}
            textureQuality={textureQuality}
          />
          <PotAura
            active={
              presentedPot.length > 0 &&
              (revealStage === 'result' || revealStage === 'players')
            }
            count={presentedPot.length}
            reducedMotion={reducedMotion}
          />
        </>
      )}

      {historicalCenters.map((round, index) => (
        <group
          key={round.center.id}
          position={[-3.85 + index * 0.72, 0.03, -1.25]}
          scale={0.42}
        >
          <SingleCard
            symbol={round.center.symbol}
            position={[0, 0, 0]}
            faceUp
            reducedMotion={reducedMotion}
            textureQuality={textureQuality}
          />
        </group>
      ))}

      {quality !== 'low' && (
        <ContactShadows
          position={[0, 0.045, 0]}
          opacity={quality === 'high' ? 0.7 : 0.48}
          scale={11}
          blur={2.6}
          far={3.8}
          frames={quality === 'high' ? Infinity : 1}
          color="#050308"
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

      {quality === 'high' && !reducedMotion ? (
        <EffectComposer multisampling={4}>
          <N8AO
            aoRadius={0.55}
            intensity={1.15}
            quality="medium"
            halfRes
          />
          <DepthOfField
            focusDistance={0.018}
            focalLength={0.025}
            bokehScale={revealStage === 'choosing' ? 1.4 : 2.4}
            target={[0, 0.12, 0]}
          />
          <Bloom
            intensity={0.55}
            luminanceThreshold={0.68}
            luminanceSmoothing={0.42}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.68} />
        </EffectComposer>
      ) : quality === 'high' ? (
        <EffectComposer multisampling={4}>
          <N8AO
            aoRadius={0.55}
            intensity={1.15}
            quality="medium"
            halfRes
          />
          <Bloom
            intensity={0.55}
            luminanceThreshold={0.68}
            luminanceSmoothing={0.42}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.68} />
        </EffectComposer>
      ) : quality === 'medium' ? (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.28}
            luminanceThreshold={0.68}
            luminanceSmoothing={0.42}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.28} darkness={0.48} />
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
    props.quality === 'high' ? 2 : props.quality === 'medium' ? 1.5 : 1

  return (
    <SceneErrorBoundary fallback={<WebGlMessage />}>
      <div className="scene-shell" aria-hidden={contextLost}>
        <Canvas
          shadows={props.quality !== 'low'}
          dpr={[1, maxDpr]}
          camera={{ position: [0, 7.55, 8.05], fov: 42, near: 0.1, far: 36 }}
          gl={{
            antialias: props.quality !== 'low',
            powerPreference: 'high-performance',
            alpha: false,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
            outputColorSpace: SRGBColorSpace,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
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
