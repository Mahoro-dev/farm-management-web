import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ANIMAL_WRITE, BREEDING_WRITE, WEIGHT_WRITE, canOnFarm, isOrgAdmin } from '../access'
import {
  allPages,
  api,
  type Animal,
  type AnimalEvent,
  type Breed,
  type Breeding,
  type FarmHistory,
  type Identifier,
  type MilkRecord,
  type Page,
  type Pregnancy,
  type SemenStraw,
  type Species,
  type Weight,
} from '../api'
import { useAuth } from '../auth'
import { ACQUISITION, ANIMAL_STATUS, CALVING_OUTCOMES, EVENT_TYPES, IDENTIFIER_TYPES, SEX } from '../enums'
import { useFarm } from '../farm'
import { amount, asInstant, asNumber, checked, field, formatWhen, labelEnum, localInput, saveForm } from '../format'
import { useLoad } from '../load'
import {
  AnimalOptions,
  AreaField,
  Banner,
  Button,
  CheckField,
  EnumOptions,
  FatherLabel,
  FormFooter,
  Modal,
  PageHead,
  Pill,
  SelectField,
  TextField,
} from '../ui'

type Detail = {
  animal: Animal
  identifiers: Identifier[]
  history: FarmHistory[]
  weights: Page<Weight>
  events: Page<AnimalEvent>
  milk: Page<MilkRecord>
}

export function AnimalPage() {
  const { id = '' } = useParams()
  const detail = useLoad(`animal:${id}`, () => loadDetail(id))
  const animal = detail.data?.animal
  return (
    <div className="stack">
      <p><Link to="/animals">Back to herd</Link></p>
      <Banner>{detail.error}</Banner>
      {detail.loading && !animal ? <p className="muted">Loading animal…</p> : null}
      {animal && detail.data ? <AnimalBody detail={detail.data} reload={detail.reload} /> : null}
    </div>
  )
}

async function loadDetail(id: string): Promise<Detail> {
  const [animal, identifiers, history, weights, events, milk] = await Promise.all([
    api<Animal>(`/api/animals/${id}`),
    api<Identifier[]>(`/api/animals/${id}/identifiers`),
    api<FarmHistory[]>(`/api/animals/${id}/farm-history`),
    api<Page<Weight>>(`/api/animals/${id}/weights?page=0&size=20`),
    api<Page<AnimalEvent>>(`/api/animals/${id}/events?page=0&size=20`),
    api<Page<MilkRecord>>(`/api/animals/${id}/milk-records?page=0&size=10`),
  ])
  return { animal, identifiers, history, weights, events, milk }
}

