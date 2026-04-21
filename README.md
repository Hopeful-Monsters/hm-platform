# HM Platform

Internal multi-tool SaaS platform for Hopeful Monsters. Access-gated tools for the team, built to be extended as new tools are added.

**Live:** [app.hopefulmonsters.com.au](https://app.hopefulmonsters.com.au)

---

## Stack

| Technology | Purpose |
|---|---|
| Next.js 16.2 (App Router) | Framework |
| React 19 + TypeScript | UI |
| Tailwind CSS v4 | Styling |
| Supabase | Auth + database |
| Upstash Redis | Rate limiting |
| Resend | Transactional email |
| Zustand v5 | UI state + user preferences |
| Sentry | Error monitoring |
| Vercel | Hosting + analytics |

---

## How It Works

Every route (except static assets and auth pages) passes through `src/proxy.ts`. The middleware checks two things: whether the user is approved (`user_metadata.status === 'approved'`) and whether they have an active row in the `tool_access` table for the specific tool they're trying to reach. Tools are registered in `src/lib/tools.ts` — the `TOOLS` array is the single source of truth, and `TOOL_SLUGS` (used by the middleware to identify protected routes) is derived from it automatically.

Admin routes (`/admin/*`) are separately gated — they require `user_metadata.role === 'admin'`.

---

## Project Structure

```
src/
├── proxy.ts              # Middleware — auth + access gating for all routes
├── app/
│   ├── admin/            # Approvals and user management (Server Actions)
│   ├── (auth)/           # Login, signup, callback, no-access (route group)
│   └── [tool-slug]/      # One directory per tool; layout.tsx handles auth check
├── components/           # Shared UI: SiteHeader, AdminSidebar, Button, Card, etc.
├── hooks/                # Shared React hooks (e.g. use-toast.ts)
├── lib/
│   ├── supabase/         # server.ts, client.ts, service.ts — three client variants
│   ├── upstash/          # ratelimit.ts — api, ai, and auth rate limit configs
│   └── tools.ts          # Canonical tool registry — slugs, labels, descriptions
└── store/
    └── app-store.ts      # Zustand store for UI state + user preferences
```

---

## Auth & Access Flow

1. User signs up → `user_metadata.status` is set to `'pending'`
2. Admin receives an email notification (sent inline during the OAuth callback in `src/app/(auth)/callback/route.ts`)
3. Admin approves the user at `/admin/approvals`
4. Approval sets `status = 'approved'` and inserts rows into `tool_access` for each tool the user should access
5. User can now reach any tool they have an active `tool_access` record for

Users without approval, or with approval but no `tool_access` record for a given tool, are redirected to `/auth/no-access`.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below.

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Project Settings → API |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint | Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token | Upstash console |
| `RESEND_API_KEY` | Resend API key for transactional email | Resend dashboard |
| `ADMIN_EMAIL` | Email address that receives signup notifications | Your choice |
| `LINEAR_API_KEY` | Linear API key for support form issue creation | Linear → Settings → API → Personal API keys |
| `LINEAR_TEAM_ID` | Linear team to file support issues against | Settings → Teams → click team → UUID from URL |
| `GEMINI_KEY` | Gemini API key for receipt extraction in Expenses Manager | Google AI Studio |
| `STREAMTIME_KEY` | Streamtime API key for Expenses Manager | Streamtime → Settings → Integrations → API |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Drive integration | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret for Drive integration | Google Cloud Console → APIs & Services → Credentials |
| `EXPENSES_DRIVE_FOLDER_ID` | (Optional) Restrict Drive uploads to a specific folder | Top-level folder ID from the Drive URL |

---

## Adding a New Tool

1. **Register the tool** — add a new entry (slug, label, description) to the `TOOLS` array in `src/lib/tools.ts`. This is the only place you need to edit — `TOOL_SLUGS` and all derived lookups update automatically.
2. **Scaffold the route** — create `src/app/[tool-slug]/layout.tsx` following the pattern in an existing tool directory; `page.tsx` for the tool UI
3. **Database** — enable RLS on any new tables before writing policies

The middleware will begin protecting the new route as soon as the slug is registered.

---

## Deployment

The platform is deployed on Vercel.
Set all environment variables from the table above in the Vercel project dashboard under **Settings → Environment Variables**.
No other configuration is required.
