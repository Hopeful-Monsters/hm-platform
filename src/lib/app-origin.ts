/**
 * Returns the canonical origin used for OAuth redirect_uri values.
 *
 * In production, NEXT_PUBLIC_APP_ORIGIN must be set to the public URL
 * registered with Google Cloud Console (e.g. https://app.example.com).
 * Falling back to request.url here would let an attacker on a misconfigured
 * subdomain craft a redirect_uri that bypasses the registered allowlist —
 * Google's own check would catch it, but defense-in-depth is cheap.
 *
 * In development, falls back to the request origin so localhost works
 * without extra env wiring.
 */
export function getAppOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_ORIGIN
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_ORIGIN must be set in production')
  }
  return new URL(request.url).origin
}
