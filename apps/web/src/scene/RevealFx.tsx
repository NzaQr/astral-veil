import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, type Mesh, type MeshBasicMaterial } from 'three'
import { springStep } from './proceduralTextures'

/** Subtle winner accent — no particles. */
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

  useFrame((_, delta) => {
    const mesh = ring.current
    if (mesh === null) return
    const mat = mesh.material as MeshBasicMaterial
    const targetOpacity = active && !reducedMotion ? 0.22 : 0
    mat.opacity = springStep(mat.opacity, targetOpacity, delta, 6)
  })

  const x =
    recipientSide === 'left' ? -1.0 : recipientSide === 'right' ? 1.0 : 0

  return (
    <mesh
      ref={ring}
      position={[x, 0.004, 0.25]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={active}
    >
      <ringGeometry args={[0.55, 0.72, 48]} />
      <meshBasicMaterial
        color="#d4b07a"
        transparent
        opacity={0}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}
