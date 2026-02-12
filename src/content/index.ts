import { getAdapter } from './adapters/registry';
import { getDomainConfig } from '../background/storage';
import { DomainConfig } from '../types';

let currentConfig: DomainConfig | null = null;
const origin = window.location.origin;
const hostname = window.location.hostname;

// Resolve the adapter for this site (once, at load time)
const adapter = getAdapter(hostname);

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
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    // Determine listener target based on adapter config
    const captureTarget: EventTarget = adapter.listenerTarget === 'window'
        ? (doc.defaultView || window)
        : doc;

    // --- Capture Phase Listener ---
    // Handles ALL key interception for this adapter.
    captureTarget.addEventListener('keydown', (evt) => {
        const event = evt as KeyboardEvent;
        if (!event.isTrusted) return;
        if (!currentConfig || !currentConfig.enabled) return;

        const target = event.target as HTMLElement;

        // Check if target is an editable area handled by this adapter
        if (!adapter.isEditable(target, currentConfig)) return;

        const isSendKey = isMac
            ? event.metaKey && event.key === 'Enter'
            : event.ctrlKey && event.key === 'Enter';
        const isPlainEnter = event.key === 'Enter'
            && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

        if (adapter.nativeSendKey === 'enter') {
            // --- Enter-to-Send apps (Discord, Claude, Grok, Teams, ChatGPT, Slack) ---
            // We intercept BOTH Enter and Ctrl+Enter in capture phase.
            if (isSendKey) {
                event.preventDefault();
                event.stopImmediatePropagation();
                adapter.triggerSend(target);
                return;
            }
            if (isPlainEnter) {
                event.preventDefault();
                event.stopImmediatePropagation();
                adapter.insertNewline(target);
                return;
            }
        } else {
            // --- Standard apps (nativeSendKey === 'ctrl+enter') ---
            // Only handle plain Enter in capture phase (to prevent default send/newline).
            // Ctrl+Enter is handled in bubble phase (see below).
            if (isPlainEnter) {
                event.preventDefault();
                event.stopImmediatePropagation();
                adapter.insertNewline(target);
                return;
            }
        }
    }, true);

    // --- Bubble Phase Listener (Standard apps only) ---
    // For sites where nativeSendKey is 'ctrl+enter', we handle Ctrl+Enter in bubble phase.
    // This allows the site to handle it first (e.g., Gmail).
    if (adapter.nativeSendKey === 'ctrl+enter') {
        doc.addEventListener('keydown', (event) => {
            if (!event.isTrusted) return;
            if (!currentConfig || !currentConfig.enabled) return;

            const target = event.target as HTMLElement;
            if (!adapter.isEditable(target, currentConfig)) return;

            const isSendKey = isMac
                ? event.metaKey && event.key === 'Enter'
                : event.ctrlKey && event.key === 'Enter';

            if (isSendKey) {
                // If the site already handled it, don't interfere.
                if (event.defaultPrevented) return;

                event.preventDefault();
                event.stopImmediatePropagation();
                adapter.triggerSend(target);
            }
        }, false);
    }
}

// Attach to main document
attachListeners(document);

// Handle iframes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLIFrameElement) {
                try {
                    const iframeDoc = node.contentDocument;
                    if (iframeDoc) {
                        attachListeners(iframeDoc);
                    } else {
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
