/**
 * Linear GraphQL client primitives — server-side only.
 *
 * Generic-enough for any Linear integration: pass an apiKey and a query/
 * variables payload. Higher-level helpers (createIssue, attachFile) live
 * here too since both are commonly reused together.
 */

import 'server-only'

const LINEAR_API_URL = 'https://api.linear.app/graphql'

const CREATE_ISSUE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`

const CREATE_ATTACHMENT_MUTATION = `
  mutation AttachmentCreate($input: AttachmentCreateInput!) {
    attachmentCreate(input: $input) {
      success
      attachment {
        id
      }
    }
  }
`

export interface LinearIssueInput {
  teamId:      string
  title:       string
  description: string
  priority:    number
}

export interface LinearIssue {
  id:         string
  identifier: string
  title:      string
  url:        string
}

async function linearRequest<T>(body: object, apiKey: string): Promise<T> {
  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify(body),
  })

  // Always read the body — Linear often includes useful error detail even on 4xx
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const detail = json?.errors?.[0]?.message ?? JSON.stringify(json)
    throw new Error(`Linear API ${res.status}: ${detail}`)
  }

  if (json?.errors?.length) {
    throw new Error(`Linear GraphQL error: ${json.errors[0].message}`)
  }

  return json.data
}

export async function createLinearIssue(input: LinearIssueInput, apiKey: string): Promise<LinearIssue> {
  const data = await linearRequest<{
    issueCreate: { success: boolean; issue: LinearIssue }
  }>({ query: CREATE_ISSUE_MUTATION, variables: { input } }, apiKey)

  if (!data.issueCreate.success) throw new Error('issueCreate returned success: false')
  return data.issueCreate.issue
}

export async function attachFileToLinearIssue(
  issueId: string,
  url: string,
  title: string,
  apiKey: string,
): Promise<void> {
  await linearRequest({
    query: CREATE_ATTACHMENT_MUTATION,
    variables: { input: { issueId, url, title } },
  }, apiKey)
}
