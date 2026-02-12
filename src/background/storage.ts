import { ActivationMode, DomainConfig, StorageSchema } from '../types';

const STORAGE_KEY = 'ctrl_enter_sender_config';

// Domains that are disabled by default
// Note: google.com is added but only exact match (not subdomains) to allow gemini.google.com and other Google services
const DEFAULT_DISABLED_DOMAINS = ['x.com', 'twitter.com', 'google.com', 'docs.google.com'];

// Domains that are enabled by default in whitelist mode
const DEFAULT_WHITELIST_DOMAINS = ['chatgpt.com', 'claude.ai'];

function getHostnameFromOrigin(origin: string): string {
    try {
        const url = new URL(origin);
        // Remove 'www.' prefix if present for consistent comparison
        return url.hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

// Get normalized origin (wwwなし) from origin string
export function getNormalizedOrigin(origin: string): string {
    try {
        const url = new URL(origin);
        const normalizedHostname = url.hostname.replace(/^www\./, '');
        return `${url.protocol}//${normalizedHostname}`;
    } catch {
        return origin;
    }
}

// Get both wwwあり and wwwなし origins from a normalized origin
function getBothOrigins(normalizedOrigin: string): string[] {
    try {
        const url = new URL(normalizedOrigin);
        const hostname = url.hostname;
        const origins = [`${url.protocol}//${hostname}`];
        // If hostname doesn't start with www, also add www version
        if (!hostname.startsWith('www.')) {
            origins.push(`${url.protocol}//www.${hostname}`);
        }
        return origins;
    } catch {
        return [normalizedOrigin];
    }
}

function isDefaultDisabledDomain(origin: string): boolean {
    const hostname = getHostnameFromOrigin(origin);
    // For google.com, only check exact match to allow subdomains like gemini.google.com
    // For other domains, check exact match or subdomain match
    return DEFAULT_DISABLED_DOMAINS.some(domain => {
        if (domain === 'google.com') {
            // Only exact match for google.com (www.google.com becomes google.com after normalization)
            return hostname === domain;
        } else {
            // For other domains, check exact match or subdomain match
            return hostname === domain || hostname.endsWith('.' + domain);
        }
    });
}

function isDefaultWhitelistedDomain(origin: string): boolean {
    const hostname = getHostnameFromOrigin(origin);
    return DEFAULT_WHITELIST_DOMAINS.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain);
    });
}

export function isDefaultDisabledOrigin(origin: string): boolean {
    return isDefaultDisabledDomain(origin);
}

export function isDefaultWhitelistedOrigin(origin: string): boolean {
    return isDefaultWhitelistedDomain(origin);
}

export async function getActivationMode(): Promise<ActivationMode> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const config = data[STORAGE_KEY] as StorageSchema | undefined;
    return config?.activationMode || 'blacklist';
}

export async function setActivationMode(mode: ActivationMode): Promise<void> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const schema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };
    schema.activationMode = mode;
    await chrome.storage.sync.set({ [STORAGE_KEY]: schema });
}

export async function getDomainConfig(origin: string): Promise<DomainConfig> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const config = data[STORAGE_KEY] as StorageSchema | undefined;
    const mode = config?.activationMode || 'blacklist';

    if (config?.domains?.[origin]) {
        const savedConfig = config.domains[origin];
        // Remove mode property if it exists (for backward compatibility)
        const cleanConfig: DomainConfig = {
            enabled: savedConfig.enabled,
            ...(savedConfig.customTargets && { customTargets: savedConfig.customTargets }),
            ...(savedConfig.customExcludes && { customExcludes: savedConfig.customExcludes })
        };
        return cleanConfig;
    }

    // Whitelist mode: default OFF for all sites, unless it's a default whitelist domain
    if (mode === 'whitelist') {
        if (isDefaultWhitelistedDomain(origin)) {
            return { enabled: true };
        }
        return { enabled: false };
    }

    // Blacklist mode: check if this is a default disabled domain
    if (isDefaultDisabledDomain(origin)) {
        return { enabled: false };
    }

    // Blacklist mode: default ON
    return { enabled: true };
}

export async function setDomainConfig(origin: string, config: DomainConfig): Promise<void> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const currentSchema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };

    // Normalize origin (wwwなし) and apply to both wwwあり and wwwなし
    const normalizedOrigin = getNormalizedOrigin(origin);
    const bothOrigins = getBothOrigins(normalizedOrigin);
    
    // Remove mode property if it exists (for backward compatibility)
    const cleanConfig: DomainConfig = {
        enabled: config.enabled,
        ...(config.customTargets && { customTargets: config.customTargets }),
        ...(config.customExcludes && { customExcludes: config.customExcludes })
    };
    
    for (const orig of bothOrigins) {
        currentSchema.domains[orig] = cleanConfig;
    }

    await chrome.storage.sync.set({ [STORAGE_KEY]: currentSchema });
}

// Get grouped domains by normalized origin (wwwありなしを統合)
export function groupDomainsByNormalizedOrigin(domains: { [origin: string]: DomainConfig }): { [normalizedOrigin: string]: DomainConfig } {
    const grouped: { [normalizedOrigin: string]: DomainConfig } = {};
    
    for (const origin of Object.keys(domains)) {
        const normalizedOrigin = getNormalizedOrigin(origin);
        // Use the first config found (wwwありとwwwなしで同じ設定が前提)
        if (!grouped[normalizedOrigin]) {
            grouped[normalizedOrigin] = domains[origin];
        }
    }
    
    return grouped;
}

