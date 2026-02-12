# Claude.ai Fix Report (v1.2.1)

## 1. Task List

- [x] **Fix Ctrl+Enter on Claude.ai**
  - [x] Analyze HTML structure (TipTap/ProseMirror)
  - [x] Fix detection logic (support `<p>` tag target via `.closest()`)
  - [x] **Fix Event Listener Priority** (Change `document` to `window` for capture phase)
  - [x] Modify `src/content/handler.ts` to dispatch `mousedown`/`mouseup`
  - [x] Verify fix with user
- [x] **Add Help Button to Popup**
  - [x] Add button to `src/popup/App.tsx`
  - [x] Add styles to `src/popup/index.css`
- [x] **Finalize**
  - [x] Build project
  - [x] Clean up debug logs
  - [x] Update documentation

## 2. Implementation Details

### Claude.ai Fix (Critical)

The primary issue was that Claude.ai's event listeners were firing _before_ our extension's listeners, causing `stopImmediatePropagation()` to fail.

**Root Cause:**

1.  **Target Detection**: Claude.ai uses a TipTap editor where the click target is often a `<p>` tag inside the editor div. Our initial detector only checked for the wrapper class.
    - _Fix_: Updated `detector.ts` to use `.closest('.tiptap.ProseMirror')`.
2.  **Event Priority**: Claude.ai registers its own `keydown` listeners on `document` (or higher) very early. Since our content script runs at `document_end`, our `document.addEventListener` was registered _after_ Claude's, meaning their listener fired first even in the capture phase (for same-element listeners).
    - _Fix_: Changed our capture phase listener to attach to **`window`** instead of `document`.
    - _Why_: The capture phase propagates from `window` -> `document` -> `html` -> ... -> target. By attaching to `window`, we guarantee our listener fires before any listener on `document` or specific elements.

### Help Button

Added a simple "?" button to the popup header to allow users to re-open the onboarding tutorial.

## 3. Walkthrough & Verification

### Verification Steps

1.  **Claude.ai**:
    - Type text in the chat input.
    - Press **Enter**: Should insert a newline (NOT send).
    - Press **Shift+Enter**: Should insert a newline.
    - Press **Ctrl+Enter**: Should send the message.
2.  **Popup**:
    - Click the extension icon.
    - Verify no extra scrollbars appear.
    - Click the "?" button in the top right.
    - Verify the onboarding tutorial (Slide 1/3) opens.

### Files Changed

- `src/content/index.ts`: Changed capture listener to `window`.
- `src/content/detector.ts`: Improved TipTap/ProseMirror detection.
- `src/content/handler.ts`: Added `mousedown`/`mouseup` simulation for Claude.ai send button.
- `src/popup/App.tsx`, `src/popup/index.css`: Added help button and fixed scrollbars.
