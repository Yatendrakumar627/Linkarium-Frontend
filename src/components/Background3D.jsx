import React, { Component, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Points, PointMaterial, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import './Background3D.css'

// Cached WebGL availability check to avoid creating un-freed test contexts on every re-render
let _isWebGLCached = null
function isWebGLAvailable() {
  if (typeof window === 'undefined') return false
  if (_isWebGLCached !== null) return _isWebGLCached
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    _isWebGLCached = Boolean(window.WebGLRenderingContext && gl)
    // Clean up test context immediately
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext?.()
    }
    return _isWebGLCached
  } catch {
    _isWebGLCached = false
    return false
  }
}

// Error Boundary to prevent 3D canvas failures from crashing the auth or main views
class Background3DErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.warn('[Background3D] 3D canvas deactivated gracefully:', error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

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

// ---- Starfield particles (optimized count for 60fps across all GPUs) ----
const STAR_POSITIONS = (() => {
  const n = 160
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
    if (!ref.current) return
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
        { position: [-9, 3.4, -6], rotation: [0.2, 0.5, 0], color: '#6a18b8', seed: 0 },
        { position: [7.5, 2.6, -8], rotation: [-0.25, -0.4, 0.1], color: '#00e5ff', seed: 2 },
        { position: [-8, -3.2, -7], rotation: [-0.1, -0.6, 0.1], color: '#3b0a6b', seed: 6 },
        { position: [3.5, -4.4, -8], rotation: [-0.15, 0.35, 0], color: '#00b4d8', seed: 10 },
      ].map((p, i) => ({ ...p, key: i })),
    []
  )
  return (
    <>
      <AmbientStars />
      {panels.map((p) => (
        <GlassPanel key={p.key} position={p.position} rotation={p.rotation} color={p.color} seed={p.seed} />
      ))}
      <ambientLight intensity={0.4} />
      <pointLight position={[8, 8, 6]} intensity={0.85} color="#6a18b8" />
      <pointLight position={[-10, -6, 4]} intensity={0.65} color="#00e5ff" />
      <Rig enabled={!reducedMotion} />
    </>
  )
}

function Background3DInner() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  })
  const [isVisible, setIsVisible] = useState(() => (typeof document !== 'undefined' ? !document.hidden : true))
  const [isScrolling, setIsScrolling] = useState(false)
  const glRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(Boolean(mq.matches))
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Suspend rendering completely when browser tab is inactive or hidden
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = () => setIsVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Temporarily pause Three.js rendering during active scroll bursts to dedicate 100% GPU to 60fps DOM scrolling
  useEffect(() => {
    if (typeof window === 'undefined') return
    let timeoutId = null
    const handleScroll = () => {
      setIsScrolling(true)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setIsScrolling(false), 150)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Explicitly dispose WebGL context on unmount so HMR and page transitions don't exceed the browser's context limit
  useEffect(() => {
    return () => {
      if (glRef.current) {
        try {
          glRef.current.dispose?.()
          glRef.current.forceContextLoss?.()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  // Skip heavy 3D canvas on small mobile devices (screen width < 768px) where it's obscured and wastes battery
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Allow disabling 3D Canvas via environment variable (e.g. VITE_ENABLE_3D_BACKGROUND=false)
  const is3DEnabledByEnv = import.meta.env.VITE_ENABLE_3D_BACKGROUND !== 'false'

  if (!is3DEnabledByEnv || isMobile || !isWebGLAvailable()) {
    return null
  }

  return (
    <div className="scene-canvas">
      <Canvas
        dpr={[1, 1.25]}
        frameloop={isVisible && !isScrolling ? 'always' : 'never'}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0.5, 10], fov: 50 }}
        onCreated={({ gl }) => {
          glRef.current = gl
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            console.warn('[Background3D] WebGL context lost; recovering gracefully.')
          })
        }}
      >
        <AmbientScene reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}

export default function Background3D() {
  return (
    <Background3DErrorBoundary>
      <Background3DInner />
    </Background3DErrorBoundary>
  )
}

