/**
 * HTTP error class + Response builder for API route handlers.
 *
 * Throw an HttpError from anywhere inside a route handler (auth helpers,
 * data layer, validation logic) and the createApiRoute wrapper will turn
 * it into the right Response. Prevents the boilerplate of mapping error
 * messages to status codes in every route's catch block.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * Map a thrown value to a JSON Response. HttpError uses its declared
 * status; legacy auth helpers that throw plain Errors with known
 * messages are translated for backwards compatibility.
 */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    const body: Record<string, unknown> = { error: err.message }
    if (err.issues !== undefined) body.issues = err.issues
    return Response.json(body, { status: err.status })
  }

  const msg = err instanceof Error ? err.message : 'Internal error'
  // Translate the legacy string-based protocol used by lib/auth helpers.
  const status =
    msg === 'Unauthorized'                    ? 401 :
    msg === 'Account not approved'            ? 403 :
    msg === 'Admin role required'             ? 403 :
    msg.startsWith('No access')               ? 403 :
    msg.startsWith('Insufficient permissions') ? 403 :
                                                 500
  return Response.json({ error: msg }, { status })
}
