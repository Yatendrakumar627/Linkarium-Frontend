import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import SplashScreen from './components/common/SplashScreen'

const AuthPage = lazy(() => import('./components/auth/AuthPage'))
const AppShell = lazy(() => import('./components/layout/AppShell'))

export default function App() {
  const status = useAuthStore((s) => s.status)
  const bootstrap = useAuthStore((s) => s.bootstrap)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  if (status === 'idle' || status === 'checking') {
    return <SplashScreen />
  }

  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route
          path="/auth"
          element={status === 'authenticated' ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route path="/" element={status === 'authenticated' ? <AppShell /> : <Navigate to="/auth" replace />} />
        <Route
          path="*"
          element={<Navigate to={status === 'authenticated' ? '/' : '/auth'} replace />}
        />
      </Routes>
    </Suspense>
  )
}