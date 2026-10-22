import { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import ClusterSystem from './ClusterSystem'
import * as THREE from 'three'

function CameraController({ activeCluster, clusterData, controlsRef }) {
  useFrame(() => {
    if (!controlsRef?.current) return
    if (activeCluster) {
      const targetCluster = clusterData.find((c) => c.key === activeCluster)
      if (targetCluster) {
        const [tx, ty, tz] = targetCluster.position
        controlsRef.current.target.lerp(new THREE.Vector3(tx, ty, tz), 0.05)
      }
    } else {
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.05)
    }
  })
  return null
}

export default function SpaceScene({
  mapLinks = [],
  collections = [],
  activeCluster,
  setActiveCluster,
  controlsRef,
  search = '',
}) {
  // Group links by collection
  const clusters = useMemo(() => {
    const map = new Map()
    for (const link of mapLinks) {
      const key = link.collectionId || 'uncategorized'
      if (!map.has(key)) {
        map.set(key, {
          key,
          collection:
            collections.find((c) => c.id === key) || {
              id: 'uncategorized',
              name: 'Uncategorized',
              color: '#6b7280',
            },
          links: [],
        })
      }
      map.get(key).links.push(link)
    }
    return Array.from(map.values())
  }, [mapLinks, collections])

  // Calculate positions for clusters to spread them out generously
  const clusterData = useMemo(() => {
    const n = clusters.length
    return clusters.map((cluster, i) => {
      let x = 0
      const y = 0
      let z = 0

      if (n > 1) {
        const angle = (i / n) * Math.PI * 2
        // Generous spacing so orbital rings never collide
        const radius = Math.max(9, n * 4.5)
        x = Math.cos(angle) * radius
        z = Math.sin(angle) * radius
      }

      return {
        ...cluster,
        position: [x, y, z],
      }
    })
  }, [clusters])

  return (
    <Canvas
      camera={{ position: [0, 6, 16], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
    >
      <color attach="background" args={['#0b0e14']} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 12, 6]} intensity={1.2} />

      {/* Background stars */}
      <Stars radius={50} depth={50} count={2600} factor={4} saturation={0} fade speed={0.8} />

      {/* Render each collection as a solar system */}
      {clusterData.map((data) => (
        <ClusterSystem
          key={data.key}
          collection={data.collection}
          links={data.links}
          position={data.position}
          isActive={activeCluster === data.key}
          onClick={(id) => setActiveCluster(id)}
          search={search}
        />
      ))}

      {/* Smooth camera focus */}
      <CameraController
        activeCluster={activeCluster}
        clusterData={clusterData}
        controlsRef={controlsRef}
      />

      {/* Interaction Controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={2}
        maxDistance={45}
      />
    </Canvas>
  )
}
