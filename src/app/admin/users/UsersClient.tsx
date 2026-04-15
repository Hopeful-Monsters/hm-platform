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

// ── Component ─────────────────────────────────────────────────────

interface UsersClientProps {
  users:           UserRow[]
  promoteToAdmin:  (formData: FormData) => Promise<void>
  revokeAdmin:     (formData: FormData) => Promise<void>
  updateToolAccess:(formData: FormData) => Promise<void>
}

export function UsersClient({
  users,
  promoteToAdmin,
  revokeAdmin,
  updateToolAccess,
}: UsersClientProps) {
  const [query,   setQuery]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [hovered, setHovered] = useState<string | null>(null)

  // ── Sort handler ──────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  // ── Filter + sort ─────────────────────────────────────────────

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
          // master_admin < admin < user (ascending = privileged first)
          va = a.isMasterAdmin ? '0' : a.role === 'admin' ? '1' : '2'
          vb = b.isMasterAdmin ? '0' : b.role === 'admin' ? '1' : '2'
        }
        const cmp = va.localeCompare(vb)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [users, query, sortKey, sortDir])

  // ── Helpers ───────────────────────────────────────────────────

  const displayName = (u: UserRow): string | null => {
    const first = u.firstName?.trim()
    const last  = u.lastName?.trim()
    if (first && last) return `${first} ${last}`
    if (first) return first
    if (last)  return last
    return null
  }

  // ── Render ────────────────────────────────────────────────────

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
          onFocus={e  => { e.currentTarget.style.borderColor = 'var(--accent)' }}
          onBlur={e   => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>

      {/* Table header */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 180px 180px',
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
            {i === 0 ? 'User' : 'Role / Status'}{sortArrow(key)}
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
        const name          = displayName(u)
        const isAdmin       = u.role === 'admin' || u.isMasterAdmin
        const makeAdminKey  = `make-admin-${u.id}`
        const revokeKey     = `revoke-${u.id}`
        const updateKey     = `update-${u.id}`

        return (
          <div
            key={u.id}
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr 180px 180px',
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
                <p
                  style={{
                    fontFamily:    'var(--font-heading)',
                    fontWeight:    700,
                    fontSize:      17,
                    textTransform: 'uppercase',
                    color:         'var(--text)',
                    marginBottom:  2,
                  }}
                >
                  {name}
                </p>
              )}
              <p
                style={{
                  fontFamily: name ? 'var(--font-body)' : 'var(--font-heading)',
                  fontSize:   name ? 13 : 17,
                  fontWeight: name ? 400 : 700,
                  textTransform: name ? 'none' : 'uppercase',
                  color:      name ? 'var(--text-muted)' : 'var(--text)',
                  marginBottom: 4,
                }}
              >
                {u.email ?? '—'}
              </p>
              <p style={metaStyle}>Status: {u.status ?? 'unknown'}</p>
            </div>

            {/* Role */}
            <div
              style={{
                paddingTop:     2,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'flex-start',
                gap:            6,
              }}
            >
              {u.isMasterAdmin ? (
                <span
                  style={{
                    fontFamily:    'var(--font-heading)',
                    fontWeight:    700,
                    fontSize:      12,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    background:    '#1a0a00',
                    color:         'var(--accent)',
                    padding:       '4px 10px',
                    display:       'inline-block',
                  }}
                >
                  Master Admin
                </span>
              ) : isAdmin ? (
                <>
                  <span
                    style={{
                      fontFamily:    'var(--font-heading)',
                      fontWeight:    700,
                      fontSize:      12,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      background:    '#001820',
                      color:         '#00B4D8',
                      padding:       '4px 10px',
                      display:       'inline-block',
                    }}
                  >
                    Admin
                  </span>
                  <form action={revokeAdmin}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      onMouseEnter={() => setHovered(revokeKey)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        fontFamily:    'var(--font-heading)',
                        fontWeight:    900,
                        fontSize:      11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        background:    hovered === revokeKey ? '#1a0000' : 'transparent',
                        color:         hovered === revokeKey ? '#FF4444' : 'var(--text-dim)',
                        border:        `2px solid ${hovered === revokeKey ? '#FF4444' : 'var(--border-2)'}`,
                        padding:       '3px 8px',
                        cursor:        'pointer',
                        transition:    'all 0.15s',
                      }}
                    >
                      Revoke Admin
                    </button>
                  </form>
                </>
              ) : (
                <form action={promoteToAdmin}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    onMouseEnter={() => setHovered(makeAdminKey)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      fontFamily:    'var(--font-heading)',
                      fontWeight:    900,
                      fontSize:      12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      background:    hovered === makeAdminKey ? 'var(--surface-2)' : 'transparent',
                      color:         hovered === makeAdminKey ? 'var(--text)' : 'var(--text-dim)',
                      border:        `2px solid ${hovered === makeAdminKey ? 'var(--border-2)' : 'var(--border)'}`,
                      padding:       '4px 10px',
                      cursor:        'pointer',
                      transition:    'all 0.15s',
                    }}
                  >
                    Make Admin
                  </button>
                </form>
              )}
            </div>

            {/* Tool access */}
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
