import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimits = {
  // Standard API routes: 30 requests per minute per user
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'ratelimit',
  }),
  // AI/LLM routes (expensive): 10 per minute per user
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit',
  }),
  // Auth routes: 5 attempts per 15 minutes per IP
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, '15 m'),
    prefix: 'ratelimit',
  }),
};

// Rate limit key convention: {tool-slug}:{route}:{identifier}
// e.g. expenses-manager:submit:user-uuid
//      auth:login:1.2.3.4

export async function applyRateLimit(
  limiter: Ratelimit,
  key: string
): Promise<Response | null> {
  const { success, remaining, reset } = await limiter.limit(key);
  if (!success) {
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }
  return null;
}