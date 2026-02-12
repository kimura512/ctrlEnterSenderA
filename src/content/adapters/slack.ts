import { SiteAdapter } from '../types';

/**
 * Slack adapter
 * Slack uses Quill editor with .ql-editor class.
 * Native behavior: Enter sends message (in default Slack config).
 * Note: Slack has its own "Enter to send" vs "Enter to newline" setting,
 * but our extension always enforces Enter=newline, Ctrl+Enter=send.
 */
export const slackAdapter: SiteAdapter = {
    name: 'slack',

    matches(hostname: string): boolean {
        return hostname.includes('slack.com');
    },

    listenerTarget: 'document',
    nativeSendKey: 'enter',

    isEditable(element: Element): boolean {
        if (!element) return false;

        // Slack uses Quill editor with .ql-editor class
        if (element.classList.contains('ql-editor') && (element as HTMLElement).isContentEditable) {
            return true;
        }

        // Also check for child elements inside the editor
        const editor = (element as HTMLElement).closest('.ql-editor');
        if (editor && (editor as HTMLElement).isContentEditable) {
            return true;
        }

        return false;
    },

    insertNewline(target: HTMLElement): void {
        // Slack accepts Shift+Enter for newline
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
        // Strategy 1: Find send button via data-qa attribute
        let container = target.closest('.c-texty_input_unstyled__container') ||
            target.closest('.c-message_kit__editor') ||
            target.closest('[data-qa="message_editor"]');

        if (container) {
            let sendButton = container.querySelector('button[data-qa="texty_send_button"]');
            if (!sendButton && container.parentElement) {
                sendButton = container.parentElement.querySelector('button[data-qa="texty_send_button"]');
            }
            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
        }

        // Strategy 2: Traverse up manually
        let current = target.parentElement;
        for (let i = 0; i < 10 && current; i++) {
            const sendButton = current.querySelector('button[data-qa="texty_send_button"]');
            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
            current = current.parentElement;
        }
    },
};
