'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types matching the API / DB schema ───────────────────────────────────────

export type FieldRule = {
  id?:         string
  sort_order:  number
  enabled:     boolean
  rule_type:   'set' | 'remap'
  if_field:    string
  if_operator: 'eq' | 'neq' | 'in'
  if_value:    string | null
  if_group_id: string | null
  then_field:  string
  then_value:  string
  note:        string | null
}

export type PublicationGroup = {
  id:      string
  name:    string
  note:    string | null
  members: { id: string; value: string }[]
}

type Tab = 'rules' | 'groups'

// ── Field/value option lists ─────────────────────────────────────────────────

const FIELD_OPTIONS = [
  { value: 'mediaFormat', label: 'Media Format' },
  { value: 'mediaType',   label: 'Media Type'   },
  { value: 'sentiment',   label: 'Sentiment'     },
  { value: 'keyMsg',      label: 'Key Messages'  },
  { value: 'spokes',      label: 'Spokes Quote'  },
  { value: 'image',       label: 'Image'         },
  { value: 'cta',         label: 'CTA'           },
  { value: 'publication', label: 'Publication'   },
]

const FIELD_VALUES: Record<string, string[]> = {
  mediaFormat: ['ONLINE', 'PRINT', 'TV', 'RADIO', 'SOCIAL MEDIA', 'PODCAST'],
  mediaType:   ['Metro', 'Regional', 'National', 'Lifestyle', 'Sports', 'Marketing Trade'],
  sentiment:   ['POSITIVE', 'NEUTRAL', 'NEGATIVE'],
  keyMsg:      ['YES', 'NO'],
  spokes:      ['YES', 'NO'],
  image:       ['YES', 'NO'],
  cta:         ['YES', 'NO'],
  publication: [], // free-text or 'in' group
}

const OPERATOR_OPTIONS = [
  { value: 'eq',  label: 'equals'         },
  { value: 'neq', label: 'does not equal' },
  { value: 'in',  label: 'is in group'    },
]

// ── Shared style tokens ──────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width:      '100%',
  background: 'var(--surface-2)',
  border:     '2px solid var(--border)',
  color:      'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize:   13,
  padding:    '6px 10px',
  outline:    'none',
  boxSizing:  'border-box',
}

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontWeight:    700,
  fontSize:      10,
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color:         'var(--text-dim)',
  display:       'block',
  marginBottom:  4,
}

const BTN_PRIMARY: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontWeight:    900,
  fontSize:      12,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  background:    'var(--accent)',
  color:         'var(--accent-fg)',
  border:        'none',
  padding:       '7px 16px',
  cursor:        'pointer',
}

const BTN_GHOST: React.CSSProperties = {
  fontFamily:    'var(--font-heading)',
  fontWeight:    700,
  fontSize:      11,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  background:    'transparent',
  color:         'var(--text-muted)',
  border:        '2px solid var(--border)',
  padding:       '5px 12px',
  cursor:        'pointer',
}

// ── Empty rule factory ───────────────────────────────────────────────────────

function emptyRule(sort_order: number): FieldRule {
  return {
    sort_order,
    enabled:     true,
    rule_type:   'set',
    if_field:    'mediaFormat',
    if_operator: 'eq',
    if_value:    'TV',
    if_group_id: null,
    then_field:  'image',
    then_value:  'YES',
    note:        null,
  }
}

// ── RuleRow — inline editable rule ──────────────────────────────────────────

