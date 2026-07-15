import { RoundedBox } from '@react-three/drei'
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MathUtils,
  Plane,
  Raycaster,
  Shape,
  Vector2,
  Vector3,
  type Group,
} from 'three'
import type { AstralSymbol } from '@astral-veil/engine'
import {
  createCardImperfections,
  springStep,
  type TextureQuality,
} from './proceduralTextures'

/** Poker-like proportions at table scale. */
export const CARD_WIDTH = 1.05
export const CARD_HEIGHT = 1.48
export const CARD_THICKNESS = 0.028
export const CARD_RADIUS = 0.055
export const STACK_GAP = 0.034

const SYMBOL_COLORS: Record<
  AstralSymbol,
  { color: string; emissive: string; emissiveIntensity: number }
> = {
  sun: { color: '#d4a04a', emissive: '#5c3010', emissiveIntensity: 0.18 },
  moon: { color: '#b8c0d4', emissive: '#2a3560', emissiveIntensity: 0.14 },
  star: { color: '#5ec4cc', emissive: '#3a2868', emissiveIntensity: 0.2 },
}

type InteractPhase = 'idle' | 'hover' | 'dragging'

function starShape(): Shape {
  const shape = new Shape()
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 0.28 : 0.12
    const angle = Math.PI / 2 + (point * Math.PI) / 5
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (point === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function moonShape(): Shape {
  const shape = new Shape()
  shape.moveTo(0.14, 0.28)
  shape.bezierCurveTo(-0.2, 0.26, -0.32, 0.03, -0.22, -0.17)
  shape.bezierCurveTo(-0.14, -0.34, 0.09, -0.36, 0.24, -0.2)
  shape.bezierCurveTo(0.02, -0.17, -0.08, -0.03, -0.05, 0.08)
  shape.bezierCurveTo(-0.03, 0.19, 0.05, 0.26, 0.14, 0.28)
  shape.closePath()
  return shape
}

function SunGlyph({ intensity }: { intensity: number }) {
  const mat = SYMBOL_COLORS.sun
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.006, 28]} />
        <meshStandardMaterial
          color={mat.color}
          emissive={mat.emissive}
          emissiveIntensity={mat.emissiveIntensity * intensity}
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh
          key={index}
          position={[
            Math.cos((index * Math.PI) / 4) * 0.26,
            0,
            Math.sin((index * Math.PI) / 4) * 0.26,
          ]}
          rotation={[0, -(index * Math.PI) / 4, Math.PI / 2]}
        >
          <boxGeometry args={[0.09, 0.006, 0.028]} />
          <meshStandardMaterial
            color={mat.color}
            emissive={mat.emissive}
            emissiveIntensity={mat.emissiveIntensity * intensity}
            metalness={0.55}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  )
}

function SymbolGlyph({
  symbol,
  intensity,
}: {
  symbol: AstralSymbol
  intensity: number
}) {
  const shape = useMemo(
    () => (symbol === 'star' ? starShape() : moonShape()),
    [symbol],
  )
  const mat = SYMBOL_COLORS[symbol]
  if (symbol === 'sun') return <SunGlyph intensity={intensity} />
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <extrudeGeometry
        args={[
          shape,
          {
            depth: 0.006,
            bevelEnabled: true,
            bevelThickness: 0.003,
            bevelSize: 0.004,
            bevelSegments: 2,
          },
        ]}
      />
      <meshStandardMaterial
        color={mat.color}
        emissive={mat.emissive}
        emissiveIntensity={mat.emissiveIntensity * intensity}
        metalness={0.55}
        roughness={0.32}
      />
    </mesh>
  )
}

