import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { IconFolder, IconBriefcase, IconMovie, IconBrain, IconQuestionMark } from '@tabler/icons-react'

// Helper to determine icon based on collection name
const getCollectionIcon = (name) => {
  const n = name.toLowerCase()
  if (n.includes('work') || n.includes('job')) return <IconBriefcase size={20} />
  if (n.includes('entertainment') || n.includes('movie')) return <IconMovie size={20} />
  if (n.includes('ai') || n.includes('tool')) return <IconBrain size={20} />
  if (n === 'uncategorized') return <IconQuestionMark size={20} />
  return <IconFolder size={20} />
}

export default function ClusterSystem({ collection, links, position, onClick, isActive }) {
  const groupRef = useRef()
  const planetsRef = useRef()

  const color = new THREE.Color(collection?.color || '#3b82f6')
  const name = collection?.name || 'Uncategorized'

  // Pre-calculate orbits
  const orbitData = useMemo(() => {
    return links.map((link, i) => {
      // Using deterministic pseudo-random based on index so it is pure
      const pseudoRandom1 = (Math.sin(i * 12.9898) * 43758.5453) % 1
      const pseudoRandom2 = (Math.cos(i * 78.233) * 43758.5453) % 1
      const pseudoRandom3 = (Math.sin(i * 93.233) * 43758.5453) % 1

      const r1 = pseudoRandom1 - Math.floor(pseudoRandom1)
      const r2 = pseudoRandom2 - Math.floor(pseudoRandom2)
      const r3 = pseudoRandom3 - Math.floor(pseudoRandom3)

      const radius = 1.8 + i * 0.4 + r1 * 0.2 // Staggered orbits
      const speed = (0.2 + r2 * 0.2) * (i % 2 === 0 ? 1 : -1) // Random speed and direction
      const angle = r3 * Math.PI * 2 // Starting angle
      
      // Calculate points for the orbital ring
      const points = []
      for (let j = 0; j <= 64; j++) {
        const theta = (j / 64) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius))
      }
      
      return { link, radius, speed, angle, points }
    })
  }, [links])

  useFrame((state, delta) => {
    if (planetsRef.current) {
      // Rotate the whole planet system slowly
      planetsRef.current.rotation.y += delta * 0.1
    }
    // Hover breathing effect
    if (groupRef.current) {
        const scale = isActive ? 1.1 : 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.02
        groupRef.current.scale.set(scale, scale, scale)
    }
  })

  // Determine fallback letter for favicon
  const getFallback = (url) => {
    try {
      const host = new URL(url).hostname
      return host.replace('www.', '')[0].toUpperCase()
    } catch {
      return 'L'
    }
  }

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick(collection?.id || 'uncategorized'); }}>
      {/* Central Glowing Orb */}
      <Sphere args={[1, 32, 32]}>
        <meshPhysicalMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.8}
          transparent={true}
          opacity={0.4}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </Sphere>
      
      {/* Central Core (Solid) */}
      <Sphere args={[0.4, 32, 32]}>
        <meshBasicMaterial color={color} />
      </Sphere>

      {/* Central Icon Overlay */}
      <Html center zIndexRange={[100, 0]}>
        <div className="cluster-icon-overlay">
          {getCollectionIcon(name)}
        </div>
        <div className="cluster-label">
          <h4>{name}</h4>
          <p>{links.length} links</p>
        </div>
      </Html>

      {/* Orbital Rings and Planets */}
      <group ref={planetsRef} rotation={[Math.PI * 0.1, 0, Math.PI * 0.05]}>
        {orbitData.map((data, i) => {
          // Calculate planet position
          const x = Math.cos(data.angle) * data.radius
          const z = Math.sin(data.angle) * data.radius

          // Try to get favicon, fallback to empty
          const faviconUrl = data.link.url ? `https://www.google.com/s2/favicons?domain=${data.link.url}&sz=32` : null

          return (
            <group key={data.link._id || i}>
              {/* Ring */}
              <Line 
                points={data.points} 
                color={color} 
                lineWidth={1} 
                transparent 
                opacity={0.2} 
              />
              
              {/* Planet */}
              <group 
                position={[x, 0, z]} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if(data.link.url) window.open(data.link.url, '_blank', 'noopener,noreferrer') 
                }}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
              >
                <Sphere args={[0.15, 16, 16]}>
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
                </Sphere>
                <Html center zIndexRange={[100, 0]}>
                  <div className="planet-icon-overlay">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="icon" onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.classList.add('fallback'); e.target.parentNode.innerText = getFallback(data.link.url); }} />
                    ) : (
                      <div className="fallback">{getFallback(data.link.url)}</div>
                    )}
                  </div>
                </Html>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}
