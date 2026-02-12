import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function main() {
  const sourceIcon = path.join(rootDir, 'icons', 'shop-icon.png');
  const outDir = path.join(rootDir, 'icons');
  
  if (!fs.existsSync(sourceIcon)) {
    console.error(`Source icon not found at ${sourceIcon}`);
    process.exit(1);
  }

  const sizes = [16, 32, 48, 128];
  
  try {
    for (const size of sizes) {
      const outFile = path.join(outDir, `icon${size}.png`);
      await sharp(sourceIcon)
        .resize(size, size)
        .toFile(outFile);
      console.log(`Generated ${outFile}`);
    }
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();