function FaceArt({
  faceUp,
  symbol,
  highlight,
}: {
  faceUp: boolean
  symbol: AstralSymbol
  highlight: number
}) {
  if (faceUp) {
    return (
      <group position={[0, CARD_THICKNESS * 0.52, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CARD_WIDTH * 0.82, CARD_HEIGHT * 0.82]} />
          <meshStandardMaterial
            color="#121018"
            metalness={0.08}
            roughness={0.62}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.001]}>
          <ringGeometry args={[0.34, 0.38, 40]} />
          <meshStandardMaterial
            color="#2a2434"
            metalness={0.2}
            roughness={0.5}
          />
        </mesh>
        <group position={[0, 0.004, 0]}>
          <SymbolGlyph symbol={symbol} intensity={1 + highlight * 0.35} />
        </group>
      </group>
    )
  }

  return (
    <group position={[0, CARD_THICKNESS * 0.52, 0]} rotation={[0, Math.PI / 4, 0]}>
      <mesh>
        <torusGeometry args={[0.22, 0.016, 8, 32]} />
        <meshStandardMaterial
          color="#8a7358"
          metalness={0.45}
          roughness={0.4}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial
          color="#4a5470"
          emissive="#1e2848"
          emissiveIntensity={0.2 + highlight * 0.15}
          metalness={0.35}
          roughness={0.42}
        />
      </mesh>
    </group>
  )
}

function CardBody({
  faceUp,
  symbol,
  offset,
  variation,
  highlight,
  maps,
  dualSided = false,
}: {
  faceUp: boolean
  symbol: AstralSymbol
  offset: number
  variation: number
  highlight: number
  maps: ReturnType<typeof createCardImperfections>
  dualSided?: boolean
}) {
  return (
    <group position={[0, offset, 0]}>
      <RoundedBox
        args={[CARD_WIDTH, CARD_THICKNESS, CARD_HEIGHT]}
        radius={CARD_RADIUS}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#e8dfd0"
          metalness={0.05}
          roughness={0.72 + variation * 0.06}
          roughnessMap={maps.roughnessMap}
          normalMap={maps.normalMap}
          normalScale={new Vector2(0.12, 0.12)}
        />
      </RoundedBox>
      <RoundedBox
        args={[CARD_WIDTH * 0.94, CARD_THICKNESS * 0.35, CARD_HEIGHT * 0.94]}
        radius={CARD_RADIUS * 0.85}
        smoothness={3}
        position={[0, CARD_THICKNESS * 0.28, 0]}
      >
        <meshStandardMaterial
          color={faceUp || dualSided ? '#17141f' : '#10151e'}
          metalness={0.12}
          roughness={0.48 + variation * 0.08}
          roughnessMap={maps.roughnessMap}
          normalMap={maps.normalMap}
          normalScale={new Vector2(0.1, 0.1)}
          envMapIntensity={0.55 + highlight * 0.25}
        />
      </RoundedBox>
      {dualSided ? (
        <>
          <FaceArt faceUp symbol={symbol} highlight={highlight} />
          <group rotation={[Math.PI, 0, 0]}>
            <FaceArt faceUp={false} symbol={symbol} highlight={highlight} />
          </group>
        </>
      ) : (
        <FaceArt faceUp={faceUp} symbol={symbol} highlight={highlight} />
      )}
    </group>
  )
}

export interface CardStackProps {
  symbol: AstralSymbol
  count: number
  position: readonly [number, number, number]
  faceUp?: boolean
  interactive?: boolean
  selected?: boolean
  reducedMotion?: boolean
  textureQuality?: TextureQuality
  onSelect?: () => void
  onCommit?: () => void
}

