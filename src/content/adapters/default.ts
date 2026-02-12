import { SiteAdapter } from '../types';
import { DomainConfig } from '../../types';

/**
 * Default adapter for standard websites.
 * Handles textarea and contentEditable elements with generic detection and send logic.
 */
export const defaultAdapter: SiteAdapter = {
    name: 'default',

    matches(_hostname: string): boolean {
        // Always matches as fallback
        return true;
    },

    listenerTarget: 'document',
    nativeSendKey: 'ctrl+enter',

    isEditable(element: Element, config?: DomainConfig): boolean {
        if (!element) return false;

        const hostname = window.location.hostname;

        // Google Docs/Sheets/Slides: Enter behavior is complex and custom.
        if (hostname === 'docs.google.com') return false;

        // Gmail: Already has desired behavior (Enter=newline, Ctrl+Enter=send)
        if (hostname === 'mail.google.com') return false;

        // Check custom excludes
        if (config?.customExcludes) {
            if (element.matches(config.customExcludes.join(','))) return false;
        }

        // Check custom targets
        if (config?.customTargets) {
            if (element.matches(config.customTargets.join(','))) return true;
        }

        // Exclude single-line inputs
        if (element.tagName === 'INPUT') return false;

        const role = element.getAttribute('role');
        if (role === 'searchbox') return false;

        const ariaMultiline = element.getAttribute('aria-multiline');
        if (ariaMultiline === 'false') return false;

        // Check for TEXTAREA
        if (element.tagName === 'TEXTAREA') return true;

        // Check for contenteditable
        if ((element as HTMLElement).isContentEditable) {
            const ariaLabel = element.getAttribute('aria-label');
            const id = element.getAttribute('id');
            const className = element.className;

            const keywords = ['message', 'chat', 'compose', 'reply', 'comment', 'post', 'write', 'prompt', 'メッセージ', 'チャット', 'コメント'];
            const hasKeyword = keywords.some(keyword =>
                (ariaLabel && ariaLabel.toLowerCase().includes(keyword.toLowerCase())) ||
                (id && id.toLowerCase().includes(keyword.toLowerCase())) ||
                (className && typeof className === 'string' && className.toLowerCase().includes(keyword.toLowerCase()))
            );

            if (role === 'textbox' || hasKeyword) return true;
        }

        return false;
    },

    insertNewline(target: HTMLElement): void {
        if (target.tagName === 'TEXTAREA') {
            const textarea = target as HTMLTextAreaElement;
            textarea.setRangeText('\n', textarea.selectionStart, textarea.selectionEnd, 'end');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.isContentEditable) {
            const success = document.execCommand('insertText', false, '\n');
            if (!success) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const br = document.createTextNode('\n');
                    range.deleteContents();
                    range.insertNode(br);
                    range.setStartAfter(br);
                    range.setEndAfter(br);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    },

    triggerSend(target: HTMLElement): void {
        // 1. Try form submission
        const form = target.closest('form');
        if (form) {
            if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
                return;
            }
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
            'div[role="button"][aria-label*="Send"]',
            'div[role="button"][class*="send"]',
            'button[title*="Send"]',
            'button[title*="送信"]',
            // Google Meet
            'div[role="button"][aria-label="Send message"]',
            'div[role="button"][aria-label="メッセージを送信"]',
            'button[aria-label="メッセージを送信"]',
            'button[jsname="SoqoBf"]',
            // Messenger
            'div[aria-label="Press Enter to send"]',
            'div[aria-label="Send"]',
        ];
        let container = target.parentElement;
        let button: Element | null = null;

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
            // Fallback: Dispatch Enter key events
            const events = ['keydown', 'keypress', 'keyup'] as const;
            for (const eventType of events) {
                target.dispatchEvent(new KeyboardEvent(eventType, {
                    key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                    bubbles: true, cancelable: true, view: window,
                }));
            }
        }
    },
};
