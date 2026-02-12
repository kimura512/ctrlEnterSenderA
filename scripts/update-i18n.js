import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../_locales');

// Keys to update/add from EN to other locales
const KEYS_TO_UPDATE = [
    'onboardingDescription',
    'onboardingSiteToggle',
    'onboardingDefaultEnabled',
    'onboardingAdvancedSettings',
    'optionsDescription'
];

async function main() {
    // 1. Read EN messages
    const enPath = path.join(LOCALES_DIR, 'en', 'messages.json');
    const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    // 2. Get list of all locales
    const locales = fs.readdirSync(LOCALES_DIR).filter(file => {
        return fs.statSync(path.join(LOCALES_DIR, file)).isDirectory();
    });

    console.log(`Found ${locales.length} locales.`);

    // 3. Update each locale
    for (const locale of locales) {
        if (locale === 'en' || locale === 'ja') {
            console.log(`Skipping ${locale} (source/manual)`);
            continue;
        }

        const localePath = path.join(LOCALES_DIR, locale, 'messages.json');
        if (!fs.existsSync(localePath)) {
            console.warn(`Warning: messages.json not found for ${locale}`);
            continue;
        }

        try {
            const messages = JSON.parse(fs.readFileSync(localePath, 'utf8'));
            let updated = false;

            for (const key of KEYS_TO_UPDATE) {
                // If key is missing or needs update (we force update for these specific keys
                // because we know they changed significantly in logic/meaning)
                if (enMessages[key]) {
                    messages[key] = enMessages[key];
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(localePath, JSON.stringify(messages, null, 2), 'utf8');
                console.log(`Updated ${locale}`);
            } else {
                console.log(`No changes for ${locale}`);
            }
        } catch (e) {
            console.error(`Error updating ${locale}:`, e);
        }
    }

    console.log('Done!');
}

main();
