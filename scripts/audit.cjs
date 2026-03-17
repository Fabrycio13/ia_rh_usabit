const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dfsqdfetzcwvmfphljzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmc3FkZmV0emN3dm1mcGhsanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODUxODYsImV4cCI6MjA2Mzg2MTE4Nn0.qChPcuPmJCfkF7-xrqGP6fOHLIqz7QqzPJRzSHT7Pq8';

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
