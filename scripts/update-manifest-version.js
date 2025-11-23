import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const manifestJsonPath = path.join(rootDir, 'manifest.json');

try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf-8'));

    console.log(`Current manifest version: ${manifestJson.version}`);
    console.log(`New version from package.json: ${packageJson.version}`);

    manifestJson.version = packageJson.version;

    fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestJson, null, 4));
    console.log('Successfully updated manifest.json version.');
} catch (error) {
    console.error('Error updating manifest.json:', error);
    process.exit(1);
}
