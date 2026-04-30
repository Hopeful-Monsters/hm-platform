/**
 * Org-level rule evaluator for the Coverage Tracker.
 *
 * Rules execute in sort_order ascending (array order). Last write wins
 * when multiple rules target the same field. Disabled rules are skipped.
 *
 * Operators:
 *   eq  — if_field value exactly equals if_value (case-sensitive)
 *   neq — if_field value does not equal if_value
 *   in  — if_field value is in the publication group's member list
 */

import type { CoverageRow } from './types'
import type { FieldRule, PublicationGroup } from '@/app/coverage-tracker/_components/SettingsModal'

export function applyRules(
  row:    CoverageRow,
  rules:  FieldRule[],
  groups: PublicationGroup[],
): CoverageRow {
  let r = { ...row }

  for (const rule of rules) {
    if (!rule.enabled) continue

    const fieldVal = r[rule.if_field as keyof CoverageRow] ?? ''
    let matches = false

    if (rule.if_operator === 'eq') {
      matches = fieldVal === rule.if_value
    } else if (rule.if_operator === 'neq') {
      matches = fieldVal !== rule.if_value
    } else if (rule.if_operator === 'in' && rule.if_group_id) {
      const group = groups.find(g => g.id === rule.if_group_id)
      matches = !!group?.members.some(m => m.value === fieldVal)
    }

    if (matches) {
      r = { ...r, [rule.then_field]: rule.then_value }
    }
  }

  return r
}
