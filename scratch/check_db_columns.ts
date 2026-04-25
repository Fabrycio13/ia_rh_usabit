import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim().replace(/^"|"$/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkColumns() {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching candidates:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in candidates table:', Object.keys(data[0]));
  } else {
    console.log('No data in candidates table to infer columns. Trying another way...');
    // We can try to insert a dummy row or use a system query if we had admin keys, 
    // but let's try to select from a known candidate if any.
  }
}

checkColumns();
