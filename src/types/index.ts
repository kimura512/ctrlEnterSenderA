export interface DomainConfig {
    enabled: boolean;
    customTargets?: string[];
    customExcludes?: string[];
}

export interface StorageSchema {
    domains: {
        [origin: string]: DomainConfig;
    };
}
