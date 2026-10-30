import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CLINICAL_WRITE, canOnFarm } from '../access'
import { allPages, api, type Animal, type Batch, type Page, type Product, type Treatment, type Vaccination, type Visit } from '../api'
import { useAuth } from '../auth'
import { ADMIN_ROUTES, MEDICINE_UNITS, TREATMENT_OUTCOMES, VISIT_TYPES, countableUnit, defaultRoute } from '../enums'
import { useFarm } from '../farm'
import { amount, asInstant, asNumber, field, formatWhen, labelEnum, localInput, saveForm, unitLabel } from '../format'
import { useLoad } from '../load'
import { NeedFarm } from '../shell'
import { UseMedicineForm } from './MedicinePage'
import { AnimalOptions, AreaField, Banner, Button, EnumOptions, FormFooter, Modal, PageHead, Pager, Pill, SelectField, Tabs, TextField } from '../ui'

export function ClinicalPage() {
  return <NeedFarm><ClinicalBody /></NeedFarm>
}

function ClinicalBody() {
  const { user } = useAuth()
  const { farmId } = useFarm()
  const [tab, setTab] = useState<'visits' | 'vaccinations' | 'treatments'>('visits')
  const [give, setGive] = useState(false)
  const [version, setVersion] = useState(0)
  const animals = useLoad(`clinic-animals:${farmId}`, () => allPages<Animal>('/api/animals', { farmId, status: 'ACTIVE' }))
  const canGive = canOnFarm(user, farmId, CLINICAL_WRITE)
  return (
    <div className="stack">
      <PageHead
        title="Clinic"
        lede="Record medicine use for a tablet, injection, or vaccine. The quantity is taken from farm stock."
        action={canGive ? <Button tone="primary" onClick={() => setGive(true)}>Record medicine use</Button> : null}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { id: 'visits', label: 'Visits' },
          { id: 'vaccinations', label: 'Vaccinations' },
          { id: 'treatments', label: 'Treatments' },
        ]}
      />
      {tab === 'visits' ? <Visits farmId={farmId} animals={animals.data ?? []} /> : null}
      {tab === 'vaccinations' ? <Vaccines key={version} farmId={farmId} animals={animals.data ?? []} /> : null}
      {tab === 'treatments' ? <Treatments key={version} farmId={farmId} animals={animals.data ?? []} /> : null}
      {give ? <UseMedicineForm farmId={farmId} onClose={() => setGive(false)} onSaved={() => { setVersion((value) => value + 1); setGive(false) }} /> : null}
    </div>
  )
}

