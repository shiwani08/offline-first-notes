import { useAuth } from './contexts/useAuth'
import { AuthPage } from './pages/AuthPage'
import { ResetPassword } from './pages/ResetPassword'
import './App.css'

function App() {
  const { session, user, loading, passwordRecovery, signOut } = useAuth()

  if (loading) {
    return (
      <section id="center">
        <p>Loading…</p>
      </section>
    )
  }

  // The recovery link logs the user in with a temporary session, but they
  // must set a new password before seeing anything else.
  if (passwordRecovery) {
    return <ResetPassword />
  }

  // Auth gate: nothing past this point renders until there's a valid session.
  // The real enforcement is Supabase RLS on the data tables — this just keeps
  // the UI from showing protected content while logged out.
  if (!session) {
    return <AuthPage />
  }

  return (
    <section id="center">
      <h1>Welcome{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ''}</h1>
      <p>Signed in as {user?.email}</p>
      <button type="button" className="counter" onClick={signOut}>
        Log out
      </button>
    </section>
  )
}

export default App
