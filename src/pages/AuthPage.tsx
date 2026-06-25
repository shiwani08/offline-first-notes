import { useState } from 'react'
import { Login } from './Login'
import { Signup } from './Signup'
import { ForgotPassword } from './ForgotPassword'
import './AuthPage.css'

type Mode = 'login' | 'signup' | 'forgot-password'

interface AuthPageProps {
  initialMode?: Mode
  onBack?: () => void
}

export function AuthPage({ initialMode = 'login', onBack }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>(initialMode)

  return (
    <div className="auth-page">
      {onBack && (
        <button type="button" className="auth-back-btn" onClick={onBack}>
          ← Back
        </button>
      )}
      {mode === 'login' && (
        <Login
          onSwitchToSignup={() => setMode('signup')}
          onForgotPassword={() => setMode('forgot-password')}
        />
      )}
      {mode === 'signup' && <Signup onSwitchToLogin={() => setMode('login')} />}
      {mode === 'forgot-password' && <ForgotPassword onSwitchToLogin={() => setMode('login')} />}
    </div>
  )
}
