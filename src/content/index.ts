import { isMultiLineEditable } from './detector';
import { handleKeyDown } from './handler';
import { getDomainConfig } from '../background/storage';
import { DomainConfig } from '../types';

let currentConfig: DomainConfig | null = null;
const origin = window.location.origin;

// Initial config load
getDomainConfig(origin).then(config => {
    currentConfig = config;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes['ctrl_enter_sender_config']) {
        getDomainConfig(origin).then(config => {
            currentConfig = config;
        });
    }
});

function attachListeners(doc: Document) {
    // Unified Keydown Listener (Capture Phase)
    // We use Capture phase for:
    // 1. Plain Enter on ALL sites (to prevent default newline)
    // 2. Ctrl+Enter on Complex Apps (Slack, Discord, Teams) to ensure we intercept before they do.
    doc.addEventListener('keydown', (event) => {
        if (!event.isTrusted) return;
        if (!currentConfig || !currentConfig.enabled) return;

        const target = event.target as HTMLElement;
        const hostname = window.location.hostname;
        const isSlack = hostname.includes('slack.com');

        // Check if target is editable
        if (!isMultiLineEditable(target, currentConfig)) {
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isSendKey = isMac
            ? event.metaKey && event.key === 'Enter'
            : event.ctrlKey && event.key === 'Enter';
        const isPlainEnter = event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

        const isDiscord = hostname.includes('discord.com');
        const isTeams = hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com');
        const isChatGPT = hostname.includes('chatgpt.com') || hostname.includes('openai.com');
        const isGrok = hostname.includes('grok.com');
        const isComplexApp = isDiscord || isTeams || isSlack || isChatGPT || isGrok;

        // CASE 1: Complex Apps (Slack, Discord, Teams, ChatGPT, Grok)
        // Handle BOTH Enter and Ctrl+Enter in Capture phase
        if (isComplexApp) {
            if (isSendKey || isPlainEnter) {
                handleKeyDown(event, target, currentConfig);
            }
            return;
        }

        // CASE 2: Standard Apps
        // Handle Plain Enter in Capture phase (to prevent default newline)
        if (isPlainEnter) {
            handleKeyDown(event, target, currentConfig);
        }

        // Ctrl+Enter for standard apps is handled in Bubble phase (see below)
    }, true);

    // Bubble Phase Listener (for Standard Apps Ctrl+Enter)
    doc.addEventListener('keydown', (event) => {
        if (!event.isTrusted) return;
        if (!currentConfig || !currentConfig.enabled) return;

        const target = event.target as HTMLElement;
        const hostname = window.location.hostname;

        // Check if target is editable
        if (!isMultiLineEditable(target, currentConfig)) {
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isSendKey = isMac
            ? event.metaKey && event.key === 'Enter'
            : event.ctrlKey && event.key === 'Enter';

        const isDiscord = hostname.includes('discord.com');
        const isTeams = hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com');
        const isSlack = hostname.includes('slack.com');
        const isChatGPT = hostname.includes('chatgpt.com') || hostname.includes('openai.com');
        const isGrok = hostname.includes('grok.com');
        const isComplexApp = isDiscord || isTeams || isSlack || isChatGPT || isGrok;

        // Complex apps are fully handled in Capture phase, so ignore them here.
        if (isComplexApp) return;

        // Handle Ctrl+Enter for Standard Apps
        // We wait for the site to handle it. If they didn't (defaultPrevented is false), we trigger send.
        if (isSendKey) {
            // If the site already handled it (e.g. Gmail), don't interfere.
            if (event.defaultPrevented) return;

            handleKeyDown(event, target, currentConfig);
        }
    }, false);
}

// Attach to main document
attachListeners(document);

// Handle iframes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLIFrameElement) {
                try {
                    // Try to access iframe document (only works for same-origin)
                    const iframeDoc = node.contentDocument;
                    if (iframeDoc) {
                        attachListeners(iframeDoc);
                    } else {
                        // Wait for load
                        node.addEventListener('load', () => {
                            const loadedDoc = node.contentDocument;
                            if (loadedDoc) {
                                attachListeners(loadedDoc);
                            }
                        });
                    }
                } catch (e) {
                    // Cross-origin iframe, can't access
                }
            }
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// Also check existing iframes
document.querySelectorAll('iframe').forEach(iframe => {
    try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
            attachListeners(iframeDoc);
        }
    } catch (e) {
        // Cross-origin
    }
});
