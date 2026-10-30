import { useState } from 'react'
import { INVENTORY_WRITE, CLINICAL_WRITE, canAny, canOnFarm } from '../access'
import { allPages, api, type Animal, type Batch, type Movement, type Page, type Product, type Supplier, type Treatment } from '../api'
import { useAuth } from '../auth'
import { ADMIN_ROUTES, MEDICINE_FORMS, MEDICINE_UNITS, MOVEMENT_TYPES, SUPPLIER_KINDS, countableUnit, defaultRoute, defaultUnit } from '../enums'
import { useFarm } from '../farm'
import { amount, asInstant, asNumber, checked, field, formatWhen, labelEnum, localInput, rwf, saveForm, signedAmount, unitLabel } from '../format'
import { useLoad } from '../load'
import { NeedFarm } from '../shell'
import { AreaField, AnimalOptions, Banner, Button, CheckField, EnumOptions, FormFooter, Modal, PageHead, Pager, SelectField, Tabs, TextField } from '../ui'

export function MedicinePage() {
  return <NeedFarm><MedicineBody /></NeedFarm>
}

function MedicineBody() {
  const { farmId } = useFarm()
  const [tab, setTab] = useState<'stock' | 'products' | 'suppliers'>('stock')
  return (
    <div className="stack">
      <PageHead title="Medicine" lede="Record use when a cow is given a tablet, an injection, or a vaccine. That quantity is taken out of farm stock. Suppliers and pharmacies are chosen from the list." />
      <Tabs value={tab} onChange={setTab} options={[{ id: 'stock', label: 'Farm stock' }, { id: 'products', label: 'Products' }, { id: 'suppliers', label: 'Suppliers' }]} />
      {tab === 'stock' ? <Stock farmId={farmId} /> : null}
      {tab === 'products' ? <Products /> : null}
      {tab === 'suppliers' ? <Suppliers /> : null}
    </div>
  )
}

function productLabel(item: Product): string {
  const detail = item.formulation ? ` · ${item.formulation}` : ''
  return `${item.name} · ${labelEnum(item.form)} · ${unitLabel(item.baseUnit)}${detail}`
}

function onHand(row: Pick<Batch, 'quantityOnHand' | 'baseUnit'>): string {
  return `${amount(row.quantityOnHand, countableUnit(row.baseUnit) ? 0 : 3)} ${unitLabel(row.baseUnit)}`.trim()
}

