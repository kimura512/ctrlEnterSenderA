# Ctrl+Enter Sender Code Explanation

## 📋 Table of Contents
1. [Overall Architecture](#overall-architecture)
2. [Extension Startup Flow](#extension-startup-flow)
3. [Key Event Processing Flow](#key-event-processing-flow)
4. [Editable Element Detection Logic](#editable-element-detection-logic)
5. [Key Input Handling Details](#key-input-handling-details)
6. [Configuration Management System](#configuration-management-system)
7. [UI Components](#ui-components)

---

## Overall Architecture

### Diagram: Overall System Structure

```mermaid
graph TB
    Browser[Chrome Browser]
    
    subgraph WebPage["Web Page (any site)"]
        InputField["[input field]<br/>TEXTAREA or<br/>contenteditable"]
    end
    
    subgraph Extension["Extension"]
        ContentScript["Content Script<br/>(content/)<br/>• detector.ts<br/>• handler.ts<br/>• index.ts"]
        Background["Background<br/>Service Worker<br/>(background/)<br/>• index.ts<br/>• storage.ts"]
        PopupUI["Popup UI<br/>(popup/)<br/>current site settings"]
        OptionsPage["Options Page<br/>(options/)<br/>all domains settings"]
    end
    
    Storage[Chrome Storage<br/>(config data)]
    
    ContentScript -.monitor.-> InputField
    ContentScript --> Background
    Background -->|chrome.storage.sync| Storage
    PopupUI -->|setDomainConfig| Storage
    OptionsPage -->|setDomainConfig| Storage
    Storage -->|getDomainConfig| ContentScript
    Storage -->|getDomainConfig| Background
```

### Concept Explanation

This extension adopts a standard 3-layer structure for Chrome extensions:

1. **Content Script Layer** (`src/content/`)
   - Injected into each web page, monitors input fields on the page
   - Captures key events and controls Ctrl+Enter/Enter behavior

2. **Background Layer** (`src/background/`)
   - Runs as a Service Worker
   - Handles storage management and configuration persistence

3. **UI Layer** (`src/popup/`, `src/options/`)
   - Interface for users to change settings

### Related Code

```1:31:manifest.json
{
    "manifest_version": 3,
    "name": "Ctrl+Enter Sender",
    "version": "1.0.2",
    "description": "Send messages with Ctrl+Enter and insert newlines with Enter on various websites.",
    "permissions": [
        "storage"
    ],
    "host_permissions": [
        "<all_urls>"
    ],
    "action": {
        "default_popup": "src/popup/index.html"
    },
    "options_page": "src/options/index.html",
    "background": {
        "service_worker": "src/background/index.ts",
        "type": "module"
    },
    "content_scripts": [
        {
            "matches": [
                "<all_urls>"
            ],
            "js": [
                "src/content/index.ts"
            ],
            "run_at": "document_end"
        }
    ]
}
```

---

## Extension Startup Flow

### Diagram: Initialization Sequence

```mermaid
sequenceDiagram
    participant Chrome as Chrome Browser
    participant Manifest as manifest.json
    participant BG as Background Service Worker
    participant Page as Web Page
    participant CS as Content Script
    participant Storage as Chrome Storage
    
    Note over Chrome,Storage: Extension Installation
    Chrome->>Manifest: 1. Load manifest.json
    Manifest->>BG: 2. Start Background
    BG->>BG: Execute background/index.ts
    BG->>BG: Register onInstalled listener
    
    Note over Chrome,Storage: Page Load
    Chrome->>Page: 1. Page loads
    Page->>CS: 2. Inject Content Script<br/>(document_end)
    CS->>CS: Execute content/index.ts
    CS->>Storage: 3. getDomainConfig()
    Storage-->>CS: Return config
    CS->>CS: 4. Register chrome.storage.onChanged<br/>listener
    CS->>CS: 5. attachListeners(document)
    CS->>CS: Capture Phase Listener
    CS->>CS: Bubble Phase Listener
    CS->>CS: 6. Start MutationObserver<br/>iframe monitoring
```

### Concept Explanation

The extension initializes at two timings:

1. **Installation**: Background Service Worker starts and performs basic setup
2. **Page Load**: Content Script is injected into each page, loads page-specific settings, and registers event listeners

A key point is that the Content Script monitors key events in both **Capture Phase** and **Bubble Phase**. This design ensures event capture because different sites handle Enter key events at different timings.

### Related Code

```1:23:src/content/index.ts
import { isMultiLineEditable } from './detector';
import { handleKeyDown } from './handler';
import { getDomainConfig } from '../background/storage';
import { DomainConfig } from '../types';

let currentConfig: DomainConfig | null = null;
const origin = window.location.origin;

// Initial config load
getDomainConfig(origin).then(config => {
    currentConfig = config;
    console.log('Ctrl+Enter Sender: Config loaded', config);
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes['ctrl_enter_sender_config']) {
        getDomainConfig(origin).then(config => {
            currentConfig = config;
            console.log('Ctrl+Enter Sender: Config updated', config);
        });
    }
});
```

```111:153:src/content/index.ts
// Attach to main document
attachListeners(document);

// Handle iframes (like Google Chat)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLIFrameElement) {
                try {
                    // Try to access iframe document (only works for same-origin)
                    const iframeDoc = node.contentDocument;
                    if (iframeDoc) {
                        attachListeners(iframeDoc);
                    } else {
                        // Wait for load
                        node.addEventListener('load', () => {
                            const loadedDoc = node.contentDocument;
                            if (loadedDoc) {
                                attachListeners(loadedDoc);
                            }
                        });
                    }
                } catch (e) {
                    // Cross-origin iframe, can't access
                }
            }
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// Also check existing iframes
document.querySelectorAll('iframe').forEach(iframe => {
    try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
            attachListeners(iframeDoc);
        }
    } catch (e) {
        // Cross-origin
    }
});
```

---

## Key Event Processing Flow

### Diagram: Overall Key Input Processing Flow

```mermaid
flowchart TD
    Start[User presses key] --> Capture[Capture Phase Listener<br/>content/index.ts:31]
    
    Capture --> Check1{event.isTrusted?}
    Check1 -->|NO| End1[Exit]
    Check1 -->|YES| Check2{currentConfig.enabled?}
    Check2 -->|NO| End2[Exit]
    Check2 -->|YES| Check3{isMultiLineEditable?}
    Check3 -->|NO| End3[Exit]
    Check3 -->|YES| AppType{App type determination}
    
    AppType -->|Complex App<br/>Discord/Teams/Slack/ChatGPT| ComplexHandle[Ctrl+Enter or Enter<br/>→ handler]
    AppType -->|Standard App| StandardEnter[Enter → handler<br/>Ctrl+Enter handled in Bubble]
    
    ComplexHandle --> Handler
    StandardEnter --> Bubble[Bubble Phase Listener<br/>content/index.ts:74]
    
    Bubble --> BubbleCheck{Standard App AND<br/>Ctrl+Enter AND<br/>!defaultPrevented?}
    BubbleCheck -->|YES| Handler
    BubbleCheck -->|NO| End4[Exit]
    
    Handler[handleKeyDown<br/>content/handler.ts:3] --> IME{IME input active?}
    IME -->|YES| End5[Exit]
    IME -->|NO| HandlerType{App type specific processing}
    
    HandlerType -->|Complex App| ComplexAction{Ctrl+Enter?}
    ComplexAction -->|YES| SimEnter[Simulate Enter event]
    ComplexAction -->|NO| SimShiftEnter[Simulate Shift+Enter]
    
    HandlerType -->|Standard App| StandardAction{Ctrl+Enter?}
    StandardAction -->|YES| TriggerSend[triggerSend]
    StandardAction -->|NO| InsertNewline[insertNewline]
```

### Concept Explanation

Key event processing occurs in **two event phases**:

1. **Capture Phase**
   - Phase where events propagate from top to bottom of the DOM tree
   - Executes before site event handlers
   - For Complex Apps (Discord, Teams, Slack, ChatGPT), both Ctrl+Enter and Enter are handled here
   - For Standard Apps, only Enter is handled here (to prevent default send behavior)

2. **Bubble Phase**
   - Phase where events propagate from bottom to top of the DOM tree
   - For Standard Apps, Ctrl+Enter is only handled here if the site didn't handle it
   - Checks `event.defaultPrevented` to avoid interfering if the site already handled it

This design allows adaptation to various site behavior patterns.

### Related Code

```25:71:src/content/index.ts
function attachListeners(doc: Document) {
    console.log('Ctrl+Enter Sender: Attaching listeners to', doc);
    // Unified Keydown Listener (Capture Phase)
    // We use Capture phase for:
    // 1. Plain Enter on ALL sites (to prevent default newline)
    // 2. Ctrl+Enter on Complex Apps (Slack, Discord, Teams) to ensure we intercept before they do.
    doc.addEventListener('keydown', (event) => {
        if (!event.isTrusted) return;
        if (!currentConfig || !currentConfig.enabled) return;

        const target = event.target as HTMLElement;
        const hostname = window.location.hostname;
        const isSlack = hostname.includes('slack.com');

        // Check if target is editable
        if (!isMultiLineEditable(target, currentConfig)) {
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isSendKey = isMac
            ? event.metaKey && event.key === 'Enter'
            : event.ctrlKey && event.key === 'Enter';
        const isPlainEnter = event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

        const isDiscord = hostname.includes('discord.com');
        const isTeams = hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com');
        const isChatGPT = hostname.includes('chatgpt.com') || hostname.includes('openai.com');
        const isComplexApp = isDiscord || isTeams || isSlack || isChatGPT;

        // CASE 1: Complex Apps (Slack, Discord, Teams)
        // Handle BOTH Enter and Ctrl+Enter in Capture phase
        if (isComplexApp) {
            if (isSendKey || isPlainEnter) {
                handleKeyDown(event, target, currentConfig);
            }
            return;
        }

        // CASE 2: Standard Apps
        // Handle Plain Enter in Capture phase (to prevent default newline)
        if (isPlainEnter) {
            handleKeyDown(event, target, currentConfig);
        }

        // Ctrl+Enter for standard apps is handled in Bubble phase (see below)
    }, true);
```

```73:108:src/content/index.ts
    // Bubble Phase Listener (for Standard Apps Ctrl+Enter)
    doc.addEventListener('keydown', (event) => {
        if (!event.isTrusted) return;
        if (!currentConfig || !currentConfig.enabled) return;

        const target = event.target as HTMLElement;
        const hostname = window.location.hostname;

        // Check if target is editable
        if (!isMultiLineEditable(target, currentConfig)) {
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isSendKey = isMac
            ? event.metaKey && event.key === 'Enter'
            : event.ctrlKey && event.key === 'Enter';

        const isDiscord = hostname.includes('discord.com');
        const isTeams = hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com');
        const isSlack = hostname.includes('slack.com');
        const isChatGPT = hostname.includes('chatgpt.com') || hostname.includes('openai.com');
        const isComplexApp = isDiscord || isTeams || isSlack || isChatGPT;

        // Complex apps are fully handled in Capture phase, so ignore them here.
        if (isComplexApp) return;

        // Handle Ctrl+Enter for Standard Apps
        // We wait for the site to handle it. If they didn't (defaultPrevented is false), we trigger send.
        if (isSendKey) {
            // If the site already handled it (e.g. Gmail), don't interfere.
            if (event.defaultPrevented) return;

            handleKeyDown(event, target, currentConfig);
        }
    }, false);
```

---

## Editable Element Detection Logic

### Diagram: Detection Decision Flowchart

```mermaid
flowchart TD
    Start[isMultiLineEditable call] --> BlockSite{docs.google.com?}
    BlockSite -->|YES| ReturnFalse1[return false]
    BlockSite -->|NO| CustomExcludes{element.matches<br/>customExcludes?}
    
    CustomExcludes -->|YES| ReturnFalse2[return false]
    CustomExcludes -->|NO| CustomTargets{element.matches<br/>customTargets?}
    
    CustomTargets -->|YES| ReturnTrue1[return true]
    CustomTargets -->|NO| ForceOff{config.mode ===<br/>forceOff?}
    
    ForceOff -->|YES| ReturnFalse3[return false]
    ForceOff -->|NO| ForceOn{Not forceOn mode}
    
    ForceOn -->|INPUT element| ReturnFalse4[return false]
    ForceOn -->|role=searchbox| ReturnFalse5[return false]
    ForceOn -->|aria-multiline=false| ReturnFalse6[return false]
    ForceOn -->|Otherwise| SiteSpecific{Site-specific detection}
    
    SiteSpecific -->|Slack: .ql-editor| ReturnTrue2[return true]
    SiteSpecific -->|Google Meet: id/class| ReturnTrue3[return true]
    SiteSpecific -->|Google Chat: g_editable| ReturnTrue4[return true]
    SiteSpecific -->|No match| Generic{TEXTAREA element?}
    
    Generic -->|YES| ReturnTrue5[return true]
    Generic -->|NO| ContentEditable{contenteditable element?}
    
    ContentEditable -->|role=textbox| ReturnTrue6[return true]
    ContentEditable -->|Keyword match| ReturnTrue7[return true]
    ContentEditable -->|No match| ReturnFalse7[return false]
```

### Concept Explanation

The `isMultiLineEditable()` function checks in **priority order**:

1. **Highest Priority**: User settings (customExcludes, customTargets, forceOff)
2. **Next Priority**: Site-specific detection logic (Slack, Google Meet, Google Chat, etc.)
3. **Generic Detection**: TEXTAREA elements and contenteditable elements with keyword matching

This order ensures that explicit user settings are respected, and automatic detection is attempted otherwise.

### Related Code

```3:99:src/content/detector.ts
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
```

---

## Key Input Handling Details

### Diagram: handleKeyDown() Processing Branches

```mermaid
flowchart TD
    Start[handleKeyDown call] --> IME{IME input active?<br/>isComposing || keyCode===229}
    IME -->|YES| End1[return Do not process]
    IME -->|NO| KeyType{Key type determination}
    
    KeyType -->|isSendKey<br/>Ctrl+Enter/Cmd+Enter| SendKey
    KeyType -->|isPlainEnter<br/>Plain Enter| PlainEnter
    
    SendKey --> AppType1{App type determination}
    PlainEnter --> AppType2{App type determination}
    
    AppType1 -->|Complex App<br/>Discord/Teams| ComplexCtrl[Ctrl+Enter processing]
    AppType1 -->|Standard App<br/>Slack/ChatGPT/Others| StandardCtrl[Ctrl+Enter processing]
    
    AppType2 -->|Complex App| ComplexEnter[Enter processing]
    AppType2 -->|Standard App| StandardEnter[Enter processing]
    
    ComplexCtrl --> Prevent1[preventDefault<br/>stopImmediatePropagation]
    Prevent1 --> SimEnter[Simulate Enter event<br/>keydown/keypress/keyup]
    
    ComplexEnter --> Prevent2[preventDefault<br/>stopImmediatePropagation]
    Prevent2 --> InsertNewline1[insertNewline]
    InsertNewline1 --> SimShiftEnter[Simulate Shift+Enter]
    
    StandardCtrl --> Prevent3[preventDefault<br/>stopImmediatePropagation]
    Prevent3 --> TriggerSend[triggerSend]
    TriggerSend --> SlackCheck{Slack?}
    SlackCheck -->|YES| SlackButton[Slack-specific processing<br/>Button search]
    SlackCheck -->|NO| FormCheck{form element?}
    FormCheck -->|YES| FormSubmit[form.requestSubmit]
    FormCheck -->|NO| ButtonSearch[Send button search<br/>Multiple selectors]
    ButtonSearch -->|Not found| FallbackEnter[Dispatch Enter event<br/>Fallback]
    
    StandardEnter --> Prevent4[preventDefault<br/>stopImmediatePropagation]
    Prevent4 --> InsertNewline2[insertNewline]
    InsertNewline2 --> ElementType{TEXTAREA?}
    ElementType -->|YES| SetRangeText[setRangeText'\n']
    ElementType -->|NO| ContentEditable{contenteditable?}
    ContentEditable -->|Complex App| SimShiftEnter2[Simulate Shift+Enter]
    ContentEditable -->|Standard App| ExecCommand[execCommand'insertText']
    ExecCommand -->|Failed| RangeOp[Range operation<br/>Fallback]
```

### Concept Explanation

The `handleKeyDown()` function takes different strategies depending on application type:

1. **Complex App (Discord, Teams)**
   - These apps have standard behavior: Enter sends, Shift+Enter inserts newline
   - To send with Ctrl+Enter: Simulate Enter event to trigger the app's send action
   - To insert newline with Enter: Simulate Shift+Enter event

2. **Standard App (Slack, ChatGPT, Others)**
   - Searches for send button and clicks it, or attempts form submission
   - Slack has a special DOM structure, so it has dedicated search logic

3. **Newline Insertion**
   - TEXTAREA elements: Uses `setRangeText()` (supports Undo/Redo)
   - contenteditable elements: Uses `execCommand('insertText')` (deprecated but for compatibility)

### Related Code

```3:75:src/content/handler.ts
export function handleKeyDown(event: KeyboardEvent, target: HTMLElement, _config?: DomainConfig) {
    // 1. IME Check
    if (event.isComposing || event.keyCode === 229) {
        return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isSendKey = isMac
        ? event.metaKey && event.key === 'Enter'
        : event.ctrlKey && event.key === 'Enter';

    const isPlainEnter = event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

    // Check if we're on Discord or Teams
    const isDiscord = window.location.hostname.includes('discord.com');
    const isTeams = window.location.hostname.includes('teams.microsoft.com') || window.location.hostname.includes('teams.live.com');
    // Slack and ChatGPT are handled via triggerSend (button click)
    const isComplexApp = isDiscord || isTeams;

    // Special handling for Complex Apps (Discord, Teams)
    if (isComplexApp) {
        if (isSendKey) {
            // Ctrl+Enter on Complex Apps: Trigger Send
            // These apps usually send on Enter.
            // We simulate a plain Enter keypress to trigger their send action.
            event.preventDefault();
            event.stopImmediatePropagation();

            const events = ['keydown', 'keypress', 'keyup'];
            events.forEach(eventType => {
                const newEvent = new KeyboardEvent(eventType, {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                target.dispatchEvent(newEvent);
            });
            return;
        }

        if (isPlainEnter) {
            // Plain Enter: simulate Shift+Enter (newline)
            // These apps natively handle Shift+Enter to insert a newline.
            event.preventDefault();
            event.stopImmediatePropagation();
            insertNewline(target);
            return;
        }
        return;
    }

    // Non-Complex sites (Slack, ChatGPT, Standard Apps)
    if (isSendKey) {
        // If we reached here in Bubble phase and defaultPrevented is false (checked in index.ts),
        // it means the site didn't handle Ctrl+Enter. We should trigger send.
        event.preventDefault();
        event.stopImmediatePropagation();
        triggerSend(target);
        return;
    }

    if (isPlainEnter) {
        // We want to stop the default send behavior and insert a newline.
        event.preventDefault();
        event.stopImmediatePropagation();
        insertNewline(target);
        return;
    }
}
```

```135:265:src/content/handler.ts
function triggerSend(target: HTMLElement) {
    // Special handling for Slack
    const isSlack = window.location.hostname.includes('slack.com');
    if (isSlack) {
        // Slack's DOM structure is complex. The input (.ql-editor) is deep inside.
        // The send button (button[data-qa="texty_send_button"]) is usually in a toolbar or footer relative to the editor.

        // Strategy 1: Find the main editor container and search within it.
        // Known containers: .c-texty_input_unstyled__container, .c-message_kit__editor
        let container = target.closest('.c-texty_input_unstyled__container') ||
            target.closest('.c-message_kit__editor') ||
            target.closest('[data-qa="message_editor"]');

        if (container) {
            // Sometimes the button is a sibling of the container's parent, or inside the container.
            // Let's search inside first.
            let sendButton = container.querySelector('button[data-qa="texty_send_button"]');

            // If not found inside, check the parent (often the button is in a footer sibling)
            if (!sendButton && container.parentElement) {
                sendButton = container.parentElement.querySelector('button[data-qa="texty_send_button"]');
            }

            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
        }

        // Strategy 2: Traverse up manually a few levels
        let current = target.parentElement;
        for (let i = 0; i < 10 && current; i++) {
            const sendButton = current.querySelector('button[data-qa="texty_send_button"]');
            if (sendButton instanceof HTMLElement) {
                sendButton.click();
                return;
            }
            current = current.parentElement;
        }
    }

    // 1. Try form submission
    const form = target.closest('form');
    if (form) {
        // Try requestSubmit first (triggers validation and submit event)
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
            return;
        }
        // Fallback to submit() (skips validation/event listeners sometimes, use with caution)
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
        'div[role="button"][aria-label*="Send"]', // Common in modern apps
        'div[role="button"][class*="send"]',
        'button[title*="Send"]',
        'button[title*="送信"]',
        // Slack
        'button[data-qa="texty_send_button"]',
        'button[aria-label="Send now"]',
        // Google Chat / Meet
        'div[role="button"][aria-label="Send message"]',
        'div[role="button"][aria-label="メッセージを送信"]',
        'button[aria-label="メッセージを送信"]', // Meet specific
        'button[jsname="SoqoBf"]', // Meet specific jsname
        // Messenger
        'div[aria-label="Press Enter to send"]',
        'div[aria-label="Send"]'
    ];
    let container = target.parentElement;
    let button: Element | null = null;

    // Traverse up a few levels to find a container that might hold the button
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
        // Fallback: Dispatch a "real" Enter key event.
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            view: window
        });
        target.dispatchEvent(enterEvent);

        // Also dispatch keypress/keyup for completeness
        const keypressEvent = new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            view: window
        });
        target.dispatchEvent(keypressEvent);

        const keyupEvent = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            view: window
        });
        target.dispatchEvent(keyupEvent);
    }
}
```

---

## Configuration Management System

### Diagram: Configuration Data Flow

```mermaid
graph LR
    Storage[Chrome Storage<br/>chrome.storage.sync<br/><br/>ctrl_enter_sender_config:<br/>domains:<br/>  slack.com: enabled, mode<br/>  discord.com: enabled, mode]
    
    Popup[Popup UI<br/>popup/App.tsx<br/>current site settings]
    Options[Options Page<br/>options/App.tsx<br/>all domains list & edit]
    Content[Content Script<br/>content/<br/>load config<br/>monitor storage changes]
    
    Popup -->|setDomainConfig| Storage
    Options -->|setDomainConfig| Storage
    Storage -->|getDomainConfig| Content
    Storage -->|getDomainConfig| Popup
    Storage -->|getAllConfigs| Options
```

### Concept Explanation

Settings are stored in `chrome.storage.sync` with the following structure:

```typescript
{
  ctrl_enter_sender_config: {
    domains: {
      [origin: string]: DomainConfig
    }
  }
}
```

Each domain has independent settings containing:
- `enabled`: Whether the extension is enabled
- `mode`: Detection mode ('default' | 'forceOn' | 'forceOff')
- `customTargets`: Custom selectors (elements to explicitly target)
- `customExcludes`: Custom exclusion selectors (elements to explicitly exclude)

Content Script monitors storage changes and updates settings in real-time.

### Related Code

```1:33:src/background/storage.ts
import { DomainConfig, StorageSchema } from '../types';

const STORAGE_KEY = 'ctrl_enter_sender_config';

export async function getDomainConfig(origin: string): Promise<DomainConfig> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const config = data[STORAGE_KEY] as StorageSchema | undefined;

    if (config?.domains?.[origin]) {
        return config.domains[origin];
    }

    // Default config
    return {
        enabled: true,
        mode: 'default'
    };
}

export async function setDomainConfig(origin: string, config: DomainConfig): Promise<void> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    const currentSchema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };

    currentSchema.domains[origin] = config;

    await chrome.storage.sync.set({ [STORAGE_KEY]: currentSchema });
}

export async function getAllConfigs(): Promise<StorageSchema> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as StorageSchema) || { domains: {} };
}
```

```1:10:src/types/index.ts
export type DomainMode = 'default' | 'forceOn' | 'forceOff';

export interface DomainConfig {
    enabled: boolean;
    mode: DomainMode;
    customTargets?: string[];
    customExcludes?: string[];
}

export interface StorageSchema {
    domains: {
        [origin: string]: DomainConfig;
    };
}
```

---

## UI Components

### Diagram: UI Component Structure

```mermaid
graph TB
    subgraph Popup["Popup UI (popup/App.tsx)"]
        PopupTitle["Ctrl+Enter Sender"]
        PopupDomain["Current Domain<br/>https://slack.com"]
        PopupToggle["Enable for this site<br/>[Toggle Switch]"]
        PopupMode["Detection Mode<br/>[Default ▼]<br/>Standard detection logic..."]
        PopupFooter["⚙️ Advanced Settings • 🐛 Report Issue"]
    end
    
    subgraph Options["Options Page (options/App.tsx)"]
        OptionsTitle["Ctrl+Enter Sender Settings<br/>🐛 Report Issue"]
        OptionsTable["Configured Domains (3)<br/><br/>Domain | Enabled | Mode | Actions<br/>slack.com | ☑ | Default | Reset<br/>discord.com | ☑ | ForceOn | Reset<br/>teams... | ☐ | Default | Reset"]
    end
    
    PopupTitle --> PopupDomain
    PopupDomain --> PopupToggle
    PopupToggle --> PopupMode
    PopupMode --> PopupFooter
    
    OptionsTitle --> OptionsTable
```

### Concept Explanation

The UI consists of two components:

1. **Popup UI** (`popup/App.tsx`)
   - Displayed when clicking the extension icon
   - Shows and edits domain settings for the currently open tab
   - Allows simple setting changes

2. **Options Page** (`options/App.tsx`)
   - Opened from right-click menu → "Options"
   - Lists all domain settings
   - Allows batch management

Both are implemented in React and use functions from `storage.ts` to read and write settings.

### Related Code

```1:107:src/popup/App.tsx
import React, { useEffect, useState } from 'react';
import { getDomainConfig, setDomainConfig } from '../background/storage';
import { DomainConfig, DomainMode } from '../types';

function App() {
    const [origin, setOrigin] = useState<string>('');
    const [config, setConfig] = useState<DomainConfig | null>(null);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tab = tabs[0];
            if (tab?.url) {
                const url = new URL(tab.url);
                const tabOrigin = url.origin;
                setOrigin(tabOrigin);
                const loadedConfig = await getDomainConfig(tabOrigin);
                setConfig(loadedConfig);
            }
        });
    }, []);

    const handleEnabledChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!config || !origin) return;
        const newConfig = { ...config, enabled: e.target.checked };
        setConfig(newConfig);
        await setDomainConfig(origin, newConfig);
    };

    const handleModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!config || !origin) return;
        const newConfig = { ...config, mode: e.target.value as DomainMode };
        setConfig(newConfig);
        await setDomainConfig(origin, newConfig);
    };

    if (!origin) {
        return <div style={{ padding: '16px' }}>Loading...</div>;
    }

    if (!config) {
        return <div style={{ padding: '16px' }}>Loading config...</div>;
    }

    return (
        <div className="container">
            <div className="header">
                <h2 className="title">Ctrl+Enter Sender</h2>
            </div>

            <div className="card">
                <div className="domain-label">Current Domain</div>
                <div className="domain-value">{origin}</div>
            </div>

            <div className="card row">
                <label htmlFor="enabled-toggle" className="label" style={{ cursor: 'pointer' }}>Enable for this site</label>
                <label className="switch">
                    <input
                        id="enabled-toggle"
                        type="checkbox"
                        checked={config.enabled}
                        onChange={handleEnabledChange}
                    />
                    <span className="slider"></span>
                </label>
            </div>

            <div className="card">
                <label className="label" style={{ display: 'block', marginBottom: '12px' }}>Detection Mode</label>
                <select
                    value={config.mode}
                    onChange={handleModeChange}
                >
                    <option value="default">Default (Auto Detect)</option>
                    <option value="forceOn">Force On (Aggressive)</option>
                    <option value="forceOff">Force Off (Disable)</option>
                </select>
                <div className="description">
                    {config.mode === 'default' && 'Standard detection logic. Works on most sites.'}
                    {config.mode === 'forceOn' && 'Treats almost all inputs as targets. Use if detection fails.'}
                    {config.mode === 'forceOff' && 'Completely disables the extension on this site.'}
                </div>
            </div>

            <div className="footer">
                <button
                    className="link-button"
                    onClick={() => chrome.runtime.openOptionsPage()}
                >
                    <span>⚙️</span> Advanced Settings
                </button>
                <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>•</span>
                <a
                    className="link-button"
                    href="https://github.com/kimura512/ctrlEnterSenderA/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span>🐛</span> Report Issue
                </a>
            </div>
        </div>
    );
}

export default App;
```

```1:109:src/options/App.tsx
import { useEffect, useState } from 'react';
import { getAllConfigs, setDomainConfig } from '../background/storage';
import { StorageSchema, DomainConfig } from '../types';

function App() {
    const [data, setData] = useState<StorageSchema | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const configs = await getAllConfigs();
        setData(configs);
    };

    const handleConfigChange = async (origin: string, newConfig: DomainConfig) => {
        await setDomainConfig(origin, newConfig);
        await loadData();
    };

    if (!data) {
        return <div style={{ padding: '24px' }}>Loading...</div>;
    }

    const domains = Object.keys(data.domains);

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0 }}>Ctrl+Enter Sender Settings</h1>
                <a
                    className="link-button"
                    href="https://github.com/kimura512/ctrlEnterSenderA/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '14px' }}
                >
                    <span>🐛</span> Report Issue
                </a>
            </div>

            <div className="card">
                <div className="card-header">
                    Configured Domains ({domains.length})
                </div>

                {domains.length === 0 ? (
                    <div className="empty-state">
                        No domain configurations saved yet. Visit a site and use the popup to configure.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Enabled</th>
                                <th>Mode</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {domains.map(origin => {
                                const config = data.domains[origin];
                                return (
                                    <tr key={origin}>
                                        <td className="domain-cell">{origin}</td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={config.enabled}
                                                onChange={(e) => handleConfigChange(origin, { ...config, enabled: e.target.checked })}
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={config.mode}
                                                onChange={(e) => handleConfigChange(origin, { ...config, mode: e.target.value as any })}
                                            >
                                                <option value="default">Default</option>
                                                <option value="forceOn">Force On</option>
                                                <option value="forceOff">Force Off</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-reset"
                                                onClick={() => {
                                                    if (confirm(`Are you sure you want to reset settings for ${origin}?`)) {
                                                        handleConfigChange(origin, { enabled: true, mode: 'default' });
                                                    }
                                                }}
                                            >
                                                Reset
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default App;
```

---

## Summary

This extension is a Chrome extension with the following features:

1. **Flexible Event Processing**: Monitors key events in both Capture Phase and Bubble Phase to adapt to various site behavior patterns
2. **Smart Element Detection**: Combines site-specific detection logic with generic detection, prioritizing user settings
3. **Configuration Persistence**: Uses Chrome Storage API to save settings per domain
4. **User-Friendly UI**: Easy setting changes via Popup and Options Page

Each component operates independently while coordinating through storage to achieve unified behavior.


