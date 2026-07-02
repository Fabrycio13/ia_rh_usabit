require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar configuradas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepAudit() {
    const tables = ['profiles', 'jobs', 'job_names', 'candidates', 'job_candidates', 'resume_uploads', 'talent_pool'];
    const results = {};

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                results[table] = { error: error.message };
            } else if (!data || data.length === 0) {
                results[table] = { status: 'empty_or_rls' };
            } else {
                results[table] = { columns: Object.keys(data[0]), sample: data[0] };
            }
        } catch (e) {
            results[table] = { exception: e.message };
        }
    }
    fs.writeFileSync('audit_results.json', JSON.stringify(results, null, 2));
}

deepAudit();
