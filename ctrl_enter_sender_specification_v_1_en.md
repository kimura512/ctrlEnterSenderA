# Ctrl+Enter Sender Specification (v1)

## 1. Overview

### 1.1 Purpose

Enable consistent key bindings for text input (chat, comments, etc.) in browsers:

- Enter: Insert newline
- Ctrl+Enter (Cmd+Enter on macOS): Send message

This aims to prevent accidental or unintended message sending across:

- Slack, Discord, ChatGPT, Notion, various web chat services, etc.
- When using Japanese IME and other IMEs

### 1.2 Non-Goals

- 100% perfect behavior on all sites and all input fields.
- Key binding control outside browsers (native apps, VSCode, etc.).
- Saving, analyzing, or transmitting input content (text).


## 2. Scope

### 2.1 Target Input Elements

Elements that meet the following conditions are considered "multi-line text input areas (multi-line editors)" and are targeted by the extension:

- `<textarea>`
  - `rows` >= 2, or
  - CSS height >= threshold (e.g., 40px or more)
- Elements with `contenteditable="true"`
  - `class` or `id` contains any of the following (keyword examples):
    - `chat`, `message`, `input`, `prompt`, `comment`, `editor`, `ProseMirror`
  - Or ARIA attribute-based matches:
    - `role="textbox"` and `aria-multiline="true"`

### 2. Default Excluded Input Elements

The following are excluded by default (no intervention):

- All `<input>` elements
  - `type="text"`, `search`, `email`, `password`, `number`, etc.
- Login forms (ID/password, etc.)
- Search boxes (Google search, site search, etc.)
  - `type="search"`
  - `role="searchbox"`
  - `placeholder` / `aria-label` contains strings suggesting search
    - Examples: `"検索"`, `"search"`, `"find"`
- Single-line input forms (name, amount, email address, etc.)

Site-specific settings can override these default judgments (described later).


## 3. Key Handling Specification

### 3.1 Prerequisites

- Events are handled by registering `keydown` listeners on `document` or target elements via `content script`.
- IME input state is determined by:
  - `KeyboardEvent.isComposing === true`
  - Or `KeyboardEvent.keyCode === 229` (fallback for some browsers/IMEs)

### 3.2 Enter During IME Input

- Condition
  - `event.isComposing === true` or `keyCode === 229`
- Behavior
  - The extension does not intervene at all; delegates to the site's/browser's default behavior.

### 3.3 Plain Enter (Newline)

- Target
  - When the focused element is determined to be a "multi-line text input area"
- Condition
  - `event.key === 'Enter'`
  - `event.shiftKey === false`
  - `event.ctrlKey === false`
  - `event.metaKey === false`
  - Not during IME input
- Behavior
  - Call `event.preventDefault()` to cancel the original "send" behavior.
  - Insert a newline.
    - For `contenteditable`:
      - Use `document.execCommand('insertLineBreak')` if possible
      - Since it's deprecated, leave room for future migration to Selection/Range API insertion
    - For `<textarea>`:
      - Manually insert `"\n"` at the current caret position (update value manually)

### 3.4 Ctrl+Enter / Cmd+Enter (Send)

- Target
  - When the focused element is determined to be a "multi-line text input area"
- Condition
  - Windows / Linux: `event.ctrlKey === true && event.key === 'Enter'`
  - macOS: `event.metaKey === true && event.key === 'Enter'`
  - Not during IME input
- Behavior
  - Cancel newline insertion and other behaviors with `event.preventDefault()`.
  - Mimic and execute the site's "send" action.
  - Implementation priority:
    1. Search for the nearest `<form>` element from the focused element and call `form.requestSubmit()` or `form.submit()`.
    2. Search for nearby "send button" and call `click()`.
       - Candidate selectors:
         - `button[type="submit"]`
         - `button[aria-label*="送信"]`
         - `[data-testid*="send"]`
       - Allow custom selectors to be added via site-specific settings.
    3. If none found, as a last resort, dispatch a `KeyboardEvent` similar to the original Enter send.

### 3.5 Shift+Enter

- Condition
  - `event.shiftKey === true && event.key === 'Enter'`
- Behavior
  - Respect existing behavior (almost all chat services use "newline") and do not intervene from the extension side.


## 4. Target Editor Detection Logic

### 4.1 Detection Function (Concept)

```ts
function isMultiLineEditable(el: Element, config: DomainConfig): boolean
```

`DomainConfig` is site-specific settings (described later), and performs detection considering custom targets/exclusion rules as follows.

### 4.2 True Conditions

