/**
 * shouldIgnoreKeyEvent - IME composing guard
 *
 * Extracted from the capture/bubble phase listeners in index.ts
 * so it can be unit-tested independently.
 */
export function shouldIgnoreKeyEvent(event: Pick<KeyboardEvent, 'isComposing' | 'keyCode'>): boolean {
    return event.isComposing || event.keyCode === 229;
}

export type SendKeyType = 'enter' | 'ctrl+enter';

export interface KeyClassification {
    action: 'send' | 'newline' | 'ignore';
}

/**
 * classifyKeyEvent - Determine what action to take for a keydown event.
 *
 * This encapsulates the core decision logic from the capture-phase listener
 * in index.ts, making it testable without DOM/Chrome API dependencies.
 */
export function classifyKeyEvent(
    event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing' | 'keyCode'>,
    nativeSendKey: SendKeyType,
    isMac: boolean,
): KeyClassification {
    // IME composing guard - must come first
    if (shouldIgnoreKeyEvent(event)) {
        return { action: 'ignore' };
    }

    const isSendKey = isMac
        ? event.metaKey && event.key === 'Enter'
        : event.ctrlKey && event.key === 'Enter';
    const isPlainEnter = event.key === 'Enter'
        && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (nativeSendKey === 'enter') {
        // Enter-to-Send apps (Discord, Slack, Claude, etc.)
        if (isSendKey) return { action: 'send' };
        if (isPlainEnter) return { action: 'newline' };
    } else {
        // Standard apps (nativeSendKey === 'ctrl+enter')
        // Capture phase only handles plain Enter → newline
        if (isPlainEnter) return { action: 'newline' };
    }

    return { action: 'ignore' };
}
