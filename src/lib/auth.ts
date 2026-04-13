import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns the current Supabase user, memoised for the duration of a single
 * server request via React's `cache()`. Any Server Component that calls this
 * (layout, page, async children) shares the same result — only one network
 * round-trip to Supabase per request regardless of how many components call it.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
