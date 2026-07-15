import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'
import type { AstralSymbol } from '@astral-veil/engine'
import type { RevealStage } from '../game/store'
import { springStep } from './proceduralTextures'

const SYMBOL_GLOW: Record<AstralSymbol, string> = {
  sun: '#e9a83f',
  moon: '#9aa6d0',
  star: '#61d5dc',
}

export function Atmosphere({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  if (quality === 'low') return null
  return (
    <Sparkles
      count={quality === 'high' ? 48 : 24}
      scale={[9, 3.2, 9]}
      size={quality === 'high' ? 2.4 : 1.8}
      speed={0.28}
      opacity={0.35}
      color="#c9b48a"
      position={[0, 1.4, 0]}
    />
  )
}

export function RevealBurst({
  active,
  symbol,
  reducedMotion,
}: {
  active: boolean
  symbol: AstralSymbol | null
  reducedMotion: boolean
}) {
  if (!active || reducedMotion || symbol === null) return null
  return (
    <group position={[0, 0.35, -0.1]}>
      <Sparkles
        count={36}
        scale={[2.2, 1.1, 2.2]}
        size={4}
        speed={0.85}
        opacity={0.85}
        color={SYMBOL_GLOW[symbol]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 48]} />
        <meshBasicMaterial
          color={SYMBOL_GLOW[symbol]}
          transparent
          opacity={0.28}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function PotAura({
  active,
  count,
  reducedMotion,
}: {
  active: boolean
  count: number
  reducedMotion: boolean
}) {
  if (!active || reducedMotion || count <= 0) return null
  return (
    <Sparkles
      count={Math.min(12 + count * 2, 28)}
      scale={[1.4, 0.8, 1.4]}
      size={2.2}
      speed={0.45}
      opacity={0.55}
      color="#d4b07a"
      position={[-2.25, 0.45, -0.18]}
    />
  )
}

export function WinHighlight({
  active,
  recipientSide,
  reducedMotion,
}: {
  active: boolean
  recipientSide: 'left' | 'right' | null
  reducedMotion: boolean
}) {
  const ring = useRef<Mesh>(null)
  const pulse = useRef(0)

  useFrame((_, delta) => {
    const mesh = ring.current
    if (mesh === null) return
    pulse.current += delta
    const mat = mesh.material as MeshBasicMaterial
    const targetOpacity = active && !reducedMotion ? 0.32 : 0
    mat.opacity = springStep(mat.opacity, targetOpacity, delta, 6)
    const breathe = 1 + Math.sin(pulse.current * 2.4) * 0.04
    mesh.scale.setScalar(breathe)
  })

  const x = recipientSide === 'left' ? -1.03 : recipientSide === 'right' ? 1.03 : 0

  return (
    <mesh
      ref={ring}
      position={[x, 0.02, 0.28]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={active}
    >
      <ringGeometry args={[0.62, 0.88, 48]} />
      <meshBasicMaterial
        color="#e8c98e"
        transparent
        opacity={0}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

export function CinematicFocus({
  revealStage,
  reducedMotion,
}: {
  revealStage: RevealStage
  reducedMotion: boolean
}) {
  const group = useRef<Group>(null)
  const color = useMemo(() => new Color('#1a1428'), [])

  useFrame((_, delta) => {
    const current = group.current
    if (current === null) return
    const active =
      !reducedMotion &&
      (revealStage === 'center' || revealStage === 'result')
    current.visible = active
    const scale = springStep(current.scale.x, active ? 1 : 0.4, delta, 5)
    current.scale.setScalar(scale)
  })

  return (
    <group ref={group} position={[0, 0.01, 0]} scale={0.4} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.35, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
