import { useState } from 'react'
import { Login } from './Login'
import { Signup } from './Signup'
import { ForgotPassword } from './ForgotPassword'
import './AuthPage.css'

type Mode = 'login' | 'signup' | 'forgot-password'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')

  return (
    <div className="auth-page">
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
