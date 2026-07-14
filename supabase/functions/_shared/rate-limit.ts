// Shared rate limit helper for Supabase Edge Functions
// Import in any function: import { checkRateLimit } from '../_shared/rate-limit.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  key: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  const { count } = await supabaseAdmin
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart);
  if ((count ?? 0) >= maxRequests) return false;
  await supabaseAdmin.from('rate_limits').insert({ key, endpoint });
  return true;
}
