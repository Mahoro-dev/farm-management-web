import { useState } from 'react'
import { isOrgAdmin } from '../access'
import { api, qs, type AuditRow, type Page } from '../api'
import { useAuth } from '../auth'
import { formatWhen, prettyJson } from '../format'
import { useLoad } from '../load'
import { Banner, Button, Empty, PageHead, Pager } from '../ui'

export function AuditPage() {
  const { user } = useAuth()
  const admin = isOrgAdmin(user)
  const [tableName, setTableName] = useState('')
  const [recordId, setRecordId] = useState('')
  const [page, setPage] = useState(0)
  const [applied, setApplied] = useState({ tableName: '', recordId: '' })
  const query = useLoad(
    admin ? `audit:${applied.tableName}:${applied.recordId}:${page}` : 'audit-locked',
    () => admin
      ? api<Page<AuditRow>>(`/api/audit${qs({ tableName: applied.tableName, recordId: applied.recordId, page, size: 20 })}`)
      : Promise.resolve(null),
  )
  if (!admin) return <Empty title="Administrators only">The audit log is limited to organization administrators.</Empty>
  return (
    <div className="stack">
      <PageHead title="Audit" lede="Changes recorded by the API. Filter by table name or record id." />
      <form className="filters" onSubmit={(event) => {
        event.preventDefault()
        setPage(0)
        setApplied({ tableName: tableName.trim(), recordId: recordId.trim() })
      }}>
        <input placeholder="Table name" value={tableName} onChange={(event) => setTableName(event.target.value)} />
        <input placeholder="Record id" value={recordId} onChange={(event) => setRecordId(event.target.value)} />
        <Button type="submit">Filter</Button>
      </form>
      <Banner>{query.error}</Banner>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>When</th><th>Table</th><th>Action</th><th>Record</th><th>Changes</th></tr></thead>
          <tbody>
            {(query.data?.content ?? []).map((row) => (
              <tr key={row.id}>
                <td>{formatWhen(row.changedAt)}</td>
                <td>{row.tableName}</td>
                <td>{row.action}</td>
                <td>{row.recordId || '—'}</td>
                <td>
                  <details>
                    <summary>View</summary>
                    {row.oldData ? <pre>{prettyJson(row.oldData)}</pre> : null}
                    {row.newData ? <pre>{prettyJson(row.newData)}</pre> : null}
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(query.data?.content.length ?? 0) === 0 && !query.loading ? <p className="muted">No audit rows.</p> : null}
        <Pager page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} onPage={setPage} />
      </div>
    </div>
  )
}
