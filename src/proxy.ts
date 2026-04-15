import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { TOOL_SLUGS } from '@/lib/tools';

export async function proxy(request: NextRequest) {
  // ── Content Security Policy ────────────────────────────────────
  // A fresh nonce is generated per request. Next.js reads the CSP header,
  // extracts the nonce, and automatically applies it to all scripts it generates.
  // 'strict-dynamic' covers scripts that are dynamically created at runtime
  // (e.g. Vercel Analytics/SpeedInsights), so they don't need explicit allowlisting.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('https://', '');

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // In dev, Tailwind v4 injects a <style> block — 'unsafe-inline' is required.
    // In prod, Next.js applies the nonce to any <style> tags it generates.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    // next/font/google self-hosts fonts at build time — no runtime call to Google needed.
    // Upstash and Resend are server-side only — no client connect required.
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
    `frame-ancestors 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  // Helper: create a NextResponse.next() that carries the CSP and nonce forward.
  // The cookies passed in are re-applied so Supabase session writes aren't lost.
  const makeNext = (cookiesToSet: { name: string; value: string; options?: object }[] = []) => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('Content-Security-Policy', csp);
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]));
    return res;
  };

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
  const toolSlug = TOOL_SLUGS.find(slug => pathname.startsWith(`/${slug}`));

  // Skip auth entirely for routes that don't need protection —
  // saves a Supabase round-trip on every public/home/auth page request.
  if (!isAdminRoute && !toolSlug) {
    return makeNext();
  }

  // ── Auth required from here on ─────────────────────────────────
  const pendingCookies: { name: string; value: string; options?: object }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            pendingCookies.push({ name, value, options });
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ── Admin route protection ─────────────────────────────────────
  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/no-access', request.url));
    }
  }

  // ── Tool route protection ──────────────────────────────────────
  if (toolSlug && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (toolSlug && user) {
    if (user.user_metadata?.status !== 'approved') {
      return NextResponse.redirect(new URL('/no-access', request.url));
    }

    const { data: access } = await supabase
      .from('tool_access')
      .select('plan, expires_at')
      .eq('user_id', user.id)
      .eq('tool_slug', toolSlug)
      .single();

    if (!access || (access.expires_at && new Date(access.expires_at) < new Date())) {
      const noAccessUrl = new URL('/no-access', request.url);
      noAccessUrl.searchParams.set('tool', toolSlug);
      return NextResponse.redirect(noAccessUrl);
    }
  }

  return makeNext(pendingCookies);
}

export const config = {
  // Run on all page requests. Exclude static assets and skip prefetch requests
  // (they don't render HTML so there's no need to generate a fresh nonce for them).
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};