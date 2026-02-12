import { SiteAdapter } from '../types';
import { DomainConfig } from '../../types';

/**
 * ChatGPT adapter
 * ChatGPT uses a textarea (#prompt-textarea) or contentEditable.
 * Native behavior: Enter sends message.
 */
export const chatgptAdapter: SiteAdapter = {
    name: 'chatgpt',

    matches(hostname: string): boolean {
        return hostname.includes('chatgpt.com') || hostname.includes('openai.com');
    },

    listenerTarget: 'document',
    nativeSendKey: 'enter',

    isEditable(element: Element, config?: DomainConfig): boolean {
        if (!element) return false;

        // Check custom excludes
        if (config?.customExcludes) {
            if (element.matches(config.customExcludes.join(','))) return false;
        }

        // ChatGPT uses #prompt-textarea or a contentEditable div
        if (element.tagName === 'TEXTAREA') return true;

        if ((element as HTMLElement).isContentEditable) {
            const id = element.getAttribute('id');
            const role = element.getAttribute('role');
            if (id === 'prompt-textarea' || role === 'textbox') return true;

            // ProseMirror-based editor (newer ChatGPT)
            const editorEl = (element as HTMLElement).closest('.ProseMirror');
            if (editorEl && (editorEl as HTMLElement).isContentEditable) return true;
        }

        return false;
    },

    insertNewline(target: HTMLElement): void {
        if (target.tagName === 'TEXTAREA') {
            const textarea = target as HTMLTextAreaElement;
            textarea.setRangeText('\n', textarea.selectionStart, textarea.selectionEnd, 'end');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // contentEditable: Shift+Enter for newline
            const events = ['keydown', 'keypress', 'keyup'] as const;
            for (const eventType of events) {
                target.dispatchEvent(new KeyboardEvent(eventType, {
                    key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                    shiftKey: true,
                    bubbles: true, cancelable: true, view: window,
                }));
            }
        }
    },

    triggerSend(target: HTMLElement): void {
        // Strategy 1: Find the send button
        let container = target.closest('form') || target.parentElement;
        for (let i = 0; i < 10 && container; i++) {
            const sendButton =
                container.querySelector('button[data-testid="send-button"]') ||
                container.querySelector('button[aria-label="Send prompt"]') ||
                container.querySelector('button[aria-label="プロンプトを送信する"]') ||
                container.querySelector('button[aria-label*="Send"]') ||
                container.querySelector('button[aria-label*="送信"]');
            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
            container = container.parentElement;
        }

        // Strategy 2: Form submit
        const form = target.closest('form');
        if (form) {
            if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
                return;
            }
        }
    },
};
