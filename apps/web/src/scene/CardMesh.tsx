import { RoundedBox } from '@react-three/drei'
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MathUtils,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Group,
  type Texture,
} from 'three'
import type { AstralSymbol } from '@astral-veil/engine'
import { ART_ASPECT, useCardArtTextures } from './cardArt'
import { springStep, type TextureQuality } from './proceduralTextures'

/** Exact artwork proportions — do not stretch. */
export const CARD_HEIGHT = 1.44
export const CARD_WIDTH = CARD_HEIGHT * ART_ASPECT
export const CARD_THICKNESS = 0.008
export const CARD_RADIUS = 0.042
export const STACK_GAP = 0.01

type InteractPhase = 'idle' | 'hover' | 'dragging'

function CardBackFace({ facing }: { facing: 'up' | 'down' }) {
  const y = facing === 'up' ? CARD_THICKNESS * 0.52 : -CARD_THICKNESS * 0.52
  const rotX = facing === 'up' ? -Math.PI / 2 : Math.PI / 2
  return (
    <group position={[0, y, 0]} rotation={[rotX, 0, 0]}>
      <mesh>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial
          color="#f3ebe0"
          metalness={0.06}
          roughness={0.62}
          envMapIntensity={0.35}
        />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[0.22, 0.26, 40]} />
        <meshStandardMaterial
          color="#b08a52"
          metalness={0.35}
          roughness={0.42}
        />
      </mesh>
      <mesh position={[0, 0, 0.0015]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial
          color="#6a7488"
          metalness={0.25}
          roughness={0.45}
          emissive="#243048"
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  )
}

function CardFace({
  map,
  highlight,
  dimmed,
}: {
  map: Texture
  highlight: number
  dimmed: boolean
}) {
  return (
    <mesh position={[0, CARD_THICKNESS * 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
      <meshStandardMaterial
        map={map}
        color="#ffffff"
        metalness={0.08}
        roughness={0.55 - highlight * 0.04}
        envMapIntensity={0.35 + highlight * 0.18}
        transparent={dimmed}
        opacity={dimmed ? 0.55 : 1}
      />
    </mesh>
  )
}

function CardBody({
  faceUp,
  symbol,
  offset,
  highlight,
  textures,
  dualSided = false,
  dimmed = false,
}: {
  faceUp: boolean
  symbol: AstralSymbol
  offset: number
  highlight: number
  textures: Record<AstralSymbol, Texture>
  dualSided?: boolean
  dimmed?: boolean
}) {
  const map = textures[symbol]

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
          color="#e8dcc8"
          metalness={0.12}
          roughness={0.55}
          envMapIntensity={0.35}
          transparent={dimmed}
          opacity={dimmed ? 0.55 : 1}
        />
      </RoundedBox>

      {dualSided ? (
        <>
          <CardFace map={map} highlight={highlight} dimmed={dimmed} />
          <CardBackFace facing="down" />
        </>
      ) : faceUp ? (
        <CardFace map={map} highlight={highlight} dimmed={dimmed} />
      ) : (
        <CardBackFace facing="up" />
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
  const textures = useCardArtTextures()

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

  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const projectClientToPlane = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)
    dragPlane.constant = -(restPosition.current.y + 0.22)
    return raycaster.ray.intersectPlane(dragPlane, dragTarget.current)
  }
  const projectRef = useRef(projectClientToPlane)
  projectRef.current = projectClientToPlane

  useEffect(() => {
    if (phase !== 'dragging') return
    const canvas = gl.domElement

    const onMove = (event: PointerEvent) => {
      const hit = projectRef.current(event.clientX, event.clientY)
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
  }, [phase, gl])

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
      tiltX = MathUtils.clamp(localHover.current.z * 0.16, -0.09, 0.09)
      tiltZ = MathUtils.clamp(-localHover.current.x * 0.2, -0.11, 0.11)
    } else if (!reducedMotion && dragging) {
      const dx = current.position.x - rest.x
      const dz = current.position.z - rest.z
      tiltX = MathUtils.clamp(dz * 0.07, -0.1, 0.1)
      tiltZ = MathUtils.clamp(-dx * 0.09, -0.12, 0.12)
    }
    current.rotation.x = springStep(current.rotation.x, tiltX, delta, 14)
    current.rotation.z = springStep(current.rotation.z, tiltZ, delta, 14)

    const scale = selected || dragging ? 1.045 : hovering ? 1.02 : 1
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
          highlight={
            index === visibleLayers - 1 &&
            (selected || phase === 'hover' || phase === 'dragging')
              ? 1
              : 0
          }
          textures={textures}
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
  dimmed?: boolean
  fromPosition?: readonly [number, number, number]
}

export function SingleCard({
  symbol,
  position,
  faceUp,
  reducedMotion = false,
  highlighted = false,
  dimmed = false,
  fromPosition,
}: SingleCardProps) {
  const group = useRef<Group>(null)
  const flip = useRef(faceUp ? 0 : Math.PI)
  const seeded = useRef(false)
  const textures = useCardArtTextures()

  useFrame((_, delta) => {
    const current = group.current
    if (current === null) return
    if (!seeded.current) {
      if (fromPosition !== undefined) {
        current.position.set(fromPosition[0], fromPosition[1], fromPosition[2])
      }
      seeded.current = true
    }
    const lift = highlighted && !reducedMotion ? 0.06 : 0
    current.position.x = springStep(current.position.x, position[0], delta, 9)
    current.position.y = springStep(
      current.position.y,
      position[1] + lift,
      delta,
      10,
    )
    current.position.z = springStep(current.position.z, position[2], delta, 9)

    const targetFlip = faceUp ? 0 : Math.PI
    flip.current = reducedMotion
      ? targetFlip
      : springStep(flip.current, targetFlip, delta, 7)
    current.rotation.x = flip.current

    const scale = highlighted ? 1.06 : dimmed ? 0.94 : 1
    current.scale.setScalar(springStep(current.scale.x, scale, delta, 11))
  })

  return (
    <group ref={group} position={[...position]}>
      <CardBody
        faceUp={faceUp}
        symbol={symbol}
        offset={0}
        highlight={highlighted ? 1 : 0}
        textures={textures}
        dualSided
        dimmed={dimmed}
      />
    </group>
  )
}
