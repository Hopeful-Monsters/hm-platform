// Support-specific tool options — includes 'platform' for general/non-tool issues.
// Intentionally separate from lib/tools.ts, which only lists registered product tools.
// Import this in both api/support/route.ts and app/support/SupportForm.tsx.
export const SUPPORT_TOOL_OPTIONS = [
  { value: 'expenses-manager',    label: 'Expenses Manager' },
  { value: 'coverage-tracker',    label: 'Coverage Tracker' },
  { value: 'streamtime-reviewer', label: 'Streamtime Reviewer' },
  { value: 'platform',            label: 'Platform / General' },
] as const

export type SupportToolValue = (typeof SUPPORT_TOOL_OPTIONS)[number]['value']

/** Slug → label lookup for support tools */
export const SUPPORT_TOOL_LABELS: Record<SupportToolValue, string> = Object.fromEntries(
  SUPPORT_TOOL_OPTIONS.map(o => [o.value, o.label])
) as Record<SupportToolValue, string>
