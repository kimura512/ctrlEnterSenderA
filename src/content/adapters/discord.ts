import { SiteAdapter } from '../types';

/**
 * Discord adapter
 * Discord uses Slate editor with role="textbox".
 * Native behavior: Enter sends message.
 */
export const discordAdapter: SiteAdapter = {
    name: 'discord',

    matches(hostname: string): boolean {
        return hostname.includes('discord.com');
    },

    listenerTarget: 'document',
    nativeSendKey: 'enter',

    isEditable(element: Element): boolean {
        if (!element) return false;

        // Discord uses Slate editor with role="textbox"
        const role = element.getAttribute('role');
        if (role === 'textbox' && (element as HTMLElement).isContentEditable) {
            return true;
        }

        // Also check for child elements inside the textbox
        const textbox = (element as HTMLElement).closest('[role="textbox"]');
        if (textbox && (textbox as HTMLElement).isContentEditable) {
            return true;
        }

        return false;
    },

    insertNewline(target: HTMLElement): void {
        // Discord accepts Shift+Enter for newline
        const events = ['keydown', 'keypress', 'keyup'] as const;
        for (const eventType of events) {
            target.dispatchEvent(new KeyboardEvent(eventType, {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                shiftKey: true,
                bubbles: true, cancelable: true, view: window,
            }));
        }
    },

    triggerSend(target: HTMLElement): void {
        // Strategy 1: Find Discord's send button via aria-label
        let container = target.parentElement;
        for (let i = 0; i < 10 && container; i++) {
            const sendButton =
                container.querySelector('button[aria-label="Send Message"]') ||
                container.querySelector('button[aria-label="メッセージを送信"]') ||
                container.querySelector('button[aria-label*="Send"]') ||
                container.querySelector('button[aria-label*="送信"]');
            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
            container = container.parentElement;
        }

        // Strategy 2: Simulate plain Enter (Discord's native send key)
        // Since we intercepted the original Enter, we dispatch a new one
        const events = ['keydown', 'keypress', 'keyup'] as const;
        for (const eventType of events) {
            target.dispatchEvent(new KeyboardEvent(eventType, {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                bubbles: true, cancelable: true, view: window,
            }));
        }
    },
};
