import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

if (fs.existsSync(path.join(rootDir, '.env.local'))) {
  const envConfig = dotenv.parse(fs.readFileSync(path.join(rootDir, '.env.local')));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const svgPath = path.join(rootDir, 'public/logos/usabit-logo.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function convert() {
  const pngBuffer = await sharp(svgBuffer)
    .resize(113, 32)
    .png()
    .toBuffer();

  console.log(`PNG generated: ${pngBuffer.length} bytes`);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Uploading logos/usabit-logo-email.png to 'organizations' bucket...");
  const { data, error } = await supabase.storage
    .from('organizations')
    .upload('logos/usabit-logo-email.png', pngBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (error) {
    console.error("Upload error:", error);
    process.exit(1);
  }

  const { data: publicUrl } = supabase.storage
    .from('organizations')
    .getPublicUrl('logos/usabit-logo-email.png');

  console.log("\n=== URL PUBLICA (use nos emails) ===");
  console.log(publicUrl.publicUrl);
  console.log("=====================================\n");
}

convert().catch(err => {
  console.error(err);
  process.exit(1);
});
