import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.join(rootDir, 'public/logos/usabit-logo.svg');
const outputPath = path.join(rootDir, 'public/logos/usabit-logo-email.png');

const svgBuffer = fs.readFileSync(svgPath);
const pngBuffer = await sharp(svgBuffer).resize(113, 32).png().toBuffer();
fs.writeFileSync(outputPath, pngBuffer);

console.log(`PNG salvo: ${outputPath}`);
console.log(`Tamanho: ${pngBuffer.length} bytes`);

// Also generate base64 for embedding
const base64 = pngBuffer.toString('base64');
console.log(`\nBase64 (${base64.length} chars):`);
console.log(`data:image/png;base64,${base64}`);
