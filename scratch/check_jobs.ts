import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJobs() {
    console.log('Checking active jobs...');
    const { data, error } = await supabase
        .from('vagas_white_label')
        .select('title, public_hash, status, is_active, is_accepting_applications')
        .eq('is_active', true);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Active Jobs:');
    console.table(data);
}

checkJobs();
