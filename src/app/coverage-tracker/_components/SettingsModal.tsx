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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fieldLabel(value: string): string {
  return FIELD_OPTIONS.find(o => o.value === value)?.label ?? value
}

function operatorLabel(value: string): string {
  return OPERATOR_OPTIONS.find(o => o.value === value)?.label ?? value
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '…'
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

// ── RuleRow — collapsible inline editable rule ───────────────────────────────

function RuleRow({
  rule,
  groups,
  index,
  total,
  collapsed,
  onChange,
  onRemove,
  onMove,
  onToggleCollapse,
}: {
  rule:             FieldRule
  groups:           PublicationGroup[]
  index:            number
  total:            number
  collapsed:        boolean
  onChange:         (r: FieldRule) => void
  onRemove:         () => void
  onMove:           (dir: 'up' | 'down') => void
  onToggleCollapse: () => void
}) {
  const update = (patch: Partial<FieldRule>) => onChange({ ...rule, ...patch })

  const handleOperatorChange = (op: 'eq' | 'neq' | 'in') => {
    if (op === 'in') update({ if_operator: 'in',  if_value: null, if_group_id: rule.if_group_id ?? groups[0]?.id ?? null })
    else             update({ if_operator: op,    if_value: FIELD_VALUES[rule.if_field]?.[0] ?? '', if_group_id: null })
  }

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

  // Build a readable one-line summary of the rule for the collapsed view
  const ifValueLabel = rule.if_operator === 'in'
    ? (groups.find(g => g.id === rule.if_group_id)?.name ?? 'unknown group')
    : (rule.if_value ?? '—')

  const summary = `If ${fieldLabel(rule.if_field)} ${operatorLabel(rule.if_operator)} "${ifValueLabel}" → set ${fieldLabel(rule.then_field)} "${rule.then_value}"`

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '2px solid var(--border)',
      marginBottom: 6,
      opacity:      rule.enabled ? 1 : 0.55,
    }}>
      {/* ── Collapsed header (always visible) ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        '9px 12px',
        cursor:         'pointer',
        userSelect:     'none',
      }}>
        {/* Expand/collapse toggle — clicking anywhere on this row expands */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand rule' : 'Collapse rule'}
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      'var(--text-dim)',
            fontSize:   11,
            padding:    '0 2px',
            flexShrink: 0,
          }}
        >
          {collapsed ? '▶' : '▼'}
        </button>

        {/* Enabled dot */}
        <span style={{
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   rule.enabled ? 'var(--accent)' : 'var(--border-2)',
          flexShrink:   0,
          display:      'inline-block',
        }} />

        {/* Summary — click to expand */}
        <span
          onClick={onToggleCollapse}
          style={{
            flex:       1,
            fontFamily: 'var(--font-body)',
            fontSize:   12,
            color:      'var(--text-muted)',
            overflow:   'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {summary}
        </span>

        {/* Note preview (collapsed only) */}
        {collapsed && rule.note && (
          <span style={{
            fontFamily:  'var(--font-body)',
            fontSize:    11,
            color:       'var(--text-dim)',
            fontStyle:   'italic',
            maxWidth:    180,
            overflow:    'hidden',
            whiteSpace:  'nowrap',
            textOverflow:'ellipsis',
            flexShrink:  0,
          }}>
            {truncate(rule.note, 60)}
          </span>
        )}

        {/* Move + remove controls */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button type="button" onClick={() => onMove('up')}   disabled={index === 0}        style={{ ...BTN_GHOST, padding: '2px 7px', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button type="button" onClick={() => onMove('down')} disabled={index === total - 1} style={{ ...BTN_GHOST, padding: '2px 7px', opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
          <button type="button" onClick={onRemove} style={{ ...BTN_GHOST, padding: '2px 7px', color: '#FF6B6B', borderColor: '#FF6B6B' }}>✕</button>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {!collapsed && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          {/* Enable toggle */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 12 }}>
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
              maxLength={500}
            />
          </div>
        </div>
      )}
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
  const [expanded,      setExpanded]      = useState<string | null>(null)
  const [newName,       setNewName]       = useState('')
  const [newNote,       setNewNote]       = useState('')
  const [newMembers,    setNewMembers]    = useState('')  // newline-separated
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // Per-group add-member state
  const [addInputs,     setAddInputs]     = useState<Record<string, string>>({})
  const [groupSaving,   setGroupSaving]   = useState<Record<string, boolean>>({})
  const [groupErrors,   setGroupErrors]   = useState<Record<string, string | null>>({})

  // ── Create new group ────────────────────────────────────────────

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

  // ── Add members to existing group ───────────────────────────────

  async function addMembersToGroup(groupId: string) {
    const raw = (addInputs[groupId] ?? '').trim()
    if (!raw) return

    const toAdd = raw.split('\n').map(s => s.trim()).filter(Boolean)
    if (toAdd.length === 0) return

    setGroupSaving(s => ({ ...s, [groupId]: true }))
    setGroupErrors(e => ({ ...e, [groupId]: null }))

    const res  = await fetch(`/api/coverage-tracker/settings/publication-groups/${groupId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ addMembers: toAdd }),
    })
    const data = await res.json() as { error?: string }

    setGroupSaving(s => ({ ...s, [groupId]: false }))

    if (!res.ok) {
      setGroupErrors(e => ({ ...e, [groupId]: data.error ?? 'Failed to add members' }))
      return
    }

    setAddInputs(a => ({ ...a, [groupId]: '' }))
    onRefresh()
  }

  // ── Remove a single member ───────────────────────────────────────

  async function removeMember(groupId: string, memberId: string) {
    setGroupSaving(s => ({ ...s, [groupId]: true }))
    setGroupErrors(e => ({ ...e, [groupId]: null }))

    const res  = await fetch(`/api/coverage-tracker/settings/publication-groups/${groupId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ removeIds: [memberId] }),
    })
    const data = await res.json() as { error?: string }

    setGroupSaving(s => ({ ...s, [groupId]: false }))

    if (!res.ok) {
      setGroupErrors(e => ({ ...e, [groupId]: data.error ?? 'Failed to remove member' }))
      return
    }

    onRefresh()
  }

  // ── Delete entire group ──────────────────────────────────────────

  async function deleteGroup(groupId: string, groupName: string) {
    if (!confirm(`Delete "${groupName}"? This cannot be undone and will break any rules that reference it.`)) return

    setGroupSaving(s => ({ ...s, [groupId]: true }))
    setGroupErrors(e => ({ ...e, [groupId]: null }))

    const res  = await fetch(`/api/coverage-tracker/settings/publication-groups/${groupId}`, {
      method: 'DELETE',
    })
    const data = await res.json() as { error?: string }

    setGroupSaving(s => ({ ...s, [groupId]: false }))

    if (!res.ok) {
      setGroupErrors(e => ({ ...e, [groupId]: data.error ?? 'Failed to delete group' }))
      return
    }

    if (expanded === groupId) setExpanded(null)
    onRefresh()
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div>
      {groups.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          No publication groups yet. Create one below.
        </p>
      )}

      {groups.map(g => {
        const isExpanded  = expanded === g.id
        const isSaving    = groupSaving[g.id] ?? false
        const groupError  = groupErrors[g.id] ?? null
        const addInput    = addInputs[g.id] ?? ''

        return (
          <div key={g.id} style={{ background: 'var(--surface)', border: '2px solid var(--border)', marginBottom: 6 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : g.id)}
                style={{
                  flex:        1,
                  display:     'flex',
                  alignItems:  'center',
                  gap:         8,
                  background:  'none',
                  border:      'none',
                  padding:     '11px 14px',
                  cursor:      'pointer',
                  textAlign:   'left',
                  minWidth:    0,
                }}
              >
                <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span style={{
                  fontFamily:    'var(--font-heading)',
                  fontWeight:    700,
                  fontSize:      13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color:         'var(--text)',
                  overflow:      'hidden',
                  whiteSpace:    'nowrap',
                  textOverflow:  'ellipsis',
                }}>
                  {g.name}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>
                  {g.members.length} {g.members.length === 1 ? 'publication' : 'publications'}
                </span>
              </button>

              {/* Delete group button */}
              <button
                type="button"
                onClick={() => deleteGroup(g.id, g.name)}
                disabled={isSaving}
                title="Delete group"
                style={{
                  ...BTN_GHOST,
                  padding:     '4px 10px',
                  margin:      '0 10px',
                  color:       '#FF6B6B',
                  borderColor: '#FF6B6B',
                  fontSize:    11,
                  flexShrink:  0,
                }}
              >
                Delete
              </button>
            </div>

            {/* Expanded body */}
            {isExpanded && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                {g.note && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 8 }}>{g.note}</p>
                )}

                {/* Member chips with remove buttons */}
                {g.members.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10, marginBottom: 10 }}>No members yet.</p>
                ) : (
                  <div style={{
                    display:   'flex',
                    flexWrap:  'wrap',
                    gap:       6,
                    marginTop: 10,
                    marginBottom: 12,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}>
                    {g.members.map(m => (
                      <span key={m.id} style={{
                        display:    'inline-flex',
                        alignItems: 'center',
                        gap:        5,
                        fontFamily: 'var(--font-body)',
                        fontSize:   12,
                        background: 'var(--surface-2)',
                        border:     '1px solid var(--border)',
                        color:      'var(--text-muted)',
                        padding:    '2px 6px 2px 8px',
                      }}>
                        {m.value}
                        <button
                          type="button"
                          onClick={() => removeMember(g.id, m.id)}
                          disabled={isSaving}
                          aria-label={`Remove ${m.value}`}
                          style={{
                            background:  'none',
                            border:      'none',
                            cursor:      'pointer',
                            color:       '#FF6B6B',
                            fontSize:    11,
                            lineHeight:  1,
                            padding:     '0 1px',
                            opacity:     isSaving ? 0.4 : 1,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add members input */}
                <div style={{ marginTop: 8 }}>
                  <label style={LABEL_STYLE}>Add publications — one per line</label>
                  <textarea
                    style={{
                      ...INPUT_STYLE,
                      height:     80,
                      resize:     'vertical',
                      lineHeight: 1.5,
                      opacity:    isSaving ? 0.6 : 1,
                    }}
                    value={addInput}
                    onChange={e => setAddInputs(a => ({ ...a, [g.id]: e.target.value }))}
                    placeholder={'Nine Network\nSeven Network\n…'}
                    disabled={isSaving}
                  />
                </div>

                {groupError && (
                  <p style={{ fontSize: 12, color: '#FF6B6B', marginTop: 6 }}>{groupError}</p>
                )}

                <button
                  type="button"
                  style={{ ...BTN_GHOST, marginTop: 8, opacity: (!addInput.trim() || isSaving) ? 0.5 : 1 }}
                  onClick={() => addMembersToGroup(g.id)}
                  disabled={!addInput.trim() || isSaving}
                >
                  {isSaving ? 'Saving…' : '+ Add Members'}
                </button>
              </div>
            )}
          </div>
        )
      })}

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
              maxLength={200}
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
              maxLength={500}
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
  const [tab,          setTab]          = useState<Tab>('rules')
  const [rules,        setRules]        = useState<FieldRule[]>([])
  const [groups,       setGroups]       = useState<PublicationGroup[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [dirty,        setDirty]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState(false)

  // Which rules are collapsed (by index key). All existing rules start collapsed;
  // newly added rules start expanded.
  const [collapsedSet, setCollapsedSet] = useState<Set<number>>(new Set())

  // Filter by if_field — '' means show all
  const [ifFilter,     setIfFilter]     = useState<string>('')

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

      const loadedRules = rulesData.rules ?? []
      setRules(loadedRules)
      setGroups(groupsData.groups ?? [])

      // Collapse all loaded rules by default
      setCollapsedSet(new Set(loadedRules.map((_, i) => i)))
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
    setRules(prev => {
      const next = [...prev, emptyRule(prev.length)]
      // Expand the new rule, keep others as-is
      setCollapsedSet(c => {
        const updated = new Set(c)
        updated.delete(next.length - 1)
        return updated
      })
      return next
    })
    setDirty(true); setSuccess(false)
  }

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sort_order: i })))
    // Rebuild collapsed set — indices shift after removal
    setCollapsedSet(c => {
      const updated = new Set<number>()
      c.forEach(i => { if (i < idx) updated.add(i); else if (i > idx) updated.add(i - 1) })
      return updated
    })
    setDirty(true); setSuccess(false)
  }

  const moveRule = (idx: number, dir: 'up' | 'down') => {
    const next = [...rules]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setRules(next.map((r, i) => ({ ...r, sort_order: i })))
    // Swap collapsed state for the two indices
    setCollapsedSet(c => {
      const updated = new Set(c)
      const idxWasCollapsed  = updated.has(idx)
      const swapWasCollapsed = updated.has(swap)
      if (idxWasCollapsed)  updated.add(swap);  else updated.delete(swap)
      if (swapWasCollapsed) updated.add(idx);   else updated.delete(idx)
      return updated
    })
    setDirty(true); setSuccess(false)
  }

  const toggleCollapse = (idx: number) => {
    setCollapsedSet(c => {
      const updated = new Set(c)
      if (updated.has(idx)) updated.delete(idx)
      else updated.add(idx)
      return updated
    })
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

  // ── Filtered rules for display ─────────────────────────────────

  // We filter the display indices, not the underlying array, to keep indices stable
  const displayedIndices = rules
    .map((r, i) => ({ rule: r, idx: i }))
    .filter(({ rule }) => !ifFilter || rule.if_field === ifFilter)

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
              {/* Explainer + filter row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0, flex: 1, minWidth: 260 }}>
                  Rules run automatically when a CSV is uploaded and when Format is changed in the review table.
                  They execute in order — later rules override earlier ones if they target the same field.
                </p>

                {/* If-field filter */}
                <div style={{ flexShrink: 0, minWidth: 170 }}>
                  <label style={LABEL_STYLE}>Filter by If field</label>
                  <select
                    style={{ ...SELECT_STYLE, width: 'auto', minWidth: 170 }}
                    value={ifFilter}
                    onChange={e => setIfFilter(e.target.value)}
                  >
                    <option value="">All fields ({rules.length})</option>
                    {FIELD_OPTIONS.map(o => {
                      const count = rules.filter(r => r.if_field === o.value).length
                      return count > 0
                        ? <option key={o.value} value={o.value}>{o.label} ({count})</option>
                        : null
                    })}
                  </select>
                </div>
              </div>

              {rules.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                  No rules configured. Add one below.
                </p>
              )}

              {ifFilter && displayedIndices.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                  No rules match this filter.
                </p>
              )}

              {displayedIndices.map(({ rule, idx }) => (
                <RuleRow
                  key={rule.id ?? `new-${idx}`}
                  rule={rule}
                  groups={groups}
                  index={idx}
                  total={rules.length}
                  collapsed={collapsedSet.has(idx)}
                  onChange={r => updateRule(idx, r)}
                  onRemove={() => removeRule(idx)}
                  onMove={dir => moveRule(idx, dir)}
                  onToggleCollapse={() => toggleCollapse(idx)}
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
