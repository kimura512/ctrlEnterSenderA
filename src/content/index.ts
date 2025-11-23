import { isMultiLineEditable } from './detector';
import { handleKeyDown } from './handler';
import { getDomainConfig } from '../background/storage';
import { DomainConfig } from '../types';

let currentConfig: DomainConfig | null = null;
const origin = window.location.origin;

// Initial config load
getDomainConfig(origin).then(config => {
    currentConfig = config;
    console.log('Ctrl+Enter Sender: Config loaded', config);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes['ctrl_enter_sender_config']) {
        getDomainConfig(origin).then(config => {
            currentConfig = config;
            console.log('Ctrl+Enter Sender: Config updated', config);
        });
    }
});

function attachListeners(doc: Document) {
    console.log('Ctrl+Enter Sender: Attaching listeners to', doc);
    doc.addEventListener('keydown', (event) => {
        if (!event.isTrusted) return;
        if (!currentConfig || !currentConfig.enabled) return;

        const target = event.target as HTMLElement;

        // Check if target is editable
        if (!isMultiLineEditable(target, currentConfig)) {
            return;
        }

        // Handle Enter (Capture phase)
        // We want to stop the site from seeing Enter, so we use Capture and stop propagation.
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            handleKeyDown(event, target, currentConfig);
        }
    }, true);

    doc.addEventListener('keydown', (event) => {
        if (!event.isTrusted) return;
        if (!currentConfig || !currentConfig.enabled) return;

        const target = event.target as HTMLElement;

        // Check if target is editable
        if (!isMultiLineEditable(target, currentConfig)) {
            return;
        }

        // Handle Ctrl+Enter (Bubble phase)
        // We wait for the site to handle it. If they didn't (defaultPrevented is false), we trigger send.
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isSendKey = isMac
            ? event.metaKey && event.key === 'Enter'
            : event.ctrlKey && event.key === 'Enter';

        if (isSendKey) {
            // If the site already handled it (e.g. Gmail), don't interfere.
            if (event.defaultPrevented) return;

            handleKeyDown(event, target, currentConfig);
        }
    }, false);
}

// Attach to main document
attachListeners(document);

// Handle iframes (like Google Chat)
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
