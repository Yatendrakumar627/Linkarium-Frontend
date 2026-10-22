import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  IconFolder,
  IconBriefcase,
  IconMovie,
  IconBrain,
  IconQuestionMark,
  IconHash,
  IconTag,
} from '@tabler/icons-react'
import { safeUrl, faviconUrl, hostOf } from '../../utils'

// Helper to determine icon based on collection or tag
const getCollectionIcon = (name, isTag = false) => {
  if (isTag) return <IconTag size={20} />
  const n = name.toLowerCase()
  if (n.includes('work') || n.includes('job')) return <IconBriefcase size={22} />
  if (n.includes('entertainment') || n.includes('movie')) return <IconMovie size={22} />
  if (n.includes('ai') || n.includes('tool')) return <IconBrain size={22} />
  if (n === 'uncategorized') return <IconQuestionMark size={22} />
  return <IconFolder size={22} />
}

// Individual Planet with safe fallback and no 404 errors
function PlanetNode({ link, isOverflow, overflowCount, isMatch, isDimmed, colorHex, onOpenSheet, isTag = false }) {
  const [imgFailed, setImgFailed] = useState(false)
  const host = hostOf(link?.url) || 'link'
  const initial = (link?.title || host || 'L')[0].toUpperCase()
  const icon = !imgFailed && link?.url ? faviconUrl(link.url) : null

  if (isOverflow) {
    return (
      <div
        className="planet-overflow-badge"
        onClick={(e) => {
          e.stopPropagation()
          onOpenSheet()
        }}
        title={`View all ${overflowCount} more links in this ${isTag ? 'tag' : 'collection'}`}
      >
        <span>+{overflowCount}</span>
      </div>
    )
  }

  return (
    <div
      className={`planet-icon-overlay ${isMatch ? 'match' : ''} ${isDimmed ? 'dimmed' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        const target = safeUrl(link.url)
        if (target) window.open(target, '_blank', 'noopener,noreferrer')
      }}
      title={link.title || link.url}
    >
      {icon ? (
        <img
          src={icon}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="planet-fallback" style={{ background: colorHex || '#8b5cf6' }}>
          {initial}
        </span>
      )}
    </div>
  )
}

// Structured orbital bands for balanced, collision-free celestial layout
const ORBIT_BANDS = [
  { radius: 2.2, capacity: 4 },
  { radius: 3.4, capacity: 6 },
  { radius: 4.8, capacity: 8 },
  { radius: 6.2, capacity: 10 },
]

export default function ClusterSystem({
  collection,
  links = [],
  position = [0, 0, 0],
  onClick,
  isActive = false,
  search = '',
  isTag = false,
}) {
  const groupRef = useRef()
  const planetsRef = useRef()

  const colorHex = collection?.color || '#3b82f6'
  const color = useMemo(() => new THREE.Color(colorHex), [colorHex])
  const name = collection?.name || 'Uncategorized'

  const query = (search || '').trim().toLowerCase()
  const isSearching = query.length > 0

  // Calculate search matches for this cluster
  const matchInfo = useMemo(() => {
    let matchCount = 0
    const map = new Map()

    for (const link of links) {
      if (!isSearching) {
        map.set(link._id, true)
      } else {
        const matches = Boolean(
          (link.title && link.title.toLowerCase().includes(query)) ||
          (link.url && link.url.toLowerCase().includes(query)) ||
          (link.description && link.description.toLowerCase().includes(query)) ||
          (link.tags && link.tags.some((t) => t.toLowerCase().includes(query)))
        )
        if (matches) matchCount++
        map.set(link._id, matches)
      }
    }

    return { matchCount, map }
  }, [links, query, isSearching])

  // Distribute links deterministically across bands
  const { orbitData, activeBandRadii } = useMemo(() => {
    // Prioritize search matches, favorites, and recent visits
    const sorted = [...links].sort((a, b) => {
      const aMatch = matchInfo.map.get(a._id) ? 1 : 0
      const bMatch = matchInfo.map.get(b._id) ? 1 : 0
      if (aMatch !== bMatch) return bMatch - aMatch
      if (a.favorite !== b.favorite) return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)
      return (b.visitCount || 0) - (a.visitCount || 0)
    })

    const totalCapacity = 28
    const hasOverflow = sorted.length > totalCapacity
    const visibleCount = Math.min(sorted.length, totalCapacity)
    const overflowNumber = hasOverflow ? sorted.length - (totalCapacity - 1) : 0

    const items = []
    let linkIdx = 0
    const usedBands = new Set()

    for (let b = 0; b < ORBIT_BANDS.length && linkIdx < visibleCount; b++) {
      const band = ORBIT_BANDS[b]
      const remaining = visibleCount - linkIdx
      const countOnBand = Math.min(band.capacity, remaining)
      if (countOnBand <= 0) break

      usedBands.add(band.radius)
      const bandPhase = (b * Math.PI) / 3 // Stagger rotation between rings

      for (let j = 0; j < countOnBand; j++) {
        const angle = (j / countOnBand) * Math.PI * 2 + bandPhase
        const isOverflowNode = hasOverflow && b === ORBIT_BANDS.length - 1 && j === countOnBand - 1
        const link = sorted[linkIdx]

        items.push({
          link,
          radius: band.radius,
          angle,
          isOverflow: isOverflowNode,
          overflowCount: overflowNumber,
          isMatch: isSearching && link ? matchInfo.map.get(link._id) : false,
          isDimmed: isSearching && link ? !matchInfo.map.get(link._id) : false,
          x: Math.cos(angle) * band.radius,
          z: Math.sin(angle) * band.radius,
          y: Math.sin(angle * 2) * 0.12,
        })
        linkIdx++
      }
    }

    return {
      orbitData: items,
      activeBandRadii: Array.from(usedBands),
    }
  }, [links, matchInfo, isSearching])

  // Points for the clean orbital rings (only 3-4 rings total!)
  const ringLines = useMemo(() => {
    return activeBandRadii.map((radius) => {
      const pts = []
      for (let j = 0; j <= 64; j++) {
        const theta = (j / 64) * Math.PI * 2
        pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius))
      }
      return { radius, pts }
    })
  }, [activeBandRadii])

  useFrame((state, delta) => {
    if (planetsRef.current) {
      planetsRef.current.rotation.y += delta * 0.08
    }
    if (groupRef.current) {
      const scale = isActive ? 1.08 : 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.015
      groupRef.current.scale.set(scale, scale, scale)
    }
  })

  const clusterId = collection?.id || 'uncategorized'
  const isClusterDimmed = isSearching && matchInfo.matchCount === 0

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick(clusterId)
      }}
    >
      {/* Central Glowing Orb */}
      <Sphere args={[1, 32, 32]}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isClusterDimmed ? 0.2 : 0.8}
          transparent={true}
          opacity={isClusterDimmed ? 0.2 : 0.45}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </Sphere>

      {/* Central Core (Solid) */}
      <Sphere args={[0.38, 32, 32]}>
        <meshBasicMaterial color={color} transparent opacity={isClusterDimmed ? 0.3 : 0.9} />
      </Sphere>

      {/* Central Icon Overlay */}
      <Html center zIndexRange={[100, 0]}>
        <div
          className={`cluster-icon-overlay ${isClusterDimmed ? 'dimmed' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onClick(clusterId)
          }}
        >
          {getCollectionIcon(name, isTag || collection?.isTag)}
        </div>
        <div className={`cluster-label ${isClusterDimmed ? 'dimmed' : ''}`}>
          <h4>{name}</h4>
          <p>
            {isSearching
              ? `${matchInfo.matchCount} of ${links.length} match`
              : `${links.length} link${links.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </Html>

      {/* Orbital Rings and Planets */}
      <group ref={planetsRef} rotation={[Math.PI * 0.08, 0, Math.PI * 0.04]}>
        {/* Render discrete orbital rings */}
        {ringLines.map((ring) => (
          <Line
            key={ring.radius}
            points={ring.pts}
            color={color}
            lineWidth={1}
            transparent
            opacity={isClusterDimmed ? 0.06 : 0.18}
          />
        ))}

        {/* Render planets positioned cleanly on orbits */}
        {orbitData.map((data, i) => (
          <group
            key={data.link?._id || `overflow-${i}`}
            position={[data.x, data.y, data.z]}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto'
            }}
          >
            <Sphere args={[0.15, 16, 16]}>
              <meshBasicMaterial
                color={data.isMatch ? '#a5b4fc' : '#ffffff'}
                transparent
                opacity={data.isDimmed ? 0.04 : 0.15}
              />
            </Sphere>

            <Html center zIndexRange={[100, 0]}>
              <PlanetNode
                link={data.link}
                isOverflow={data.isOverflow}
                overflowCount={data.overflowCount}
                isMatch={data.isMatch}
                isDimmed={data.isDimmed}
                colorHex={colorHex}
                onOpenSheet={() => onClick(clusterId)}
                isTag={isTag || collection?.isTag}
              />
            </Html>
          </group>
        ))}
      </group>
    </group>
  )
}
