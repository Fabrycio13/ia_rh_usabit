import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.join(rootDir, 'public/logos/usabit-people-logo.svg');
const outputPath = path.join(rootDir, 'public/logos/usabit-people-logo.png');

const svgBuffer = fs.readFileSync(svgPath);
const pngBuffer = await sharp(svgBuffer).resize(240, 40).png().toBuffer();
fs.writeFileSync(outputPath, pngBuffer);

console.log(`PNG salvo: ${outputPath}`);
console.log(`Tamanho: ${pngBuffer.length} bytes`);
