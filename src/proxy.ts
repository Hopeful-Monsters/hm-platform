import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { TOOL_SLUGS } from '@/lib/tools';

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // ── Admin route protection ─────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/no-access', request.url));
    }
  }

  // ── Tool route protection ──────────────────────────────────────
  const toolSlug = TOOL_SLUGS.find(slug => pathname.startsWith(`/${slug}`));

  // Redirect unauthenticated users trying to access tools
  if (toolSlug && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check tool access for authenticated users
  if (toolSlug && user) {
    if (user.user_metadata?.status !== 'approved') {
      return NextResponse.redirect(new URL('/auth/no-access', request.url));
    }

    const { data: access } = await supabase
      .from('tool_access')
      .select('plan, expires_at')
      .eq('user_id', user.id)
      .eq('tool_slug', toolSlug)
      .single();

    if (!access || (access.expires_at && new Date(access.expires_at) < new Date())) {
      const noAccessUrl = new URL('/auth/no-access', request.url);
      noAccessUrl.searchParams.set('tool', toolSlug);
      return NextResponse.redirect(noAccessUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  // Run on all tool paths and API routes — exclude static assets and auth routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/).*)',
  ],
};