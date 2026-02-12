export type ActivationMode = 'blacklist' | 'whitelist';

export interface DomainConfig {
    enabled: boolean;
    customTargets?: string[];
    customExcludes?: string[];
}

export interface StorageSchema {
    activationMode?: ActivationMode;
    domains: {
        [origin: string]: DomainConfig;
    };
}
