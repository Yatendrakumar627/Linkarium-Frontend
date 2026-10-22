import { useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import ClusterSystem from './ClusterSystem'
import { getTagColor } from '../../utils'
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
  groupBy = 'collections',
  activeCluster,
  setActiveCluster,
  controlsRef,
  search = '',
}) {
  const [isVisible, setIsVisible] = useState(() => (typeof document !== 'undefined' ? !document.hidden : true))

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = () => setIsVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Group links dynamically by collection OR by tags
  const clusters = useMemo(() => {
    if (groupBy === 'tags') {
      const tagMap = new Map()
      const untaggedLinks = []

      for (const link of mapLinks) {
        const rawTags = Array.isArray(link.tags) ? link.tags.filter(Boolean) : []
        if (rawTags.length === 0) {
          untaggedLinks.push(link)
        } else {
          for (const rawTag of rawTags) {
            const cleanTag = String(rawTag).trim()
            if (!cleanTag) continue
            const key = cleanTag.toLowerCase()
            if (!tagMap.has(key)) {
              tagMap.set(key, {
                key,
                rawName: cleanTag,
                links: [],
              })
            }
            tagMap.get(key).links.push(link)
          }
        }
      }

      const result = []
      const sortedTags = Array.from(tagMap.values()).sort((a, b) => b.links.length - a.links.length)
      for (const item of sortedTags) {
        result.push({
          key: item.key,
          clusterType: 'tag',
          collection: {
            id: item.key,
            name: `#${item.rawName}`,
            rawName: item.rawName,
            color: getTagColor(item.key),
            isTag: true,
          },
          links: item.links,
        })
      }

      if (untaggedLinks.length > 0) {
        result.push({
          key: 'untagged',
          clusterType: 'tag',
          collection: {
            id: 'untagged',
            name: 'Untagged',
            rawName: 'Untagged',
            color: '#64748b',
            isTag: true,
          },
          links: untaggedLinks,
        })
      }

      return result
    }

    // Default: Group links by collection
    const map = new Map()
    for (const link of mapLinks) {
      const key = link.collectionId || 'uncategorized'
      if (!map.has(key)) {
        map.set(key, {
          key,
          clusterType: 'collection',
          collection:
            collections.find((c) => c.id === key) || {
              id: 'uncategorized',
              name: 'Uncategorized',
              color: '#6b7280',
              isTag: false,
            },
          links: [],
        })
      }
      map.get(key).links.push(link)
    }
    return Array.from(map.values())
  }, [mapLinks, collections, groupBy])

  // Calculate positions for clusters to spread them out generously in celestial space
  const clusterData = useMemo(() => {
    const n = clusters.length
    return clusters.map((cluster, i) => {
      let x = 0
      const y = 0
      let z = 0

      if (n > 1) {
        if (n <= 6) {
          const angle = (i / n) * Math.PI * 2
          const radius = Math.max(9, n * 4.4)
          x = Math.cos(angle) * radius
          z = Math.sin(angle) * radius
        } else {
          // Celestial galaxy spiral arrangement for many clusters
          const phi = (1 + Math.sqrt(5)) / 2
          const theta = i * 2 * Math.PI * (1 - 1 / phi)
          const r = Math.sqrt(i + 1) * 7.2 + 5
          x = Math.cos(theta) * r
          z = Math.sin(theta) * r
        }
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
      dpr={[1, 1.5]}
      frameloop={isVisible ? 'always' : 'never'}
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0b0e14']} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 12, 6]} intensity={1.2} />

      {/* Background stars */}
      <Stars radius={50} depth={50} count={2600} factor={4} saturation={0} fade speed={0.8} />

      {/* Render each collection/tag as a solar system */}
      {clusterData.map((data) => (
        <ClusterSystem
          key={data.key}
          collection={data.collection}
          links={data.links}
          position={data.position}
          isActive={activeCluster === data.key}
          onClick={(id) => setActiveCluster(id)}
          search={search}
          isTag={data.collection?.isTag}
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
