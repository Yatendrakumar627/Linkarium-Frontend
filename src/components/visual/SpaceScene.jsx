import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import ClusterSystem from './ClusterSystem'
import * as THREE from 'three'

export default function SpaceScene({ mapLinks, collections, activeCluster, setActiveCluster, controlsRef }) {
  
  // Group links by collection
  const clusters = useMemo(() => {
    const map = new Map()
    for (const link of mapLinks) {
      const key = link.collectionId || 'uncategorized'
      if (!map.has(key)) {
        map.set(key, { 
          key, 
          collection: collections.find(c => c.id === key) || { id: 'uncategorized', name: 'Uncategorized', color: '#6b7280' },
          links: [] 
        })
      }
      map.get(key).links.push(link)
    }
    return Array.from(map.values())
  }, [mapLinks, collections])

  // Calculate positions for clusters to spread them out
  const clusterData = useMemo(() => {
    const n = clusters.length
    return clusters.map((cluster, i) => {
      // Very basic spread: arrange in a circle
      let x = 0, y = 0, z = 0
      
      if (n > 1) {
        const angle = (i / n) * Math.PI * 2
        const radius = 8 + (i % 2 === 0 ? 2 : 0) // alternate radius slightly
        x = Math.cos(angle) * radius
        z = Math.sin(angle) * radius
      }

      return {
        ...cluster,
        position: [x, y, z]
      }
    })
  }, [clusters])

  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
    >
      <color attach="background" args={['#0b0e14']} />
      
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Background stars */}
      <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      {/* Render each collection as a solar system */}
      {clusterData.map((data) => (
        <ClusterSystem
          key={data.key}
          collection={data.collection}
          links={data.links}
          position={data.position}
          isActive={activeCluster === data.key}
          onClick={(id) => setActiveCluster(id)}
        />
      ))}

      {/* Interaction Controls */}
      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={40}
      />
    </Canvas>
  )
}
