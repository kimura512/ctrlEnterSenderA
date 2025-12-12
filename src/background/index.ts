import { migrateStorage } from './storage';

chrome.runtime.onInstalled.addListener(async (details) => {
    // Run migration on install or update
    if (details.reason === 'install' || details.reason === 'update') {
        await migrateStorage();
    }
});

// Also run migration on startup (in case onInstalled didn't fire)
migrateStorage().catch(console.error);
