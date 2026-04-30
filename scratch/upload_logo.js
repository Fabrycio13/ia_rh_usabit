// Script to upload logo to Supabase Storage (ESM)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role if available for full access
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables VITE_SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  const filePath = path.join('public', 'Usabit.svg');
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  
  console.log("Uploading Usabit.svg to 'organizations' bucket...");

  const { data, error } = await supabase.storage
    .from('organizations')
    .upload('Usabit.svg', fileBuffer, {
      contentType: 'image/svg+xml',
      upsert: true
    });

  if (error) {
    console.error("Error uploading file:", error);
  } else {
    console.log("Success! File uploaded:", data);
    const { data: publicUrl } = supabase.storage
      .from('organizations')
      .getPublicUrl('Usabit.svg');
    console.log("Public URL:", publicUrl.publicUrl);
  }
}

uploadLogo();
