// Test script to trigger the confirmation email (ESM version)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// If dotenv/config doesn't work with .env.local automatically
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

const testData = {
  candidateName: "Fabrycio Bermudes",
  candidateEmail: "fabrycio.bermudes@usabit.com.br",
  jobTitle: "Desenvolvedor Full Stack Sênior (Teste de E-mail)"
};

console.log(`Sending test email to ${testData.candidateEmail}...`);

async function runTest() {
  try {
    const { data, error } = await supabase.functions.invoke('send-application-email', {
      body: testData
    });

    if (error) {
      console.error("Error invoking function:", error);
    } else {
      console.log("Success! Email sent:", data);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

runTest();
