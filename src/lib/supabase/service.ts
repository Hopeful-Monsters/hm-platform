import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Bypasses RLS. Use only in server-side API routes for admin operations.
// Never use in client components. Never accept user input that flows into service client calls.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}