export function CardStack({
  symbol,
  count,
  position,
  faceUp = true,
  interactive = false,
  selected = false,
  reducedMotion = false,
  textureQuality = 'medium',
  onSelect,
  onCommit,
}: CardStackProps) {
  const group = useRef<Group>(null)
  const [phase, setPhase] = useState<InteractPhase>('idle')
  const phaseRef = useRef<InteractPhase>('idle')
  const localHover = useRef(new Vector3())
  const dragTarget = useRef(new Vector3(position[0], position[1], position[2]))
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])
  const ndc = useMemo(() => new Vector2(), [])
  const raycaster = useMemo(() => new Raycaster(), [])
  const { camera, gl } = useThree()
  const restPosition = useRef(new Vector3(position[0], position[1], position[2]))
  const visibleLayers = Math.min(count, 5)
  const maps = useMemo(
    () => createCardImperfections(textureQuality),
    [textureQuality],
  )
  const variation = useMemo(
    () => ((symbol.charCodeAt(0) * 17 + count * 13) % 29) / 29,
    [count, symbol],
  )

  const setPhaseSafe = (next: InteractPhase) => {
    phaseRef.current = next
    setPhase(next)
  }

  useEffect(() => {
    restPosition.current.set(position[0], position[1], position[2])
    if (phaseRef.current !== 'dragging') {
      dragTarget.current.copy(restPosition.current)
    }
  }, [position])

  useEffect(() => {
    if (!interactive) {
      setPhaseSafe('idle')
      return
    }
    document.body.style.cursor =
      phase === 'dragging' ? 'grabbing' : phase === 'hover' ? 'grab' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [interactive, phase])

  const projectClientToPlane = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)
    dragPlane.constant = -(restPosition.current.y + 0.22)
    return raycaster.ray.intersectPlane(dragPlane, dragTarget.current)
  }

  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (phase !== 'dragging') return
    const canvas = gl.domElement

    const onMove = (event: PointerEvent) => {
      const hit = projectClientToPlane(event.clientX, event.clientY)
      if (hit === null) return
      const rest = restPosition.current
      dragTarget.current.set(
        MathUtils.clamp(hit.x, rest.x - 1.4, rest.x + 1.4),
        rest.y + 0.22,
        MathUtils.clamp(hit.z, rest.z - 2.4, rest.z + 0.35),
      )
    }

    const onUp = () => {
      const rest = restPosition.current
      const towardCenter = rest.z - dragTarget.current.z
      const shouldCommit = towardCenter > 0.85
      dragTarget.current.copy(rest)
      setPhaseSafe('hover')
      if (shouldCommit) onCommitRef.current?.()
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [phase, gl, camera])

  useFrame((_, delta) => {
    const current = group.current
    if (current === null) return
    const active = phaseRef.current
    const dragging = active === 'dragging'
    const hovering = active === 'hover'
    const rest = restPosition.current

    const lift = reducedMotion
      ? 0
      : dragging
        ? 0.22
        : selected
          ? 0.14
          : hovering
            ? 0.08
            : 0

    let targetX = rest.x
    let targetY = rest.y + lift
    let targetZ = rest.z

    if (dragging) {
      targetX = dragTarget.current.x
      targetY = Math.max(rest.y + 0.16, dragTarget.current.y)
      targetZ = dragTarget.current.z
    }

    const stiffness = dragging ? 24 : 15
    current.position.x = springStep(current.position.x, targetX, delta, stiffness)
    current.position.y = springStep(current.position.y, targetY, delta, stiffness)
    current.position.z = springStep(current.position.z, targetZ, delta, stiffness)

    let tiltX = 0
    let tiltZ = 0
    if (!reducedMotion && hovering && !dragging) {
      tiltX = MathUtils.clamp(localHover.current.z * 0.18, -0.1, 0.1)
      tiltZ = MathUtils.clamp(-localHover.current.x * 0.22, -0.12, 0.12)
    } else if (!reducedMotion && dragging) {
      const dx = current.position.x - rest.x
      const dz = current.position.z - rest.z
      tiltX = MathUtils.clamp(dz * 0.08, -0.12, 0.12)
      tiltZ = MathUtils.clamp(-dx * 0.1, -0.14, 0.14)
    }
    current.rotation.x = springStep(current.rotation.x, tiltX, delta, 14)
    current.rotation.z = springStep(current.rotation.z, tiltZ, delta, 14)

    const scale = selected || dragging ? 1.04 : hovering ? 1.02 : 1
    current.scale.x = springStep(current.scale.x, scale, delta, 14)
    current.scale.y = springStep(current.scale.y, scale, delta, 14)
    current.scale.z = springStep(current.scale.z, scale, delta, 14)
  })

  const pointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    event.stopPropagation()
    onSelectRef.current?.()
    const hit = projectClientToPlane(
      event.nativeEvent.clientX,
      event.nativeEvent.clientY,
    )
    if (hit !== null) {
      const rest = restPosition.current
      dragTarget.current.set(
        MathUtils.clamp(hit.x, rest.x - 1.4, rest.x + 1.4),
        rest.y + 0.22,
        MathUtils.clamp(hit.z, rest.z - 2.4, rest.z + 0.35),
      )
    }
    setPhaseSafe('dragging')
  }

  if (count <= 0) return null

  return (
    <group
      ref={group}
      position={[...position]}
      onPointerEnter={(event) => {
        if (!interactive || phaseRef.current === 'dragging') return
        event.stopPropagation()
        setPhaseSafe('hover')
        if (group.current !== null) {
          group.current.worldToLocal(localHover.current.copy(event.point))
        }
      }}
      onPointerLeave={() => {
        if (phaseRef.current === 'dragging') return
        setPhaseSafe('idle')
        localHover.current.set(0, 0, 0)
      }}
      onPointerDown={pointerDown}
      onPointerMove={(event) => {
        if (!interactive || phaseRef.current === 'dragging') return
        if (group.current !== null) {
          group.current.worldToLocal(localHover.current.copy(event.point))
        }
      }}
    >
      {Array.from({ length: visibleLayers }, (_, index) => (
        <CardBody
          key={index}
          faceUp={faceUp && index === visibleLayers - 1}
          symbol={symbol}
          offset={index * STACK_GAP}
          variation={variation + index * 0.02}
          highlight={
            index === visibleLayers - 1 &&
            (selected || phase === 'hover' || phase === 'dragging')
              ? 1
              : 0
          }
          maps={maps}
        />
      ))}
    </group>
  )
}

