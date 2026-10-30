import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type DailyMilk, type ExpiryWatch, type HerdAnimal, type Withdrawal } from '../api'
import { useFarm } from '../farm'
import { amount, dateInput, formatWhen, rwf } from '../format'
import { useLoad } from '../load'
import { NeedFarm } from '../shell'
import { Banner, PageHead, Pill, Tabs } from '../ui'

export function ReportsPage() {
  return <NeedFarm><ReportsBody /></NeedFarm>
}

function ReportsBody() {
  const { farmId } = useFarm()
  const [tab, setTab] = useState<'milk' | 'herd' | 'holds' | 'expiry'>('milk')
  return (
    <div className="stack">
      <PageHead title="Reports" lede="Figures for the selected farm. Medicine values are in Rwandan francs." />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { id: 'milk', label: 'Daily milk' },
          { id: 'herd', label: 'Herd' },
          { id: 'holds', label: 'Withdrawals' },
          { id: 'expiry', label: 'Expiry' },
        ]}
      />
      {tab === 'milk' ? <MilkReport farmId={farmId} /> : null}
      {tab === 'herd' ? <HerdReport farmId={farmId} /> : null}
      {tab === 'holds' ? <HoldReport farmId={farmId} /> : null}
      {tab === 'expiry' ? <ExpiryReport farmId={farmId} /> : null}
    </div>
  )
}

function MilkReport({ farmId }: { farmId: string }) {
  const [from, setFrom] = useState(dateInput(-30))
  const [to, setTo] = useState(dateInput())
  const query = useLoad(`rmilk:${farmId}:${from}:${to}`, () => api<DailyMilk[]>(`/api/reports/daily-milk?farmId=${farmId}&from=${from}&to=${to}`))
  const rows = [...(query.data ?? [])].sort((a, b) => b.milkingDate.localeCompare(a.milkingDate))
  return (
    <section className="card">
      <div className="filters">
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      <Banner>{query.error}</Banner>
      {rows.length === 0 ? <p className="muted">No milk in this range.</p> : (
        <table>
          <thead><tr><th>Date</th><th>Liters</th><th>Animals milked</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.milkingDate}>
                <td>{formatWhen(row.milkingDate)}</td>
                <td className="num">{amount(row.totalLiters, 2)}</td>
                <td>{row.animalsMilked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function HerdReport({ farmId }: { farmId: string }) {
  const query = useLoad(`rherd:${farmId}`, () => api<HerdAnimal[]>(`/api/reports/herd?farmId=${farmId}`))
  return (
    <section className="card">
      <Banner>{query.error}</Banner>
      {(query.data ?? []).length === 0 ? <p className="muted">The herd list is empty.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Number</th><th>Name</th><th>Sex</th><th>Breed</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {query.data?.map((row) => (
                <tr key={row.animalId}>
                  <td><Link to={`/animals/${row.animalId}`}>{row.animalNumber}</Link></td>
                  <td>{row.name || '—'}</td>
                  <td>{row.sex}</td>
                  <td>{row.breedName || '—'}</td>
                  <td><Pill value={row.status} /></td>
                  <td>{formatWhen(row.joinedOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function HoldReport({ farmId }: { farmId: string }) {
  const query = useLoad(`rhold:${farmId}`, () => api<Withdrawal[]>(`/api/reports/withdrawals?farmId=${farmId}`))
  return (
    <section className="card">
      <Banner>{query.error}</Banner>
      {(query.data ?? []).length === 0 ? <p className="muted">No active withdrawals.</p> : (
        <table>
          <thead><tr><th>Animal</th><th>Milk until</th><th>Meat until</th><th>Outcome</th></tr></thead>
          <tbody>
            {query.data?.map((row) => (
              <tr key={row.treatmentId}>
                <td><Link to={`/animals/${row.animalId}`}>{row.animalNumber}</Link></td>
                <td>{formatWhen(row.milkWithdrawalUntil)}</td>
                <td>{formatWhen(row.meatWithdrawalUntil)}</td>
                <td><Pill value={row.outcome} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function ExpiryReport({ farmId }: { farmId: string }) {
  const [days, setDays] = useState(90)
  const query = useLoad(`rexp:${farmId}:${days}`, () => api<ExpiryWatch[]>(`/api/reports/medicine-expiry?farmId=${farmId}&withinDays=${days}`))
  return (
    <section className="card">
      <div className="filters">
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={180}>180 days</option>
        </select>
      </div>
      <Banner>{query.error}</Banner>
      {(query.data ?? []).length === 0 ? <p className="muted">No batches expire in this window.</p> : (
        <table>
          <thead><tr><th>Medicine</th><th>Batch</th><th>Expires</th><th>On hand</th><th>Unit cost</th></tr></thead>
          <tbody>
            {query.data?.map((row) => (
              <tr key={row.batchId}>
                <td>{row.medicineName}</td>
                <td>{row.batchNumber}</td>
                <td>{formatWhen(row.expiryDate)}</td>
                <td className="num">{amount(row.quantityOnHand, 3)}</td>
                <td>{rwf(row.unitCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
