import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

const TOOL_SLUG = 'coverage-tracker'; // ← change per tool

export default async function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  if (user.user_metadata?.status !== 'approved') redirect('/auth/no-access');

  const { data: access } = await supabase
    .from('tool_access')
    .select('plan, expires_at')
    .eq('user_id', user.id)
    .eq('tool_slug', TOOL_SLUG)
    .single();

  if (!access) redirect('/auth/no-access');

  return (
    <div>
      <header className="p-4 bg-gray-100 flex justify-between items-center">
        <h1>Coverage Tracker</h1>
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}