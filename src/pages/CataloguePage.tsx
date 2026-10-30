import { useState } from 'react'
import { canAny, isOrgAdmin } from '../access'
import { api, type Breed, type Page, type SemenStraw, type Species } from '../api'
import { useAuth } from '../auth'
import { checked, field, saveForm } from '../format'
import { useLoad } from '../load'
import { AreaField, Banner, Button, CheckField, FormFooter, Modal, PageHead, Pager, TextField } from '../ui'

export function CataloguePage() {
  const { user } = useAuth()
  const admin = isOrgAdmin(user)
  const manager = canAny(user, ['FARM_MANAGER'])
  const species = useLoad('species-page', () => api<Species[]>('/api/species'))
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const breeds = useLoad(`breeds:${q}:${page}`, () => api<Page<Breed>>(`/api/breeds?page=${page}&size=20${q ? `&q=${encodeURIComponent(q)}` : ''}`))
  const [sq, setSq] = useState('')
  const [spage, setSpage] = useState(0)
  const strawQuery = useLoad(`straws:${sq}:${spage}`, () => api<Page<SemenStraw>>(`/api/semen-straws?page=${spage}&size=20${sq ? `&q=${encodeURIComponent(sq)}` : ''}`))
  const [speciesOpen, setSpeciesOpen] = useState(false)
  const [breedOpen, setBreedOpen] = useState(false)
  const [strawOpen, setStrawOpen] = useState(false)
  const [edit, setEdit] = useState<Breed | null>(null)
  const [editStraw, setEditStraw] = useState<SemenStraw | null>(null)
  const canStraw = canAny(user, ['FARM_MANAGER', 'VETERINARIAN'])
  return (
    <div className="stack">
      <PageHead title="Catalogue" lede="Species, breeds, and semen straws. A straw is the father when a veterinarian inseminates a cow." />
      <section className="card">
        <div className="page-head"><h2>Species</h2>{admin ? <Button onClick={() => setSpeciesOpen(true)}>Add species</Button> : null}</div>
        <Banner>{species.error}</Banner>
        <ul className="plain">
          {(species.data ?? []).map((item) => <li key={item.id}><strong>{item.name}</strong> · {item.code}{item.active ? '' : ' · inactive'}</li>)}
        </ul>
      </section>
      <section className="card">
        <div className="page-head"><h2>Breeds</h2>{manager ? <Button tone="primary" onClick={() => setBreedOpen(true)}>Add breed</Button> : null}</div>
        <div className="filters">
          <input placeholder="Search breeds" value={q} onChange={(event) => { setQ(event.target.value); setPage(0) }} />
        </div>
        <Banner>{breeds.error}</Banner>
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {(breeds.data?.content ?? []).map((breed) => (
              <tr key={breed.id}>
                <td>{breed.name}</td>
                <td>{breed.description || '—'}</td>
                <td>{breed.active ? 'Yes' : 'No'}</td>
                <td>{manager ? <Button onClick={() => setEdit(breed)}>Edit</Button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={breeds.data?.page ?? 0} totalPages={breeds.data?.totalPages ?? 0} onPage={setPage} />
      </section>
      <section className="card">
        <div className="page-head"><h2>Straws</h2>{canStraw ? <Button tone="primary" onClick={() => setStrawOpen(true)}>Add straw</Button> : null}</div>
        <p className="hint">Each code is an artificial father. Choose it when recording insemination.</p>
        <div className="filters">
          <input placeholder="Search straw codes" value={sq} onChange={(event) => { setSq(event.target.value); setSpage(0) }} />
        </div>
        <Banner>{strawQuery.error}</Banner>
        <table>
          <thead><tr><th>Code</th><th>Description</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {(strawQuery.data?.content ?? []).map((straw) => (
              <tr key={straw.id}>
                <td>{straw.code}</td>
                <td>{straw.description || '—'}</td>
                <td>{straw.active ? 'Yes' : 'No'}</td>
                <td>{canStraw ? <Button onClick={() => setEditStraw(straw)}>Edit</Button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={strawQuery.data?.page ?? 0} totalPages={strawQuery.data?.totalPages ?? 0} onPage={setSpage} />
      </section>
      {speciesOpen ? <SpeciesForm onClose={() => setSpeciesOpen(false)} onSaved={species.reload} /> : null}
      {breedOpen ? <BreedForm onClose={() => setBreedOpen(false)} onSaved={breeds.reload} /> : null}
      {edit ? <BreedForm breed={edit} onClose={() => setEdit(null)} onSaved={breeds.reload} /> : null}
      {strawOpen ? <StrawForm onClose={() => setStrawOpen(false)} onSaved={strawQuery.reload} /> : null}
      {editStraw ? <StrawForm straw={editStraw} onClose={() => setEditStraw(null)} onSaved={strawQuery.reload} /> : null}
    </div>
  )
}

function SpeciesForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title="Add species">
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api('/api/species', { method: 'POST', body: JSON.stringify({ code: field(data, 'code'), name: field(data, 'name') }) })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <TextField label="Code" name="code" required placeholder="CATTLE" />
        <TextField label="Name" name="name" required placeholder="Cattle" />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function BreedForm({ breed, onClose, onSaved }: { breed?: Breed; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={breed ? 'Edit breed' : 'Add breed'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(breed ? `/api/breeds/${breed.id}` : '/api/breeds', {
            method: breed ? 'PUT' : 'POST',
            body: JSON.stringify({
              name: field(data, 'name'),
              description: field(data, 'description'),
              active: checked(data, 'active'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <TextField label="Name" name="name" required defaultValue={breed?.name} />
        <AreaField label="Description" name="description" defaultValue={breed?.description} />
        <CheckField name="active" label="Active" defaultChecked={breed?.active ?? true} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function StrawForm({ straw, onClose, onSaved }: { straw?: SemenStraw; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={straw ? 'Edit straw' : 'Add straw'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(straw ? `/api/semen-straws/${straw.id}` : '/api/semen-straws', {
            method: straw ? 'PUT' : 'POST',
            body: JSON.stringify({
              code: field(data, 'code'),
              description: field(data, 'description'),
              active: checked(data, 'active'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <TextField label="Code" name="code" required defaultValue={straw?.code} placeholder="AI-204" />
        <AreaField label="Description" name="description" defaultValue={straw?.description} />
        <CheckField name="active" label="Active" defaultChecked={straw?.active ?? true} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}