function Products() {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Product | null>(null)
  const query = useLoad(`products:${page}`, () => api<Page<Product>>(`/api/medicine-products?page=${page}&size=20`))
  const canWrite = canAny(user, INVENTORY_WRITE)
  return (
    <section className="card">
      <div className="page-head"><h2>Products</h2>{canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>Add product</Button> : null}</div>
      <Banner>{query.error}</Banner>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Kind</th><th>Unit</th><th>Ingredient</th><th>Prescription</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {(query.data?.content ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.name}{row.formulation ? <span className="muted"> · {row.formulation}</span> : null}</td>
                <td>{labelEnum(row.form)}</td>
                <td>{unitLabel(row.baseUnit)}</td>
                <td>{row.activeIngredient || '—'}</td>
                <td>{row.requiresPrescription ? 'Yes' : 'No'}</td>
                <td>{row.active ? 'Yes' : 'No'}</td>
                <td>{canWrite ? <Button onClick={() => setEdit(row)}>Edit</Button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
      </div>
      {open ? <ProductForm onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
      {edit ? <ProductForm product={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
    </section>
  )
}

function ProductForm({ product, onClose, onSaved }: { product?: Product; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [kind, setKind] = useState(product?.form ?? 'TABLET')
  const [unit, setUnit] = useState(product?.baseUnit ?? defaultUnit(product?.form ?? 'TABLET'))
  return (
    <Modal title={product ? 'Edit product' : 'Add product'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(product ? `/api/medicine-products/${product.id}` : '/api/medicine-products', {
            method: product ? 'PUT' : 'POST',
            body: JSON.stringify({
              name: field(data, 'name'),
              activeIngredient: field(data, 'activeIngredient'),
              form: field(data, 'form'),
              formulation: field(data, 'formulation'),
              baseUnit: field(data, 'baseUnit'),
              description: field(data, 'description'),
              requiresPrescription: checked(data, 'requiresPrescription'),
              active: checked(data, 'active'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <TextField label="Name" name="name" required defaultValue={product?.name} />
        <SelectField label="Kind" name="form" required defaultValue={kind} onChange={(value) => { setKind(value); setUnit(defaultUnit(value)) }}>
          <EnumOptions values={MEDICINE_FORMS} />
        </SelectField>
        <SelectField key={unit} label="Unit" name="baseUnit" required defaultValue={unit} onChange={setUnit}>
          {MEDICINE_UNITS.map((item) => <option key={item} value={item}>{unitLabel(item)}</option>)}
        </SelectField>
        <p className="hint">Stock and doses are counted in this unit. Tablets, injections, and other pieces can be bought one or two at a time. Liquids are counted in ml.</p>
        <TextField label="Active ingredient" name="activeIngredient" defaultValue={product?.activeIngredient} />
        <TextField label="Strength or detail" name="formulation" defaultValue={product?.formulation} placeholder="10% or long-acting" />
        <AreaField label="Description" name="description" defaultValue={product?.description} />
        <CheckField name="requiresPrescription" label="Requires a prescription" defaultChecked={product?.requiresPrescription} />
        <CheckField name="active" label="Active" defaultChecked={product?.active ?? true} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function Suppliers() {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Supplier | null>(null)
  const query = useLoad(`suppliers:${page}:${q}`, () => api<Page<Supplier>>(`/api/suppliers?page=${page}&size=20${q ? `&q=${encodeURIComponent(q)}` : ''}`))
  const canWrite = canAny(user, INVENTORY_WRITE)
  return (
    <section className="card">
      <div className="page-head"><h2>Suppliers and pharmacies</h2>{canWrite ? <Button tone="primary" onClick={() => setOpen(true)}>Add</Button> : null}</div>
      <p className="hint">Add each wholesaler as a supplier and each shop you visit as a pharmacy. Receipts choose from this list.</p>
      <form className="filters" onSubmit={(event) => { event.preventDefault(); setPage(0); setQ(String(new FormData(event.currentTarget).get('q') ?? '').trim()) }}>
        <TextField label="Search" name="q" defaultValue={q} />
        <Button type="submit">Search</Button>
      </form>
      <Banner>{query.error}</Banner>
      {(query.data?.content.length ?? 0) === 0 ? <p className="muted">No suppliers yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Kind</th><th>Phone</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {query.data?.content.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{labelEnum(row.kind)}</td>
                  <td>{row.phone || '—'}</td>
                  <td>{row.active ? 'Yes' : 'No'}</td>
                  <td>{canWrite ? <Button onClick={() => setEdit(row)}>Edit</Button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
        </div>
      )}
      {open ? <SupplierForm onClose={() => setOpen(false)} onSaved={query.reload} /> : null}
      {edit ? <SupplierForm supplier={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
    </section>
  )
}

function SupplierForm({ supplier, onClose, onSaved }: { supplier?: Supplier; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Modal title={supplier ? 'Edit supplier' : 'Add supplier'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers', {
            method: supplier ? 'PUT' : 'POST',
            body: JSON.stringify({
              name: field(data, 'name'),
              kind: field(data, 'kind'),
              phone: field(data, 'phone'),
              notes: field(data, 'notes'),
              active: checked(data, 'active'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <Banner>{error}</Banner>
        <TextField label="Name" name="name" required defaultValue={supplier?.name} />
        <SelectField label="Kind" name="kind" required defaultValue={supplier?.kind ?? 'SUPPLIER'}><EnumOptions values={SUPPLIER_KINDS} /></SelectField>
        <TextField label="Phone" name="phone" defaultValue={supplier?.phone} />
        <AreaField label="Notes" name="notes" defaultValue={supplier?.notes} />
        <CheckField name="active" label="Active" defaultChecked={supplier?.active ?? true} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function Stock({ farmId }: { farmId: string }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<'supplier' | 'pharmacy' | null>(null)
  const [edit, setEdit] = useState<Batch | null>(null)
  const [moves, setMoves] = useState<Batch | null>(null)
  const [give, setGive] = useState<Batch | true | null>(null)
  const query = useLoad(`batches:${farmId}:${page}`, () => api<Page<Batch>>(`/api/farms/${farmId}/medicine-batches?page=${page}&size=20`))
  const canWrite = canOnFarm(user, farmId, INVENTORY_WRITE)
  const canGive = canOnFarm(user, farmId, CLINICAL_WRITE)
  return (
    <section className="card">
      <div className="page-head">
        <h2>Batches</h2>
        <div className="row-actions">
          {canGive ? <Button tone="primary" onClick={() => setGive(true)}>Record use</Button> : null}
          {canWrite ? <Button onClick={() => setOpen('pharmacy')}>Buy at a pharmacy</Button> : null}
          {canWrite ? <Button onClick={() => setOpen('supplier')}>Receive from supplier</Button> : null}
        </div>
      </div>
      <p className="hint">Record use for a tablet, injection, or vaccine given to an animal. Stock then drops by that quantity. Receipts and corrections are separate movements.</p>
      <Banner>{query.error}</Banner>
      {(query.data?.content.length ?? 0) === 0 ? <p className="muted">No batches on this farm.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Kind</th><th>Batch</th><th>From</th><th>Expires</th><th>On hand</th><th>Unit cost</th><th></th></tr></thead>
            <tbody>
              {query.data?.content.map((row) => (
                <tr key={row.id}>
                  <td>{row.medicineName}</td>
                  <td>{labelEnum(row.form)}</td>
                  <td>{row.batchNumber}</td>
                  <td>{row.supplierName || '—'}</td>
                  <td>{formatWhen(row.expiryDate)}</td>
                  <td className="num">{onHand(row)}</td>
                  <td>{rwf(row.unitCost)}</td>
                  <td className="row-actions">
                    <Button onClick={() => setMoves(row)}>Movements</Button>
                    {canGive ? <Button onClick={() => setGive(row)}>Use</Button> : null}
                    {canWrite ? <Button onClick={() => setEdit(row)}>Edit</Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
        </div>
      )}
      {open ? <ReceiptForm farmId={farmId} pharmacy={open === 'pharmacy'} onClose={() => setOpen(null)} onSaved={query.reload} /> : null}
      {give ? <UseMedicineForm farmId={farmId} batch={give === true ? undefined : give} onClose={() => setGive(null)} onSaved={query.reload} /> : null}
      {edit ? <BatchEdit batch={edit} onClose={() => setEdit(null)} onSaved={query.reload} /> : null}
      {moves ? <Movements batch={moves} canWrite={canWrite} onClose={() => setMoves(null)} onSaved={query.reload} /> : null}
    </section>
  )
}

function ReceiptForm({ farmId, pharmacy, onClose, onSaved }: { farmId: string; pharmacy: boolean; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [productId, setProductId] = useState('')
  const products = useLoad('active-products', () => allPages<Product>('/api/medicine-products'))
  const suppliers = useLoad('suppliers-receipt', () => allPages<Supplier>('/api/suppliers'))
  const product = (products.data ?? []).find((item) => item.id === productId)
  const unit = product?.baseUnit
  const choices = (suppliers.data ?? []).filter((item) => item.active && (pharmacy ? item.kind === 'PHARMACY' : true))
  return (
    <Modal title={pharmacy ? 'Buy at a pharmacy' : 'Receive from supplier'}>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(`/api/farms/${farmId}/medicine-batches`, {
            method: 'POST',
            body: JSON.stringify({
              medicineProductId: field(data, 'medicineProductId'),
              batchNumber: field(data, 'batchNumber'),
              expiryDate: field(data, 'expiryDate'),
              receivedOn: field(data, 'receivedOn'),
              supplierId: field(data, 'supplierId'),
              unitCost: asNumber(data, 'unitCost'),
              initialQuantity: asNumber(data, 'initialQuantity'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <p className="hint">
          {pharmacy
            ? 'Choose the pharmacy, then enter 1 or 2 doses or pieces. Leave the batch number empty when the pack has none. Unit cost is RWF for one unit.'
            : 'Choose a supplier saved under Suppliers. Unit cost is RWF for one unit. Quantity posts a purchase movement.'}
        </p>
        <Banner>{error}</Banner>
        <SelectField label="Product" name="medicineProductId" required onChange={setProductId}>
          <option value="">Select</option>
          {(products.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{productLabel(item)}</option>)}
        </SelectField>
        <SelectField label={pharmacy ? 'Pharmacy' : 'Supplier'} name="supplierId" required>
          <option value="">Select</option>
          {choices.map((item) => <option key={item.id} value={item.id}>{item.name} · {labelEnum(item.kind)}</option>)}
        </SelectField>
        {choices.length === 0 ? <p className="hint">{pharmacy ? 'Add the pharmacy under Suppliers first.' : 'Add the supplier under Suppliers first.'}</p> : null}
        <TextField label="Batch number" name="batchNumber" required={!pharmacy} placeholder={pharmacy ? 'Optional' : ''} />
        <TextField label="Expiry" name="expiryDate" type="date" required />
        <TextField label="Received on" name="receivedOn" type="date" />
        <TextField label="Unit cost (RWF)" name="unitCost" type="number" min={0} step="0.01" />
        <TextField key={unit ?? 'qty'} label={unit ? `Quantity (${unitLabel(unit)})` : 'Quantity'} name="initialQuantity" type="number" required={pharmacy} min={pharmacy ? (countableUnit(unit) ? 1 : '0.001') : 0} step={countableUnit(unit) ? '1' : '0.001'} defaultValue={pharmacy ? 1 : undefined} />
        <FormFooter pending={pending} onCancel={onClose} label={pharmacy ? 'Buy' : 'Receive'} />
      </form>
    </Modal>
  )
}

function BatchEdit({ batch, onClose, onSaved }: { batch: Batch; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const suppliers = useLoad('suppliers-edit', () => allPages<Supplier>('/api/suppliers'))
  const choices = (suppliers.data ?? []).filter((item) => item.active || item.id === batch.supplierId)
  return (
    <Modal title="Edit batch">
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          await api(`/api/medicine-batches/${batch.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              expiryDate: field(data, 'expiryDate'),
              receivedOn: field(data, 'receivedOn'),
              supplierId: field(data, 'supplierId'),
              unitCost: asNumber(data, 'unitCost'),
            }),
          })
          onSaved(); onClose()
        })
      }}>
        <p className="hint">This does not change quantity on hand.</p>
        <Banner>{error}</Banner>
        {!batch.supplierId && batch.supplierName ? <p className="hint">Recorded earlier as {batch.supplierName}. Choose a supplier to replace that name.</p> : null}
        <TextField label="Expiry" name="expiryDate" type="date" required defaultValue={batch.expiryDate} />
        <TextField label="Received on" name="receivedOn" type="date" required defaultValue={batch.receivedOn} />
        <SelectField label="Supplier" name="supplierId" defaultValue={batch.supplierId ?? ''}>
          <option value="">Unchanged</option>
          {choices.map((item) => <option key={item.id} value={item.id}>{item.name} · {labelEnum(item.kind)}</option>)}
        </SelectField>
        <TextField label="Unit cost (RWF)" name="unitCost" type="number" min={0} step="0.01" defaultValue={batch.unitCost ?? ''} />
        <FormFooter pending={pending} onCancel={onClose} />
      </form>
    </Modal>
  )
}

function Movements({ batch, canWrite, onClose, onSaved }: { batch: Batch; canWrite: boolean; onClose: () => void; onSaved: () => void }) {
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const query = useLoad(`moves:${batch.id}:${page}`, () => api<Page<Movement>>(`/api/medicine-batches/${batch.id}/movements?page=${page}&size=20`))
  const unit = unitLabel(batch.baseUnit)
  return (
    <Modal title={`${batch.medicineName} · ${batch.batchNumber}`} wide>
      <p className="hint">On hand: {onHand(batch)}. A later pharmacy trip can add 1 or 2 {unit || 'units'} with a purchase. Purchases, returns, and transfers in add stock. Expired stock and transfers out remove it. Adjustments use a signed quantity.</p>
      <Banner>{query.error}</Banner>
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Type</th><th>Change</th><th>Reference</th></tr></thead>
          <tbody>
            {(query.data?.content ?? []).map((row) => (
              <tr key={row.id}>
                <td>{formatWhen(row.movementAt)}</td>
                <td>{labelEnum(row.movementType)}</td>
                <td className="num">{signedAmount(row.quantityChange)} {unit}</td>
                <td>{row.referenceText || row.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
      </div>
      {canWrite ? (
        <form className="stack" onSubmit={(event) => {
          void saveForm(event, setError, setPending, async (data) => {
            await api(`/api/medicine-batches/${batch.id}/movements`, {
              method: 'POST',
              body: JSON.stringify({
                movementType: field(data, 'movementType'),
                quantity: asNumber(data, 'quantity'),
                referenceText: field(data, 'referenceText'),
                notes: field(data, 'notes'),
              }),
            })
            onSaved(); query.reload(); onClose()
          })
        }}>
          <Banner>{error}</Banner>
          <div className="form-grid">
            <SelectField label="Movement" name="movementType" required defaultValue="PURCHASE"><EnumOptions values={MOVEMENT_TYPES} /></SelectField>
            <TextField label={unit ? `Quantity (${unit})` : 'Quantity'} name="quantity" type="number" required step={countableUnit(batch.baseUnit) ? '1' : '0.001'} />
            <TextField className="span-2" label="Reference" name="referenceText" placeholder="Pharmacy receipt" />
            <AreaField className="span-2" label="Notes" name="notes" />
          </div>
          <FormFooter pending={pending} onCancel={onClose} label="Post movement" />
        </form>
      ) : <div className="form-footer"><Button onClick={onClose}>Close</Button></div>}
    </Modal>
  )
}

export function UseMedicineForm({ farmId, batch, onClose, onSaved }: { farmId: string; batch?: Batch; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [purpose, setPurpose] = useState('treatment')
  const [productId, setProductId] = useState(batch?.medicineProductId ?? '')
  const animals = useLoad(`use-animals:${farmId}`, () => allPages<Animal>('/api/animals', { farmId, status: 'ACTIVE' }))
  const products = useLoad('use-products', () => allPages<Product>('/api/medicine-products'))
  const batches = useLoad(`use-batches:${farmId}`, () => allPages<Batch>(`/api/farms/${farmId}/medicine-batches`))
  const product = batch
    ? (products.data ?? []).find((item) => item.id === batch.medicineProductId)
    : (products.data ?? []).find((item) => item.id === productId)
  const choices = (batches.data ?? []).filter((item) => item.medicineProductId === (batch?.medicineProductId ?? productId))
  const unit = batch?.baseUnit ?? product?.baseUnit
  return (
    <Modal title="Record medicine use" wide>
      <form className="stack" onSubmit={(event) => {
        void saveForm(event, setError, setPending, async (data) => {
          const medicineProductId = batch?.medicineProductId ?? field(data, 'medicineProductId')
          const batchId = batch?.id ?? field(data, 'batchId')
          const quantity = asNumber(data, 'quantityUsed')
          const when = asInstant(data, 'givenAt')
          const notes = field(data, 'notes')
          const doseUnit = unit ?? 'PIECE'
          if (field(data, 'purpose') === 'vaccination') {
            await api(`/api/farms/${farmId}/vaccinations`, {
              method: 'POST',
              body: JSON.stringify({
                animalId: field(data, 'animalId'),
                medicineProductId,
                medicineBatchId: batchId,
                quantityUsed: quantity,
                administeredAt: when,
                nextDueOn: field(data, 'nextDueOn'),
                notes,
              }),
            })
          } else {
            const treatment = await api<Treatment>(`/api/farms/${farmId}/treatments`, {
              method: 'POST',
              body: JSON.stringify({
                animalId: field(data, 'animalId'),
                treatmentDate: when,
                diagnosis: notes ?? 'Medicine given from store',
                outcome: 'IN_PROGRESS',
              }),
            })
            await api(`/api/treatments/${treatment.id}/medications`, {
              method: 'POST',
              body: JSON.stringify({
                medicineProductId,
                batchId,
                doseAmount: quantity,
                doseUnit,
                route: field(data, 'route'),
                administrationsCount: 1,
                quantityUsed: quantity,
                notes,
              }),
            })
          }
          onSaved()
          onClose()
        })
      }}>
        <p className="hint">Choose the animal and the batch. A tablet, injection, or vaccine is removed from that batch.</p>
        <Banner>{error}</Banner>
        <div className="form-grid">
          <SelectField label="Animal" name="animalId" required><AnimalOptions animals={animals.data ?? []} /></SelectField>
          <SelectField label="Given as" name="purpose" required defaultValue="treatment" onChange={setPurpose}>
            <option value="treatment">Treatment</option>
            <option value="vaccination">Vaccination</option>
          </SelectField>
          {batch ? (
            <p className="hint span-2">{batch.medicineName} · {labelEnum(batch.form)} · batch {batch.batchNumber} · {onHand(batch)} on hand</p>
          ) : (
            <>
              <SelectField label="Product" name="medicineProductId" required onChange={setProductId}>
                <option value="">Select</option>
                {(products.data ?? []).filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{productLabel(item)}</option>)}
              </SelectField>
              <SelectField key={productId} label="Batch" name="batchId" required>
                <option value="">Select</option>
                {choices.map((item) => <option key={item.id} value={item.id}>{item.batchNumber} · {onHand(item)} on hand</option>)}
              </SelectField>
            </>
          )}
          <TextField key={unit ?? 'qty'} label={unit ? `Quantity (${unitLabel(unit)})` : 'Quantity'} name="quantityUsed" type="number" required min={countableUnit(unit) ? 1 : '0.001'} step={countableUnit(unit) ? '1' : '0.001'} defaultValue={1} />
          <TextField label="When" name="givenAt" type="datetime-local" defaultValue={localInput(new Date().toISOString())} />
          {purpose === 'vaccination' ? (
            <TextField label="Next due" name="nextDueOn" type="date" />
          ) : (
            <SelectField key={product?.form ?? 'route'} label="Route" name="route" required defaultValue={defaultRoute(batch?.form ?? product?.form)}>
              <EnumOptions values={ADMIN_ROUTES} />
            </SelectField>
          )}
          <AreaField className="span-2" label="Notes" name="notes" />
        </div>
        {productId && !batch && choices.length === 0 ? <p className="hint">This medicine is not in farm stock yet. Receive it first.</p> : null}
        <FormFooter pending={pending} onCancel={onClose} label="Record use" />
      </form>
    </Modal>
  )
}
