import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BREEDING_WRITE, canOnFarm } from '../access'
import { allPages, api, type Animal, type Breeding, type Calving, type Page, type Person, type Pregnancy, type SemenStraw } from '../api'
import { useAuth } from '../auth'
import { BREEDING_METHODS, BREEDING_OUTCOMES, CALVING_OUTCOMES, PREGNANCY_STATUSES, SEX } from '../enums'
import { useFarm } from '../farm'
import { asInstant, asNumber, checked, field, formatWhen, localInput, saveForm } from '../format'
import { useLoad } from '../load'
import { NeedFarm } from '../shell'
import { AnimalOptions, AreaField, Banner, Button, CheckField, EnumOptions, FatherLabel, FormFooter, Modal, PageHead, Pager, Pill, SelectField, Tabs, TextField } from '../ui'

export function BreedingPage() {
  return <NeedFarm><BreedingBody /></NeedFarm>
}

function BreedingBody() {
  const { farmId } = useFarm()
  const [tab, setTab] = useState<'matings' | 'pregnancies' | 'calvings'>('matings')
  const cows = useLoad(`cows:${farmId}`, () => allPages<Animal>('/api/animals', { farmId, sex: 'FEMALE', status: 'ACTIVE' }))
  const sires = useLoad('sires', () => allPages<Animal>('/api/animals', { sex: 'MALE', status: 'ACTIVE' }))
  const people = useLoad('people', () => api<Person[]>('/api/people'))
  const straws = useLoad('straws', () => allPages<SemenStraw>('/api/semen-straws'))
  return (
    <div className="stack">
      <PageHead title="Breeding" lede="For artificial insemination, choose a straw from the catalogue. That straw is the father. The technician is a person in this organization." />
      <Tabs value={tab} onChange={setTab} options={[{ id: 'matings', label: 'Matings' }, { id: 'pregnancies', label: 'Pregnancies' }, { id: 'calvings', label: 'Calvings' }]} />
      {tab === 'matings' ? <Matings farmId={farmId} cows={cows.data ?? []} sires={sires.data ?? []} people={people.data ?? []} straws={straws.data ?? []} /> : null}
      {tab === 'pregnancies' ? <Pregnancies farmId={farmId} cows={cows.data ?? []} /> : null}
      {tab === 'calvings' ? <Calvings farmId={farmId} cows={cows.data ?? []} sires={sires.data ?? []} straws={straws.data ?? []} /> : null}
    </div>
  )
}

