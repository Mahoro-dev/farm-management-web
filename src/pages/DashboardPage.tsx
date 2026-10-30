import { Link } from 'react-router-dom'
import { allPages, api, type DailyMilk, type ExpiryWatch, type HerdAnimal, type Pregnancy, type Vaccination, type Withdrawal } from '../api'
import { amount, dateInput, formatWhen, labelEnum } from '../format'
import { useLoad } from '../load'
import { NeedFarm } from '../shell'
import { Banner, PageHead, Pill } from '../ui'
import { useFarm } from '../farm'

export function DashboardPage() {
  return (
    <NeedFarm>
      <DashboardBody />
    </NeedFarm>
  )
}

function DashboardBody() {
  const { farmId, farm } = useFarm()
  const report = useLoad(`dash:${farmId}`, async () => {
    const [herd, milk, withdrawals, expiry, due, pregnancies] = await Promise.all([
      api<HerdAnimal[]>(`/api/reports/herd?farmId=${farmId}`),
      api<DailyMilk[]>(`/api/reports/daily-milk?farmId=${farmId}&from=${dateInput(-13)}&to=${dateInput()}`),
      api<Withdrawal[]>(`/api/reports/withdrawals?farmId=${farmId}`),
      api<ExpiryWatch[]>(`/api/reports/medicine-expiry?farmId=${farmId}&withinDays=90`),
      api<Vaccination[]>(`/api/farms/${farmId}/vaccinations/due?until=${dateInput(30)}`),
      allPages<Pregnancy>(`/api/farms/${farmId}/pregnancies`),
    ])
    return { herd, milk, withdrawals, expiry, due, pregnancies }
  })

  const herd = report.data?.herd ?? []
  const active = herd.filter((animal) => animal.status === 'ACTIVE')
  const series = [...(report.data?.milk ?? [])].sort((a, b) => a.milkingDate.localeCompare(b.milkingDate))
  const max = Math.max(...series.map((day) => Number(day.totalLiters)), 1)
  const today = series.find((day) => day.milkingDate === dateInput())
  const horizon = dateInput(30)
  const dueCalvings = (report.data?.pregnancies ?? [])
    .filter((row) => (row.status === 'SUSPECTED' || row.status === 'CONFIRMED') && row.expectedCalvingOn && row.expectedCalvingOn <= horizon)
    .sort((a, b) => (a.expectedCalvingOn ?? '').localeCompare(b.expectedCalvingOn ?? ''))

  return (
    <div className="stack">
      <PageHead title={farm?.name ?? 'Today'} lede={`${farm?.farmCode ?? ''} · ${farm?.district ?? 'Farm overview'}`.replace(/^ · /, '')} />
      <Banner>{report.error}</Banner>
      <section className="stats">
        <article className="card stat"><span>Active herd</span><strong>{active.length}</strong></article>
        <article className="card stat"><span>Females</span><strong>{active.filter((animal) => animal.sex === 'FEMALE').length}</strong></article>
        <article className="card stat"><span>Liters today</span><strong>{amount(today?.totalLiters ?? 0, 1)}</strong></article>
        <article className="card stat"><span>Withdrawals</span><strong>{report.data?.withdrawals.length ?? 0}</strong></article>
      </section>
      <section className="card">
        <div className="page-head">
          <h2>Expected calving</h2>
          <Link to="/breeding">Open breeding</Link>
        </div>
        {dueCalvings.length === 0 ? <p className="muted">No open pregnancies are due in the next 30 days.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cow</th><th>Status</th><th>Expected</th><th>When</th></tr></thead>
              <tbody>
                {dueCalvings.map((row) => (
                  <tr key={row.id}>
                    <td><Link to={`/animals/${row.cowId}`}>{row.cowNumber}</Link></td>
                    <td><Pill value={row.status} /></td>
                    <td>{formatWhen(row.expectedCalvingOn)}</td>
                    <td>{dueLabel(dayOffset(row.expectedCalvingOn ?? ''))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="split">
        <article className="card">
          <h2>Milk, last 14 days</h2>
          {series.length === 0 ? <p className="muted">No milk recorded in this window.</p> : (
            <div className="bars">
              {series.map((day) => (
                <div className="bar" key={day.milkingDate} title={`${amount(day.totalLiters, 1)} L`}>
                  <div className="bar-fill" style={{ height: `${Math.max(4, (Number(day.totalLiters) / max) * 130)}px` }} />
                  <span>{day.milkingDate.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="hint"><Link to="/milk">Open the milk book</Link></p>
        </article>
        <article className="card">
          <h2>Due vaccines</h2>
          {(report.data?.due.length ?? 0) === 0 ? <p className="muted">Nothing due in the next 30 days.</p> : (
            <ul className="plain">
              {report.data?.due.slice(0, 6).map((item) => (
                <li key={item.id}>{item.animalNumber} · {item.vaccineName} · {formatWhen(item.nextDueOn)}</li>
              ))}
            </ul>
          )}
          <p className="hint"><Link to="/clinical">Open the clinic</Link></p>
        </article>
      </section>
      <section className="split">
        <article className="card">
          <h2>Active withdrawals</h2>
          {(report.data?.withdrawals.length ?? 0) === 0 ? <p className="muted">No milk or meat holds.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Animal</th><th>Milk until</th><th>Meat until</th><th>Outcome</th></tr></thead>
                <tbody>
                  {report.data?.withdrawals.slice(0, 8).map((item) => (
                    <tr key={item.treatmentId}>
                      <td><Link to={`/animals/${item.animalId}`}>{item.animalNumber}</Link></td>
                      <td>{formatWhen(item.milkWithdrawalUntil)}</td>
                      <td>{formatWhen(item.meatWithdrawalUntil)}</td>
                      <td><Pill value={item.outcome} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
        <article className="card">
          <h2>Medicine expiring</h2>
          {(report.data?.expiry.length ?? 0) === 0 ? <p className="muted">No batches expire within 90 days.</p> : (
            <ul className="plain">
              {report.data?.expiry.slice(0, 6).map((item) => (
                <li key={item.batchId}>{item.medicineName} · {item.batchNumber} · {formatWhen(item.expiryDate)} · {amount(item.quantityOnHand, 2)} left</li>
              ))}
            </ul>
          )}
          <p className="hint"><Link to="/medicine">Open stock</Link> · herd status counts: {statusLine(herd)}</p>
        </article>
      </section>
    </div>
  )
}

function dayOffset(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  const expected = new Date(year, (month ?? 1) - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((expected.getTime() - today.getTime()) / 86_400_000)
}

function dueLabel(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Overdue by 1 day'
  if (days < 0) return `Overdue by ${-days} days`
  return `In ${days} days`
}

function statusLine(herd: HerdAnimal[]): string {
  const counts = new Map<string, number>()
  for (const animal of herd) counts.set(animal.status, (counts.get(animal.status) ?? 0) + 1)
  if (counts.size === 0) return 'no animals on this farm'
  return [...counts.entries()].map(([status, count]) => `${count} ${labelEnum(status).toLowerCase()}`).join(', ')
}
