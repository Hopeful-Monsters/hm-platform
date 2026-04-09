import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const TOOL_SLUG = 'expenses-manager'; // ← change per tool

export default async function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: access } = await supabase
    .from('tool_access')
    .select('plan, expires_at')
    .eq('user_id', user.id)
    .eq('tool_slug', TOOL_SLUG)
    .single();

  if (!access) redirect('/auth/no-access');

  return (
    <div>
      {/* Add tool-specific navigation/layout here */}
      {children}
    </div>
  );
}