export async function getAllConfigs(): Promise<StorageSchema> {
    try {
        const data = await chrome.storage.sync.get(STORAGE_KEY);
        const schema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };
        const mode = schema.activationMode || 'blacklist';
        
        // Include default disabled domains if they're not already in the config
        const allDomains = { ...schema.domains };
        
        // Only add default disabled domains in blacklist mode
        if (mode === 'blacklist') {
            // Add default disabled domains that aren't explicitly configured
            // We need to check common origin patterns for these domains
            // Note: google.com is added but only exact match (not subdomains) to allow gemini.google.com and other Google services
            const defaultDisabledOrigins = [
                'https://x.com',
                'https://www.x.com',
                'https://twitter.com',
                'https://www.twitter.com',
                'https://google.com',
                'https://www.google.com',
                'https://docs.google.com'
            ];
            
            for (const origin of defaultDisabledOrigins) {
                // Only add if not already configured and matches default disabled domain
                if (!allDomains[origin] && isDefaultDisabledDomain(origin)) {
                    allDomains[origin] = {
                        enabled: false
                    };
                }
            }
        }
        
        // Only add default whitelist domains in whitelist mode
        if (mode === 'whitelist') {
            const defaultWhitelistOrigins = [
                'https://chatgpt.com',
                'https://claude.ai'
            ];
            
            for (const origin of defaultWhitelistOrigins) {
                if (!allDomains[origin] && isDefaultWhitelistedDomain(origin)) {
                    allDomains[origin] = {
                        enabled: true
                    };
                }
            }
        }
        
        return { activationMode: mode, domains: allDomains };
    } catch (error) {
        console.error('Failed to get all configs:', error);
        // エラーが発生した場合は空のデータを返す
        return { domains: {} };
    }
}

// Check if an origin is a default disabled domain (for UI display)
// Check if an origin is a default disabled domain (for UI display)
// export function isDefaultDisabledOrigin(origin: string): boolean {
//     return isDefaultDisabledDomain(origin);
// }
// This was duplicate, removing it. Actually, I need to keep one export.
// The previous edit added one at the top. I should remove this one at the bottom.


export function getDefaultDisabledDomains(): string[] {
    return DEFAULT_DISABLED_DOMAINS;
}

const ONBOARDING_SHOWN_KEY = 'ctrl_enter_sender_onboarding_shown';

export async function hasOnboardingBeenShown(): Promise<boolean> {
    const data = await chrome.storage.local.get(ONBOARDING_SHOWN_KEY);
    return data[ONBOARDING_SHOWN_KEY] === true;
}

export async function setOnboardingShown(): Promise<void> {
    await chrome.storage.local.set({ [ONBOARDING_SHOWN_KEY]: true });
}

const LAST_VERSION_KEY = 'ctrl_enter_sender_last_version';

export async function getLastVersion(): Promise<string | null> {
    const data = await chrome.storage.local.get(LAST_VERSION_KEY);
    return data[LAST_VERSION_KEY] || null;
}

export async function setLastVersion(version: string): Promise<void> {
    await chrome.storage.local.set({ [LAST_VERSION_KEY]: version });
}

export async function shouldShowWhatsNew(currentVersion: string): Promise<boolean> {
    const lastVersion = await getLastVersion();
    if (!lastVersion) {
        // First time, set current version and don't show
        await setLastVersion(currentVersion);
        return false;
    }
    if (lastVersion !== currentVersion) {
        // Version changed, show and update
        await setLastVersion(currentVersion);
        return true;
    }
    return false;
}

const MIGRATION_VERSION_KEY = 'ctrl_enter_sender_migration_version';

async function getMigrationVersion(): Promise<string | null> {
    const data = await chrome.storage.local.get(MIGRATION_VERSION_KEY);
    return data[MIGRATION_VERSION_KEY] || null;
}

async function setMigrationVersion(version: string): Promise<void> {
    await chrome.storage.local.set({ [MIGRATION_VERSION_KEY]: version });
}

// Reset all settings to default
export async function resetAllSettings(): Promise<void> {
    await chrome.storage.sync.remove(STORAGE_KEY);
}

/**
 * Migrate storage data to remove deprecated properties
 * This function removes the 'mode' property from all domain configs
 */
export async function migrateStorage(): Promise<void> {
    try {
        const currentVersion = chrome.runtime.getManifest().version;
        const lastMigrationVersion = await getMigrationVersion();
        
        // Skip if already migrated to current version
        if (lastMigrationVersion === currentVersion) {
            return;
        }
        
        const data = await chrome.storage.sync.get(STORAGE_KEY);
        const schema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };
        
        let hasChanges = false;
        const cleanedDomains: { [origin: string]: DomainConfig } = {};
        
        // Clean up all domain configs
        for (const [origin, config] of Object.entries(schema.domains)) {
            // Remove deprecated 'mode' property and other invalid properties
            const cleanConfig: DomainConfig = {
                enabled: config.enabled ?? true,
                ...(config.customTargets && { customTargets: config.customTargets }),
                ...(config.customExcludes && { customExcludes: config.customExcludes })
            };
            
            // Check if config was modified (had mode or other invalid properties)
            const originalKeys = Object.keys(config);
            const cleanKeys = Object.keys(cleanConfig);
            if (originalKeys.length !== cleanKeys.length || 
                originalKeys.some(key => !cleanKeys.includes(key))) {
                hasChanges = true;
            }
            
            cleanedDomains[origin] = cleanConfig;
        }
        
        // Save cleaned configs if there were changes
        if (hasChanges) {
            await chrome.storage.sync.set({ [STORAGE_KEY]: { domains: cleanedDomains } });
        }
        
        // Mark migration as completed for this version
        await setMigrationVersion(currentVersion);
    } catch (error) {
        console.error('Migration failed:', error);
        // Don't throw - migration failures shouldn't break the extension
    }
}