function Matings({ farmId, cows, sires, people, straws }: { farmId: string; cows: Animal[]; sires: Animal[]; people: Person[]; straws: SemenStraw[] }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Breeding | null>(null)
  const query = useLoad(`breed:${farmId}:${page}`, () => api<Page<Breeding>>(`/api/farms/${farmId}/breeding-records?page=${page}&size=20`))
  const canWrite = canOnFarm(user, farmId, BREEDING_WRITE)
  return (
    <section className="card">
      <div className="page-head"><h2>Matings</h2>{canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>Record mating</Button> : null}</div>
      <Banner>{query.error}</Banner>
      <Rows empty="No breeding records.">
        <table>
          <thead><tr><th>When</th><th>Cow</th><th>Father</th><th>Technician</th><th>Method</th><th>Outcome</th><th></th></tr></thead>
          <tbody>
            {(query.data?.content ?? []).map((row) => (
              <tr key={row.id}>
                <td>{formatWhen(row.breedingAt)}</td>
                <td><Link to={`/animals/${row.cowId}`}>{row.cowNumber}</Link></td>
                <td><FatherLabel sireId={row.sireId} sireNumber={row.sireNumber} artificialCode={row.breedingMethod === 'ARTIFICIAL_INSEMINATION' || row.breedingMethod === 'EMBRYO_TRANSFER' ? row.semenBatchNumber : null} /></td>
                <td>{row.technicianName || '—'}</td>
                <td>{row.breedingMethod.replaceAll('_', ' ').toLowerCase()}</td>
                <td><Pill value={row.outcome} /></td>
                <td>{canWrite ? <Button onClick={() => setEdit(row)}>Edit</Button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Rows>
      <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
      {open ? <MatingForm farmId={farmId} cows={cows} sires={sires} people={people} straws={straws} onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
      {edit ? <MatingForm farmId={farmId} cows={cows} sires={sires} people={people} straws={straws} record={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
    </section>
  )
}

function Rows({ empty, children }: { empty: string; children: ReactNode }) {
  return <div className="table-wrap">{children ?? <p className="muted">{empty}</p>}</div>
}

function MatingForm({ farmId, cows, sires, people, straws, record, onClose, onSaved }: { farmId: string; cows: Animal[]; sires: Animal[]; people: Person[]; straws: SemenStraw[]; record?: Breeding; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [method, setMethod] = useState(record?.breedingMethod ?? 'ARTIFICIAL_INSEMINATION')
  const artificial = method === 'ARTIFICIAL_INSEMINATION' || method === 'EMBRYO_TRANSFER'
  const strawChoices = straws.filter((item) => item.active || item.id === record?.semenStrawId)
  return (
    <Modal title={record ? 'Edit mating' : 'Record mating'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          const chosen = field(data, 'breedingMethod')
          const byStraw = chosen === 'ARTIFICIAL_INSEMINATION' || chosen === 'EMBRYO_TRANSFER'
          const shared = {
            sireId: byStraw ? null : field(data, 'sireId'),
            breedingAt: asInstant(data, 'breedingAt'),
            breedingMethod: chosen,
            outcome: field(data, 'outcome'),
            technicianId: field(data, 'technicianId'),
            semenStrawId: byStraw ? field(data, 'semenStrawId') : null,
            ancestryOverrideReason: byStraw ? null : field(data, 'ancestryOverrideReason'),
            notes: field(data, 'notes'),
          }
          await api(record ? `/api/breeding-records/${record.id}` : `/api/farms/${farmId}/breeding-records`, {
            method: record ? 'PUT' : 'POST',
            body: JSON.stringify(record ? shared : { ...shared, cowId: field(data, 'cowId') }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        {record ? <p>Cow {record.cowNumber}</p> : (
          <SelectField label="Cow" name="cowId" required><AnimalOptions animals={cows} /></SelectField>
        )}
        <SelectField label="Method" name="breedingMethod" required defaultValue={method} onChange={setMethod}><EnumOptions values={BREEDING_METHODS} /></SelectField>
        {artificial ? (
          <>
            <SelectField label="Father (straw)" name="semenStrawId" required defaultValue={record?.semenStrawId ?? ''}>
              <option value="">Select</option>
              {strawChoices.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </SelectField>
            {strawChoices.length === 0 ? <p className="hint">Add the straw under Catalogue before recording this mating.</p> : <p className="hint">The selected straw is the father and is shown as artificial.</p>}
          </>
        ) : (
          <SelectField label="Sire" name="sireId" defaultValue={record?.sireId ?? ''}>
            <AnimalOptions animals={sires} blank="None" current={record?.sireId ? { id: record.sireId, label: record.sireNumber || record.sireId } : null} />
          </SelectField>
        )}
        <TextField label="When" name="breedingAt" type="datetime-local" required defaultValue={localInput(record?.breedingAt ?? new Date().toISOString())} />
        <SelectField label="Outcome" name="outcome" required={Boolean(record)} defaultValue={record?.outcome ?? 'PENDING'}><EnumOptions values={BREEDING_OUTCOMES} /></SelectField>
        <SelectField label="Technician" name="technicianId" defaultValue={record?.technicianId ?? ''}>
          <option value="">None</option>
          {people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
          {record?.technicianId && !people.some((person) => person.id === record.technicianId) ? <option value={record.technicianId}>{record.technicianName || 'Former person'}</option> : null}
        </SelectField>
        {people.length === 0 ? <p className="hint">An administrator adds people before a technician can be chosen.</p> : null}
        {artificial ? null : <AreaField label="Ancestry override reason" name="ancestryOverrideReason" defaultValue={record?.ancestryOverrideReason} />}
        <AreaField label="Notes" name="notes" defaultValue={record?.notes} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function Pregnancies({ farmId, cows }: { farmId: string; cows: Animal[] }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Pregnancy | null>(null)
  const query = useLoad(`preg:${farmId}:${page}`, () => api<Page<Pregnancy>>(`/api/farms/${farmId}/pregnancies?page=${page}&size=20`))
  const canWrite = canOnFarm(user, farmId, BREEDING_WRITE)
  return (
    <section className="card">
      <div className="page-head"><h2>Pregnancies</h2>{canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>Record pregnancy</Button> : null}</div>
      <Banner>{query.error}</Banner>
      {(query.data?.content.length ?? 0) === 0 ? <p className="muted">No pregnancies.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cow</th><th>Confirmed</th><th>Expected</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {query.data?.content.map((row) => (
                <tr key={row.id}>
                  <td><Link to={`/animals/${row.cowId}`}>{row.cowNumber}</Link></td>
                  <td>{formatWhen(row.confirmedAt)}</td>
                  <td>{formatWhen(row.expectedCalvingOn)}</td>
                  <td><Pill value={row.status} /></td>
                  <td>{canWrite ? <Button onClick={() => setEdit(row)}>Edit</Button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
        </div>
      )}
      {open ? <PregnancyForm farmId={farmId} cows={cows} onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
      {edit ? <PregnancyForm farmId={farmId} cows={cows} record={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
    </section>
  )
}

function PregnancyForm({ farmId, cows, record, onClose, onSaved }: { farmId: string; cows: Animal[]; record?: Pregnancy; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={record ? 'Edit pregnancy' : 'Record pregnancy'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(record ? `/api/pregnancies/${record.id}` : `/api/farms/${farmId}/pregnancies`, {
            method: record ? 'PUT' : 'POST',
            body: JSON.stringify({
              cowId: field(data, 'cowId'),
              breedingRecordId: field(data, 'breedingRecordId'),
              confirmedAt: asInstant(data, 'confirmedAt'),
              confirmationMethod: field(data, 'confirmationMethod'),
              expectedCalvingOn: field(data, 'expectedCalvingOn'),
              status: field(data, 'status'),
              notes: field(data, 'notes'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <SelectField label="Cow" name="cowId" required defaultValue={record?.cowId}>
          <AnimalOptions animals={cows} current={record ? { id: record.cowId, label: record.cowNumber } : null} />
        </SelectField>
        <TextField label="Breeding record id" name="breedingRecordId" defaultValue={record?.breedingRecordId} />
        <TextField label="Confirmed at" name="confirmedAt" type="datetime-local" defaultValue={localInput(record?.confirmedAt)} />
        <TextField label="Confirmation method" name="confirmationMethod" defaultValue={record?.confirmationMethod} />
        <TextField label="Expected calving" name="expectedCalvingOn" type="date" defaultValue={record?.expectedCalvingOn} />
        <SelectField label="Status" name="status" defaultValue={record?.status ?? 'SUSPECTED'}><EnumOptions values={PREGNANCY_STATUSES} /></SelectField>
        <AreaField label="Notes" name="notes" defaultValue={record?.notes} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function Calvings({ farmId, cows, sires, straws }: { farmId: string; cows: Animal[]; sires: Animal[]; straws: SemenStraw[] }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const query = useLoad(`calv:${farmId}:${page}`, () => api<Page<Calving>>(`/api/farms/${farmId}/calvings?page=${page}&size=20`))
  const canWrite = canOnFarm(user, farmId, BREEDING_WRITE)
  return (
    <section className="card">
      <div className="page-head"><h2>Calvings</h2>{canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>Record calving</Button> : null}</div>
      <Banner>{query.error}</Banner>
      {(query.data?.content.length ?? 0) === 0 ? <p className="muted">No calvings.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Dam</th><th>Father</th><th>Calf</th><th>Outcome</th><th>Calves</th></tr></thead>
            <tbody>
              {query.data?.content.map((row) => (
                <tr key={row.id}>
                  <td>{formatWhen(row.calvedAt)}</td>
                  <td><Link to={`/animals/${row.damId}`}>{row.damNumber}</Link></td>
                  <td><FatherLabel sireId={row.sireId} sireNumber={row.sireNumber} artificialCode={row.artificialSireCode} /></td>
                  <td>{row.calfId ? <Link to={`/animals/${row.calfId}`}>{row.calfNumber}</Link> : '—'}</td>
                  <td><Pill value={row.outcome} /></td>
                  <td>{row.numberOfCalves}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
        </div>
      )}
      {open ? <CalvingForm farmId={farmId} cows={cows} sires={sires} straws={straws} onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
    </section>
  )
}

function CalvingForm({ farmId, cows, sires, straws, onClose, onSaved }: { farmId: string; cows: Animal[]; sires: Animal[]; straws: SemenStraw[]; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [createCalf, setCreateCalf] = useState(true)
  const breeds = useLoad('breeds-calf', () => allPages<import('../api').Breed>('/api/breeds'))
  return (
    <Modal title="Record calving" wide>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          const calf = createCalf ? {
            animalNumber: field(data, 'calfNumber'),
            name: field(data, 'calfName'),
            sex: field(data, 'calfSex'),
            breedId: field(data, 'breedId'),
            colorMarkings: field(data, 'colorMarkings'),
          } : undefined
          const straw = field(data, 'semenStrawId')
          await api(`/api/farms/${farmId}/calvings`, {
            method: 'POST',
            body: JSON.stringify({
              damId: field(data, 'damId'),
              sireId: straw ? null : field(data, 'sireId'),
              semenStrawId: straw,
              pregnancyRecordId: field(data, 'pregnancyRecordId'),
              calfId: createCalf ? undefined : field(data, 'calfId'),
              createCalf: calf,
              calvedAt: asInstant(data, 'calvedAt'),
              outcome: field(data, 'outcome'),
              assistanceRequired: checked(data, 'assistanceRequired'),
              numberOfCalves: asNumber(data, 'numberOfCalves'),
              complications: field(data, 'complications'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <div className="form-grid">
          <SelectField label="Dam" name="damId" required><AnimalOptions animals={cows} /></SelectField>
          <SelectField label="Sire on the farm" name="sireId"><AnimalOptions animals={sires} blank="None" /></SelectField>
          <SelectField label="Artificial father (straw)" name="semenStrawId">
            <option value="">None</option>
            {straws.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
          </SelectField>
          <p className="hint span-2">Choose a straw saved in Catalogue when a veterinarian inseminated the cow. Leave the on-farm sire empty. The calf shows that straw as an artificial father.</p>
          <TextField label="When" name="calvedAt" type="datetime-local" required defaultValue={localInput(new Date().toISOString())} />
          <SelectField label="Outcome" name="outcome" required defaultValue="LIVE"><EnumOptions values={CALVING_OUTCOMES} /></SelectField>
          <TextField label="Number of calves" name="numberOfCalves" type="number" required min={1} defaultValue={1} />
          <TextField label="Pregnancy record id" name="pregnancyRecordId" />
          <CheckField name="assistanceRequired" label="Assistance required" />
          <AreaField className="span-2" label="Complications" name="complications" />
        </div>
        <label className="check"><input type="checkbox" checked={createCalf} onChange={(event) => setCreateCalf(event.target.checked)} /> Register a new calf</label>
        {createCalf ? (
          <div className="form-grid">
            <TextField label="Calf number" name="calfNumber" required />
            <TextField label="Calf name" name="calfName" />
            <SelectField label="Calf sex" name="calfSex" required defaultValue="FEMALE"><EnumOptions values={SEX} /></SelectField>
            <SelectField label="Breed" name="breedId">
              <option value="">None</option>
              {(breeds.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            <TextField className="span-2" label="Color and markings" name="colorMarkings" />
          </div>
        ) : (
          <TextField label="Existing calf id" name="calfId" />
        )}
        <FormFooter pending={pending} onCancel={onClose} label="Record calving" />
      </form>
    </Modal>
  )
}
