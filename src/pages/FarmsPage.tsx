import { useState } from 'react'
import { isOrgAdmin } from '../access'
import { allPages, api, type Assignment, type Farm, type Role, type User } from '../api'
import { useAuth } from '../auth'
import { useFarm } from '../farm'
import { checked, field, formatWhen, saveForm } from '../format'
import { useLoad } from '../load'
import { Banner, Button, CheckField, Empty, FormFooter, Modal, PageHead, TextField } from '../ui'

export function FarmsPage() {
  const { user } = useAuth()
  const { farms, reloadFarms, error } = useFarm()
  const admin = isOrgAdmin(user)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Farm | null>(null)
  const [staff, setStaff] = useState<Farm | null>(null)
  return (
    <div className="stack">
      <PageHead title="Farms" lede="Assignments decide who can work on each farm. An organization admin can reach every farm." action={admin ? <Button tone="primary" onClick={() => setOpen(true)}>Add farm</Button> : null} />
      <Banner>{error}</Banner>
      {farms.length === 0 ? <Empty title="No farms yet">Add the first farm to start recording animals.</Empty> : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>District</th><th>Province</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {farms.map((farm) => (
                <tr key={farm.id}>
                  <td>{farm.farmCode}</td>
                  <td>{farm.name}</td>
                  <td>{farm.district || '—'}</td>
                  <td>{farm.province || '—'}</td>
                  <td>{farm.active ? 'Yes' : 'No'}</td>
                  <td className="row-actions">
                    <Button onClick={() => setStaff(farm)}>Staff</Button>
                    {admin ? <Button onClick={() => setEdit(farm)}>Edit</Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? <FarmForm onClose={() => setOpen(false)} onSaved={reloadFarms} /> : null}
      {edit ? <FarmForm farm={edit} onClose={() => setEdit(null)} onSaved={reloadFarms} /> : null}
      {staff ? <StaffFarm farm={staff} admin={admin} onClose={() => setStaff(null)} /> : null}
    </div>
  )
}

function FarmForm({ farm, onClose, onSaved }: { farm?: Farm; onClose: () => void; onSaved: () => Promise<void> }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={farm ? 'Edit farm' : 'Add farm'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          const shared = {
            name: field(data, 'name'),
            farmCode: field(data, 'farmCode'),
            locationText: field(data, 'locationText'),
            district: field(data, 'district'),
            province: field(data, 'province'),
            countryCode: field(data, 'countryCode') ?? 'RW',
            timezone: field(data, 'timezone') ?? 'Africa/Kigali',
          }
          await api(farm ? `/api/farms/${farm.id}` : '/api/farms', {
            method: farm ? 'PUT' : 'POST',
            body: JSON.stringify(farm ? { ...shared, active: checked(data, 'active') } : shared),
          })
          await onSaved()
          onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <div className="form-grid">
          <TextField label="Name" name="name" required defaultValue={farm?.name} />
          <TextField label="Farm code" name="farmCode" required defaultValue={farm?.farmCode} />
          <TextField label="District" name="district" defaultValue={farm?.district} />
          <TextField label="Province" name="province" defaultValue={farm?.province} />
          <TextField className="span-2" label="Location" name="locationText" defaultValue={farm?.locationText} />
          <TextField label="Country" name="countryCode" defaultValue={farm?.countryCode || 'RW'} required={Boolean(farm)} />
          <TextField label="Timezone" name="timezone" defaultValue={farm?.timezone || 'Africa/Kigali'} required={Boolean(farm)} />
          {farm ? <CheckField name="active" label="Active" defaultChecked={farm.active} /> : null}
        </div>
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function StaffFarm({ farm, admin, onClose }: { farm: Farm; admin: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const assignments = useLoad(`assign:${farm.id}`, () => api<Assignment[]>(`/api/farms/${farm.id}/assignments`))
  const users = useLoad(admin ? 'users-for-assign' : 'skip-users', () => admin ? allPages<User>('/api/users') : Promise.resolve([]))
  const roles = useLoad('roles', () => api<Role[]>('/api/roles'))
  return (
    <Modal title={`Staff · ${farm.name}`} wide>
      <Banner>{assignments.error || error}</Banner>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Person</th><th>Role</th><th>From</th><th>Ended</th><th></th></tr></thead>
          <tbody>
            {(assignments.data ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.userName}</td>
                <td>{row.roleName}</td>
                <td>{formatWhen(row.assignedAt)}</td>
                <td>{formatWhen(row.endedAt)}</td>
                <td>{admin && !row.endedAt ? (
                  <Button
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`End ${row.userName}'s ${row.roleName} assignment?`)) return
                      setPending(true)
                      api(`/api/assignments/${row.id}/end`, { method: 'POST' })
                        .then(() => assignments.reload())
                        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not end the assignment'))
                        .finally(() => setPending(false))
                    }}
                  >End</Button>
                ) : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {admin ? (
        <form className="stack" onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/farms/${farm.id}/assignments`, {
              method: 'POST',
              body: JSON.stringify({ userId: field(data, 'userId'), role: field(data, 'role') }),
            })
            assignments.reload()
          })
        }}>
          <div className="form-grid">
            <label className="field"><span>Person</span>
              <select name="userId" required defaultValue="">
                <option value="">Select</option>
                {(users.data ?? []).filter((user) => user.active).map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
              </select>
            </label>
            <label className="field"><span>Role</span>
              <select name="role" required defaultValue="">
                <option value="">Select</option>
                {(roles.data ?? []).map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
              </select>
            </label>
          </div>
          <FormFooter pending={pending} onCancel={onClose} label="Assign" />
        </form>
      ) : <div className="form-footer"><Button onClick={onClose}>Close</Button></div>}
    </Modal>
  )
}
