import { RoundedBox } from '@react-three/drei'
import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  MathUtils,
  Shape,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
} from 'three'
import type { AstralSymbol } from '@astral-veil/engine'
import {
  createCardImperfections,
  springStep,
  type TextureQuality,
} from './proceduralTextures'

const SYMBOL_MATERIALS: Record<
  AstralSymbol,
  MeshPhysicalMaterialParameters
> = {
  sun: {
    color: '#f0b34a',
    emissive: '#8a4508',
    emissiveIntensity: 0.42,
    metalness: 0.92,
    roughness: 0.18,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.35,
  },
  moon: {
    color: '#c8d0e4',
    emissive: '#2a3488',
    emissiveIntensity: 0.32,
    metalness: 0.94,
    roughness: 0.16,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.4,
  },
  star: {
    color: '#6de0e6',
    emissive: '#4a2a96',
    emissiveIntensity: 0.48,
    metalness: 0.88,
    roughness: 0.14,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.5,
  },
}

function starShape(): Shape {
  const shape = new Shape()
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 0.37 : 0.16
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
  shape.moveTo(0.18, 0.38)
  shape.bezierCurveTo(-0.26, 0.34, -0.42, 0.04, -0.3, -0.22)
  shape.bezierCurveTo(-0.19, -0.45, 0.12, -0.48, 0.32, -0.27)
  shape.bezierCurveTo(0.03, -0.22, -0.1, -0.04, -0.07, 0.11)
  shape.bezierCurveTo(-0.04, 0.25, 0.06, 0.34, 0.18, 0.38)
  shape.closePath()
  return shape
}

function SunInlay({ intensity }: { intensity: number }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.04, 32]} />
        <meshPhysicalMaterial
          {...SYMBOL_MATERIALS.sun}
          emissiveIntensity={SYMBOL_MATERIALS.sun.emissiveIntensity! * intensity}
        />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh
          key={index}
          castShadow
          position={[
            Math.cos((index * Math.PI) / 4) * 0.36,
            0,
            Math.sin((index * Math.PI) / 4) * 0.36,
          ]}
          rotation={[0, -(index * Math.PI) / 4, Math.PI / 2]}
        >
          <coneGeometry args={[0.055, 0.15, 3]} />
          <meshPhysicalMaterial
            {...SYMBOL_MATERIALS.sun}
            emissiveIntensity={
              SYMBOL_MATERIALS.sun.emissiveIntensity! * intensity
            }
          />
        </mesh>
      ))}
    </group>
  )
}

function SymbolInlay({
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
  if (symbol === 'sun') return <SunInlay intensity={intensity} />
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <extrudeGeometry
        args={[
          shape,
          {
            depth: 0.038,
            bevelEnabled: true,
            bevelThickness: 0.012,
            bevelSize: 0.016,
            bevelSegments: 3,
          },
        ]}
      />
      <meshPhysicalMaterial
        {...SYMBOL_MATERIALS[symbol]}
        emissiveIntensity={
          SYMBOL_MATERIALS[symbol].emissiveIntensity! * intensity
        }
      />
    </mesh>
  )
}

function FaceMotif({
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
      <group>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5, 48]} />
          <meshPhysicalMaterial
            color="#08070c"
            metalness={0.4}
            roughness={0.62}
            clearcoat={0.2}
            clearcoatRoughness={0.55}
            envMapIntensity={0.35}
          />
        </mesh>
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.5, 48]} />
          <meshPhysicalMaterial
            color="#1a1622"
            metalness={0.55}
            roughness={0.4}
            envMapIntensity={0.5}
          />
        </mesh>
        {/* Recessed engraving sits below the face plane */}
        <group position={[0, -0.012, 0]} scale={[0.92, 0.55, 0.92]}>
          <SymbolInlay symbol={symbol} intensity={0.75 + highlight * 0.45} />
        </group>
      </group>
    )
  }
  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.28, 0.028, 10, 40]} />
        <meshPhysicalMaterial
          color="#94785a"
          metalness={0.94}
          roughness={0.2}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <octahedronGeometry args={[0.125, 0]} />
        <meshPhysicalMaterial
          color="#5c6688"
          emissive="#243058"
          emissiveIntensity={0.38 + highlight * 0.25}
          metalness={0.85}
          roughness={0.22}
          clearcoat={0.7}
          clearcoatRoughness={0.18}
        />
      </mesh>
    </group>
  )
}

