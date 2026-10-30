import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MILK_WRITE, SHIFT_WRITE, canOnFarm } from '../access'
import { allPages, api, type Animal, type LactationStage, type MilkRecord, type Page, type Shift } from '../api'
import { useAuth } from '../auth'
import { useFarm } from '../farm'
import { amount, asNumber, checked, dateInput, field, formatWhen, saveForm, timeInput } from '../format'
import { useLoad } from '../load'
import { NeedFarm } from '../shell'
import { AnimalOptions, Banner, Button, CheckField, FormFooter, Modal, PageHead, Pager, TextField } from '../ui'

export function MilkPage() {
  return <NeedFarm><MilkBody /></NeedFarm>
}

function MilkBody() {
  const { user } = useAuth()
  const { farmId } = useFarm()
  const [from, setFrom] = useState(dateInput(-30))
  const [to, setTo] = useState(dateInput())
  const [page, setPage] = useState(0)
  const [shiftOpen, setShiftOpen] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [editRecord, setEditRecord] = useState<MilkRecord | null>(null)
  const shifts = useLoad(`shifts:${farmId}`, () => api<Shift[]>(`/api/farms/${farmId}/shifts`))
  const stages = useLoad('lactation-stages', () => api<LactationStage[]>('/api/lactation-stages'))
  const records = useLoad(`milk:${farmId}:${from}:${to}:${page}`, () =>
    api<Page<MilkRecord>>(`/api/farms/${farmId}/milk-records?from=${from}&to=${to}&page=${page}&size=20`),
  )
  const cows = useLoad(`cows:${farmId}`, () => allPages<Animal>('/api/animals', { farmId, sex: 'FEMALE', status: 'ACTIVE' }))
  const canShift = canOnFarm(user, farmId, SHIFT_WRITE)
  const canMilk = canOnFarm(user, farmId, MILK_WRITE)
  const refresh = () => { shifts.reload(); records.reload() }

  return (
    <div className="stack">
      <PageHead
        title="Milk"
        lede="Shifts, lactation stage, and liters. Only active females can be milked."
        action={canMilk ? <Button tone="primary" onClick={() => setRecordOpen(true)}>Record milk</Button> : null}
      />
      <section className="card">
        <div className="page-head">
          <h2>Shifts</h2>
          {canShift ? <Button onClick={() => setShiftOpen(true)}>Add shift</Button> : null}
        </div>
        <Banner>{shifts.error}</Banner>
        {(shifts.data ?? []).length === 0 ? <p className="muted">No milking shifts yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Order</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {(shifts.data ?? []).map((shift) => (
                  <tr key={shift.id}>
                    <td>{shift.name}</td>
                    <td>{timeInput(shift.startTime) || '—'}</td>
                    <td>{timeInput(shift.endTime) || '—'}</td>
                    <td>{shift.displayOrder}</td>
                    <td>{shift.active ? 'Yes' : 'No'}</td>
                    <td>{canShift ? <Button onClick={() => setEditShift(shift)}>Edit</Button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Records</h2>
        <div className="filters">
          <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0) }} />
          <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0) }} />
        </div>
        <Banner>{records.error}</Banner>
        {(records.data?.content.length ?? 0) === 0 ? <p className="muted">No milk in this range.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Animal</th><th>Shift</th><th>Stage</th><th>Liters</th><th>Fat %</th><th>Protein %</th><th></th></tr></thead>
              <tbody>
                {records.data?.content.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.milkingDate)}</td>
                    <td><Link to={`/animals/${row.animalId}`}>{row.animalNumber}</Link></td>
                    <td>{row.shiftName}</td>
                    <td>{row.lactationStageName || '—'}</td>
                    <td className="num">{amount(row.quantityLiters, 2)}</td>
                    <td className="num">{amount(row.fatPercent, 2)}</td>
                    <td className="num">{amount(row.proteinPercent, 2)}</td>
                    <td>{canMilk ? <Button onClick={() => setEditRecord(row)}>Edit</Button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={records.data?.page ?? 0} totalPages={records.data?.totalPages ?? 0} onPage={setPage} />
          </div>
        )}
      </section>
      {shiftOpen ? <ShiftForm farmId={farmId} onClose={() => setShiftOpen(false)} onSaved={refresh} /> : null}
      {editShift ? <ShiftForm farmId={farmId} shift={editShift} onClose={() => setEditShift(null)} onSaved={refresh} /> : null}
      {recordOpen ? (
        <MilkForm farmId={farmId} animals={cows.data ?? []} shifts={shifts.data ?? []} stages={stages.data ?? []} onClose={() => setRecordOpen(false)} onSaved={records.reload} />
      ) : null}
      {editRecord ? (
        <MilkForm farmId={farmId} record={editRecord} animals={cows.data ?? []} shifts={shifts.data ?? []} stages={stages.data ?? []} onClose={() => setEditRecord(null)} onSaved={records.reload} />
      ) : null}
    </div>
  )
}

