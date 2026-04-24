'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

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
  publication: [],
}

const OPERATOR_OPTIONS = [
  { value: 'eq',  label: 'equals'         },
  { value: 'neq', label: 'does not equal' },
  { value: 'in',  label: 'is in group'    },
]

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

// ── RuleRow ──────────────────────────────────────────────────────────────────

function RuleRow({
  rule, groups, index, total, collapsed,
  onChange, onRemove, onMove, onToggleCollapse,
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

  const ifValueLabel = rule.if_operator === 'in'
    ? (groups.find(g => g.id === rule.if_group_id)?.name ?? 'unknown group')
    : (rule.if_value ?? '—')

  const summary = `If ${fieldLabel(rule.if_field)} ${operatorLabel(rule.if_operator)} "${ifValueLabel}" → set ${fieldLabel(rule.then_field)} "${rule.then_value}"`

  return (
    <div className={cn('sm-rule-row', !rule.enabled && 'is-disabled')}>
      {/* Collapsed header */}
      <div className="sm-rule-header">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand rule' : 'Collapse rule'}
          className="sm-rule-expand-btn"
        >
          {collapsed ? '▶' : '▼'}
        </button>

        <span className={cn('sm-rule-dot', rule.enabled ? 'is-active' : 'is-inactive')} />

        <span onClick={onToggleCollapse} className="sm-rule-summary">
          {summary}
        </span>

        {collapsed && rule.note && (
          <span className="sm-rule-note">{truncate(rule.note, 60)}</span>
        )}

        <div className="sm-rule-controls">
          <button type="button" onClick={() => onMove('up')}   disabled={index === 0}        className="sm-btn-ghost">↑</button>
          <button type="button" onClick={() => onMove('down')} disabled={index === total - 1} className="sm-btn-ghost">↓</button>
          <button type="button" onClick={onRemove}                                            className="sm-btn-danger">✕</button>
        </div>
      </div>

      {/* Expanded body */}
      {!collapsed && (
        <div className="sm-rule-body">
          <div className="sm-enable-row">
            <label className="sm-enable-label">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={e => update({ enabled: e.target.checked })}
                className="sm-checkbox"
              />
              <span className="sm-label sm-label--no-margin">
                {rule.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="sm-condition-row">
            <div className="sm-condition-field">
              <label className="sm-label">If field</label>
              <select className="sm-select" value={rule.if_field} onChange={e => handleIfFieldChange(e.target.value)}>
                {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="sm-condition-op">
              <label className="sm-label">Operator</label>
              <select
                className="sm-select"
                value={rule.if_operator}
                onChange={e => handleOperatorChange(e.target.value as 'eq' | 'neq' | 'in')}
                disabled={rule.if_field !== 'publication' && rule.if_operator !== 'in'}
              >
                {OPERATOR_OPTIONS
                  .filter(o => rule.if_field === 'publication' || o.value !== 'in')
                  .map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="sm-condition-val">
              <label className="sm-label">Value / Group</label>
              {rule.if_operator === 'in' ? (
                <select className="sm-select" value={rule.if_group_id ?? ''} onChange={e => update({ if_group_id: e.target.value || null })}>
                  <option value="">— select group —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.members.length})</option>)}
                </select>
              ) : ifFieldValues.length > 0 ? (
                <select className="sm-select" value={rule.if_value ?? ''} onChange={e => update({ if_value: e.target.value })}>
                  {ifFieldValues.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  className="sm-input"
                  value={rule.if_value ?? ''}
                  onChange={e => update({ if_value: e.target.value })}
                  placeholder="Enter value…"
                />
              )}
            </div>
          </div>

          <div className="sm-action-row">
            <span className="sm-action-arrow">→ set</span>
            <div className="sm-action-then">
              <label className="sm-label">Then field</label>
              <select
                className="sm-select"
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
            <div className="sm-action-val">
              <label className="sm-label">To value</label>
              {(FIELD_VALUES[rule.then_field] ?? []).length > 0 ? (
                <select className="sm-select" value={rule.then_value} onChange={e => update({ then_value: e.target.value })}>
                  {FIELD_VALUES[rule.then_field].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  className="sm-input"
                  value={rule.then_value}
                  onChange={e => update({ then_value: e.target.value })}
                  placeholder="Enter value…"
                />
              )}
            </div>
          </div>

          <div>
            <label className="sm-label">Note (optional)</label>
            <input
              type="text"
              className="sm-input"
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

// ── PublicationGroupsPanel ────────────────────────────────────────────────────

function PublicationGroupsPanel({
  groups,
  onRefresh,
}: {
  groups:    PublicationGroup[]
  onRefresh: () => void
}) {
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [newName,     setNewName]     = useState('')
  const [newNote,     setNewNote]     = useState('')
  const [newMembers,  setNewMembers]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [addInputs,   setAddInputs]   = useState<Record<string, string>>({})
  const [groupSaving, setGroupSaving] = useState<Record<string, boolean>>({})
  const [groupErrors, setGroupErrors] = useState<Record<string, string | null>>({})

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

  async function deleteGroup(groupId: string, groupName: string) {
    if (!confirm(`Delete "${groupName}"? This cannot be undone and will break any rules that reference it.`)) return

    setGroupSaving(s => ({ ...s, [groupId]: true }))
    setGroupErrors(e => ({ ...e, [groupId]: null }))

    const res  = await fetch(`/api/coverage-tracker/settings/publication-groups/${groupId}`, { method: 'DELETE' })
    const data = await res.json() as { error?: string }
    setGroupSaving(s => ({ ...s, [groupId]: false }))

    if (!res.ok) {
      setGroupErrors(e => ({ ...e, [groupId]: data.error ?? 'Failed to delete group' }))
      return
    }
    if (expanded === groupId) setExpanded(null)
    onRefresh()
  }

  return (
    <div>
      {groups.length === 0 && (
        <p className="sm-groups-empty">No publication groups yet. Create one below.</p>
      )}

      {groups.map(g => {
        const isExpanded = expanded === g.id
        const isSaving   = groupSaving[g.id] ?? false
        const groupError = groupErrors[g.id] ?? null
        const addInput   = addInputs[g.id] ?? ''

        return (
          <div key={g.id} className="sm-group-row">
            <div className="sm-group-header">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : g.id)}
                className="sm-group-expand-btn"
              >
                <span className="sm-group-caret">{isExpanded ? '▼' : '▶'}</span>
                <span className="sm-group-name">{g.name}</span>
                <span className="sm-group-count">{g.members.length} {g.members.length === 1 ? 'publication' : 'publications'}</span>
              </button>

              <button
                type="button"
                onClick={() => deleteGroup(g.id, g.name)}
                disabled={isSaving}
                title="Delete group"
                className="sm-group-delete-btn"
              >
                Delete
              </button>
            </div>

            {isExpanded && (
              <div className="sm-group-body">
                {g.note && <p className="sm-group-note">{g.note}</p>}

                {g.members.length === 0 ? (
                  <p className="sm-members-empty">No members yet.</p>
                ) : (
                  <div className="sm-member-chips">
                    {g.members.map(m => (
                      <span key={m.id} className="sm-member-chip">
                        {m.value}
                        <button
                          type="button"
                          onClick={() => removeMember(g.id, m.id)}
                          disabled={isSaving}
                          aria-label={`Remove ${m.value}`}
                          className="sm-member-remove-btn"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <label className="sm-label">Add publications — one per line</label>
                  <textarea
                    className={cn('sm-input', 'sm-textarea-resize')}
                    value={addInput}
                    onChange={e => setAddInputs(a => ({ ...a, [g.id]: e.target.value }))}
                    placeholder={'Nine Network\nSeven Network\n…'}
                    disabled={isSaving}
                  />
                </div>

                {groupError && <p className="sm-group-error">{groupError}</p>}

                <button
                  type="button"
                  className="sm-btn-ghost mt-2"
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

      <div className="sm-new-group-panel">
        <p className="sm-new-group-title">New Publication Group</p>

        <div className="sm-new-group-row">
          <div className="sm-new-group-field">
            <label className="sm-label">Group Name</label>
            <input
              type="text"
              className="sm-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. TV Broadcasters"
              maxLength={200}
            />
          </div>
          <div className="sm-new-group-field">
            <label className="sm-label">Note (optional)</label>
            <input
              type="text"
              className="sm-input"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="What is this group for?"
              maxLength={500}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="sm-label">Publications — one per line (exact names from Meltwater exports)</label>
          <textarea
            className={cn('sm-input', 'sm-textarea-lg')}
            value={newMembers}
            onChange={e => setNewMembers(e.target.value)}
            placeholder={'Nine Network\nSeven Network\nABC News\n…'}
          />
        </div>

        {error && <p className="sm-group-error--create">{error}</p>}

        <button type="button" className="sm-btn-primary" onClick={createGroup} disabled={saving}>
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
  const [collapsedSet, setCollapsedSet] = useState<Set<number>>(new Set())
  const [ifFilter,     setIfFilter]     = useState<string>('')

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
      setCollapsedSet(new Set(loadedRules.map((_, i) => i)))
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving, onClose])

  const updateRule = (idx: number, r: FieldRule) => {
    setRules(prev => prev.map((x, i) => i === idx ? r : x))
    setDirty(true); setSuccess(false)
  }

  const addRule = () => {
    setRules(prev => {
      const next = [...prev, emptyRule(prev.length)]
      setCollapsedSet(c => { const u = new Set(c); u.delete(next.length - 1); return u })
      return next
    })
    setDirty(true); setSuccess(false)
  }

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sort_order: i })))
    setCollapsedSet(c => {
      const u = new Set<number>()
      c.forEach(i => { if (i < idx) u.add(i); else if (i > idx) u.add(i - 1) })
      return u
    })
    setDirty(true); setSuccess(false)
  }

  const moveRule = (idx: number, dir: 'up' | 'down') => {
    const next = [...rules]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setRules(next.map((r, i) => ({ ...r, sort_order: i })))
    setCollapsedSet(c => {
      const u = new Set(c)
      const idxWas  = u.has(idx);  const swapWas = u.has(swap)
      if (idxWas)  u.add(swap);  else u.delete(swap)
      if (swapWas) u.add(idx);   else u.delete(idx)
      return u
    })
    setDirty(true); setSuccess(false)
  }

  const toggleCollapse = (idx: number) => {
    setCollapsedSet(c => {
      const u = new Set(c)
      if (u.has(idx)) u.delete(idx); else u.add(idx)
      return u
    })
  }

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

  const displayedIndices = rules
    .map((r, i) => ({ rule: r, idx: i }))
    .filter(({ rule }) => !ifFilter || rule.if_field === ifFilter)

  return (
    <div
      className="sm-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Coverage Tracker Settings"
    >
      <div className="sm-panel">
        {/* Header */}
        <div className="sm-header">
          <div className="sm-header-left">
            <span className="sm-title">Settings</span>
            <div className="sm-tabs">
              {(['rules', 'groups'] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn('sm-tab', tab === t && 'is-active')}
                >
                  {t === 'rules' ? 'Rules' : 'Publication Groups'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => { if (!saving) onClose() }}
            className="sm-btn-close"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="sm-body">
          {loading && <p className="sm-status-text sm-status-text--muted">Loading…</p>}
          {!loading && error && <p className="sm-status-text sm-status-text--error">{error}</p>}

          {!loading && !error && tab === 'rules' && (
            <div>
              <div className="sm-rules-filter-row">
                <p className="sm-rules-explainer">
                  Rules run automatically when a CSV is uploaded and when Format is changed in the review table.
                  They execute in order — later rules override earlier ones if they target the same field.
                </p>
                <div className="sm-rules-filter">
                  <label className="sm-label">Filter by If field</label>
                  <select
                    className={cn('sm-select', 'sm-select-auto')}
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
                <p className="sm-status-text sm-status-text--muted">No rules configured. Add one below.</p>
              )}
              {ifFilter && displayedIndices.length === 0 && (
                <p className="sm-status-text sm-status-text--muted">No rules match this filter.</p>
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

              <button type="button" className="sm-btn-ghost mt-2" onClick={addRule}>
                + Add Rule
              </button>
            </div>
          )}

          {!loading && !error && tab === 'groups' && (
            <PublicationGroupsPanel groups={groups} onRefresh={load} />
          )}
        </div>

        {/* Footer */}
        {tab === 'rules' && !loading && (
          <div className="sm-footer">
            <div>
              {error   && <p className={cn('sm-status-text', 'sm-status-text--error')}>{error}</p>}
              {success && <p className={cn('sm-status-text', 'sm-status-text--success')}>Rules saved.</p>}
              {dirty && !error && !success && (
                <p className={cn('sm-status-text', 'sm-status-text--unsaved')}>Unsaved changes</p>
              )}
            </div>
            <div className="sm-footer-actions">
              <button type="button" className="sm-btn-ghost" onClick={() => { if (!saving) onClose() }}>
                Cancel
              </button>
              <button
                type="button"
                className="sm-btn-primary"
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
