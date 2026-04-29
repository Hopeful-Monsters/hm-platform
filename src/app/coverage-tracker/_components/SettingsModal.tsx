'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import RuleRow from './settings/RuleRow'
import PublicationGroupsPanel from './settings/PublicationGroupsPanel'
import {
  type FieldRule, type PublicationGroup, type SettingsTab,
  FIELD_OPTIONS, emptyRule,
} from './settings/types'

// Re-exported so imports like `import type { FieldRule } from './SettingsModal'`
// in coverage-tracker/page.tsx keep working without churn.
export type { FieldRule, PublicationGroup }

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab,          setTab]          = useState<SettingsTab>('rules')
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
        <div className="sm-header">
          <div className="sm-header-left">
            <span className="sm-title">Settings</span>
            <div className="sm-tabs">
              {(['rules', 'groups'] as SettingsTab[]).map(t => (
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
