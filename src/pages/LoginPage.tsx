import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { saveForm } from '../format'
import { ThemeSwitch } from '../theme'
import { Banner, Button, TextField } from '../ui'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [apiUp, setApiUp] = useState<boolean | null>(null)

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  useEffect(() => {
    api<{ status: string }>('/api/health')
      .then(() => setApiUp(true))
      .catch(() => setApiUp(false))
  }, [])

  return (
    <div className="gate">
      <div className="gate-theme"><ThemeSwitch /></div>
      <aside className="gate-aside">
        <div>
          <strong>Farm desk</strong>
          <h1>The herd, the shift, the stock.</h1>
          <p>Daily work for your organization and its cattle farms. Every amount is recorded in Rwandan francs.</p>
        </div>
        <p>Sign in with the account created for your organization.</p>
      </aside>
      <main className="gate-main">
        <form
          className="gate-card stack"
          onSubmit={(event) => {
            void saveForm(event, setError, setPending, async (data) => {
              await signIn(String(data.get('email') ?? ''), String(data.get('password') ?? ''))
            })
          }}
        >
          <div>
            <h2>Sign in</h2>
            <p className="muted">Use the email and password for your farm account.</p>
          </div>
          {apiUp === false ? <Banner>The API is not reachable on port 8080.</Banner> : null}
          <Banner>{error}</Banner>
          <TextField label="Email" name="email" type="email" required placeholder="aline@example.com" />
          <TextField label="Password" name="password" type="password" required />
          <Button type="submit" tone="primary" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</Button>
          <p>Need another organization? <Link to="/setup">Set up an organization</Link></p>
        </form>
      </main>
    </div>
  )
}
