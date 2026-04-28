// Canonical tool registry — single source of truth for tool slugs, labels, and descriptions.
// Import TOOL_SLUGS in proxy.ts; import TOOLS everywhere else.
// When adding a new tool: add it here only. proxy.ts, the dashboard, admin pages,
// and the access-request API all derive their lists from this file.
//
// Note: support/route.ts has its own TOOL_OPTIONS (includes 'platform' for general issues)
// and is intentionally not coupled to this registry.

export const TOOLS = [
  {
    slug: 'expenses-manager',
    label: 'Expenses Manager',
    description: 'Track, categorise, and report on expenses with detailed analytics.',
  },
  {
    slug: 'coverage-tracker',
    label: 'Coverage Tracker',
    description: 'Monitor earned media and coverage metrics across clients and campaigns.',
  },
  {
    slug: 'streamtime-reviewer',
    label: 'Streamtime Reviewer',
    description: 'Review weekly time entries, billable rates, and team performance from Streamtime.',
  },
] as const

export type ToolSlug = (typeof TOOLS)[number]['slug']

/** Flat array of slugs — use this in proxy.ts middleware */
export const TOOL_SLUGS: string[] = TOOLS.map(t => t.slug)

/** Slug → label lookup */
export const TOOL_LABEL: Record<ToolSlug, string> = Object.fromEntries(
  TOOLS.map(t => [t.slug, t.label])
) as Record<ToolSlug, string>