- Elements matching CSS selectors in `config.customTargets`
- Otherwise, elements satisfying any of:
  - `<textarea>` and
    - `rows >= 2` or
    - Height after layout calculation >= threshold
  - Elements with `contenteditable="true"` and
    - `className` or `id` contains any of:
      - `chat`, `message`, `input`, `prompt`, `comment`, `editor`, `ProseMirror`
    - Or `role="textbox"` and `aria-multiline="true"`

### 4.3 False Conditions

- Elements matching CSS selectors in `config.customExcludes`
- `<input>` elements
- `type="search"` / `role="searchbox"`
- Elements with `placeholder` / `aria-label` containing strings suggesting search
  - Examples: `"検索"`, `"search"`, `"find"`

When site-specific settings have `mode: 'forceOn'`, relax true conditions; when `forceOff`, always return false.


## 5. Site-Specific Settings

### 5.1 DomainConfig Type

```ts
type DomainMode = 'default' | 'forceOn' | 'forceOff';

type DomainConfig = {
  enabled: boolean;            // Whether to use the extension on this domain
  mode: DomainMode;            // Detection mode
  customTargets?: string[];    // Additional CSS selectors to target
  customExcludes?: string[];   // CSS selectors to exclude from targets
};
```

- `default`:
  - Follows the detection logic defined in this specification.
- `forceOn`:
  - Aggressively targets multi-line text inputs, even if somewhat uncertain.
- `forceOff`:
  - Performs no key handling on this domain at all.

### 5.2 Storage

- Use `chrome.storage.sync` to enable synchronization of settings per domain.
- Storage format:

```ts
// key: origin (e.g., "https://chat.openai.com")

interface StorageSchema {
  domains: {
    [origin: string]: DomainConfig;
  };
  // Add common global settings here if needed (e.g., customization of send shortcut)
}
```


## 6. UI Specification

### 6.1 Browser Action (Popup)

- Display content (simplified version)
  - Current domain / origin
  - Enable / disable toggle (`enabled` switch)
  - Mode selection
    - Radio buttons or select box for `default / forceOn / forceOff`
  - "Open Advanced Settings" button (opens options page)

### 6.2 Options Page

- Structure:
  1. Global settings
     - Start minimal this time (expand as needed in the future)
  2. Domain-specific settings list
     - Domain (origin)
     - Enabled / disabled
     - Mode
     - Edit button (to modal or detailed edit screen)
  3. Domain settings detailed edit
     - customTargets (multi-line text, comma-separated or one selector per line)
     - customExcludes
  4. Settings export / import (future expansion)

- UI implementation uses React + TypeScript.


## 7. Technology Stack

### 7.1 Overall

- Chrome Extension: Manifest V3
- Language: TypeScript
- Bundler: Vite
- UI Library: React
- Code Quality:
  - ESLint
  - Prettier

### 7.2 Structure

- `manifest.json` (V3)
  - `background.service_worker`: Written in TypeScript, output as JS on build
  - `content_scripts`: TypeScript
  - `action.default_popup`: Popup implemented in React
  - `options_page`: Options page implemented in React

- Directory structure:

```text
src/
  content/
    index.ts        // content script entry
    handler.ts      // key handling logic
    detector.ts     // isMultiLineEditable and other detection logic
  background/
    index.ts        // service worker entry
    storage.ts      // chrome.storage access wrapper
  popup/
    main.tsx        // popup entry
    App.tsx
    components/
  options/
    main.tsx        // options page entry
    App.tsx
    components/
  types/
    config.ts       // DomainConfig, StorageSchema, etc.

public/
  manifest.json
  icons/
```


## 8. Development Roadmap

### Phase 1: ChatGPT-Only MVP

- Apply content script with `matches: ["https://chat.openai.com/*"]`.
- For ChatGPT input area
  - `#prompt-textarea.ProseMirror[contenteditable="true"]`
  Force the following:
  - Enter: Newline
  - Ctrl+Enter / Cmd+Enter: Send
- Check ChatGPT's specific "send" behavior and implement dedicated handler if needed.

### Phase 2: Generic Support

- Expand to `matches: ["<all_urls>"]`.
- Introduce automatic detection via `isMultiLineEditable`.
- Test on typical chat services (Slack Web, Discord Web, etc.).
- Use `DomainConfig` with `forceOff` etc. to avoid issues on problematic sites.

### Phase 3: Settings UI

- Enable per-domain settings in browser action popup:
  - Enable / disable
  - Mode switching
- Enable editing in options page:
  - Domain list
  - customTargets / customExcludes

### Phase 4: Improvements & Extensions (Optional)

- Switch to Selection/Range API-based newline insertion logic for better safety and future compatibility.
- Consider Undo and "cancelable for a short time after sending" cautious mode.
- Provide site-specific presets (template settings for Slack / Discord / ChatGPT, etc.).


