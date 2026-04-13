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
| Vercel | Hosting + analytics |

---

## How It Works

Every route (except static assets and auth pages) passes through `src/proxy.ts`. The middleware checks two things: whether the user is approved (`user_metadata.status === 'approved'`) and whether they have an active row in the `tool_access` table for the specific tool they're trying to reach. Tools are registered by slug in `TOOL_SLUGS` — adding a slug to that array is what tells the middleware to protect a new route.

Admin routes (`/admin/*`) are separately gated — they require `user_metadata.role === 'admin'`.

---

## Project Structure

```
src/
├── proxy.ts              # Middleware — auth + access gating for all routes
├── app/
│   ├── admin/            # Approvals and user management (Server Actions)
│   ├── auth/             # Login, signup, callback, no-access
│   └── [tool-slug]/      # One directory per tool; layout.tsx handles auth check
├── components/           # Shared UI: SiteHeader, AdminSidebar, Button, Card, etc.
├── lib/
│   ├── supabase/         # server.ts, client.ts, service.ts — three client variants
│   └── upstash/          # ratelimit.ts — api, ai, and auth rate limit configs
└── store/
    └── app-store.ts      # Zustand store for UI state + user preferences
```

---

## Auth & Access Flow

1. User signs up → `user_metadata.status` is set to `'pending'`
2. Admin receives an email notification via `/api/auth/notify-admin`
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
| `RESEND_API_KEY` | Resend API key for email | Resend dashboard |
| `ADMIN_EMAIL` | Email address that receives signup notifications | Your choice |

---

## Adding a New Tool

1. **Register the slug** — add it to `TOOL_SLUGS` in `src/proxy.ts`
2. **Scaffold the route** — create `src/app/[tool-slug]/layout.tsx` following the pattern in an existing tool directory; `page.tsx` for the tool UI
3. **Database** — enable RLS on any new tables before writing policies

The middleware will begin protecting the new route as soon as the slug is registered.

---

## Deployment

The platform is deployed on Vercel.
Set all environment variables from the table above in the Vercel project dashboard under **Settings → Environment Variables**.
No other configuration is required.
