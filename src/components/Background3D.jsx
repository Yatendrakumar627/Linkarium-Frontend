import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Points, PointMaterial, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef, useState, useEffect } from 'react'
import './Background3D.css'

// ---- Subtle parallax camera that follows the pointer ----
function Rig({ enabled = true }) {
  useFrame((state, delta) => {
    if (!enabled) return
    const cam = state.camera
    cam.position.x = THREE.MathUtils.damp(cam.position.x, state.pointer.x * 0.7, 1.6, delta)
    cam.position.y = THREE.MathUtils.damp(cam.position.y, state.pointer.y * 0.45 + 0.5, 1.6, delta)
    cam.lookAt(0, 0, 0)
  })
  return null
}

// ---- Starfield particles ----
const STAR_POSITIONS = (() => {
  const n = 450
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 14 + Math.random() * 14
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    arr[i * 3 + 2] = r * Math.cos(phi) - 4
  }
  return arr
})()

function AmbientStars() {
  return (
    <Points positions={STAR_POSITIONS} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#8f93c9" size={0.03} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </Points>
  )
}

// ---- Floating translucent glass panels ----
function GlassPanel({ position, rotation, color, seed }) {
  const ref = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    ref.current.rotation.x = rotation[0] + Math.sin(t * 0.2 + seed) * 0.08
    ref.current.rotation.y = rotation[1] + Math.cos(t * 0.16 + seed) * 0.08
  })
  return (
    <Float speed={0.7} rotationIntensity={0.2} floatIntensity={0.6}>
      <RoundedBox ref={ref} args={[1.8, 2.4, 0.12]} radius={0.14} position={position}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.1}
          metalness={0.2}
          roughness={0.5}
          emissive={color}
          emissiveIntensity={0.06}
          depthWrite={false}
        />
      </RoundedBox>
    </Float>
  )
}

function AmbientScene({ reducedMotion = false }) {
  const panels = useMemo(
    () =>
      [
        { position: [-9, 3.4, -6], rotation: [0.2, 0.5, 0], color: '#6d5bd0', seed: 0 },
        { position: [7.5, 2.6, -8], rotation: [-0.25, -0.4, 0.1], color: '#5b6bcd', seed: 2 },
        { position: [-8, -3.2, -7], rotation: [-0.1, -0.6, 0.1], color: '#6455c8', seed: 6 },
        { position: [3.5, -4.4, -8], rotation: [-0.15, 0.35, 0], color: '#4f729f', seed: 10 },
      ].map((p, i) => ({ ...p, key: i })),
    []
  )
  return (
    <>
      <AmbientStars />
      {panels.map((p) => (
        <GlassPanel key={p.key} position={p.position} rotation={p.rotation} color={p.color} seed={p.seed} />
      ))}
      <ambientLight intensity={0.5} />
      <pointLight position={[8, 8, 6]} intensity={0.8} color="#8b5cf6" />
      <pointLight position={[-10, -6, 4]} intensity={0.55} color="#38bdf8" />
      <Rig enabled={!reducedMotion} />
    </>
  )
}

export default function Background3D() {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  return (
    <div className="scene-canvas">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.5, 10], fov: 50 }}
      >
        <AmbientScene reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}
