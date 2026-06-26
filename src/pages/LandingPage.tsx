import './LandingPage.css'

interface LandingPageProps {
  onLogin: () => void
  onGetStarted: () => void
}

export function LandingPage({ onLogin, onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <span className="landing-logo">Notes</span>
        <button type="button" className="landing-nav-login" onClick={onLogin}>
          Log in
        </button>
      </header>

      <section className="landing-hero">
        <h1>Take notes anywhere. Even offline.</h1>
        <p className="landing-subtitle">
          Write on your phone, your laptop, or both — everything stays in sync the moment
          you&apos;re back online. No sync button, no conflicts, no lost notes.
        </p>
        <div className="landing-cta">
          <button type="button" className="landing-primary-btn" onClick={onGetStarted}>
            Get started — it&apos;s free
          </button>
          <p className="landing-cta-switch">
            Already have an account?{' '}
            <button type="button" className="link-button" onClick={onLogin}>
              Log in
            </button>
          </p>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-feature">
          <h2>Fully offline</h2>
          <p>Create, edit, and delete notes with zero connection, on any device. Nothing waits on a network.</p>
        </div>
        <div className="landing-feature">
          <h2>Always in sync</h2>
          <p>Sync runs automatically the moment a device reconnects — never a manual step, never a wait.</p>
        </div>
        <div className="landing-feature">
          <h2>Nothing ever lost</h2>
          <p>Edit the same note on two offline devices and conflicts resolve deterministically. Lose a device, reinstall the app — your notes come back in full.</p>
        </div>
      </section>

      <section className="landing-highlight">
        <h2>Local-first by design</h2>
        <p>
          Every device keeps a full copy of your notes and reads and writes locally first. The
          server is a durable backup, not a gatekeeper — your notes are always there, online or
          not.
        </p>
      </section>

      <footer className="landing-footer">
        <p>Made with ❤️ by Shiwani</p>
      </footer>
    </div>
  )
}
