
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function getOrgId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('No session found. Please login.');
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .single();

  console.log('Organization ID:', profile?.organization_id);
}

getOrgId();
