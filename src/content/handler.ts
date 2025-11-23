import { DomainConfig } from '../types';

export function handleKeyDown(event: KeyboardEvent, target: HTMLElement, _config?: DomainConfig) {
    // 1. IME Check
    if (event.isComposing || event.keyCode === 229) {
        return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isSendKey = isMac
        ? event.metaKey && event.key === 'Enter'
        : event.ctrlKey && event.key === 'Enter';

    const isPlainEnter = event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

    // Check if we're on Discord or Teams
    const isDiscord = window.location.hostname.includes('discord.com');
    const isTeams = window.location.hostname.includes('teams.microsoft.com') || window.location.hostname.includes('teams.live.com');
    const isComplexApp = isDiscord || isTeams;

    // Special handling for Complex Apps (Discord, Teams)
    if (isComplexApp) {
        if (isSendKey) {
            // Ctrl+Enter on Complex Apps: Trigger Send
            // These apps usually send on Enter.
            // We simulate a plain Enter keypress to trigger their send action.
            event.preventDefault();
            event.stopImmediatePropagation();

            const events = ['keydown', 'keypress', 'keyup'];
            events.forEach(eventType => {
                const newEvent = new KeyboardEvent(eventType, {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                target.dispatchEvent(newEvent);
            });
            return;
        }

        if (isPlainEnter) {
            // Plain Enter: simulate Shift+Enter (newline)
            // These apps natively handle Shift+Enter to insert a newline.
            event.preventDefault();
            event.stopImmediatePropagation();
            insertNewline(target);
            return;
        }
        return;
    }

    // Non-Complex sites
    if (isSendKey) {
        // If we reached here in Bubble phase and defaultPrevented is false (checked in index.ts),
        // it means the site didn't handle Ctrl+Enter. We should trigger send.
        event.preventDefault();
        event.stopImmediatePropagation();
        triggerSend(target);
        return;
    }

    if (isPlainEnter) {
        // We want to stop the default send behavior and insert a newline.
        event.preventDefault();
        event.stopImmediatePropagation();
        insertNewline(target);
        return;
    }
}

function insertNewline(target: HTMLElement) {
    if (target.tagName === 'TEXTAREA') {
        const textarea = target as HTMLTextAreaElement;
        // Use setRangeText for better undo/redo support and cursor preservation
        textarea.setRangeText('\n', textarea.selectionStart, textarea.selectionEnd, 'end');
        // Trigger input event
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (target.isContentEditable) {
        // For contenteditable (Slack, Discord, Teams, etc.), simulating Shift+Enter 
        // is the most robust way to trigger the site's native newline insertion.
        // Manual DOM manipulation often conflicts with internal editor state (React/Slate).
        const events = ['keydown', 'keypress', 'keyup'];
        events.forEach(eventType => {
            const event = new KeyboardEvent(eventType, {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                shiftKey: true, // Simulate Shift+Enter
                bubbles: true,
                cancelable: true,
                view: window
            });
            target.dispatchEvent(event);
        });
    }
}

function triggerSend(target: HTMLElement) {
    // 1. Try form submission
    const form = target.closest('form');
    if (form) {
        // Try requestSubmit first (triggers validation and submit event)
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
            return;
        }
        // Fallback to submit() (skips validation/event listeners sometimes, use with caution)
        form.submit();
        return;
    }

    // 2. Search for send button
    // Look for button in the same container or globally if needed.
    // Strategy: Look up the tree for a container, then find submit button.

    // Common selectors for send buttons
    const selectors = [
        'button[type="submit"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="送信"]',
        '[data-testid*="send"]',
        '[data-testid*="submit"]',
        'button[class*="send"]',
        'div[role="button"][aria-label*="送信"]',
        'div[role="button"][aria-label*="Send"]', // Common in modern apps
        'div[role="button"][class*="send"]',
        'button[title*="Send"]',
        'button[title*="送信"]'
    ];

    // Search strategy:
    // a. Closest common container (e.g. the chat input wrapper)
    // b. Document wide (risky, might hit search bar button)

    // Let's try to find a button near the input first.
    let container = target.parentElement;
    let button: Element | null = null;

    // Traverse up a few levels to find a container that might hold the button
    for (let i = 0; i < 7 && container; i++) {
        for (const selector of selectors) {
            button = container.querySelector(selector);
            if (button) break;
        }
        if (button) break;
        container = container.parentElement;
    }

    if (button && button instanceof HTMLElement) {
        button.click();
        console.log('Ctrl+Enter Sender: Clicked send button', button);
    } else {
        console.log('Ctrl+Enter Sender: Could not find send button. Dispatching Enter event as fallback.');

        // Fallback: Dispatch a "real" Enter key event.
        // Note: This might be caught by our own Capture listener if we are not careful?
        // No, dispatchEvent is synchronous.
        // But wait, if we dispatch 'Enter', our Capture listener in index.ts will see it!
        // And it will block it!
        // We need to make sure our Capture listener ignores THIS specific event.
        // We can't easily tag the event object in a way that survives dispatch (unless we use a custom property, but TS hates that).
        // However, index.ts checks `event.isTrusted`.
        // dispatchEvent creates an untrusted event (isTrusted: false).
        // index.ts has `if (!event.isTrusted) return;`.
        // So our simulated event WILL pass through our blocker.
        // The site will receive it.
        // If the site accepts untrusted events, it will work.

        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            view: window
        });
        target.dispatchEvent(enterEvent);

        // Also dispatch keypress/keyup for completeness
        const keypressEvent = new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            view: window
        });
        target.dispatchEvent(keypressEvent);

        const keyupEvent = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            view: window
        });
        target.dispatchEvent(keyupEvent);
    }
}
