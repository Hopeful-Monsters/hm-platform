import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Resend } from 'resend';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Validate next param to prevent open redirect. Resolve against the origin
  // and require the result to live on this host — blocks raw external URLs,
  // protocol-relative paths (//evil), and percent-encoded slashes (/%2f%2f).
  const rawNext = searchParams.get('next') ?? '/';
  let next = '/';
  try {
    const resolved = new URL(rawNext, origin);
    if (resolved.origin === origin) {
      next = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    }
  } catch {
    // Invalid URL → stick with default
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // New OAuth user: status absent means this is their first sign-in via OAuth.
      // Email/password signups set status:'pending' during signUp() so they're already handled.
      if (!user.user_metadata?.status) {
        try {
          const service = createServiceClient();

          // Mark as pending approval
          await service.auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, status: 'pending' },
          });

          // Notify admin — inline to avoid a self-referencing HTTP call
          const resend = new Resend(process.env.RESEND_API_KEY!);
          await resend.emails.send({
            from: 'noreply@hopefulmonsters.com.au',
            to: process.env.ADMIN_EMAIL || 'admin@hm-platform.com',
            subject: 'New User Signup (Google)',
            text: `New user signed up via Google: ${user.email}. Please approve at /admin/approvals`,
          });
        } catch {
          // Non-critical — don't block the auth redirect if email fails
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