function RuleRow({
  rule,
  groups,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  rule:     FieldRule
  groups:   PublicationGroup[]
  index:    number
  total:    number
  onChange: (r: FieldRule) => void
  onRemove: () => void
  onMove:   (dir: 'up' | 'down') => void
}) {
  const update = (patch: Partial<FieldRule>) => onChange({ ...rule, ...patch })

  // When if_operator changes to 'in', clear if_value; when away from 'in', clear group
  const handleOperatorChange = (op: 'eq' | 'neq' | 'in') => {
    if (op === 'in') update({ if_operator: 'in',  if_value: null, if_group_id: rule.if_group_id ?? groups[0]?.id ?? null })
    else             update({ if_operator: op,    if_value: FIELD_VALUES[rule.if_field]?.[0] ?? '', if_group_id: null })
  }

  // When if_field changes, reset value to first valid option
  const handleIfFieldChange = (field: string) => {
    const firstVal = FIELD_VALUES[field]?.[0] ?? ''
    update({
      if_field:    field,
      if_operator: field === 'publication' ? 'in' : 'eq',
      if_value:    field === 'publication' ? null : firstVal,
      if_group_id: field === 'publication' ? (groups[0]?.id ?? null) : null,
    })
  }

  const ifFieldValues = FIELD_VALUES[rule.if_field] ?? []

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '2px solid var(--border)',
      padding:      '14px',
      marginBottom: 6,
      opacity:      rule.enabled ? 1 : 0.5,
    }}>
      {/* Top row: enable toggle + move + remove */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={e => update({ enabled: e.target.checked })}
            style={{ accentColor: 'var(--accent)', width: 13, height: 13 }}
          />
          <span style={{ ...LABEL_STYLE, margin: 0 }}>
            {rule.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" onClick={() => onMove('up')}   disabled={index === 0}         style={{ ...BTN_GHOST, padding: '3px 8px', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button type="button" onClick={() => onMove('down')} disabled={index === total - 1}  style={{ ...BTN_GHOST, padding: '3px 8px', opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
          <button type="button" onClick={onRemove} style={{ ...BTN_GHOST, padding: '3px 8px', color: '#FF6B6B', borderColor: '#FF6B6B' }}>✕</button>
        </div>
      </div>

      {/* Condition row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: '0 0 140px' }}>
          <label style={LABEL_STYLE}>If field</label>
          <select style={SELECT_STYLE} value={rule.if_field} onChange={e => handleIfFieldChange(e.target.value)}>
            {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ flex: '0 0 160px' }}>
          <label style={LABEL_STYLE}>Operator</label>
          <select
            style={SELECT_STYLE}
            value={rule.if_operator}
            onChange={e => handleOperatorChange(e.target.value as 'eq' | 'neq' | 'in')}
            // 'in' operator only valid for publication field
            disabled={rule.if_field !== 'publication' && rule.if_operator !== 'in'}
          >
            {OPERATOR_OPTIONS
              .filter(o => rule.if_field === 'publication' || o.value !== 'in')
              .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label style={LABEL_STYLE}>Value / Group</label>
          {rule.if_operator === 'in' ? (
            <select
              style={SELECT_STYLE}
              value={rule.if_group_id ?? ''}
              onChange={e => update({ if_group_id: e.target.value || null })}
            >
              <option value="">— select group —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.members.length})</option>)}
            </select>
          ) : ifFieldValues.length > 0 ? (
            <select
              style={SELECT_STYLE}
              value={rule.if_value ?? ''}
              onChange={e => update({ if_value: e.target.value })}
            >
              {ifFieldValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input
              type="text"
              style={INPUT_STYLE}
              value={rule.if_value ?? ''}
              onChange={e => update({ if_value: e.target.value })}
              placeholder="Enter value…"
            />
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
        <span style={{ ...LABEL_STYLE, margin: '0 4px 0 0', alignSelf: 'center', paddingTop: 16 }}>→ set</span>
        <div style={{ flex: '0 0 140px' }}>
          <label style={LABEL_STYLE}>Then field</label>
          <select
            style={SELECT_STYLE}
            value={rule.then_field}
            onChange={e => {
              const firstVal = FIELD_VALUES[e.target.value]?.[0] ?? ''
              update({ then_field: e.target.value, then_value: firstVal })
            }}
          >
            {FIELD_OPTIONS.filter(o => o.value !== 'publication').map(o =>
              <option key={o.value} value={o.value}>{o.label}</option>
            )}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={LABEL_STYLE}>To value</label>
          {(FIELD_VALUES[rule.then_field] ?? []).length > 0 ? (
            <select
              style={SELECT_STYLE}
              value={rule.then_value}
              onChange={e => update({ then_value: e.target.value })}
            >
              {FIELD_VALUES[rule.then_field].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input
              type="text"
              style={INPUT_STYLE}
              value={rule.then_value}
              onChange={e => update({ then_value: e.target.value })}
              placeholder="Enter value…"
            />
          )}
        </div>
      </div>

      {/* Note */}
      <div>
        <label style={LABEL_STYLE}>Note (optional)</label>
        <input
          type="text"
          style={INPUT_STYLE}
          value={rule.note ?? ''}
          onChange={e => update({ note: e.target.value || null })}
          placeholder="Describe what this rule does…"
        />
      </div>
    </div>
  )
}

// ── PublicationGroupPanel ────────────────────────────────────────────────────

