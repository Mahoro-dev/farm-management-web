import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type AuthResponse } from '../api'
import { useAuth } from '../auth'
import { field, saveForm } from '../format'
import { ThemeSwitch } from '../theme'
import { Banner, Button, TextField } from '../ui'

export function SetupPage() {
  const { user, accept } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  return (
    <div className="gate">
      <div className="gate-theme"><ThemeSwitch /></div>
      <aside className="gate-aside">
        <div>
          <strong>Farm desk</strong>
          <h1>Open the books.</h1>
          <p>This creates an organization, its first administrator, and its first farm. Each organization keeps its own farms and herd.</p>
        </div>
        <p>Already set up? <Link to="/login">Sign in</Link></p>
      </aside>
      <main className="gate-main">
        <form
          className="gate-card stack"
          onSubmit={(event) => {
            void saveForm(event, setError, setPending, async (data) => {
              const auth = await api<AuthResponse>('/api/auth/bootstrap', {
                method: 'POST',
                body: JSON.stringify({
                  organizationName: field(data, 'organizationName'),
                  legalName: field(data, 'legalName'),
                  registrationNumber: field(data, 'registrationNumber'),
                  timezone: field(data, 'timezone') ?? 'Africa/Kigali',
                  admin: {
                    fullName: field(data, 'fullName'),
                    email: field(data, 'email'),
                    phone: field(data, 'phone'),
                    password: field(data, 'password'),
                  },
                  farm: {
                    name: field(data, 'farmName'),
                    farmCode: field(data, 'farmCode'),
                    district: field(data, 'district'),
                    province: field(data, 'province'),
                    countryCode: 'RW',
                    timezone: field(data, 'timezone') ?? 'Africa/Kigali',
                  },
                }),
              })
              accept(auth)
            })
          }}
        >
          <div>
            <h2>Set up</h2>
            <p className="muted">Administrator password must be at least 8 characters.</p>
          </div>
          <Banner>{error}</Banner>
          <div className="form-grid">
            <TextField className="span-2" label="Organization" name="organizationName" required />
            <TextField label="Legal name" name="legalName" />
            <TextField label="Registration number" name="registrationNumber" />
            <TextField label="Timezone" name="timezone" defaultValue="Africa/Kigali" />
            <TextField label="Administrator" name="fullName" required />
            <TextField label="Email" name="email" type="email" required />
            <TextField label="Phone" name="phone" />
            <TextField label="Password" name="password" type="password" required minLength={8} />
            <TextField label="First farm" name="farmName" required />
            <TextField label="Farm code" name="farmCode" required placeholder="KGL-01" />
            <TextField label="District" name="district" />
            <TextField label="Province" name="province" />
          </div>
          <Button type="submit" tone="primary" disabled={pending}>{pending ? 'Creating…' : 'Create organization'}</Button>
        </form>
      </main>
    </div>
  )
}