function Visits({ farmId, animals }: { farmId: string; animals: Animal[] }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Visit | null>(null)
  const query = useLoad(`visits:${farmId}:${page}`, () => api<Page<Visit>>(`/api/farms/${farmId}/veterinary-visits?page=${page}&size=20`))
  const canWrite = canOnFarm(user, farmId, CLINICAL_WRITE)
  return (
    <section className="card">
      <div className="page-head">
        <h2>Visits</h2>
        {canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>New visit</Button> : null}
      </div>
      <Banner>{query.error}</Banner>
      <VisitTable rows={query.data?.content ?? []} canWrite={canWrite} onEdit={setEdit} />
      <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
      {open ? <VisitForm farmId={farmId} animals={animals} onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
      {edit ? <VisitForm farmId={farmId} animals={animals} visit={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
    </section>
  )
}

function VisitTable({ rows, canWrite, onEdit }: { rows: Visit[]; canWrite: boolean; onEdit: (visit: Visit) => void }) {
  if (rows.length === 0) return <p className="muted">No visits yet.</p>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>When</th><th>Animal</th><th>Type</th><th>Diagnosis</th><th>Temp</th><th></th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatWhen(row.visitAt)}</td>
              <td><Link to={`/animals/${row.animalId}`}>{row.animalNumber}</Link></td>
              <td>{labelEnum(row.visitType)}</td>
              <td>{row.diagnosis || row.symptoms || '—'}</td>
              <td>{row.temperatureC ?? '—'}</td>
              <td>{canWrite ? <Button onClick={() => onEdit(row)}>Edit</Button> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VisitForm({ farmId, animals, visit, onClose, onSaved }: { farmId: string; animals: Animal[]; visit?: Visit; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={visit ? 'Edit visit' : 'New visit'} wide>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          const body = {
            animalId: field(data, 'animalId'),
            visitAt: asInstant(data, 'visitAt'),
            visitType: field(data, 'visitType'),
            symptoms: field(data, 'symptoms'),
            diagnosis: field(data, 'diagnosis'),
            temperatureC: asNumber(data, 'temperatureC'),
            weightKg: asNumber(data, 'weightKg'),
            vetNotes: field(data, 'vetNotes'),
            followUpAt: asInstant(data, 'followUpAt'),
          }
          await api(visit ? `/api/veterinary-visits/${visit.id}` : `/api/farms/${farmId}/veterinary-visits`, {
            method: visit ? 'PUT' : 'POST',
            body: JSON.stringify(body),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <div className="form-grid">
          <SelectField label="Animal" name="animalId" required defaultValue={visit?.animalId}>
            <AnimalOptions animals={animals} current={visit ? { id: visit.animalId, label: visit.animalNumber } : null} />
          </SelectField>
          <SelectField label="Type" name="visitType" defaultValue={visit?.visitType ?? 'EXAMINATION'}><EnumOptions values={VISIT_TYPES} /></SelectField>
          <TextField label="Visit at" name="visitAt" type="datetime-local" defaultValue={localInput(visit?.visitAt ?? new Date().toISOString())} />
          <TextField label="Follow up" name="followUpAt" type="datetime-local" defaultValue={localInput(visit?.followUpAt)} />
          <TextField label="Temperature °C" name="temperatureC" type="number" min={25} max={45} step="0.1" defaultValue={visit?.temperatureC} />
          <TextField label="Weight kg" name="weightKg" type="number" min="0.01" step="0.01" defaultValue={visit?.weightKg} />
          <AreaField className="span-2" label="Symptoms" name="symptoms" defaultValue={visit?.symptoms} />
          <AreaField className="span-2" label="Diagnosis" name="diagnosis" defaultValue={visit?.diagnosis} />
          <AreaField className="span-2" label="Vet notes" name="vetNotes" defaultValue={visit?.vetNotes} />
        </div>
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function Vaccines({ farmId, animals }: { farmId: string; animals: Animal[] }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const query = useLoad(`vax:${farmId}:${page}`, () => api<Page<Vaccination>>(`/api/farms/${farmId}/vaccinations?page=${page}&size=20`))
  const due = useLoad(`due:${farmId}`, () => api<Vaccination[]>(`/api/farms/${farmId}/vaccinations/due`))
  const canWrite = canOnFarm(user, farmId, CLINICAL_WRITE)
  return (
    <section className="stack">
      <article className="card">
        <h2>Due</h2>
        <Banner>{due.error}</Banner>
        {(due.data ?? []).length === 0 ? <p className="muted">No vaccines are due.</p> : (
          <ul className="plain">{(due.data ?? []).map((item) => <li key={item.id}>{item.animalNumber} · {item.vaccineName} · {formatWhen(item.nextDueOn)}</li>)}</ul>
        )}
      </article>
      <article className="card">
        <div className="page-head"><h2>Given</h2>{canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>Record vaccination</Button> : null}</div>
        <Banner>{query.error}</Banner>
        {(query.data?.content.length ?? 0) === 0 ? <p className="muted">No vaccinations yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Animal</th><th>Vaccine</th><th>Taken from store</th><th>Next due</th></tr></thead>
              <tbody>
                {query.data?.content.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.administeredAt)}</td>
                    <td><Link to={`/animals/${row.animalId}`}>{row.animalNumber}</Link></td>
                    <td>{row.vaccineName}</td>
                    <td>{row.quantityUsed != null ? `${amount(row.quantityUsed, countableUnit(row.baseUnit) ? 0 : 3)} ${unitLabel(row.baseUnit)}`.trim() : (row.dose || '—')}</td>
                    <td>{formatWhen(row.nextDueOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
          </div>
        )}
      </article>
      {open ? <VaccineForm farmId={farmId} animals={animals} onClose={() => setOpen(false)} onSaved={() => { query.reload(); due.reload() }} /> : null}
    </section>
  )
}

function VaccineForm({ farmId, animals, onClose, onSaved }: { farmId: string; animals: Animal[]; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [productId, setProductId] = useState('')
  const products = useLoad('vax-products', () => allPages<Product>('/api/medicine-products'))
  const batches = useLoad(`vax-batches:${farmId}`, () => allPages<Batch>(`/api/farms/${farmId}/medicine-batches`))
  const product = (products.data ?? []).find((item) => item.id === productId)
  const choices = (batches.data ?? []).filter((batch) => batch.medicineProductId === productId)
  return (
    <Modal title="Record vaccination">
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(`/api/farms/${farmId}/vaccinations`, {
            method: 'POST',
            body: JSON.stringify({
              animalId: field(data, 'animalId'),
              medicineProductId: field(data, 'medicineProductId'),
              medicineBatchId: field(data, 'medicineBatchId'),
              quantityUsed: asNumber(data, 'quantityUsed'),
              administeredAt: asInstant(data, 'administeredAt'),
              nextDueOn: field(data, 'nextDueOn'),
              notes: field(data, 'notes'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <p className="hint">The quantity is removed from the selected batch. A vaccine stored as one dose or one injection leaves the store as that amount.</p>
        <Banner>{error}</Banner>
        <SelectField label="Animal" name="animalId" required><AnimalOptions animals={animals} /></SelectField>
        <SelectField label="Vaccine" name="medicineProductId" required onChange={setProductId}>
          <option value="">Select</option>
          {(products.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {labelEnum(item.form)} · {unitLabel(item.baseUnit)}</option>)}
        </SelectField>
        <SelectField key={productId} label="Batch" name="medicineBatchId" required>
          <option value="">Select</option>
          {choices.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber} · {amount(batch.quantityOnHand, 2)} {unitLabel(batch.baseUnit)} on hand</option>)}
        </SelectField>
        {productId && choices.length === 0 ? <p className="hint">This vaccine is not in farm stock. Receive it under Medicine first.</p> : null}
        <TextField key={product?.baseUnit ?? 'qty'} label={product ? `Quantity (${unitLabel(product.baseUnit)})` : 'Quantity'} name="quantityUsed" type="number" required min={countableUnit(product?.baseUnit) ? 1 : '0.001'} step={countableUnit(product?.baseUnit) ? '1' : '0.001'} defaultValue={1} />
        <TextField label="Given at" name="administeredAt" type="datetime-local" defaultValue={localInput(new Date().toISOString())} />
        <TextField label="Next due" name="nextDueOn" type="date" />
        <AreaField label="Notes" name="notes" />
        <FormFooter pending={pending} onCancel={onClose} label="Record" />
      </form>
    </Modal>
  )
}

function Treatments({ farmId, animals }: { farmId: string; animals: Animal[] }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Treatment | null>(null)
  const [medsFor, setMedsFor] = useState<Treatment | null>(null)
  const query = useLoad(`tx:${farmId}:${page}`, () => api<Page<Treatment>>(`/api/farms/${farmId}/treatments?page=${page}&size=20`))
  const canWrite = canOnFarm(user, farmId, CLINICAL_WRITE)
  return (
    <section className="card">
      <div className="page-head"><h2>Treatments</h2>{canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>New treatment</Button> : null}</div>
      <Banner>{query.error}</Banner>
      {(query.data?.content.length ?? 0) === 0 ? <p className="muted">No treatments yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Animal</th><th>Diagnosis</th><th>Outcome</th><th>Milk hold</th><th></th></tr></thead>
            <tbody>
              {query.data?.content.map((row) => (
                <tr key={row.id}>
                  <td>{formatWhen(row.treatmentDate)}</td>
                  <td><Link to={`/animals/${row.animalId}`}>{row.animalNumber}</Link></td>
                  <td>{row.diagnosis || '—'}</td>
                  <td><Pill value={row.outcome} /></td>
                  <td>{formatWhen(row.milkWithdrawalUntil)}</td>
                  <td className="row-actions">
                    {canWrite ? <Button onClick={() => setEdit(row)}>Edit</Button> : null}
                    {canWrite ? <Button onClick={() => setMedsFor(row)}>Add dose</Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
        </div>
      )}
      {open ? <TreatmentForm farmId={farmId} animals={animals} onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
      {edit ? <TreatmentForm farmId={farmId} animals={animals} treatment={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
      {medsFor ? <MedicationForm treatment={medsFor} onClose={() => setMedsFor(null)} onSaved={query.reload} /> : null}
    </section>
  )
}

function TreatmentForm({ farmId, animals, treatment, onClose, onSaved }: { farmId: string; animals: Animal[]; treatment?: Treatment; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={treatment ? 'Edit treatment' : 'New treatment'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(treatment ? `/api/treatments/${treatment.id}` : `/api/farms/${farmId}/treatments`, {
            method: treatment ? 'PUT' : 'POST',
            body: JSON.stringify({
              animalId: field(data, 'animalId'),
              treatmentDate: asInstant(data, 'treatmentDate'),
              diagnosis: field(data, 'diagnosis'),
              treatmentPlan: field(data, 'treatmentPlan'),
              outcome: field(data, 'outcome'),
              milkWithdrawalUntil: asInstant(data, 'milkWithdrawalUntil'),
              meatWithdrawalUntil: asInstant(data, 'meatWithdrawalUntil'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <SelectField label="Animal" name="animalId" required defaultValue={treatment?.animalId}>
          <AnimalOptions animals={animals} current={treatment ? { id: treatment.animalId, label: treatment.animalNumber } : null} />
        </SelectField>
        <TextField label="When" name="treatmentDate" type="datetime-local" defaultValue={localInput(treatment?.treatmentDate ?? new Date().toISOString())} />
        <SelectField label="Outcome" name="outcome" defaultValue={treatment?.outcome ?? 'IN_PROGRESS'}><EnumOptions values={TREATMENT_OUTCOMES} /></SelectField>
        <AreaField label="Diagnosis" name="diagnosis" defaultValue={treatment?.diagnosis} />
        <AreaField label="Plan" name="treatmentPlan" defaultValue={treatment?.treatmentPlan} />
        <TextField label="Milk withdrawal until" name="milkWithdrawalUntil" type="datetime-local" defaultValue={localInput(treatment?.milkWithdrawalUntil)} />
        <TextField label="Meat withdrawal until" name="meatWithdrawalUntil" type="datetime-local" defaultValue={localInput(treatment?.meatWithdrawalUntil)} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function MedicationForm({ treatment, onClose, onSaved }: { treatment: Treatment; onClose: () => void; onSaved: () => void }) {
  const { farmId } = useFarm()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [productId, setProductId] = useState('')
  const products = useLoad('products', () => allPages<Product>('/api/medicine-products'))
  const batches = useLoad(`batches:${farmId}`, () => allPages<Batch>(`/api/farms/${farmId}/medicine-batches`))
  const choices = (batches.data ?? []).filter((batch) => batch.medicineProductId === productId)
  return (
    <Modal title={`Medicine for ${treatment.animalNumber}`} wide>
      <ul className="plain">
        {(treatment.medications ?? []).map((item) => (
          <li key={item.id}>{item.medicineName} · {amount(item.quantityUsed, 3)} {unitLabel(item.doseUnit) || item.doseUnit} · {labelEnum(item.route)}</li>
        ))}
      </ul>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(`/api/treatments/${treatment.id}/medications`, {
            method: 'POST',
            body: JSON.stringify({
              medicineProductId: field(data, 'medicineProductId'),
              batchId: field(data, 'batchId'),
              doseAmount: asNumber(data, 'doseAmount'),
              doseUnit: field(data, 'doseUnit'),
              route: field(data, 'route'),
              administrationsCount: asNumber(data, 'administrationsCount'),
              quantityUsed: asNumber(data, 'quantityUsed'),
              frequency: field(data, 'frequency'),
              durationText: field(data, 'durationText'),
              milkWithdrawalHours: asNumber(data, 'milkWithdrawalHours'),
              meatWithdrawalHours: asNumber(data, 'meatWithdrawalHours'),
              notes: field(data, 'notes'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <p className="hint">An injection, tablet, or other dose is removed from the batch you choose. Quantity used is what leaves the store.</p>
        <Banner>{error}</Banner>
        <div className="form-grid">
          <SelectField label="Product" name="medicineProductId" required onChange={setProductId}>
            <option value="">Select</option>
            {(products.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {labelEnum(item.form)} · {unitLabel(item.baseUnit)}</option>)}
          </SelectField>
          <SelectField key={productId} label="Batch" name="batchId" required>
            <option value="">Select</option>
            {choices.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber} · {amount(batch.quantityOnHand, 2)} {unitLabel(batch.baseUnit)} on hand</option>)}
          </SelectField>
          {productId && choices.length === 0 ? <p className="hint span-2">This medicine is not in farm stock. Receive it under Medicine first.</p> : null}
          <TextField label="Dose amount" name="doseAmount" type="number" required min="0.001" step="0.001" />
          <SelectField key={`unit-${productId}`} label="Dose unit" name="doseUnit" required defaultValue={(products.data ?? []).find((item) => item.id === productId)?.baseUnit ?? 'ML'}>
            {MEDICINE_UNITS.map((item) => <option key={item} value={item}>{unitLabel(item)}</option>)}
          </SelectField>
          <SelectField key={`route-${productId}`} label="Route" name="route" required defaultValue={defaultRoute((products.data ?? []).find((item) => item.id === productId)?.form)}>
            <EnumOptions values={ADMIN_ROUTES} />
          </SelectField>
          <TextField label="Times given" name="administrationsCount" type="number" required min={1} defaultValue={1} />
          <TextField label={productId ? `Quantity used (${unitLabel((products.data ?? []).find((item) => item.id === productId)?.baseUnit)})` : 'Quantity used'} name="quantityUsed" type="number" required min="0.001" step="0.001" />
          <TextField label="Frequency" name="frequency" />
          <TextField label="Duration" name="durationText" />
          <TextField label="Milk withdrawal hours" name="milkWithdrawalHours" type="number" min={0} />
          <TextField label="Meat withdrawal hours" name="meatWithdrawalHours" type="number" min={0} />
          <AreaField className="span-2" label="Notes" name="notes" />
        </div>
        <FormFooter pending={pending} onCancel={onClose} label="Add medicine" />
      </form>
    </Modal>
  )
}
