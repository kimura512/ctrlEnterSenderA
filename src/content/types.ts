import { DomainConfig } from '../types';

/**
 * SiteAdapter interface
 * 
 * Each supported site implements this interface to encapsulate ALL site-specific logic.
 * This ensures that changes to one site cannot affect another.
 */
export interface SiteAdapter {
    /** Human-readable name for debugging */
    readonly name: string;

    /** Check if this adapter handles the given hostname */
    matches(hostname: string): boolean;

    /**
     * Where to attach the capture-phase keydown listener.
     * - 'window': fires before document-level listeners (needed for Claude.ai)
     * - 'document': standard capture phase (sufficient for most sites)
     */
    readonly listenerTarget: 'window' | 'document';

    /**
     * Native send behavior of this site.
     * - 'enter': site sends on Enter (Discord, Teams, Grok, Claude)
     * - 'ctrl+enter': site sends on Ctrl+Enter (or doesn't send at all)
     */
    readonly nativeSendKey: 'enter' | 'ctrl+enter';

    /** Check if the event target is an editable area this adapter should handle */
    isEditable(element: Element, config?: DomainConfig): boolean;

    /** Insert a newline at the cursor position */
    insertNewline(target: HTMLElement): void;

    /** Trigger the send action */
    triggerSend(target: HTMLElement): void;
}
