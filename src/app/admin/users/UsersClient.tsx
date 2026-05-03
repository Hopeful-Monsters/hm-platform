'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { TOOLS as TOOL_REGISTRY } from '@/lib/tools'

// ── Types ─────────────────────────────────────────────────────────

export type UserRow = {
  id:            string
  email:         string | null
  firstName:     string | null
  lastName:      string | null
  status:        string | null
  role:          string | null
  isMasterAdmin: boolean
  tools:         string[]
}

type SortKey = 'name' | 'role'
type SortDir = 'asc' | 'desc'

// ── Constants ─────────────────────────────────────────────────────

const TOOLS = TOOL_REGISTRY.map(t => ({ value: t.slug, label: t.label }))

const ROLE_OPTIONS = [
  { value: 'admin',  label: 'Admin'  },
  { value: 'editor', label: 'Editor' },
  { value: 'user',   label: 'User'   },
]

const ROLE_WEIGHT: Record<string, number> = {
  master_admin: 0,
  admin:        1,
  editor:       2,
  user:         3,
}

// ── Component ─────────────────────────────────────────────────────

interface UsersClientProps {
  users:            UserRow[]
  setRole:          (formData: FormData) => Promise<void>
  updateToolAccess: (formData: FormData) => Promise<void>
}

export function UsersClient({ users, setRole, updateToolAccess }: UsersClientProps) {
  const [query,        setQuery]        = useState('')
  const [sortKey,      setSortKey]      = useState<SortKey>('name')
  const [sortDir,      setSortDir]      = useState<SortDir>('asc')
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortArrow = (key: SortKey) =>
    sortKey !== key ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓'

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return [...users]
      .filter(u => {
        if (!q) return true
        const name  = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase()
        const email = (u.email ?? '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
      .sort((a, b) => {
        let va = '', vb = ''
        if (sortKey === 'name') {
          va = `${a.firstName ?? ''} ${a.lastName ?? ''} ${a.email ?? ''}`.toLowerCase()
          vb = `${b.firstName ?? ''} ${b.lastName ?? ''} ${b.email ?? ''}`.toLowerCase()
        } else {
          const wa = a.isMasterAdmin ? ROLE_WEIGHT.master_admin : (ROLE_WEIGHT[a.role ?? 'user'] ?? 3)
          const wb = b.isMasterAdmin ? ROLE_WEIGHT.master_admin : (ROLE_WEIGHT[b.role ?? 'user'] ?? 3)
          va = String(wa)
          vb = String(wb)
        }
        const cmp = va.localeCompare(vb)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [users, query, sortKey, sortDir])

  const displayName = (u: UserRow): string | null => {
    const first = u.firstName?.trim()
    const last  = u.lastName?.trim()
    if (first && last) return `${first} ${last}`
    return first ?? last ?? null
  }

  const effectiveRole = (u: UserRow) =>
    u.isMasterAdmin ? 'master_admin' : (u.role ?? 'user')

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="users-search"
        />
      </div>

      {/* Table header */}
      <div className="users-table-header">
        {(['name', 'role'] as SortKey[]).map((key, i) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={cn('users-sort-btn', sortKey === key && 'is-active')}
          >
            {i === 0 ? 'User' : 'Role'}{sortArrow(key)}
          </button>
        ))}
        <span className="users-meta">Tool Access</span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <p className="users-empty">No users match your search.</p>
      )}

      {/* User rows */}
      {filtered.map(u => {
        const name       = displayName(u)
        const role       = effectiveRole(u)
        const roleLabel  = role === 'master_admin' ? 'Master Admin'
          : ROLE_OPTIONS.find(r => r.value === role)?.label ?? role
        const badgeClass = `users-badge users-badge--${role.replace('_', '-')}`

        const validRoles  = ROLE_OPTIONS.map(r => r.value)
        const currentRole = validRoles.includes(u.role ?? '') ? (u.role as string) : 'user'
        const pendingRole = pendingRoles[u.id] ?? currentRole
        const isDirty     = !u.isMasterAdmin && pendingRole !== currentRole

        return (
          <div key={u.id} className="users-row">
            {/* User info */}
            <div>
              {name && <p className="users-name">{name}</p>}
              <p className={name ? 'users-email' : 'users-email--primary'}>
                {u.email ?? '—'}
              </p>
              <p className="users-meta">Status: {u.status ?? 'unknown'}</p>
            </div>

            {/* Role — badge + dropdown + Save */}
            <div className="users-role-col">
              <div className="mb-[10px]">
                <span className={badgeClass}>{roleLabel}</span>
                {u.isMasterAdmin && (
                  <p className="users-master-note">Change via Supabase</p>
                )}
              </div>

              {!u.isMasterAdmin && (
                <form action={setRole} className="users-role-form">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="role"   value={pendingRole} />

                  <select
                    value={pendingRole}
                    onChange={e => setPendingRoles(prev => ({ ...prev, [u.id]: e.target.value }))}
                    className={cn('users-role-select', isDirty && 'is-dirty')}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={!isDirty}
                    className={cn('users-action-btn', isDirty && 'is-dirty')}
                  >
                    Save Role
                  </button>
                </form>
              )}
            </div>

            {/* Tool access */}
            <form action={updateToolAccess} className="users-tool-form">
              <input type="hidden" name="userId" value={u.id} />
              {TOOLS.map(tool => (
                <label key={tool.value} className="users-checkbox-label">
                  <input
                    type="checkbox"
                    name="tools"
                    value={tool.value}
                    defaultChecked={u.tools.includes(tool.value)}
                    className="users-checkbox"
                  />
                  {tool.label}
                </label>
              ))}
              <button type="submit" className="users-update-btn">
                Update
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}
