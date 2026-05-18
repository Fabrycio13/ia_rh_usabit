
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('--- Candidates Sample ---');
    const { data: candidates } = await supabase.from('candidates').select('*').limit(1);
    console.log(JSON.stringify(candidates, null, 2));

    console.log('\n--- Job Candidates Sample ---');
    const { data: jc } = await supabase.from('job_candidates').select('*').limit(1);
    console.log(JSON.stringify(jc, null, 2));

    console.log('\n--- Duplicate Email Check ---');
    const { data: candRows } = await supabase.from('candidates').select('name, email');
    const counts: Record<string, number> = {};
    candRows?.forEach(row => {
        if (row.email) {
            const key = row.email.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
        }
    });
    const duplicates = Object.entries(counts).filter(([, c]) => c > 1);
    console.log('Emails with counts > 1:', duplicates);

    if (duplicates.length > 0) {
        console.log('\n--- Details for first duplicate email ---');
        const firstDupEmail = duplicates[0][0];
        const { data: dupDetails } = await supabase.from('candidates').select('id, name, email, created_at').eq('email', firstDupEmail);
        console.log(JSON.stringify(dupDetails, null, 2));
    }
}

test();
