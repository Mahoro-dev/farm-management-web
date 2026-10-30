import { useState } from 'react'
import { isOrgAdmin } from '../access'
import { api, type Page, type User } from '../api'
import { useAuth } from '../auth'
import { field, formatWhen, saveForm } from '../format'
import { useLoad } from '../load'
import { Banner, Button, Empty, FormFooter, Modal, PageHead, Pager, TextField } from '../ui'

export function PeoplePage() {
  const { user } = useAuth()
  const admin = isOrgAdmin(user)
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<User | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const query = useLoad(admin ? `people:${page}` : 'people-locked', () =>
    admin ? api<Page<User>>(`/api/users?page=${page}&size=20`) : Promise.resolve(null),
  )
  if (!admin) {
    return <Empty title="Administrators only">Only an organization administrator can manage people.</Empty>
  }
  return (
    <div className="stack">
      <PageHead title="People" lede="Create accounts here, then assign them to a farm." action={<Button tone="primary" onClick={() => setOpen(true)}>Add person</Button>} />
      <Banner>{query.error || message}</Banner>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Active</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {(query.data?.content ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.fullName}</td>
                <td>{row.email}</td>
                <td>{row.phone || '—'}</td>
                <td>{row.active ? 'Yes' : 'No'}</td>
                <td>{formatWhen(row.lastLoginAt)}</td>
                <td className="row-actions">
                  <Button onClick={() => setEdit(row)}>Edit</Button>
                  <Button onClick={() => {
                    setMessage(null)
                    void toggle(row, query.reload).catch((reason: unknown) => {
                      setMessage(reason instanceof Error ? reason.message : 'Could not update this person')
                    })
                  }}>{row.active ? 'Deactivate' : 'Activate'}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
      </div>
      {open ? <PersonForm onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
      {edit ? <PersonForm person={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
    </div>
  )
}

async function toggle(person: User, reload: () => void) {
  const next = !person.active
  const verb = next ? 'Activate' : 'Deactivate'
  if (!window.confirm(`${verb} ${person.fullName}?`)) return
  await api(`/api/users/${person.id}/active`, { method: 'PATCH', body: JSON.stringify({ active: next }) })
  reload()
}

function PersonForm({ person, onClose, onSaved }: { person?: User; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={person ? 'Edit person' : 'Add person'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          const body = {
            fullName: field(data, 'fullName'),
            email: field(data, 'email'),
            phone: field(data, 'phone'),
            password: field(data, 'password'),
          }
          await api(person ? `/api/users/${person.id}` : '/api/users', {
            method: person ? 'PUT' : 'POST',
            body: JSON.stringify(body),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <TextField label="Full name" name="fullName" required defaultValue={person?.fullName} />
        <TextField label="Email" name="email" type="email" required defaultValue={person?.email} />
        <TextField label="Phone" name="phone" defaultValue={person?.phone} />
        <TextField label={person ? 'New password' : 'Password'} name="password" type="password" required={!person} minLength={person ? undefined : 8} placeholder={person ? 'Leave blank to keep the current password' : ''} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}
