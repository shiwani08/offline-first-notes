import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/useAuth'

interface LoginProps {
  onSwitchToSignup: () => void
  onForgotPassword: () => void
}

export function Login({ onSwitchToSignup, onForgotPassword }: LoginProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) setError(signInError)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Log in</h1>

      {error && <p className="auth-error">{error}</p>}

      <label className="auth-field">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="Enter your email"
          required
        />
      </label>

      <label className="auth-field">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </label>

      <button type="submit" className="auth-submit" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </button>

      <button type="button" className="link-button" onClick={onForgotPassword}>
        Forgot password?
      </button>

      <p className="auth-switch">
        Don&apos;t have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitchToSignup}>
          Sign up
        </button>
      </p>
    </form>
  )
}
