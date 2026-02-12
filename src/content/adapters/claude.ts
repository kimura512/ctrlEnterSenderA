import { SiteAdapter } from '../types';

/**
 * Claude.ai adapter
 * Claude uses TipTap/ProseMirror editor.
 * Native behavior: Enter sends message.
 * IMPORTANT: Must use 'window' as listener target to fire BEFORE Claude's
 * document-level React/TipTap listeners.
 */
export const claudeAdapter: SiteAdapter = {
    name: 'claude',

    matches(hostname: string): boolean {
        return hostname.includes('claude.ai');
    },

    // CRITICAL: Claude.ai registers keydown on document very early.
    // We must listen on window to fire before Claude's listeners.
    listenerTarget: 'window',
    nativeSendKey: 'enter',

    isEditable(element: Element): boolean {
        if (!element) return false;

        // Claude uses TipTap/ProseMirror editor.
        // Event target is often a child element (e.g. <p>), not the editor div.
        const editorEl = (element as HTMLElement).closest('.tiptap.ProseMirror');
        if (editorEl && (editorEl as HTMLElement).isContentEditable) {
            return true;
        }

        return false;
    },

    insertNewline(target: HTMLElement): void {
        // Claude accepts Shift+Enter for newline
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
        // Claude.ai uses a button with aria-label for send
        let container = target.parentElement;
        for (let i = 0; i < 10 && container; i++) {
            const sendButton =
                container.querySelector('button[aria-label="メッセージを送信"]') ||
                container.querySelector('button[aria-label="Send message"]') ||
                container.querySelector('button[aria-label*="送信"]') ||
                container.querySelector('button[aria-label*="Send"]');

            if (sendButton instanceof HTMLElement) {
                // React 18 may verify user interaction strictly
                const eventOptions = { bubbles: true, cancelable: true, view: window };
                sendButton.dispatchEvent(new MouseEvent('mousedown', eventOptions));
                sendButton.dispatchEvent(new MouseEvent('mouseup', eventOptions));
                sendButton.click();
                return;
            }
            container = container.parentElement;
        }
    },
};
