'use client'

import { useState, useMemo } from 'react'

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

const TOOLS = [
  { value: 'coverage-tracker', label: 'Coverage Tracker' },
  { value: 'expenses-manager', label: 'Expenses Manager' },
]

const ROLE_OPTIONS = [
  { value: 'admin',  label: 'Admin'  },
  { value: 'editor', label: 'Editor' },
  { value: 'user',   label: 'User'   },
]

// Role sort weight — lower = higher privilege, sorts first ascending
const ROLE_WEIGHT: Record<string, number> = {
  master_admin: 0,
  admin:        1,
  editor:       2,
  user:         3,
}

// Role badge styles
const ROLE_BADGE: Record<string, React.CSSProperties> = {
  master_admin: { background: '#1a0a00', color: 'var(--accent)'  },
  admin:        { background: '#001820', color: '#00B4D8'         },
  editor:       { background: '#0d0d1a', color: '#A78BFA'         },
  user:         { background: 'var(--surface-2)', color: 'var(--text-muted)' },
}

// ── Style helpers ─────────────────────────────────────────────────

const metaStyle: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontSize:      11,
  fontWeight:    700,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  color:         'var(--text-dim)',
}

const checkboxLabelStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        8,
  fontSize:   13,
  color:      'var(--text-muted)',
  cursor:     'pointer',
  fontFamily: 'var(--font-body)',
}

const badgeStyle: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontWeight:    700,
  fontSize:      11,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  padding:       '3px 9px',
  display:       'inline-block',
  marginBottom:  6,
}

// ── Component ─────────────────────────────────────────────────────

interface UsersClientProps {
  users:            UserRow[]
  setRole:          (formData: FormData) => Promise<void>
  updateToolAccess: (formData: FormData) => Promise<void>
}

