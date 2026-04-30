'use client'

import type { Operator } from '@/lib/coverage-tracker/types'

interface Props {
  label:       string
  items:       string[]
  ops:         Operator[]
  placeholder: string
  onUpdate:    (idx: number, value: string) => void
  onAdd:       () => void
  onRemove:    (idx: number) => void
  onSetOp:     (idx: number, op: Operator) => void
}

/**
 * Repeating list of text inputs with a per-item AND/OR toggle BETWEEN
 * adjacent entries. ops[i] is the operator between items[i] and items[i+1].
 * The "Add another" button appears once the last item has content.
 */
export default function RepeatingField({
  label, items, ops, placeholder,
  onUpdate, onAdd, onRemove, onSetOp,
}: Props) {
  return (
    <div className="ct-field-wrap">
      <label className="ct-label">{label}</label>
      <div className="ct-field-group">
        {items.map((item, i) => (
          <div key={i}>
            {i > 0 && (
              <div className="ct-op-toggle mb-[6px]">
                {(['AND', 'OR'] as Operator[]).map(op => (
                  <button
                    key={op}
                    type="button"
                    className={`ct-btn ct-btn-toggle${ops[i - 1] === op ? ' is-active' : ''}`}
                    onClick={() => onSetOp(i - 1, op)}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
            <div className="ct-field-row">
              <input
                type="text"
                className="ct-input"
                value={item}
                onChange={e => onUpdate(i, e.target.value)}
                placeholder={`${placeholder} ${i + 1}`}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  className="ct-remove-btn"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove ${label} ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {items[items.length - 1].trim() !== '' && (
        <button type="button" className="ct-btn ct-btn-add mt-2" onClick={onAdd}>
          + Add another {label.replace(/\(s\)$/, '').replace(/\(.*\)$/, '').trim().toLowerCase()}
        </button>
      )}
    </div>
  )
}
