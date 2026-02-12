import { SiteAdapter } from '../types';
import { discordAdapter } from './discord';
import { claudeAdapter } from './claude';
import { slackAdapter } from './slack';
import { grokAdapter } from './grok';
import { chatgptAdapter } from './chatgpt';
import { teamsAdapter } from './teams';
import { defaultAdapter } from './default';

/**
 * Adapter registry.
 * 
 * Order matters: site-specific adapters are checked first,
 * defaultAdapter is always last (it matches everything).
 * 
 * To add a new site: create a new adapter file and add it to this array.
 */
const adapters: SiteAdapter[] = [
    discordAdapter,
    claudeAdapter,
    slackAdapter,
    grokAdapter,
    chatgptAdapter,
    teamsAdapter,
    // defaultAdapter is always last
    defaultAdapter,
];

/**
 * Get the appropriate adapter for the given hostname.
 * Returns the first matching adapter, or defaultAdapter as fallback.
 */
export function getAdapter(hostname: string): SiteAdapter {
    for (const adapter of adapters) {
        if (adapter.matches(hostname)) {
            return adapter;
        }
    }
    // Should never reach here since defaultAdapter matches everything
    return defaultAdapter;
}