export interface SingleCardProps {
  symbol: AstralSymbol
  position: readonly [number, number, number]
  faceUp: boolean
  reducedMotion?: boolean
  textureQuality?: TextureQuality
  highlighted?: boolean
  fromPosition?: readonly [number, number, number]
}

export function SingleCard({
  symbol,
  position,
  faceUp,
  reducedMotion = false,
  textureQuality = 'medium',
  highlighted = false,
  fromPosition,
}: SingleCardProps) {
  const group = useRef<Group>(null)
  const flip = useRef(faceUp ? 0 : Math.PI)
  const seeded = useRef(false)
  const maps = useMemo(
    () => createCardImperfections(textureQuality),
    [textureQuality],
  )

  useFrame((_, delta) => {
    const current = group.current
    if (current === null) return
    if (!seeded.current) {
      if (fromPosition !== undefined) {
        current.position.set(fromPosition[0], fromPosition[1], fromPosition[2])
      }
      seeded.current = true
    }
    const lift = highlighted && !reducedMotion ? 0.05 : 0
    current.position.x = springStep(current.position.x, position[0], delta, 10)
    current.position.y = springStep(
      current.position.y,
      position[1] + lift,
      delta,
      11,
    )
    current.position.z = springStep(current.position.z, position[2], delta, 10)

    const targetFlip = faceUp ? 0 : Math.PI
    flip.current = reducedMotion
      ? targetFlip
      : springStep(flip.current, targetFlip, delta, 9)
    current.rotation.x = flip.current

    const scale = highlighted ? 1.04 : 1
    current.scale.setScalar(springStep(current.scale.x, scale, delta, 12))
  })

  return (
    <group ref={group} position={[...position]}>
      <CardBody
        faceUp={faceUp}
        symbol={symbol}
        offset={0}
        variation={0.35}
        highlight={highlighted ? 1 : 0}
        maps={maps}
        dualSided
      />
    </group>
  )
}
