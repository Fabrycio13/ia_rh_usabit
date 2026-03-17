
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('Starting cleanup of duplicate candidates...');

    // 1. Fetch all candidates
    const { data: all } = await supabase.from('candidates').select('*');
    if (!all) return;

    const groups = new Map<string, any[]>();

    all.forEach(c => {
        // Find a key to identify the "same" person
        // Priority 1: Real email
        // Priority 2: Name + User (risky but matches user screenshot case)
        let key = '';
        if (c.email && !c.email.includes('@id.') && !c.email.includes('@analise.')) {
            key = 'email:' + c.email.toLowerCase();
        } else {
            key = 'name:' + c.name.toLowerCase().trim() + ':' + c.user_id;
        }

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
    });

    for (const [key, members] of groups.entries()) {
        if (members.length <= 1) continue;

        console.log(`Merging ${members.length} entries for ${key}...`);

        // Pick the "best" entry to keep (one with real email, or most recent)
        members.sort((a, b) => {
            const aHasEmail = a.email && !a.email.includes('@id.') ? 1 : 0;
            const bHasEmail = b.email && !b.email.includes('@id.') ? 1 : 0;
            if (aHasEmail !== bHasEmail) return bHasEmail - aHasEmail;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const kept = members[0];
        const duplicates = members.slice(1);

        // Merge history if needed? 
        // For simplicity, we just repoint everything to 'kept'

        for (const dup of duplicates) {
            console.log(`  Merging ${dup.id} into ${kept.id}`);

            // Repoint job_candidates
            await supabase.from('job_candidates').update({ candidate_id: kept.id }).eq('candidate_id', dup.id);

            // Repoint talent_pool
            await supabase.from('talent_pool').update({ candidate_id: kept.id }).eq('candidate_id', dup.id);

            // Delete duplicate candidate
            await supabase.from('candidates').delete().eq('id', dup.id);
        }
    }

    console.log('Cleanup finished!');
}

cleanup();
