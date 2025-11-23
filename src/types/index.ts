export type DomainMode = 'default' | 'forceOn' | 'forceOff';

export interface DomainConfig {
    enabled: boolean;
    mode: DomainMode;
    customTargets?: string[];
    customExcludes?: string[];
}

export interface StorageSchema {
    domains: {
        [origin: string]: DomainConfig;
    };
}
