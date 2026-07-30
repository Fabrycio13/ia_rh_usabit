// Shared rate limit helper for Supabase Edge Functions
// Import in any function: import { checkRateLimit } from '../_shared/rate-limit.ts';
//
// Uses atomic RPC (check_rate_limit) instead of separate COUNT + INSERT
// to avoid race conditions. Fail-closed: if the RPC errors, the request is blocked.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  key: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_key: key,
    p_endpoint: endpoint,
    p_max_requests: maxRequests,
    p_window_ms: windowMs,
  });

  // Fail-closed: se a RPC falhar (banco fora, schema desatualizado, etc.),
  // bloqueia a requisição em vez de liberar
  if (error) {
    console.error(`[rate-limit] check_rate_limit RPC failed for ${endpoint}:${key}`, error);
    return false;
  }

  return data ?? false;
}
