import { useState } from 'react'
import { isOrgAdmin } from '../access'
import { api, type Organization } from '../api'
import { useAuth } from '../auth'
import { useFarm } from '../farm'
import { field, saveForm } from '../format'
import { useLoad } from '../load'
import { Banner, Button, PageHead, TextField } from '../ui'

export function SettingsPage() {
  const { user } = useAuth()
  const { reloadFarms } = useFarm()
  const admin = isOrgAdmin(user)
  const query = useLoad('organization', () => api<Organization>('/api/organization'))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const org = query.data
  return (
    <div className="stack">
      <PageHead title="Organization" lede="This organization holds its own farms. Amounts stay in Rwandan francs." />
      <Banner>{query.error || error}</Banner>
      {saved ? <Banner tone="info">Organization saved.</Banner> : null}
      {org ? (
        <form className="card stack" onSubmit={(event) => {
          if (!admin) {
            event.preventDefault()
            return
          }
          void saveForm(event, setError, setPending, async (data) => {
            await api('/api/organization', {
              method: 'PUT',
              body: JSON.stringify({
                name: field(data, 'name'),
                legalName: field(data, 'legalName'),
                registrationNumber: field(data, 'registrationNumber'),
                timezone: field(data, 'timezone'),
              }),
            })
            setSaved(true)
            await reloadFarms()
            query.reload()
          })
        }}>
          <TextField label="Name" name="name" required defaultValue={org.name} />
          <TextField label="Legal name" name="legalName" defaultValue={org.legalName} />
          <TextField label="Registration number" name="registrationNumber" defaultValue={org.registrationNumber} />
          <TextField label="Timezone" name="timezone" required defaultValue={org.timezone} />
          {admin ? <Button type="submit" tone="primary" disabled={pending}>{pending ? 'Saving…' : 'Save organization'}</Button> : <p className="muted">Only an organization administrator can change these details.</p>}
        </form>
      ) : null}
    </div>
  )
}
