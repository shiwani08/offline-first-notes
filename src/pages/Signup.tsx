import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/useAuth'

export function Signup({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signUp } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signUpError, needsEmailConfirmation } = await signUp(email, password, displayName)
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError)
      return
    }
    if (needsEmailConfirmation) setConfirmationSent(true)
  }

  if (confirmationSent) {
    return (
      <div className="auth-form">
        <h1>Check your email</h1>
        <p>We sent a confirmation link to {email}. Confirm it, then log in.</p>
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Back to log in
        </button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Sign up</h1>

      {error && <p className="auth-error">{error}</p>}

      <label className="auth-field">
        Name
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete="name"
          required
        />
      </label>

      <label className="auth-field">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="auth-field">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </label>

      <button type="submit" className="auth-submit" disabled={submitting}>
        {submitting ? 'Signing up…' : 'Sign up'}
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Log in
        </button>
      </p>
    </form>
  )
}
