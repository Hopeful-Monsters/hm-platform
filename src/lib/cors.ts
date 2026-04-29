const ALLOWED_ORIGINS = [
  'https://app.hopefulmonsters.com.au',
  // 'http://localhost:3000', // uncomment for local dev only
];

/**
 * Returns CORS headers for a recognised origin.
 * Throws when the origin is missing or not in ALLOWED_ORIGINS so callers
 * fail closed instead of silently echoing the first whitelisted origin —
 * which would let an unrecognised origin still receive credentials with
 * a CORS-allowed response, defeating the allowlist.
 */
export function getCorsHeaders(origin?: string | null) {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    throw new Error('Origin not allowed')
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleOptions(request: Request) {
  try {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request.headers.get('origin')),
    });
  } catch {
    return new Response(null, { status: 403 })
  }
}