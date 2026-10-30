import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { isOrgAdmin } from './access'
import { useAuth } from './auth'
import { FarmProvider, useFarm } from './farm'
import { labelEnum } from './format'
import { ThemeSwitch } from './theme'
import { Banner, Button, Empty } from './ui'

const work = [
  { to: '/', label: 'Today', end: true },
  { to: '/animals', label: 'Herd' },
  { to: '/milk', label: 'Milk' },
  { to: '/breeding', label: 'Breeding' },
]

const care = [
  { to: '/clinical', label: 'Clinic' },
  { to: '/medicine', label: 'Medicine' },
]

export function Shell() {
  return (
    <FarmProvider>
      <ShellFrame />
    </FarmProvider>
  )
}

function ShellFrame() {
  const { user, logout } = useAuth()
  const { farms, farmId, farm, organization, setFarmId } = useFarm()
  const admin = isOrgAdmin(user)
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const roles = roleLine(user?.assignments)

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="M6 22c6-1 8-8 10-14 2 6 4 13 10 14-6 1-8 4-10 8-2-4-4-7-10-8z" /></svg>
          </span>
          <div>
            <strong>Farm desk</strong>
            <p>{organization?.name ?? 'Farm management'}</p>
          </div>
        </div>
        <nav>
          <p className="group">Work</p>
          {work.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>{item.label}</NavLink>
          ))}
          <p className="group">Care</p>
          {care.map((item) => (
            <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
          ))}
          <p className="group">Office</p>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/farms">Farms</NavLink>
          <NavLink to="/catalogue">Catalogue</NavLink>
          <NavLink to="/organization">Organization</NavLink>
          {admin ? <NavLink to="/people">People</NavLink> : null}
          {admin ? <NavLink to="/audit">Audit</NavLink> : null}
        </nav>
        <div className="who">
          <strong>{user?.fullName}</strong>
          <p>{roles}</p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="frame">
            <div>
              <strong>{farm?.name ?? 'No farm selected'}</strong>
              <span className="muted">{today}</span>
            </div>
            <div className="top-actions">
              <ThemeSwitch />
              <label className="farm-pick">
                <span className="sr">Farm</span>
                <select value={farmId} onChange={(event) => setFarmId(event.target.value)} disabled={farms.length === 0}>
                  {farms.length === 0 ? <option value="">No farms</option> : null}
                  {farms.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.farmCode} · {item.name}{item.active ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="button" tone="ghost" onClick={logout}>Log out</Button>
            </div>
          </div>
        </header>
        <main className="content">
          <div className="frame">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function roleLine(assignments: { roleCode: string; roleName: string; endedAt?: string | null }[] | null | undefined): string {
  const active = (assignments ?? []).filter((item) => !item.endedAt)
  if (active.some((item) => item.roleCode === 'ORG_ADMIN')) return 'Organization admin'
  const names = [...new Set(active.map((item) => item.roleName || labelEnum(item.roleCode)))]
  return names.join(', ') || 'Member'
}

export function NeedFarm({ children }: { children: ReactNode }) {
  const { farm, ready, error } = useFarm()
  if (!ready) return <p className="muted">Loading farms…</p>
  if (error) return <Banner>{error}</Banner>
  if (!farm) {
    return (
      <Empty title="No farm yet">
        <p>Create a farm, or ask an administrator to assign you to one.</p>
        <Link to="/farms">Go to farms</Link>
      </Empty>
    )
  }
  return children
}