function PublicationGroupsPanel({
  groups,
  onRefresh,
}: {
  groups:    PublicationGroup[]
  onRefresh: () => void
}) {
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [newName,    setNewName]    = useState('')
  const [newNote,    setNewNote]    = useState('')
  const [newMembers, setNewMembers] = useState('')  // newline-separated
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function createGroup() {
    const name    = newName.trim()
    const members = newMembers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!name) { setError('Group name is required'); return }

    setSaving(true); setError(null)
    const res  = await fetch('/api/coverage-tracker/settings/publication-groups', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, note: newNote || undefined, members }),
    })
    const data = await res.json() as { error?: string }
    setSaving(false)

    if (!res.ok && res.status !== 207) { setError(data.error ?? 'Failed to create group'); return }
    setNewName(''); setNewNote(''); setNewMembers('')
    onRefresh()
  }

  return (
    <div>
      {/* Existing groups */}
      {groups.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          No publication groups yet. Create one below.
        </p>
      )}

      {groups.map(g => (
        <div key={g.id} style={{ background: 'var(--surface)', border: '2px solid var(--border)', marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => setExpanded(expanded === g.id ? null : g.id)}
            style={{
              width:      '100%',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border:     'none',
              padding:    '12px 14px',
              cursor:     'pointer',
              textAlign:  'left',
            }}
          >
            <span style={{
              fontFamily:    'var(--font-heading)',
              fontWeight:    700,
              fontSize:      13,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color:         'var(--text)',
            }}>
              {g.name}
              <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 10, fontWeight: 400 }}>
                {g.members.length} {g.members.length === 1 ? 'publication' : 'publications'}
              </span>
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{expanded === g.id ? '▲' : '▼'}</span>
          </button>

          {expanded === g.id && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
              {g.note && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 10 }}>{g.note}</p>
              )}
              {g.members.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>No members yet.</p>
              ) : (
                <div style={{
                  display:       'flex',
                  flexWrap:      'wrap',
                  gap:           6,
                  marginTop:     10,
                  maxHeight:     180,
                  overflowY:     'auto',
                }}>
                  {g.members.map(m => (
                    <span key={m.id} style={{
                      fontFamily:  'var(--font-body)',
                      fontSize:    12,
                      background:  'var(--surface-2)',
                      border:      '1px solid var(--border)',
                      color:       'var(--text-muted)',
                      padding:     '2px 8px',
                    }}>
                      {m.value}
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 12, fontStyle: 'italic' }}>
                Full member editing (add/remove individually) coming in a future update.
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Create new group */}
      <div style={{
        marginTop:  20,
        background: 'var(--surface)',
        border:     '2px solid var(--border)',
        borderLeft: '4px solid var(--accent)',
        padding:    '16px',
      }}>
        <p style={{
          fontFamily:    'var(--font-heading)',
          fontWeight:    700,
          fontSize:      11,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color:         'var(--text-dim)',
          marginBottom:  14,
        }}>
          New Publication Group
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={LABEL_STYLE}>Group Name</label>
            <input
              type="text"
              style={INPUT_STYLE}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. TV Broadcasters"
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={LABEL_STYLE}>Note (optional)</label>
            <input
              type="text"
              style={INPUT_STYLE}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="What is this group for?"
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>
            Publications — one per line (exact names from Meltwater exports)
          </label>
          <textarea
            style={{
              ...INPUT_STYLE,
              height:     120,
              resize:     'vertical',
              lineHeight: 1.5,
            }}
            value={newMembers}
            onChange={e => setNewMembers(e.target.value)}
            placeholder={'Nine Network\nSeven Network\nABC News\n…'}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 10 }}>{error}</p>
        )}

        <button
          type="button"
          style={BTN_PRIMARY}
          onClick={createGroup}
          disabled={saving}
        >
          {saving ? 'Creating…' : 'Create Group'}
        </button>
      </div>
    </div>
  )
}

