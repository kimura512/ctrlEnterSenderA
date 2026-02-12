import { SiteAdapter } from '../types';

/**
 * Microsoft Teams adapter
 * Teams uses a contentEditable div for message input.
 * Native behavior: Enter sends message.
 */
export const teamsAdapter: SiteAdapter = {
    name: 'teams',

    matches(hostname: string): boolean {
        return hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com');
    },

    listenerTarget: 'document',
    nativeSendKey: 'enter',

    isEditable(element: Element): boolean {
        if (!element) return false;

        // Teams uses contentEditable with role="textbox"
        if ((element as HTMLElement).isContentEditable) {
            const role = element.getAttribute('role');
            if (role === 'textbox') return true;
        }

        // Check for child elements inside the textbox
        const textbox = (element as HTMLElement).closest('[role="textbox"]');
        if (textbox && (textbox as HTMLElement).isContentEditable) {
            return true;
        }

        return false;
    },

    insertNewline(target: HTMLElement): void {
        // Teams accepts Shift+Enter for newline
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
        // Strategy 1: Find send button
        let container = target.parentElement;
        for (let i = 0; i < 10 && container; i++) {
            const sendButton =
                container.querySelector('button[aria-label="Send"]') ||
                container.querySelector('button[aria-label="送信"]') ||
                container.querySelector('button[data-tid="newMessageCommands-send"]') ||
                container.querySelector('button[aria-label*="Send"]') ||
                container.querySelector('button[aria-label*="送信"]');
            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
            container = container.parentElement;
        }

        // Strategy 2: Simulate plain Enter
        const events = ['keydown', 'keypress', 'keyup'] as const;
        for (const eventType of events) {
            target.dispatchEvent(new KeyboardEvent(eventType, {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                bubbles: true, cancelable: true, view: window,
            }));
        }
    },
};
