import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TOOLS, TOOL_LABEL, type ToolSlug } from '@/lib/tools'
import { approveUser, approveToolRequest, denyToolRequest } from './_actions'

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/login')

  const service = createServiceClient()
  // perPage=200 covers the org for the foreseeable future; if it ever
  // exceeds that, build a paged admin UI rather than silently dropping users.
  const { data: users } = await service.auth.admin.listUsers({ perPage: 200 })
  const pendingUsers = users.users.filter(u => u.user_metadata?.status === 'pending')

  const { data: toolRequests } = await service
    .from('tool_access_requests')
    .select('id, user_id, user_email, tool_slug, message, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  return (
    <div>
      <h1 className="page-heading">Pending Approvals</h1>

      {/* Pending user approvals */}
      <section className="mb-12">
        <span className="eyebrow hm-text-dim block mb-4">
          Waiting for approval ({pendingUsers.length})
        </span>

        {pendingUsers.length === 0 ? (
          <p className="body-md hm-text-muted">
            No pending users right now.
          </p>
        ) : (
          pendingUsers.map(u => (
            <div key={u.id} className="bg-[var(--surface)] border-2 border-[var(--border)] border-l-4 border-l-[var(--accent)] p-6 mb-3">
              <div className="mb-4">
                <p className="font-[var(--font-heading)] font-bold text-lg uppercase tracking-wide hm-text mb-1">
                  {u.email}
                </p>
                <p className="eyebrow hm-text-dim">Status: {u.user_metadata?.status ?? 'unknown'}</p>
              </div>

              <form action={approveUser}>
                <input type="hidden" name="userId" value={u.id} />

                <p className="eyebrow hm-text-dim mb-2">Grant access to:</p>
                <div className="flex flex-col gap-2 mb-5">
                  {TOOLS.map(tool => (
                    <label key={tool.slug} className="flex items-center gap-2 body-md hm-text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        name="tools"
                        value={tool.slug}
                        defaultChecked
                        className="accent-[var(--accent)] w-3.5 h-3.5"
                      />
                      {tool.label}
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className="btn-hm bg-[var(--accent)] text-[var(--accent-fg)] text-base px-6 py-2.5"
                >
                  Approve User →
                </button>
              </form>
            </div>
          ))
        )}
      </section>

      {/* Tool access requests */}
      <section>
        <span className="eyebrow hm-text-dim block mb-4">
          Tool access requests ({toolRequests?.length ?? 0})
        </span>

        {!toolRequests || toolRequests.length === 0 ? (
          <p className="body-md hm-text-muted">
            No pending tool access requests.
          </p>
        ) : (
          toolRequests.map(req => {
            const toolLabel = TOOL_LABEL[req.tool_slug as ToolSlug] ?? req.tool_slug
            const createdAt = new Date(req.created_at).toLocaleDateString('en-AU', {
              day:   '2-digit',
              month: 'short',
              year:  'numeric',
            })
            return (
              <div key={req.id} className="bg-[var(--surface)] border-2 border-[var(--border)] border-l-4 border-l-[var(--accent)] p-6 mb-3">
                <div className="mb-4">
                  <p className="font-[var(--font-heading)] font-bold text-lg uppercase tracking-wide hm-text mb-1">
                    {req.user_email}
                  </p>
                  <p className="eyebrow hm-text-dim">
                    Requesting: {toolLabel} &nbsp;·&nbsp; {createdAt}
                  </p>
                  {req.message && (
                    <p className="body-md hm-text-muted mt-2.5 bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2">
                      &ldquo;{req.message}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5 flex-wrap">
                  <form action={approveToolRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="userId"    value={req.user_id} />
                    <input type="hidden" name="userEmail" value={req.user_email ?? ''} />
                    <input type="hidden" name="toolSlug"  value={req.tool_slug} />
                    <button
                      type="submit"
                      className="btn-hm bg-[var(--accent)] text-[var(--accent-fg)] text-sm px-5 py-2"
                    >
                      Approve →
                    </button>
                  </form>

                  <form action={denyToolRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="userEmail" value={req.user_email ?? ''} />
                    <input type="hidden" name="toolSlug"  value={req.tool_slug} />
                    <button
                      type="submit"
                      className="btn-hm bg-transparent hm-text-muted border-2 border-[var(--border)] text-sm px-5 py-2"
                    >
                      Deny
                    </button>
                  </form>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