// ── SettingsModal ────────────────────────────────────────────────────────────

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab,     setTab]     = useState<Tab>('rules')
  const [rules,   setRules]   = useState<FieldRule[]>([])
  const [groups,  setGroups]  = useState<PublicationGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Load data ──────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rulesRes, groupsRes] = await Promise.all([
        fetch('/api/coverage-tracker/settings/rules'),
        fetch('/api/coverage-tracker/settings/publication-groups'),
      ])
      const rulesData  = await rulesRes.json()  as { rules?: FieldRule[];         error?: string }
      const groupsData = await groupsRes.json() as { groups?: PublicationGroup[]; error?: string }

      if (!rulesRes.ok)  throw new Error(rulesData.error  ?? 'Failed to load rules')
      if (!groupsRes.ok) throw new Error(groupsData.error ?? 'Failed to load groups')

      setRules(rulesData.rules   ?? [])
      setGroups(groupsData.groups ?? [])
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Close on Esc (guard: don't close if saving)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving, onClose])

  // ── Rules helpers ──────────────────────────────────────────────

  const updateRule = (idx: number, r: FieldRule) => {
    setRules(prev => prev.map((x, i) => i === idx ? r : x))
    setDirty(true); setSuccess(false)
  }

  const addRule = () => {
    setRules(prev => [...prev, emptyRule(prev.length)])
    setDirty(true); setSuccess(false)
  }

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sort_order: i })))
    setDirty(true); setSuccess(false)
  }

  const moveRule = (idx: number, dir: 'up' | 'down') => {
    const next = [...rules]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setRules(next.map((r, i) => ({ ...r, sort_order: i })))
    setDirty(true); setSuccess(false)
  }

  // ── Save rules ─────────────────────────────────────────────────

  async function saveRules() {
    setSaving(true); setError(null); setSuccess(false)
    const res  = await fetch('/api/coverage-tracker/settings/rules', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rules }),
    })
    const data = await res.json() as { error?: string }
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save rules'); return }
    setDirty(false); setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div
      style={{
        position:   'fixed',
        inset:       0,
        background:  'rgba(0,0,0,0.75)',
        zIndex:      100,
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        padding:     '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Coverage Tracker Settings"
    >
      <div style={{
        background:   'var(--surface)',
        border:       '2px solid var(--border)',
        width:        '100%',
        maxWidth:     760,
        maxHeight:    '85vh',
        display:      'flex',
        flexDirection: 'column',
        overflow:     'hidden',
      }}>

        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '16px 20px',
          borderBottom:   '2px solid var(--border)',
          flexShrink:     0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{
              fontFamily:    'var(--font-heading)',
              fontWeight:    900,
              fontSize:      18,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color:         'var(--text)',
            }}>
              Settings
            </span>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2 }}>
              {(['rules', 'groups'] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    fontFamily:    'var(--font-heading)',
                    fontWeight:    700,
                    fontSize:      11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    background:    tab === t ? 'var(--accent)' : 'transparent',
                    color:         tab === t ? 'var(--accent-fg)' : 'var(--text-muted)',
                    border:        `2px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
                    padding:       '4px 12px',
                    cursor:        'pointer',
                  }}
                >
                  {t === 'rules' ? 'Rules' : 'Publication Groups'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => { if (!saving) onClose() }}
            style={{ ...BTN_GHOST, padding: '4px 10px', fontSize: 14 }}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
          )}
          {!loading && error && (
            <p style={{ color: '#FF6B6B', fontSize: 13 }}>{error}</p>
          )}

          {!loading && !error && tab === 'rules' && (
            <div>
              {/* Explainer */}
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.55 }}>
                Rules run automatically when a CSV is uploaded and when Format is changed in the review table.
                They execute in order — later rules override earlier ones if they target the same field.
              </p>

              {rules.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                  No rules configured. Add one below.
                </p>
              )}

              {rules.map((rule, idx) => (
                <RuleRow
                  key={rule.id ?? `new-${idx}`}
                  rule={rule}
                  groups={groups}
                  index={idx}
                  total={rules.length}
                  onChange={r => updateRule(idx, r)}
                  onRemove={() => removeRule(idx)}
                  onMove={dir => moveRule(idx, dir)}
                />
              ))}

              <button type="button" style={{ ...BTN_GHOST, marginTop: 8 }} onClick={addRule}>
                + Add Rule
              </button>
            </div>
          )}

          {!loading && !error && tab === 'groups' && (
            <PublicationGroupsPanel groups={groups} onRefresh={load} />
          )}
        </div>

        {/* Footer — save bar (rules tab only) */}
        {tab === 'rules' && !loading && (
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '14px 20px',
            borderTop:      '2px solid var(--border)',
            flexShrink:     0,
            background:     'var(--surface)',
          }}>
            <div>
              {error && <p style={{ fontSize: 12, color: '#FF6B6B', margin: 0 }}>{error}</p>}
              {success && <p style={{ fontSize: 12, color: '#4ADE80', margin: 0 }}>Rules saved.</p>}
              {dirty && !error && !success && (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>Unsaved changes</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" style={BTN_GHOST} onClick={() => { if (!saving) onClose() }}>
                Cancel
              </button>
              <button
                type="button"
                style={{ ...BTN_PRIMARY, opacity: dirty ? 1 : 0.5 }}
                onClick={saveRules}
                disabled={saving || !dirty}
              >
                {saving ? 'Saving…' : 'Save Rules'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
