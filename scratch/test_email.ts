// Test script to trigger the confirmation email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

const env = await load();
const supabaseUrl = env["VITE_SUPABASE_URL"] || Deno.env.get("VITE_SUPABASE_URL");
const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || Deno.env.get("VITE_SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testData = {
  candidateName: "Fabrycio Bermudes",
  candidateEmail: "fabrycio.bermudes@usabit.com.br",
  jobTitle: "Desenvolvedor Full Stack Sênior (Teste de E-mail)"
};

console.log(`Sending test email to ${testData.candidateEmail}...`);

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
