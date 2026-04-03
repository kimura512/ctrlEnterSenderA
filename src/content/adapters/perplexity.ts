import { SiteAdapter } from '../types';

/**
 * Perplexity.ai adapter
 * Uses Lexical editor (#ask-input).
 * Native behavior: Enter sends message, Shift+Enter inserts newline.
 */
export const perplexityAdapter: SiteAdapter = {
  name: 'perplexity',

  matches(hostname: string): boolean {
    return hostname.includes('perplexity.ai');
  },

  // Perplexity also wires key handlers high up; follow Claude pattern.
  // Note: Cmd/Ctrl+Enter is handled natively by the site, so we use 'none'
  // to avoid interfering. We only intercept Enter for newline.
  listenerTarget: 'window',
  nativeSendKey: 'none',

  isEditable(element: Element): boolean {
    if (!element) return false;

    // Event target may be a child <p>, so walk up to #ask-input.
    const editorEl = (element as HTMLElement).closest('#ask-input');
    return !!editorEl && (editorEl as HTMLElement).isContentEditable;
  },

  insertNewline(target: HTMLElement): void {
    // Perplexity accepts Shift+Enter for newline, so simulate that.
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
    // Send button: <button aria-label="Submit" ...>
    let container: HTMLElement | null = target.parentElement;
    for (let i = 0; i < 10 && container; i++) {
      const sendButton =
        container.querySelector('button[aria-label="Submit"]') ||
        container.querySelector('button[aria-label*="Submit"]');

      if (sendButton instanceof HTMLElement) {
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