export function UsersClient({ users, setRole, updateToolAccess }: UsersClientProps) {
  const [query,   setQuery]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [hovered, setHovered] = useState<string | null>(null)

  // Track pending role selections per user before save
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
      <div style={{ marginBottom: 24 }}>
        <input
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width:      '100%',
            maxWidth:   400,
            background: 'var(--surface)',
            border:     '2px solid var(--border)',
            color:      'var(--text)',
            fontFamily: 'var(--font-body)',
            fontSize:   14,
            padding:    '9px 14px',
            outline:    'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>

      {/* Table header */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 200px 200px',
          padding:             '8px 16px',
          borderBottom:        '2px solid var(--border)',
          marginBottom:        2,
        }}
      >
        {(['name', 'role'] as SortKey[]).map((key, i) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            style={{
              ...metaStyle,
              background: 'none',
              border:     'none',
              padding:    0,
              cursor:     'pointer',
              textAlign:  'left',
              color:      sortKey === key ? 'var(--text)' : 'var(--text-dim)',
            }}
          >
            {i === 0 ? 'User' : 'Role'}{sortArrow(key)}
          </button>
        ))}
        <span style={metaStyle}>Tool Access</span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '16px' }}>
          No users match your search.
        </p>
      )}

      {/* User rows */}
      {filtered.map(u => {
        const name        = displayName(u)
        const role        = effectiveRole(u)
        const badgeColors = ROLE_BADGE[role] ?? ROLE_BADGE.user
        const roleLabel   = role === 'master_admin' ? 'Master Admin'
          : ROLE_OPTIONS.find(r => r.value === role)?.label ?? role
        const saveKey     = `save-role-${u.id}`
        const updateKey   = `update-${u.id}`

        // Pending role selection for this user (or current role if untouched)
        const pendingRole = pendingRoles[u.id] ?? (u.isMasterAdmin ? 'admin' : (u.role ?? 'user'))
        const isDirty     = !u.isMasterAdmin && pendingRole !== (u.role ?? 'user')

        return (
          <div
            key={u.id}
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr 200px 200px',
              alignItems:          'start',
              padding:             '16px',
              borderBottom:        '1px solid var(--border)',
              background:          'var(--surface)',
              marginBottom:        1,
            }}
          >
            {/* User info */}
            <div>
              {name && (
                <p style={{
                  fontFamily:    'var(--font-heading)',
                  fontWeight:    700,
                  fontSize:      17,
                  textTransform: 'uppercase',
                  color:         'var(--text)',
                  marginBottom:  2,
                }}>
                  {name}
                </p>
              )}
              <p style={{
                fontFamily:    name ? 'var(--font-body)' : 'var(--font-heading)',
                fontSize:      name ? 13 : 17,
                fontWeight:    name ? 400 : 700,
                textTransform: name ? 'none' : 'uppercase',
                color:         name ? 'var(--text-muted)' : 'var(--text)',
                marginBottom:  4,
              }}>
                {u.email ?? '—'}
              </p>
              <p style={metaStyle}>Status: {u.status ?? 'unknown'}</p>
            </div>

            {/* Role — dropdown + Save (independent form) */}
            <div style={{ paddingTop: 2 }}>
              {/* Current role badge */}
              <span style={{ ...badgeStyle, ...badgeColors }}>{roleLabel}</span>

              {/* Dropdown — hidden for master admin (cannot be changed via UI) */}
              {!u.isMasterAdmin && (
                <form action={setRole} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="role"   value={pendingRole} />
                  <select
                    value={pendingRole}
                    onChange={e => setPendingRoles(prev => ({ ...prev, [u.id]: e.target.value }))}
                    style={{
                      background:  'var(--surface-2)',
                      border:      `2px solid ${isDirty ? 'var(--accent)' : 'var(--border)'}`,
                      color:       'var(--text)',
                      fontFamily:  'var(--font-heading)',
                      fontWeight:  700,
                      fontSize:    12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding:     '4px 8px',
                      cursor:      'pointer',
                      width:       '100%',
                      outline:     'none',
                    }}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!isDirty}
                    onMouseEnter={() => setHovered(saveKey)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      fontFamily:    'var(--font-heading)',
                      fontWeight:    900,
                      fontSize:      11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      background:    isDirty
                        ? (hovered === saveKey ? 'var(--accent)' : 'var(--surface-2)')
                        : 'transparent',
                      color: isDirty
                        ? (hovered === saveKey ? 'var(--accent-fg)' : 'var(--text-muted)')
                        : 'var(--text-dim)',
                      border:     `2px solid ${isDirty ? (hovered === saveKey ? 'var(--accent)' : 'var(--border-2)') : 'var(--border)'}`,
                      padding:    '4px 10px',
                      cursor:     isDirty ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      opacity:    isDirty ? 1 : 0.4,
                    }}
                  >
                    Save Role
                  </button>
                </form>
              )}

              {u.isMasterAdmin && (
                <p style={{ ...metaStyle, fontSize: 10, marginTop: 4 }}>
                  Change via Supabase
                </p>
              )}
            </div>

            {/* Tool access — independent form */}
            <form action={updateToolAccess} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="hidden" name="userId" value={u.id} />
              {TOOLS.map(tool => (
                <label key={tool.value} style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    name="tools"
                    value={tool.value}
                    defaultChecked={u.tools.includes(tool.value)}
                    style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}
                  />
                  {tool.label}
                </label>
              ))}
              <button
                type="submit"
                onMouseEnter={() => setHovered(updateKey)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  fontFamily:    'var(--font-heading)',
                  fontWeight:    900,
                  fontSize:      11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  background:    hovered === updateKey ? 'var(--accent)' : 'var(--surface-2)',
                  color:         hovered === updateKey ? 'var(--accent-fg)' : 'var(--text-muted)',
                  border:        `2px solid ${hovered === updateKey ? 'var(--accent)' : 'var(--border)'}`,
                  padding:       '5px 12px',
                  cursor:        'pointer',
                  marginTop:     4,
                  transition:    'all 0.15s',
                }}
              >
                Update
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}
