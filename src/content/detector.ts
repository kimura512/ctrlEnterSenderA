import { DomainConfig } from '../types';

export function isMultiLineEditable(element: Element, config?: DomainConfig): boolean {
    if (!element) return false;

    // 0. Check blocked sites
    const hostname = window.location.hostname;
    const isSlack = hostname.includes('slack.com');

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

        // Exclude single-line text inputs
        const ariaMultiline = element.getAttribute('aria-multiline');
        if (ariaMultiline === 'false') return false;
    }

    // 5. Explicit Slack detection
    if (isSlack) {
        // Slack uses Quill editor with .ql-editor class
        if (element.classList.contains('ql-editor') && (element as HTMLElement).isContentEditable) {
            return true;
        }
    }

    // 6. Explicit Google Meet detection
    const isMeet = hostname.includes('meet.google.com');
    if (isMeet) {
        const id = element.getAttribute('id');
        const className = element.className;
        if (id === 'bfTqV' || className.includes('qdOxv-fmcmS-wGMbrd')) {
            return true;
        }
    }

    // 7. Explicit Google Chat detection
    const isGoogleChat = hostname.includes('chat.google.com') || hostname.includes('mail.google.com');
    if (isGoogleChat) {
        if (element.getAttribute('g_editable') === 'true') {
            return true;
        }
    }

    // 8. Check for TEXTAREA
    if (element.tagName === 'TEXTAREA') {
        return true;
    }

    // 9. Check for contenteditable
    if ((element as HTMLElement).isContentEditable) {
        const role = element.getAttribute('role');
        const ariaLabel = element.getAttribute('aria-label');
        const id = element.getAttribute('id');
        const className = element.className;

        // Keywords that suggest this is a message input
        const keywords = ['message', 'chat', 'compose', 'reply', 'comment', 'post', 'write', 'prompt', 'メッセージ', 'チャット', 'コメント'];
        const hasKeyword = keywords.some(keyword =>
            (ariaLabel && ariaLabel.toLowerCase().includes(keyword.toLowerCase())) ||
            (id && id.toLowerCase().includes(keyword.toLowerCase())) ||
            (className && className.toLowerCase().includes(keyword.toLowerCase()))
        );

        // Accept if role is textbox or if it has message-related keywords
        if (role === 'textbox' || hasKeyword) {
            return true;
        }
    }

    return false;
}
