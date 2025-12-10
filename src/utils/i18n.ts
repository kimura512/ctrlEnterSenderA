/**
 * Chrome i18n helper functions
 */

export function getMessage(messageName: string, substitutions?: string | string[]): string {
    return chrome.i18n.getMessage(messageName, substitutions);
}

export function getUILanguage(): string {
    return chrome.i18n.getUILanguage();
}

export function isJapanese(): boolean {
    const lang = getUILanguage();
    return lang.startsWith('ja');
}

