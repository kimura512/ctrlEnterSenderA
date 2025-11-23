import { DomainConfig } from '../types';

export function isMultiLineEditable(element: Element, config?: DomainConfig): boolean {
    if (!element) return false;

    // 0. Check blocked sites
    const hostname = window.location.hostname;


    // Google Docs/Sheets/Slides: Enter behavior is complex and custom.
    if (hostname === 'docs.google.com') {
        return false;
    }

    // 1. Check custom excludes
    if (config?.customExcludes) {
        if (element.matches(config.customExcludes.join(','))) {
            return false;
        }
    }

    // 2. Check custom targets
    if (config?.customTargets) {
        if (element.matches(config.customTargets.join(','))) {
            return true;
        }
    }

    // 3. Check forceOff
    if (config?.mode === 'forceOff') {
        return false;
    }

    // 4. Default exclusion rules (unless forceOn)
    if (config?.mode !== 'forceOn') {
        if (element.tagName === 'INPUT') return false;

        const role = element.getAttribute('role');
        if (role === 'searchbox') return false;

        const type = element.getAttribute('type');
        if (type === 'search' || type === 'email' || type === 'password' || type === 'number') return false;

        // Check placeholder/aria-label for search keywords
        const placeholder = element.getAttribute('placeholder')?.toLowerCase() || '';
        const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
        const searchKeywords = ['search', 'find', '検索'];
        if (searchKeywords.some(k => placeholder.includes(k) || ariaLabel.includes(k))) {
            return false;
        }
    }

    // 5. Detection Logic

    // <textarea>
    if (element.tagName === 'TEXTAREA') {
        const textarea = element as HTMLTextAreaElement;
        // Google Meet specific check
        if (textarea.id === 'bfTqV' || textarea.classList.contains('qdOxv-fmcmS-wGMbrd')) {
            return true;
        }

        if (textarea.rows >= 2) return true;
        // Check computed style height if needed, but rows is usually sufficient for initial check.
        // Accessing computed style can be expensive, so we might want to defer or cache it.
        // For now, let's assume rows check is primary.
        if (element.clientHeight >= 40) return true;
        return false;
    }

    // contenteditable
    if (element instanceof HTMLElement && element.isContentEditable) {
        // Check specific classes/ids/aria-labels
        const id = element.id.toLowerCase();
        const className = element.className.toLowerCase();
        const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
        const keywords = ['chat', 'message', 'input', 'prompt', 'comment', 'editor', 'prosemirror', 'body']; // 'body' for some editors

        if (keywords.some(k => id.includes(k) || className.includes(k) || ariaLabel.includes(k))) {
            return true;
        }

        // Google Chat specific check
        if (element.getAttribute('g_editable') === 'true') {
            return true;
        }

        // Check ARIA
        const role = element.getAttribute('role');
        const ariaMultiline = element.getAttribute('aria-multiline');

        // Relaxed check: role="textbox" is usually enough if it's contenteditable and not explicitly a search box (checked above)
        if (role === 'textbox') {
            return true;
        }

        if (ariaMultiline === 'true') {
            return true;
        }

        // If forceOn, be more aggressive
        if (config?.mode === 'forceOn') {
            return true;
        }
    }

    return false;
}