function AnimalBody({ detail, reload }: { detail: Detail; reload: () => void }) {
  const { user } = useAuth()
  const { farms } = useFarm()
  const { animal } = detail
  const [dialog, setDialog] = useState<string | null>(null)
  const canEdit = animal.currentFarmId
    ? canOnFarm(user, animal.currentFarmId, ANIMAL_WRITE)
    : isOrgAdmin(user)
  const canWeigh = canOnFarm(user, animal.currentFarmId, WEIGHT_WRITE)
  const close = () => setDialog(null)

  return (
    <>
      <PageHead
        title={animal.name || animal.animalNumber}
        lede={`${animal.animalNumber} · ${animal.currentFarmName ?? 'No current farm'}`}
        action={<Pill value={animal.status} />}
      />
      <div className="row-actions">
        {canEdit ? <Button onClick={() => setDialog('edit')}>Edit</Button> : null}
        {canEdit ? <Button onClick={() => setDialog('status')}>Change status</Button> : null}
        {canEdit ? <Button onClick={() => setDialog('transfer')}>Transfer</Button> : null}
        {canEdit ? <Button onClick={() => setDialog('tag')}>Add tag</Button> : null}
        {canWeigh ? <Button onClick={() => setDialog('weight')}>Record weight</Button> : null}
        {canWeigh ? <Button onClick={() => setDialog('event')}>Record event</Button> : null}
      </div>
      <section className="split">
        <article className="card">
          <h2>Profile</h2>
          <dl className="facts">
            <dt>Sex</dt><dd>{labelEnum(animal.sex)}</dd>
            <dt>Species</dt><dd>{animal.speciesCode || animal.speciesId}</dd>
            <dt>Breed</dt><dd>{animal.breedName || '—'}</dd>
            <dt>Born</dt><dd>{formatWhen(animal.dateOfBirth)}{animal.birthDateEstimated ? ' (estimated)' : ''}</dd>
            <dt>Acquired</dt><dd>{labelEnum(animal.acquisitionType)} · {formatWhen(animal.acquiredOn)}</dd>
            <dt>Dam</dt><dd>{animal.damId ? <Link to={`/animals/${animal.damId}`}>{animal.damNumber}</Link> : '—'}</dd>
            <dt>Sire</dt><dd><FatherLabel sireId={animal.sireId} sireNumber={animal.sireNumber} artificialCode={animal.artificialSireCode} /></dd>
            <dt>Markings</dt><dd>{animal.colorMarkings || '—'}</dd>
            <dt>Tag</dt><dd>{animal.primaryIdentifier || '—'}</dd>
            <dt>Status since</dt><dd>{formatWhen(animal.statusChangedOn)}</dd>
            <dt>Notes</dt><dd>{animal.notes || '—'}</dd>
          </dl>
        </article>
        <article className="card">
          <h2>Tags</h2>
          {detail.identifiers.length === 0 ? <p className="muted">No identifiers yet.</p> : (
            <ul className="plain">
              {detail.identifiers.map((item) => (
                <li key={item.id}>
                  <strong>{item.identifierValue}</strong> · {labelEnum(item.identifierType)}
                  {item.primary ? ' · primary' : ''}
                  {item.retiredAt ? ` · retired ${formatWhen(item.retiredAt)}` : ''}
                  {!item.retiredAt && canEdit ? <RetireTag id={item.id} onSaved={reload} /> : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      {animal.sex === 'FEMALE' ? <CowBreeding animal={animal} canWrite={canOnFarm(user, animal.currentFarmId, BREEDING_WRITE)} /> : null}
      <section className="card">
        <h2>Farm history</h2>
        <HistoryTable rows={detail.history} />
      </section>
      <section className="split">
        <article className="card">
          <h2>Weights</h2>
          <SimpleList empty="No weights yet" rows={detail.weights.content.map((item) => (
            `${formatWhen(item.measuredAt)} · ${amount(item.weightKg, 1)} kg${item.measurementMethod ? ` · ${item.measurementMethod}` : ''}`
          ))} />
        </article>
        <article className="card">
          <h2>Events</h2>
          <SimpleList empty="No events yet" rows={detail.events.content.map((item) => (
            `${formatWhen(item.eventAt)} · ${labelEnum(item.eventType)}${item.details ? ` · ${item.details}` : ''}`
          ))} />
        </article>
      </section>
      <section className="card">
        <h2>Recent milk</h2>
        {detail.milk.content.length === 0 ? <p className="muted">No milk records.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Shift</th><th>Stage</th><th>Liters</th><th>Fat %</th><th>Protein %</th></tr></thead>
              <tbody>
                {detail.milk.content.map((item) => (
                  <tr key={item.id}>
                    <td>{formatWhen(item.milkingDate)}</td>
                    <td>{item.shiftName}</td>
                    <td>{item.lactationStageName || '—'}</td>
                    <td className="num">{amount(item.quantityLiters, 2)}</td>
                    <td className="num">{amount(item.fatPercent, 2)}</td>
                    <td className="num">{amount(item.proteinPercent, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {dialog === 'edit' ? <EditAnimal animal={animal} onClose={close} onSaved={reload} /> : null}
      {dialog === 'status' ? <StatusDialog animal={animal} onClose={close} onSaved={reload} /> : null}
      {dialog === 'transfer' ? <TransferDialog animal={animal} farms={farms} onClose={close} onSaved={reload} /> : null}
      {dialog === 'tag' ? <TagDialog animalId={animal.id} onClose={close} onSaved={reload} /> : null}
      {dialog === 'weight' ? <WeightDialog animal={animal} onClose={close} onSaved={reload} /> : null}
      {dialog === 'event' ? <EventDialog animal={animal} onClose={close} onSaved={reload} /> : null}
    </>
  )
}

function SimpleList({ rows, empty }: { rows: string[]; empty: string }) {
  if (rows.length === 0) return <p className="muted">{empty}</p>
  return <ul className="plain">{rows.map((row, index) => <li key={`${index}:${row}`}>{row}</li>)}</ul>
}

function HistoryTable({ rows }: { rows: FarmHistory[] }) {
  if (rows.length === 0) return <p className="muted">No farm history.</p>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Farm</th><th>Joined</th><th>Left</th><th>Reason</th><th>Notes</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.farmName}</td>
              <td>{formatWhen(row.joinedOn)}</td>
              <td>{formatWhen(row.leftOn)}</td>
              <td>{labelEnum(row.transferReason)}</td>
              <td>{row.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RetireTag({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(`/api/animal-identifiers/${id}/retire`, {
            method: 'POST',
            body: JSON.stringify({ retiredAt: field(data, 'retiredAt') }),
          })
          onSaved()
        })
      }}
    >
      <input type="date" name="retiredAt" required aria-label="Retired on" />
      <Button type="submit" disabled={pending}>Retire</Button>
      {error ? <span className="banner danger">{error}</span> : null}
    </form>
  )
}

function EditAnimal({ animal, onClose, onSaved }: { animal: Animal; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const species = useLoad('species', () => api<Species[]>('/api/species'))
  const breeds = useLoad('breeds', () => allPages<Breed>('/api/breeds'))
  const females = useLoad(`dams:${animal.id}`, () => allPages<Animal>('/api/animals', { sex: 'FEMALE', status: 'ACTIVE' }))
  const males = useLoad(`sires:${animal.id}`, () => allPages<Animal>('/api/animals', { sex: 'MALE', status: 'ACTIVE' }))
  const straws = useLoad('straws-edit', () => allPages<SemenStraw>('/api/semen-straws'))
  return (
    <Modal title="Edit animal" wide>
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/animals/${animal.id}`, {
              method: 'PUT',
              body: JSON.stringify({
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
              }),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        <div className="form-grid">
          <TextField label="Animal number" name="animalNumber" required defaultValue={animal.animalNumber} />
          <TextField label="Name" name="name" defaultValue={animal.name} />
          <SelectField label="Species" name="speciesId" required defaultValue={String(animal.speciesId)}>
            {(species.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField label="Breed" name="breedId" defaultValue={animal.breedId ?? ''}>
            <option value="">None</option>
            {(breeds.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField label="Sex" name="sex" required defaultValue={animal.sex}><EnumOptions values={SEX} /></SelectField>
          <SelectField label="How acquired" name="acquisitionType" required defaultValue={animal.acquisitionType}><EnumOptions values={ACQUISITION} /></SelectField>
          <TextField label="Date of birth" name="dateOfBirth" type="date" defaultValue={animal.dateOfBirth} />
          <TextField label="Acquired on" name="acquiredOn" type="date" defaultValue={animal.acquiredOn} />
          <CheckField name="birthDateEstimated" label="Birth date is estimated" defaultChecked={animal.birthDateEstimated} />
          <TextField className="span-2" label="Color and markings" name="colorMarkings" defaultValue={animal.colorMarkings} />
          <SelectField label="Dam" name="damId" defaultValue={animal.damId ?? ''}>
            <AnimalOptions animals={(females.data ?? []).filter((item) => item.id !== animal.id)} blank="None" />
          </SelectField>
          <SelectField label="Sire on the farm" name="sireId" defaultValue={animal.sireId ?? ''}>
            <AnimalOptions animals={(males.data ?? []).filter((item) => item.id !== animal.id)} blank="None" />
          </SelectField>
          <SelectField className="span-2" label="Artificial father (straw)" name="semenStrawId" defaultValue={animal.semenStrawId ?? ''}>
            <option value="">None</option>
            {(straws.data ?? []).filter((item) => item.active || item.id === animal.semenStrawId).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
          </SelectField>
          <AreaField className="span-2" label="Notes" name="notes" defaultValue={animal.notes} />
        </div>
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function StatusDialog({ animal, onClose, onSaved }: { animal: Animal; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title="Change status">
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/animals/${animal.id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({
                status: field(data, 'status'),
                statusChangedOn: field(data, 'statusChangedOn'),
                notes: field(data, 'notes'),
              }),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        <SelectField label="Status" name="status" required defaultValue={animal.status}><EnumOptions values={ANIMAL_STATUS} /></SelectField>
        <TextField label="Changed on" name="statusChangedOn" type="date" required />
        <AreaField label="Notes" name="notes" />
        <FormFooter pending={pending} onCancel={onClose} label="Update status" />
      </form>
    </Modal>
  )
}

function TransferDialog({
  animal,
  farms,
  onClose,
  onSaved,
}: {
  animal: Animal
  farms: { id: string; name: string; farmCode: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const destinations = farms.filter((farm) => farm.id !== animal.currentFarmId)
  return (
    <Modal title="Transfer">
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/animals/${animal.id}/transfers`, {
              method: 'POST',
              body: JSON.stringify({
                toFarmId: field(data, 'toFarmId'),
                transferOn: field(data, 'transferOn'),
                notes: field(data, 'notes'),
              }),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        <SelectField label="Destination farm" name="toFarmId" required>
          <option value="">Select</option>
          {destinations.map((farm) => <option key={farm.id} value={farm.id}>{farm.farmCode} · {farm.name}</option>)}
        </SelectField>
        <TextField label="Transfer date" name="transferOn" type="date" required />
        <AreaField label="Notes" name="notes" />
        <FormFooter pending={pending} onCancel={onClose} label="Transfer" />
      </form>
    </Modal>
  )
}

function TagDialog({ animalId, onClose, onSaved }: { animalId: string; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title="Add tag">
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/animals/${animalId}/identifiers`, {
              method: 'POST',
              body: JSON.stringify({
                identifierType: field(data, 'identifierType'),
                identifierValue: field(data, 'identifierValue'),
                issuingAuthority: field(data, 'issuingAuthority'),
                issuedAt: field(data, 'issuedAt'),
                primary: checked(data, 'primary'),
                notes: field(data, 'notes'),
              }),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        <SelectField label="Type" name="identifierType" required defaultValue="VISUAL_EAR_TAG"><EnumOptions values={IDENTIFIER_TYPES} /></SelectField>
        <TextField label="Value" name="identifierValue" required />
        <TextField label="Issuing authority" name="issuingAuthority" />
        <TextField label="Issued on" name="issuedAt" type="date" />
        <CheckField name="primary" label="Primary identifier" defaultChecked />
        <AreaField label="Notes" name="notes" />
        <FormFooter pending={pending} onCancel={onClose} label="Add tag" />
      </form>
    </Modal>
  )
}

function WeightDialog({ animal, onClose, onSaved }: { animal: Animal; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title="Record weight">
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/animals/${animal.id}/weights`, {
              method: 'POST',
              body: JSON.stringify({
                farmId: animal.currentFarmId,
                measuredAt: asInstant(data, 'measuredAt'),
                weightKg: asNumber(data, 'weightKg'),
                measurementMethod: field(data, 'measurementMethod'),
                notes: field(data, 'notes'),
              }),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        <TextField label="Measured at" name="measuredAt" type="datetime-local" defaultValue={localInput(new Date().toISOString())} />
        <TextField label="Weight (kg)" name="weightKg" type="number" required min="0.01" step="0.01" />
        <TextField label="Method" name="measurementMethod" placeholder="Scale" />
        <AreaField label="Notes" name="notes" />
        <FormFooter pending={pending} onCancel={onClose} label="Record" />
      </form>
    </Modal>
  )
}

function EventDialog({ animal, onClose, onSaved }: { animal: Animal; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title="Record event">
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/animals/${animal.id}/events`, {
              method: 'POST',
              body: JSON.stringify({
                farmId: animal.currentFarmId,
                eventType: field(data, 'eventType'),
                eventAt: asInstant(data, 'eventAt'),
                details: field(data, 'details'),
              }),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        <SelectField label="Event" name="eventType" required defaultValue="OTHER"><EnumOptions values={EVENT_TYPES} /></SelectField>
        <TextField label="When" name="eventAt" type="datetime-local" defaultValue={localInput(new Date().toISOString())} />
        <AreaField label="Details" name="details" />
        <FormFooter pending={pending} onCancel={onClose} label="Record" />
      </form>
    </Modal>
  )
}

function expectedCalving(breedingAt: string): string {
  const date = new Date(breedingAt)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  date.setUTCDate(date.getUTCDate() + 280)
  const today = new Date()
  const expected = date.getTime() < today.getTime() ? today : date
  return expected.toISOString().slice(0, 10)
}

function CowBreeding({ animal, canWrite }: { animal: Animal; canWrite: boolean }) {
  const matings = useLoad(`cow-matings:${animal.id}`, () => allPages<Breeding>(`/api/animals/${animal.id}/breeding-records`))
  const pregnancies = useLoad(`cow-preg:${animal.id}`, () => allPages<Pregnancy>(`/api/animals/${animal.id}/pregnancies`))
  const [confirm, setConfirm] = useState<Breeding | null>(null)
  const [calve, setCalve] = useState<{ mating?: Breeding; pregnancy?: Pregnancy } | null>(null)
  const pending = (matings.data ?? []).filter((row) => (row.outcome ?? 'PENDING') === 'PENDING')
  const open = (pregnancies.data ?? []).filter((row) => row.status === 'SUSPECTED' || row.status === 'CONFIRMED')
  const reload = () => {
    matings.reload()
    pregnancies.reload()
  }
  if (!matings.data && !pregnancies.data && (matings.loading || pregnancies.loading)) return null
  if (pending.length === 0 && open.length === 0 && !matings.error && !pregnancies.error) return null
  const farmId = animal.currentFarmId
  return (
    <section className="card">
      <div className="page-head">
        <h2>Breeding follow-up</h2>
        <Link to="/breeding">Open breeding</Link>
      </div>
      <Banner>{matings.error || pregnancies.error}</Banner>
      {pending.length > 0 ? (
        <>
          <p className="hint">Pending matings can be confirmed or calved from this profile.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Method</th><th>Father</th><th></th></tr></thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.breedingAt)}</td>
                    <td>{labelEnum(row.breedingMethod)}</td>
                    <td><FatherLabel sireId={row.sireId} sireNumber={row.sireNumber} artificialCode={row.breedingMethod === 'ARTIFICIAL_INSEMINATION' || row.breedingMethod === 'EMBRYO_TRANSFER' ? row.semenBatchNumber : null} /></td>
                    <td className="row-actions">
                      {canWrite && farmId ? <Button onClick={() => setConfirm(row)}>Confirm pregnancy</Button> : null}
                      {canWrite && farmId ? <Button tone="primary" onClick={() => setCalve({ mating: row })}>Record calving</Button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {open.length > 0 ? (
        <>
          <h2>Open pregnancies</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Status</th><th>Confirmed</th><th>Expected</th><th></th></tr></thead>
              <tbody>
                {open.map((row) => (
                  <tr key={row.id}>
                    <td><Pill value={row.status} /></td>
                    <td>{formatWhen(row.confirmedAt)}</td>
                    <td>{formatWhen(row.expectedCalvingOn)}</td>
                    <td>{canWrite && farmId ? <Button tone="primary" onClick={() => setCalve({ pregnancy: row, mating: (matings.data ?? []).find((item) => item.id === row.breedingRecordId) })}>Record calving</Button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {confirm && farmId ? <ConfirmPregnancy farmId={farmId} animal={animal} mating={confirm} onClose={() => setConfirm(null)} onSaved={reload} /> : null}
      {calve && farmId ? <ProfileCalving farmId={farmId} animal={animal} mating={calve.mating} pregnancy={calve.pregnancy} onClose={() => setCalve(null)} onSaved={reload} /> : null}
    </section>
  )
}

function ConfirmPregnancy({ farmId, animal, mating, onClose, onSaved }: { farmId: string; animal: Animal; mating: Breeding; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title="Confirm pregnancy">
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(`/api/farms/${farmId}/pregnancies`, {
            method: 'POST',
            body: JSON.stringify({
              cowId: animal.id,
              breedingRecordId: mating.id,
              confirmedAt: asInstant(data, 'confirmedAt'),
              confirmationMethod: field(data, 'confirmationMethod'),
              expectedCalvingOn: field(data, 'expectedCalvingOn'),
              status: 'CONFIRMED',
              notes: field(data, 'notes'),
            }),
          })
          onSaved()
          onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <p>{animal.animalNumber} · mated {formatWhen(mating.breedingAt)}</p>
        <TextField label="Confirmed at" name="confirmedAt" type="datetime-local" required defaultValue={localInput(new Date().toISOString())} />
        <TextField label="Confirmation method" name="confirmationMethod" placeholder="Palpation or ultrasound" />
        <TextField label="Expected calving" name="expectedCalvingOn" type="date" required defaultValue={expectedCalving(mating.breedingAt)} />
        <AreaField label="Notes" name="notes" />
        <FormFooter pending={pending} onCancel={onClose} label="Confirm" />
      </form>
    </Modal>
  )
}

function ProfileCalving({ farmId, animal, mating, pregnancy, onClose, onSaved }: { farmId: string; animal: Animal; mating?: Breeding; pregnancy?: Pregnancy; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [createCalf, setCreateCalf] = useState(true)
  const breeds = useLoad('breeds-calf-profile', () => allPages<Breed>('/api/breeds'))
  return (
    <Modal title="Record calving" wide>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          let pregnancyId = pregnancy?.id
          const calvedAt = asInstant(data, 'calvedAt')
          if (!pregnancyId && mating) {
            const created = await api<Pregnancy>(`/api/farms/${farmId}/pregnancies`, {
              method: 'POST',
              body: JSON.stringify({
                cowId: animal.id,
                breedingRecordId: mating.id,
                confirmedAt: calvedAt,
                status: 'CONFIRMED',
                expectedCalvingOn: calvedAt?.slice(0, 10),
              }),
            })
            pregnancyId = created.id
          }
          const calf = createCalf ? {
            animalNumber: field(data, 'calfNumber'),
            name: field(data, 'calfName'),
            sex: field(data, 'calfSex'),
            breedId: field(data, 'breedId'),
            colorMarkings: field(data, 'colorMarkings'),
          } : undefined
          await api(`/api/farms/${farmId}/calvings`, {
            method: 'POST',
            body: JSON.stringify({
              damId: animal.id,
              sireId: mating?.semenStrawId ? null : mating?.sireId,
              semenStrawId: mating?.semenStrawId,
              pregnancyRecordId: pregnancyId,
              calfId: createCalf ? undefined : field(data, 'calfId'),
              createCalf: calf,
              calvedAt,
              outcome: field(data, 'outcome'),
              assistanceRequired: checked(data, 'assistanceRequired'),
              numberOfCalves: asNumber(data, 'numberOfCalves'),
              complications: field(data, 'complications'),
            }),
          })
          onSaved()
          onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <p>{animal.animalNumber}{mating ? ` · mated ${formatWhen(mating.breedingAt)}` : ''}</p>
        <div className="form-grid">
          <TextField label="When" name="calvedAt" type="datetime-local" required defaultValue={localInput(new Date().toISOString())} />
          <SelectField label="Outcome" name="outcome" required defaultValue="LIVE"><EnumOptions values={CALVING_OUTCOMES} /></SelectField>
          <TextField label="Number of calves" name="numberOfCalves" type="number" required min={1} defaultValue={1} />
          <CheckField name="assistanceRequired" label="Assistance required" />
          <AreaField className="span-2" label="Complications" name="complications" />
        </div>
        <label className="check"><input type="checkbox" checked={createCalf} onChange={(event) => setCreateCalf(event.target.checked)} /> Register a new calf</label>
        {createCalf ? (
          <div className="form-grid">
            <TextField label="Calf number" name="calfNumber" required />
            <TextField label="Calf name" name="calfName" />
            <SelectField label="Calf sex" name="calfSex" required defaultValue="FEMALE"><EnumOptions values={SEX} /></SelectField>
            <SelectField label="Breed" name="breedId" defaultValue={animal.breedId ?? ''}>
              <option value="">None</option>
              {(breeds.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            <TextField className="span-2" label="Color and markings" name="colorMarkings" />
          </div>
        ) : (
          <TextField label="Existing calf id" name="calfId" required />
        )}
        <FormFooter pending={pending} onCancel={onClose} label="Record calving" />
      </form>
    </Modal>
  )
}
