import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  TextInput,
  PasswordInput,
  Alert,
} from '@mantine/core'
import {
  IconArrowRight,
  IconWorld,
  IconTags,
  IconFolder,
  IconChartBar,
} from '@tabler/icons-react'
import { useAuthStore } from '../../store/authStore'
import './AuthPage.css'

const Background3D = lazy(() => import('../Background3D'))

export default function AuthPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        if (!name.trim()) throw new Error('Please enter your name.')
        await register({ name, email, password })
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const features = [
    { icon: IconWorld, text: 'Save any link in one click and watch it appear in your visual universe.' },
    { icon: IconFolder, text: 'Organize links into collections, tag them, and favorite what matters.' },
    { icon: IconTags, text: 'Search, sort and filter everything instantly.' },
    { icon: IconChartBar, text: 'Track visits, recently added and recently visited, plus basic analytics.' },
  ]

  return (
    <div className="auth-page">
      <Suspense fallback={null}>
        <Background3D />
      </Suspense>
      <div className="scene-underlay" />

      <div className="auth-stage">
        {/* Brand side */}
        <div className="auth-brand">
          <div className="auth-brand-head">
            <div className="brand-mark">
              <IconArrowRight size={22} stroke={2.5} />
            </div>
            <span className="auth-brand-name">Linkarium</span>
          </div>
          <h1 className="fade-up auth-brand-title">
            Your universe of links,
            <br />
            <span className="gradient-text">beautifully organized.</span>
          </h1>
          <p className="auth-brand-tagline">
            A beautiful visual bookmarks manager with collections, tags, analytics and one-click saves.
          </p>
          <div className="auth-features">
            {features.map((f) => (
              <div key={f.text} className="auth-feature">
                <div className="brand-mark auth-feature-icon">
                  <f.icon size={15} />
                </div>
                <span className="auth-feature-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="glass fade-up auth-card">
          <div className="auth-card-head">
            <div className="brand-mark">
              <IconArrowRight size={20} stroke={2.5} />
            </div>
            <div>
              <div className="auth-card-title">
                {mode === 'login' ? 'Welcome back' : 'Create your universe'}
              </div>
              <div className="auth-card-subtitle">
                {mode === 'login' ? 'Sign in to Linkarium' : 'Free forever. No credit card.'}
              </div>
            </div>
          </div>

          {error && (
            <Alert color="red" variant="light" className="auth-error">
              {error}
            </Alert>
          )}

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <TextInput
                label="Name"
                placeholder="Ada Lovelace"
                required
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
            )}
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Button type="submit" size="md" fullWidth loading={busy} className="auth-submit gradient-btn">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                New to Linkarium?{' '}
                <a
                  href="#"
                  className="auth-switch-link"
                  onClick={(e) => {
                    e.preventDefault()
                    switchMode('register')
                  }}
                >
                  Create an account
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a
                  href="#"
                  className="auth-switch-link"
                  onClick={(e) => {
                    e.preventDefault()
                    switchMode('login')
                  }}
                >
                  Sign in
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}