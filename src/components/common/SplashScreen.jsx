import { useEffect, useState } from 'react'
import { IconArrowRight, IconRefresh } from '@tabler/icons-react'
import './SplashScreen.css'

export default function SplashScreen() {
  const [slowState, setSlowState] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setSlowState(1), 3500)
    const t2 = setTimeout(() => setSlowState(2), 12000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="splash-screen">
      <div className="splash-inner">
        <div className="brand-mark splash-logo">
          <IconArrowRight size={26} stroke={2.5} />
        </div>
        <div className="splash-title">Linkarium</div>
        <div className="splash-subtitle">
          {slowState === 0 && 'Entering your universe…'}
          {slowState === 1 && 'Waking up secure server…'}
          {slowState === 2 && 'Cloud server is spinning up, almost ready…'}
        </div>

        {slowState === 2 && (
          <button
            type="button"
            className="splash-retry-btn"
            onClick={() => {
              window.location.href = '/auth'
            }}
          >
            <IconRefresh size={14} />
            <span>Go to Sign In</span>
          </button>
        )}
      </div>
    </div>
  )
}