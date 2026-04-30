'use client'

import { cn } from '@/lib/utils'
import {
  type FieldRule, type PublicationGroup,
  FIELD_OPTIONS, FIELD_VALUES, OPERATOR_OPTIONS,
  fieldLabel, operatorLabel, truncate,
} from './types'

interface Props {
  rule:             FieldRule
  groups:           PublicationGroup[]
  index:            number
  total:            number
  collapsed:        boolean
  onChange:         (r: FieldRule) => void
  onRemove:         () => void
  onMove:           (dir: 'up' | 'down') => void
  onToggleCollapse: () => void
}

export default function RuleRow({
  rule, groups, index, total, collapsed,
  onChange, onRemove, onMove, onToggleCollapse,
}: Props) {
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