function ShiftForm({ farmId, shift, onClose, onSaved }: { farmId: string; shift?: Shift; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={shift ? 'Edit shift' : 'Add shift'}>
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            const body = {
              name: field(data, 'name'),
              startTime: field(data, 'startTime'),
              endTime: field(data, 'endTime'),
              displayOrder: asNumber(data, 'displayOrder'),
              active: checked(data, 'active'),
            }
            await api(shift ? `/api/shifts/${shift.id}` : `/api/farms/${farmId}/shifts`, {
              method: shift ? 'PUT' : 'POST',
              body: JSON.stringify(body),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        <TextField label="Name" name="name" required defaultValue={shift?.name} placeholder="Morning" />
        <TextField label="Start" name="startTime" type="time" defaultValue={timeInput(shift?.startTime)} />
        <TextField label="End" name="endTime" type="time" defaultValue={timeInput(shift?.endTime)} />
        <TextField label="Display order" name="displayOrder" type="number" required min={1} defaultValue={shift?.displayOrder ?? 1} />
        <CheckField name="active" label="Active" defaultChecked={shift?.active ?? true} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function MilkForm({
  farmId,
  record,
  animals,
  shifts,
  stages,
  onClose,
  onSaved,
}: {
  farmId: string
  record?: MilkRecord
  animals: Animal[]
  shifts: Shift[]
  stages: LactationStage[]
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [stageCode, setStageCode] = useState(record?.lactationStage ?? '')
  const stage = stages.find((item) => item.code === stageCode)
  return (
    <Modal title={record ? 'Edit milk record' : 'Record milk'}>
      <form
        className="stack"
        onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            const body = {
              animalId: field(data, 'animalId'),
              shiftId: field(data, 'shiftId'),
              milkingDate: field(data, 'milkingDate'),
              quantityLiters: asNumber(data, 'quantityLiters'),
              lactationStage: field(data, 'lactationStage'),
              fatPercent: asNumber(data, 'fatPercent'),
              proteinPercent: asNumber(data, 'proteinPercent'),
              somaticCellCount: asNumber(data, 'somaticCellCount'),
              notes: field(data, 'notes'),
            }
            await api(record ? `/api/milk-records/${record.id}` : `/api/farms/${farmId}/milk-records`, {
              method: record ? 'PUT' : 'POST',
              body: JSON.stringify(body),
            })
            onSaved()
            onClose()
          })
        }}
      >
        <Banner>{error}</Banner>
        {shifts.length === 0 ? <Banner tone="info">Add a milking shift before recording milk.</Banner> : null}
        {stages.length === 0 ? <Banner tone="info">Lactation stages are not on this desk yet.</Banner> : null}
        <label className="field">
          <span>Animal</span>
          <select name="animalId" required defaultValue={record?.animalId ?? ''}>
            <AnimalOptions
              animals={animals}
              current={record ? { id: record.animalId, label: record.animalNumber } : null}
            />
          </select>
        </label>
        <label className="field">
          <span>Shift</span>
          <select name="shiftId" required defaultValue={record?.shiftId ?? ''}>
            <option value="">Select</option>
            {shifts.filter((shift) => shift.active || shift.id === record?.shiftId).map((shift) => (
              <option key={shift.id} value={shift.id}>{shift.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Stage</span>
          <select name="lactationStage" required value={stageCode} onChange={(event) => setStageCode(event.target.value)}>
            <option value="">Select</option>
            {stages.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
          {stage ? <p className="hint">{stage.meaning}</p> : null}
        </label>
        <TextField label="Date" name="milkingDate" type="date" defaultValue={record?.milkingDate ?? dateInput()} />
        <TextField label="Liters" name="quantityLiters" type="number" required min={0} step="0.01" defaultValue={record?.quantityLiters} />
        <TextField label="Fat %" name="fatPercent" type="number" min={0} max={100} step="0.01" defaultValue={record?.fatPercent} />
        <TextField label="Protein %" name="proteinPercent" type="number" min={0} max={100} step="0.01" defaultValue={record?.proteinPercent} />
        <TextField label="Somatic cell count" name="somaticCellCount" type="number" min={0} step="1" defaultValue={record?.somaticCellCount} />
        <label className="field"><span>Notes</span><textarea name="notes" defaultValue={record?.notes ?? ''} /></label>
        <FormFooter pending={pending} onCancel={onClose} label={record ? 'Save' : 'Record'} />
      </form>
    </Modal>
  )
}
