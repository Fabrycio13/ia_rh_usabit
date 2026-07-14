// Test script to trigger the confirmation email (ESM version)
// Contrato NOVO: aceita apenas { applicationId } (busca dados no banco)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Aceita applicationId como argumento: `node scripts/test_email.mjs <applicationId>`
const applicationId = process.argv[2];

if (!applicationId) {
  console.error("Uso: node scripts/test_email.mjs <applicationId>");
  console.error("Exemplo: node scripts/test_email.mjs 123e4567-e89b-12d3-a456-426614174000");
  process.exit(1);
}

console.log(`Sending application email for applicationId: ${applicationId}...`);

async function runTest() {
  try {
    const { data, error } = await supabase.functions.invoke('send-application-email', {
      body: { applicationId }
    });

    if (error) {
      console.error("Error invoking function:", error);
      process.exit(1);
    } else {
      console.log("Success! Email sent:", data);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
}

runTest();
