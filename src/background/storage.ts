import { DomainConfig, StorageSchema } from '../types';

const STORAGE_KEY = 'ctrl_enter_sender_config';

// Domains that are disabled by default
const DEFAULT_DISABLED_DOMAINS = ['x.com', 'google.com'];

function getHostnameFromOrigin(origin: string): string {
    try {
        const url = new URL(origin);
        // Remove 'www.' prefix if present for consistent comparison
        return url.hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

function isDefaultDisabledDomain(origin: string): boolean {
    const hostname = getHostnameFromOrigin(origin);
    return DEFAULT_DISABLED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
}

export async function getDomainConfig(origin: string): Promise<DomainConfig> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const config = data[STORAGE_KEY] as StorageSchema | undefined;

    if (config?.domains?.[origin]) {
        return config.domains[origin];
    }

    // Check if this is a default disabled domain
    if (isDefaultDisabledDomain(origin)) {
        return {
            enabled: false,
            mode: 'default'
        };
    }

    // Default config
    return {
        enabled: true,
        mode: 'default'
    };
}

export async function setDomainConfig(origin: string, config: DomainConfig): Promise<void> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const currentSchema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };

    currentSchema.domains[origin] = config;

    await chrome.storage.sync.set({ [STORAGE_KEY]: currentSchema });
}

export async function getAllConfigs(): Promise<StorageSchema> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const schema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };
    
    // Include default disabled domains if they're not already in the config
    const allDomains = { ...schema.domains };
    
    // Add default disabled domains that aren't explicitly configured
    // We need to check common origin patterns for these domains
    const defaultDisabledOrigins = [
        'https://x.com',
        'https://www.x.com',
        'https://twitter.com',
        'https://www.twitter.com',
        'https://google.com',
        'https://www.google.com'
    ];
    
    for (const origin of defaultDisabledOrigins) {
        // Only add if not already configured and matches default disabled domain
        if (!allDomains[origin] && isDefaultDisabledDomain(origin)) {
            allDomains[origin] = {
                enabled: false,
                mode: 'default'
            };
        }
    }
    
    return { domains: allDomains };
}

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
