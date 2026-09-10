import { IconArrowRight } from '@tabler/icons-react'
import './SplashScreen.css'

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-inner">
        <div className="brand-mark splash-logo">
          <IconArrowRight size={26} stroke={2.5} />
        </div>
        <div className="splash-title">Linkarium</div>
        <div className="splash-subtitle">Entering your universe…</div>
      </div>
    </div>
  )
}