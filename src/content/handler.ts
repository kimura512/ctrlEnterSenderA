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
    // Slack is handled via triggerSend (button click) because simulating Enter might just insert a newline
    // depending on user settings.
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
    // Special handling for Slack
    const isSlack = window.location.hostname.includes('slack.com');
    if (isSlack) {
        // Slack's DOM structure is complex. The input (.ql-editor) is deep inside.
        // The send button (button[data-qa="texty_send_button"]) is usually in a toolbar or footer relative to the editor.

        // Strategy 1: Find the main editor container and search within it.
        // Known containers: .c-texty_input_unstyled__container, .c-message_kit__editor
        let container = target.closest('.c-texty_input_unstyled__container') ||
            target.closest('.c-message_kit__editor') ||
            target.closest('[data-qa="message_editor"]');

        if (container) {
            // Sometimes the button is a sibling of the container's parent, or inside the container.
            // Let's search inside first.
            let sendButton = container.querySelector('button[data-qa="texty_send_button"]');

            // If not found inside, check the parent (often the button is in a footer sibling)
            if (!sendButton && container.parentElement) {
                sendButton = container.parentElement.querySelector('button[data-qa="texty_send_button"]');
            }

            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
        }

        // Strategy 2: Traverse up manually a few levels
        let current = target.parentElement;
        for (let i = 0; i < 10 && current; i++) {
            const sendButton = current.querySelector('button[data-qa="texty_send_button"]');
            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
            current = current.parentElement;
        }
    }

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
        'button[title*="送信"]',
        // Slack
        'button[data-qa="texty_send_button"]',
        'button[aria-label="Send now"]',
        // Google Chat / Meet
        'div[role="button"][aria-label="Send message"]',
        'div[role="button"][aria-label="メッセージを送信"]',
        'button[aria-label="メッセージを送信"]', // Meet specific
        'button[jsname="SoqoBf"]', // Meet specific jsname
        // Messenger
        'div[aria-label="Press Enter to send"]',
        'div[aria-label="Send"]'
    ];
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
    } else {
        // Fallback: Dispatch a "real" Enter key event.
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
