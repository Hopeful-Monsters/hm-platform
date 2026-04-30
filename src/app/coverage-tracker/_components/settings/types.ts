/**
 * Coverage Tracker settings types and option lists — shared between the
 * settings modal, the rule editor row, and the publication-groups panel.
 *
 * Field options stay in lock-step with the API schema in
 * /api/coverage-tracker/settings/rules and the page-level rule engine.
 */

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

export type SettingsTab = 'rules' | 'groups'

export const FIELD_OPTIONS = [
  { value: 'mediaFormat', label: 'Media Format' },
  { value: 'mediaType',   label: 'Media Type'   },
  { value: 'sentiment',   label: 'Sentiment'     },
  { value: 'keyMsg',      label: 'Key Messages'  },
  { value: 'spokes',      label: 'Spokes Quote'  },
  { value: 'image',       label: 'Image'         },
  { value: 'cta',         label: 'CTA'           },
  { value: 'publication', label: 'Publication'   },
] as const

export const FIELD_VALUES: Record<string, string[]> = {
  mediaFormat: ['ONLINE', 'PRINT', 'TV', 'RADIO', 'SOCIAL MEDIA', 'PODCAST'],
  mediaType:   ['Metro', 'Regional', 'National', 'Lifestyle', 'Sports', 'Marketing Trade'],
  sentiment:   ['POSITIVE', 'NEUTRAL', 'NEGATIVE'],
  keyMsg:      ['YES', 'NO'],
  spokes:      ['YES', 'NO'],
  image:       ['YES', 'NO'],
  cta:         ['YES', 'NO'],
  publication: [],
}

export const OPERATOR_OPTIONS = [
  { value: 'eq',  label: 'equals'         },
  { value: 'neq', label: 'does not equal' },
  { value: 'in',  label: 'is in group'    },
] as const

export function fieldLabel(value: string): string {
  return FIELD_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function operatorLabel(value: string): string {
  return OPERATOR_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '…'
}

export function emptyRule(sort_order: number): FieldRule {
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