function CardShell({
  symbol,
  offset,
  variation,
  highlight,
  maps,
  children,
}: {
  symbol: AstralSymbol
  offset: number
  variation: number
  highlight: number
  maps: ReturnType<typeof createCardImperfections>
  children?: ReactNode
}) {
  const faceRef = useRef<Mesh>(null)
  const rimRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    const face = faceRef.current
    const rim = rimRef.current
    if (face === null || rim === null) return
    const faceMat = face.material as MeshPhysicalMaterial
    const rimMat = rim.material as MeshPhysicalMaterial
    faceMat.envMapIntensity = springStep(
      faceMat.envMapIntensity,
      0.85 + highlight * 0.9,
      delta,
      10,
    )
    faceMat.clearcoat = springStep(
      faceMat.clearcoat,
      0.55 + highlight * 0.4,
      delta,
      10,
    )
    faceMat.roughness = springStep(
      faceMat.roughness,
      0.26 + variation * 0.1 - highlight * 0.08,
      delta,
      10,
    )
    rimMat.envMapIntensity = springStep(
      rimMat.envMapIntensity,
      1.05 + highlight * 0.7,
      delta,
      10,
    )
    rimMat.metalness = springStep(
      rimMat.metalness,
      0.78 + highlight * 0.12,
      delta,
      10,
    )
  })

  return (
    <group position={[0, offset, 0]}>
      <RoundedBox
        ref={rimRef}
        args={[1.14, 0.11, 1.64]}
        radius={0.082}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#6a5234"
          metalness={0.78}
          roughness={0.26 + variation * 0.08}
          clearcoat={0.72}
          clearcoatRoughness={0.18}
          roughnessMap={maps.roughnessMap}
          normalMap={maps.normalMap}
          normalScale={new Vector2(0.35, 0.35)}
          envMapIntensity={1.05}
        />
      </RoundedBox>
      <RoundedBox
        ref={faceRef}
        args={[1.05, 0.118, 1.55]}
        radius={0.065}
        smoothness={4}
        position={[0, 0.006, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          color="#15121c"
          metalness={0.48}
          roughness={0.3 + variation * 0.1}
          clearcoat={0.55}
          clearcoatRoughness={0.22}
          roughnessMap={maps.roughnessMap}
          normalMap={maps.normalMap}
          normalScale={new Vector2(0.28, 0.28)}
          envMapIntensity={0.85}
        />
      </RoundedBox>
      {children}
      {highlight > 0.05 && (
        <mesh
          position={[0, -0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1.05, 1.45, 1]}
        >
          <circleGeometry args={[0.55, 32]} />
          <meshBasicMaterial
            color={SYMBOL_MATERIALS[symbol].color}
            transparent
            opacity={0.12 + highlight * 0.18}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

function CardLayer({
  faceUp,
  symbol,
  offset,
  variation,
  highlight,
  maps,
}: {
  faceUp: boolean
  symbol: AstralSymbol
  offset: number
  variation: number
  highlight: number
  maps: ReturnType<typeof createCardImperfections>
}) {
  return (
    <CardShell
      symbol={symbol}
      offset={offset}
      variation={variation}
      highlight={highlight}
      maps={maps}
    >
      <group position={[0, 0.072, 0]}>
        <FaceMotif faceUp={faceUp} symbol={symbol} highlight={highlight} />
      </group>
    </CardShell>
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
  const [hovered, setHovered] = useState(false)
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)
  const localPointer = useRef(new Vector3(0, 0, 0))
  const visibleLayers = Math.min(count, 5)
  const maps = useMemo(
    () => createCardImperfections(textureQuality),
    [textureQuality],
  )
  const variation = useMemo(
    () => ((symbol.charCodeAt(0) * 17 + count * 13) % 29) / 29,
    [count, symbol],
  )
  const highlight = hovered || selected ? (selected ? 1 : 0.7) : 0

  useEffect(() => {
    if (!interactive) return
    document.body.style.cursor = hovered ? 'grab' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered, interactive])

  const toLocal = (event: ThreeEvent<PointerEvent>) => {
    const current = group.current
    if (current === null) return
    current.worldToLocal(localPointer.current.copy(event.point))
  }

  useFrame((_, delta) => {
    const current = group.current
    if (current === null) return
    const lift =
      !reducedMotion && (hovered || selected) ? (selected ? 0.28 : 0.2) : 0
    current.position.x = springStep(current.position.x, position[0], delta)
    current.position.y = springStep(
      current.position.y,
      position[1] + lift + drag * 0.26,
      delta,
      selected ? 16 : 14,
    )
    current.position.z = springStep(
      current.position.z,
      position[2] - drag * 1.45,
      delta,
    )

    let tiltX = 0
    let tiltZ = !reducedMotion && hovered ? -0.04 : 0
    if (!reducedMotion && hovered) {
      tiltX = MathUtils.clamp(localPointer.current.z * 0.22, -0.14, 0.14)
      tiltZ = MathUtils.clamp(-localPointer.current.x * 0.28, -0.16, 0.16)
    }
    if (!reducedMotion && selected && !hovered) {
      tiltX = Math.sin(performance.now() * 0.002) * 0.018
    }
    current.rotation.x = springStep(current.rotation.x, tiltX, delta, 12)
    current.rotation.z = springStep(current.rotation.z, tiltZ, delta, 12)
    const scale = selected ? 1.035 : hovered ? 1.02 : 1
    current.scale.x = springStep(current.scale.x, scale, delta, 12)
    current.scale.y = springStep(current.scale.y, scale, delta, 12)
    current.scale.z = springStep(current.scale.z, scale, delta, 12)
  })

  const pointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    event.stopPropagation()
    dragStart.current = event.pointer.y
    const target = event.nativeEvent.target
    if (target instanceof Element) {
      target.setPointerCapture(event.pointerId)
    }
  }

  const pointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    event.stopPropagation()
    toLocal(event)
    if (dragStart.current === null) return
    setDrag(MathUtils.clamp((event.pointer.y - dragStart.current) * 1.8, 0, 1))
  }

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive || dragStart.current === null) return
    event.stopPropagation()
    const finalDrag = MathUtils.clamp(
      (event.pointer.y - dragStart.current) * 1.8,
      0,
      1,
    )
    const shouldCommit = finalDrag > 0.62
    dragStart.current = null
    setDrag(0)
    if (shouldCommit) onCommit?.()
    else onSelect?.()
  }

  if (count <= 0) return null

  return (
    <group
      ref={group}
      position={[...position]}
      onPointerEnter={(event) => {
        if (!interactive) return
        setHovered(true)
        toLocal(event)
      }}
      onPointerLeave={() => {
        setHovered(false)
        if (dragStart.current === null) setDrag(0)
        localPointer.current.set(0, 0, 0)
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(event) => {
        if (!interactive) return
        event.stopPropagation()
        if (dragStart.current === null) onSelect?.()
      }}
    >
      {Array.from({ length: visibleLayers }, (_, index) => (
        <CardLayer
          key={index}
          faceUp={faceUp && index === visibleLayers - 1}
          symbol={symbol}
          offset={index * 0.082}
          variation={variation + index * 0.025}
          highlight={index === visibleLayers - 1 ? highlight : 0}
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
    const lift = highlighted && !reducedMotion ? 0.08 : 0
    current.position.x = springStep(current.position.x, position[0], delta, 8)
    current.position.y = springStep(
      current.position.y,
      position[1] + lift,
      delta,
      9,
    )
    current.position.z = springStep(current.position.z, position[2], delta, 8)

    const targetFlip = faceUp ? 0 : Math.PI
    if (reducedMotion) flip.current = targetFlip
    else flip.current = springStep(flip.current, targetFlip, delta, 7)
    current.rotation.x = flip.current

    const scale = highlighted ? 1.06 : 1
    const next = springStep(current.scale.x, scale, delta, 10)
    current.scale.setScalar(next)
  })

  return (
    <group ref={group} position={[...position]}>
      <CardShell
        symbol={symbol}
        offset={0}
        variation={0.4}
        highlight={highlighted ? 1 : 0}
        maps={maps}
      >
        <group position={[0, 0.072, 0]}>
          <FaceMotif faceUp symbol={symbol} highlight={highlighted ? 1 : 0} />
        </group>
        <group position={[0, -0.06, 0]} rotation={[Math.PI, 0, 0]}>
          <FaceMotif
            faceUp={false}
            symbol={symbol}
            highlight={highlighted ? 1 : 0}
          />
        </group>
      </CardShell>
    </group>
  )
}
