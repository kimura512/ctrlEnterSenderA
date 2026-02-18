import { shouldIgnoreKeyEvent, classifyKeyEvent, SendKeyType } from '../keyClassifier';

/**
 * keyClassifier unit tests
 *
 * Tests the core key event classification logic, specifically:
 * - IME composing guard (the v1.3.3 bugfix)
 * - Enter/Ctrl+Enter/Shift+Enter classification
 * - Mac vs non-Mac behavior
 */

function makeEvent(overrides: Partial<KeyboardEvent> = {}): Pick<
    KeyboardEvent,
    'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing' | 'keyCode'
> {
    return {
        key: 'Enter',
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        isComposing: false,
        keyCode: 13,
        ...overrides,
    };
}

// ============================================================
// shouldIgnoreKeyEvent
// ============================================================

describe('shouldIgnoreKeyEvent', () => {
    it('should return true when isComposing is true', () => {
        expect(shouldIgnoreKeyEvent({ isComposing: true, keyCode: 13 })).toBe(true);
    });

    it('should return true when keyCode is 229 (IME processing)', () => {
        expect(shouldIgnoreKeyEvent({ isComposing: false, keyCode: 229 })).toBe(true);
    });

    it('should return true when both isComposing and keyCode 229', () => {
        expect(shouldIgnoreKeyEvent({ isComposing: true, keyCode: 229 })).toBe(true);
    });

    it('should return false for normal key events', () => {
        expect(shouldIgnoreKeyEvent({ isComposing: false, keyCode: 13 })).toBe(false);
    });

    it('should return false for non-Enter keys that are not composing', () => {
        expect(shouldIgnoreKeyEvent({ isComposing: false, keyCode: 65 })).toBe(false);
    });
});

// ============================================================
// classifyKeyEvent — enter-to-send apps (Discord, Slack, etc.)
// ============================================================

describe('classifyKeyEvent (nativeSendKey = "enter")', () => {
    const nativeSendKey: SendKeyType = 'enter';

    describe('IME composing', () => {
        it('should ignore Enter during IME composition (isComposing=true)', () => {
            const result = classifyKeyEvent(
                makeEvent({ isComposing: true }),
                nativeSendKey,
                true, // Mac
            );
            expect(result.action).toBe('ignore');
        });

        it('should ignore Enter during IME composition (keyCode=229)', () => {
            const result = classifyKeyEvent(
                makeEvent({ keyCode: 229 }),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('ignore');
        });

        it('should ignore Enter during IME composition on non-Mac', () => {
            const result = classifyKeyEvent(
                makeEvent({ isComposing: true }),
                nativeSendKey,
                false,
            );
            expect(result.action).toBe('ignore');
        });
    });

    describe('plain Enter → newline', () => {
        it('should classify plain Enter as newline on Mac', () => {
            const result = classifyKeyEvent(
                makeEvent(),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('newline');
        });

        it('should classify plain Enter as newline on non-Mac', () => {
            const result = classifyKeyEvent(
                makeEvent(),
                nativeSendKey,
                false,
            );
            expect(result.action).toBe('newline');
        });
    });

    describe('Cmd/Ctrl+Enter → send', () => {
        it('should classify Cmd+Enter as send on Mac', () => {
            const result = classifyKeyEvent(
                makeEvent({ metaKey: true }),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('send');
        });

        it('should classify Ctrl+Enter as send on non-Mac', () => {
            const result = classifyKeyEvent(
                makeEvent({ ctrlKey: true }),
                nativeSendKey,
                false,
            );
            expect(result.action).toBe('send');
        });

        // Mac Ctrl+Enter should NOT be send (Mac uses Cmd)
        it('should ignore Ctrl+Enter on Mac (not a send key)', () => {
            const result = classifyKeyEvent(
                makeEvent({ ctrlKey: true }),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('ignore');
        });
    });

    describe('Shift+Enter → ignore (let browser handle)', () => {
        it('should ignore Shift+Enter', () => {
            const result = classifyKeyEvent(
                makeEvent({ shiftKey: true }),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('ignore');
        });
    });

    describe('Alt+Enter → ignore', () => {
        it('should ignore Alt+Enter', () => {
            const result = classifyKeyEvent(
                makeEvent({ altKey: true }),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('ignore');
        });
    });
});

// ============================================================
// classifyKeyEvent — standard apps (ctrl+enter to send)
// ============================================================

describe('classifyKeyEvent (nativeSendKey = "ctrl+enter")', () => {
    const nativeSendKey: SendKeyType = 'ctrl+enter';

    describe('IME composing', () => {
        it('should ignore Enter during IME composition', () => {
            const result = classifyKeyEvent(
                makeEvent({ isComposing: true }),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('ignore');
        });

        it('should ignore keyCode 229 during IME composition', () => {
            const result = classifyKeyEvent(
                makeEvent({ keyCode: 229 }),
                nativeSendKey,
                false,
            );
            expect(result.action).toBe('ignore');
        });
    });

    describe('plain Enter → newline', () => {
        it('should classify plain Enter as newline', () => {
            const result = classifyKeyEvent(
                makeEvent(),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('newline');
        });
    });

    describe('Ctrl+Enter → ignore in capture phase (handled by bubble)', () => {
        // In ctrl+enter apps, the capture-phase classifier returns 'ignore'
        // for Ctrl+Enter, because it's handled in the bubble phase instead.
        it('should ignore Cmd+Enter on Mac (handled in bubble phase)', () => {
            const result = classifyKeyEvent(
                makeEvent({ metaKey: true }),
                nativeSendKey,
                true,
            );
            expect(result.action).toBe('ignore');
        });

        it('should ignore Ctrl+Enter on non-Mac (handled in bubble phase)', () => {
            const result = classifyKeyEvent(
                makeEvent({ ctrlKey: true }),
                nativeSendKey,
                false,
            );
            expect(result.action).toBe('ignore');
        });
    });
});

// ============================================================
// Edge cases: Mac IME Enter after composition ends
// ============================================================

describe('Edge cases: Mac IME behavior', () => {
    it('should handle compositionend followed by immediate keydown (keyCode=229)', () => {
        // On Chrome/Mac, after compositionend, the next keydown may have
        // isComposing=false but keyCode=229. Our guard catches this.
        const result = classifyKeyEvent(
            makeEvent({ isComposing: false, keyCode: 229 }),
            'enter',
            true,
        );
        expect(result.action).toBe('ignore');
    });

    it('should handle normal Enter after IME is fully done', () => {
        // After IME is completely finished, the next Enter should work normally
        const result = classifyKeyEvent(
            makeEvent({ isComposing: false, keyCode: 13 }),
            'enter',
            true,
        );
        expect(result.action).toBe('newline');
    });

    it('should handle non-Enter keys during IME', () => {
        // Even non-Enter keys with isComposing should be ignored
        const result = classifyKeyEvent(
            makeEvent({ key: 'a', isComposing: true, keyCode: 65 }),
            'enter',
            true,
        );
        expect(result.action).toBe('ignore');
    });
});
