/**
 * Build the Linear issue title + description body for a support submission.
 * Pure formatting — no I/O, no auth — so the route handler can stay small.
 */

export interface SupportIssueFields {
  submitterName:  string
  submitterEmail: string
  toolLabel:      string
  urgencyLabel:   string
  tried:          string
  happened:       string
  screenshotUrl?: string | null
}

export function buildSupportIssueTitle(tried: string): string {
  // Auto-generate title from "what they tried to do" (first 100 chars).
  const raw = tried.replace(/\n/g, ' ').trim()
  return raw.length > 100 ? raw.slice(0, 97) + '…' : raw
}

export function buildSupportIssueDescription(fields: SupportIssueFields): string {
  const lines = [
    `**Submitted by:** ${fields.submitterName} (${fields.submitterEmail})`,
    `**Tool:** ${fields.toolLabel}`,
    `**Urgency:** ${fields.urgencyLabel}`,
    '',
    '---',
    '',
    '## What were you trying to do?',
    fields.tried,
    '',
    '## What happened instead?',
    fields.happened,
  ]

  if (fields.screenshotUrl) {
    lines.push('', '---', '', `**Screenshot:** [View](${fields.screenshotUrl})`)
  }

  return lines.join('\n')
}
