import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/useAuth'

export function ForgotPassword({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: resetError } = await requestPasswordReset(email)
    setSubmitting(false)
    if (resetError) {
      setError(resetError)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-form">
        <h1>Check your email</h1>
        <p>We sent a password reset link to {email}.</p>
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Back to log in
        </button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Reset password</h1>

      {error && <p className="auth-error">{error}</p>}

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

      <button type="submit" className="auth-submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="auth-switch">
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Back to log in
        </button>
      </p>
    </form>
  )
}
