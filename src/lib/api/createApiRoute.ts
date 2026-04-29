/**
 * Thin wrapper around an API route handler that bundles the patterns
 * every route currently re-implements:
 *   - resolve the caller (tool / settings / admin / plain user / none)
 *   - optional rate-limit gate before the handler runs
 *   - optional zod-parsed JSON body
 *   - one catch block that maps thrown errors to 4xx/5xx responses
 *
 * Routes that need bespoke shapes (multipart formData, popup HTML
 * responses, OAuth redirects) should keep using a hand-rolled handler.
 * Anything that returns Response.json from a single user/admin context
 * is a clean fit for this wrapper.
 */

import 'server-only'
import type { ZodType } from 'zod'
import type { User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  requireToolAccess,
  requireSettingsAccess,
  requireAdminAccess,
} from '@/lib/auth'
import { applyRateLimit, type rateLimits as RateLimits } from '@/lib/upstash/ratelimit'
import { HttpError, toErrorResponse } from './errors'
import type { ToolSlug } from '@/lib/tools'

type RateLimiter = (typeof RateLimits)[keyof typeof RateLimits]

export type AuthMode =
  | 'none'
  | 'user'
  | 'admin'
  | 'settings'
  | { tool: ToolSlug }

export interface RouteContext<TBody, TParams> {
  request: Request
  /** Resolved user. null only when auth='none' or auth='user' with no session. */
  user:    User | null
  body:    TBody
  params:  TParams
}

export interface CreateApiRouteOptions<TBody, TParams> {
  auth?:      AuthMode
  /** Zod schema applied to `await request.json()`. */
  schema?:    ZodType<TBody>
  /** Optional rate-limit gate. Key receives the resolved user. */
  rateLimit?: {
    limiter: RateLimiter
    key:     (user: User) => string
  }
  handler: (ctx: RouteContext<TBody, TParams>) => Promise<Response>
}

async function resolveAuth(mode: AuthMode | undefined): Promise<User | null> {
  switch (mode) {
    case undefined:
    case 'none':
      return null
    case 'user': {
      const user = await getCurrentUser()
      if (!user) throw new HttpError(401, 'Unauthorized')
      return user
    }
    case 'admin':
      return requireAdminAccess()
    case 'settings':
      return requireSettingsAccess()
    default:
      // Tool-scoped access
      return requireToolAccess(mode.tool)
  }
}

/**
 * Build a Next.js App Router route handler. Returns a function with the
 * shape `(request, ctx) => Promise<Response>` that Next will invoke for
 * each HTTP method export.
 */
export function createApiRoute<TBody = undefined, TParams = Record<string, never>>(
  opts: CreateApiRouteOptions<TBody, TParams>,
) {
  return async function handler(
    request: Request,
    routeCtx?: { params: Promise<TParams> },
  ): Promise<Response> {
    try {
      const user = await resolveAuth(opts.auth)

      if (opts.rateLimit && user) {
        const limited = await applyRateLimit(opts.rateLimit.limiter, opts.rateLimit.key(user))
        if (limited) return limited
      }

      let body = undefined as TBody
      if (opts.schema) {
        let json: unknown
        try {
          json = await request.json()
        } catch {
          throw new HttpError(400, 'Invalid JSON body')
        }
        const parsed = opts.schema.safeParse(json)
        if (!parsed.success) {
          throw new HttpError(400, 'Invalid payload', parsed.error.flatten().fieldErrors)
        }
        body = parsed.data
      }

      const params = (routeCtx ? await routeCtx.params : ({} as TParams))

      return await opts.handler({ request, user, body, params })
    } catch (err) {
      return toErrorResponse(err)
    }
  }
}
