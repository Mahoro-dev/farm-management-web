import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ANIMAL_WRITE, canOnFarm } from '../access'
import { allPages, api, type Animal, type Breed, type Page, type SemenStraw, type Species } from '../api'
import { useAuth } from '../auth'
import { ACQUISITION, IDENTIFIER_TYPES, SEX } from '../enums'
import { useFarm } from '../farm'
import { asNumber, checked, field, formatWhen, saveForm } from '../format'
import { useLoad } from '../load'
import { NeedFarm } from '../shell'
import {
  AnimalOptions,
  Banner,
  Button,
  CheckField,
  EnumOptions,
  FormFooter,
  Modal,
  PageHead,
  Pager,
  Pill,
  SelectField,
  TextField,
  AreaField,
} from '../ui'

export function AnimalsPage() {
  return (
    <NeedFarm>
      <AnimalsBody />
    </NeedFarm>
  )
}

function AnimalsBody() {
  const { user } = useAuth()
  const { farmId, farm } = useFarm()
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(draft.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [draft])
  const [status, setStatus] = useState('')
  const [sex, setSex] = useState('')
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const filterKey = `${farmId}|${q}|${status}|${sex}`
  const [bound, setBound] = useState(filterKey)
  if (bound !== filterKey) {
    setBound(filterKey)
    if (page !== 0) setPage(0)
  }
  const query = useLoad(`animals:${filterKey}:${page}`, () =>
    api<Page<Animal>>(`/api/animals?farmId=${farmId}&page=${page}&size=20${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${status}` : ''}${sex ? `&sex=${sex}` : ''}`),
  )
  const canAdd = canOnFarm(user, farmId, ANIMAL_WRITE)

  return (
    <div>
      <PageHead
        title="Herd"
        lede={`${farm?.name ?? 'Farm'} · ${query.data?.totalElements ?? 0} animals`}
        action={canAdd ? <Button tone="primary" onClick={() => setOpen(true)}>Register animal</Button> : null}
      />
      <div className="filters">
        <input
          value={draft}
          placeholder="Number, name, or tag"
          onChange={(event) => setDraft(event.target.value)}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Any status</option>
          <EnumOptions values={['ACTIVE', 'SOLD', 'DECEASED', 'LOST', 'CULLED', 'TRANSFERRED_OUT']} />
        </select>
        <select value={sex} onChange={(event) => setSex(event.target.value)}>
          <option value="">Any sex</option>
          <EnumOptions values={SEX} />
        </select>
      </div>
      <Banner>{query.error}</Banner>
      {query.loading && !query.data ? <p className="muted">Loading herd…</p> : null}
      {query.data && query.data.content.length === 0 ? <p className="muted">No animals match this filter.</p> : null}
      {query.data && query.data.content.length > 0 ? (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Number</th><th>Name</th><th>Sex</th><th>Breed</th><th>Status</th><th>Tag</th><th>Born</th></tr>
            </thead>
            <tbody>
              {query.data.content.map((animal) => (
                <tr key={animal.id}>
                  <td><Link to={`/animals/${animal.id}`}>{animal.animalNumber}</Link></td>
                  <td>{animal.name || '—'}</td>
                  <td>{animal.sex === 'FEMALE' ? 'Female' : animal.sex === 'MALE' ? 'Male' : 'Unknown'}</td>
                  <td>{animal.breedName || animal.speciesCode || '—'}</td>
                  <td><Pill value={animal.status} /></td>
                  <td>{animal.primaryIdentifier || '—'}</td>
                  <td>{formatWhen(animal.dateOfBirth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={query.data.page} totalPages={query.data.totalPages} onPage={setPage} />
        </div>
      ) : null}
      {open ? <CreateAnimal farmId={farmId} onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
    </div>
  )
}

function CreateAnimal({ farmId, onClose, onSaved }: { farmId: string; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const species = useLoad('species', () => api<Species[]>('/api/species'))
  const breeds = useLoad('breeds', () => allPages<Breed>('/api/breeds'))
  const females = useLoad('dams', () => allPages<Animal>('/api/animals', { sex: 'FEMALE', status: 'ACTIVE' }))
  const males = useLoad('sires', () => allPages<Animal>('/api/animals', { sex: 'MALE', status: 'ACTIVE' }))
  const straws = useLoad('straws-animal', () => allPages<SemenStraw>('/api/semen-straws'))
  const activeSpecies = (species.data ?? []).filter((item) => item.active)

  return (
    <Modal title="Register animal" wide>
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            const identifierValue = field(data, 'identifierValue')
            await api('/api/animals', {
              method: 'POST',
              body: JSON.stringify({
                farmId,
                speciesId: asNumber(data, 'speciesId'),
                breedId: field(data, 'breedId'),
                animalNumber: field(data, 'animalNumber'),
                name: field(data, 'name'),
                sex: field(data, 'sex'),
                dateOfBirth: field(data, 'dateOfBirth'),
                birthDateEstimated: checked(data, 'birthDateEstimated'),
                colorMarkings: field(data, 'colorMarkings'),
                acquisitionType: field(data, 'acquisitionType'),
                acquiredOn: field(data, 'acquiredOn'),
                damId: field(data, 'damId'),
                sireId: field(data, 'semenStrawId') ? null : field(data, 'sireId'),
                semenStrawId: field(data, 'semenStrawId'),
                notes: field(data, 'notes'),
                identifier: identifierValue ? {
                  identifierType: field(data, 'identifierType') ?? 'VISUAL_EAR_TAG',
                  identifierValue,
                  issuingAuthority: field(data, 'issuingAuthority'),
                  issuedAt: field(data, 'issuedAt'),
                  primary: true,
                } : undefined,
              }),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error || species.error}</Banner>
        {activeSpecies.length === 0 && !species.loading ? <Banner tone="info">Add a species in Catalogue before registering an animal.</Banner> : null}
        <div className="form-grid">
          <TextField label="Animal number" name="animalNumber" required placeholder="KGL-0142" />
          <TextField label="Name" name="name" />
          <SelectField label="Species" name="speciesId" required>
            <option value="">Select</option>
            {activeSpecies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField label="Breed" name="breedId">
            <option value="">None</option>
            {(breeds.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField label="Sex" name="sex" required defaultValue="FEMALE">
            <EnumOptions values={SEX} />
          </SelectField>
          <SelectField label="How acquired" name="acquisitionType" required defaultValue="PURCHASED">
            <EnumOptions values={ACQUISITION} />
          </SelectField>
          <TextField label="Date of birth" name="dateOfBirth" type="date" />
          <TextField label="Acquired on" name="acquiredOn" type="date" />
          <CheckField name="birthDateEstimated" label="Birth date is estimated" />
          <TextField className="span-2" label="Color and markings" name="colorMarkings" />
          <SelectField label="Dam" name="damId">
            <AnimalOptions animals={females.data ?? []} blank="None" />
          </SelectField>
          <SelectField label="Sire on the farm" name="sireId">
            <AnimalOptions animals={males.data ?? []} blank="None" />
          </SelectField>
          <SelectField className="span-2" label="Artificial father (straw)" name="semenStrawId">
            <option value="">None</option>
            {(straws.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
          </SelectField>
          <AreaField className="span-2" label="Notes" name="notes" />
          <SelectField label="Tag type" name="identifierType" defaultValue="VISUAL_EAR_TAG">
            <EnumOptions values={IDENTIFIER_TYPES} />
          </SelectField>
          <TextField label="Tag value" name="identifierValue" placeholder="Optional ear tag" />
          <TextField label="Issuing authority" name="issuingAuthority" />
          <TextField label="Issued on" name="issuedAt" type="date" />
        </div>
        <FormFooter pending={pending} onCancel={onClose} label="Register" />
      </form>
    </Modal>
  )
}
