# サイト対応カテゴリ分類

このドキュメントでは、Ctrl+Enter Senderが対応しているサイトを技術的な特徴に基づいて分類し、それぞれの対応方法を説明します。

---

## 📊 カテゴリ一覧

| カテゴリ | サイト | 特徴 |
|----------|--------|------|
| **A. Standard Apps** | Gmail, ほとんどのサイト | 汎用ロジックで対応 |
| **B. Complex Apps (Enter=送信系)** | Discord, Teams, Grok, Claude.ai | Enter で送信、特殊処理必要 |
| **C. Complex Apps (ボタンクリック系)** | Slack, ChatGPT | ボタンクリックで送信 |
| **D. Google Apps** | Google Meet, Google Chat | 独自属性を持つ特殊対応 |
| **E. Blocked Sites** | Google Docs | 対応していない（意図的） |

---

## 🅰️ カテゴリA: Standard Apps（汎用対応）

### 対象サイト
- Gmail
- ほとんどの一般的なウェブサイト
- `<textarea>` や `contenteditable` を使用するサイト

### 技術的特徴
- 標準的な `<textarea>` または `contenteditable` 要素を使用
- 送信ボタンが見つけやすい（`button[type="submit"]` など）
- サイト独自のキーボードイベント処理が少ない

### 対応方法
```
イベント処理フェーズ:
├─ Plain Enter → Capture phase で処理（改行挿入）
└─ Ctrl+Enter → Bubble phase で処理（サイトが処理しなければ送信）

改行挿入方法:
├─ <textarea> → setRangeText('\n')
└─ contenteditable → document.execCommand('insertText', false, '\n')

送信方法:
├─ form.requestSubmit() または form.submit()
└─ 汎用送信ボタンセレクタでボタンを検索してクリック
```

### 汎用送信ボタンセレクタ
```typescript
const selectors = [
    'button[type="submit"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="送信"]',
    '[data-testid*="send"]',
    '[data-testid*="submit"]',
    'button[class*="send"]',
    'div[role="button"][aria-label*="送信"]',
    'div[role="button"][aria-label*="Send"]',
    'button[title*="Send"]',
    'button[title*="送信"]',
];
```

### 検出ロジック
```typescript
// キーワードベースで検出
const keywords = ['message', 'chat', 'compose', 'reply', 'comment', 'post', 'write', 'prompt', 'メッセージ', 'チャット', 'コメント'];
// role="textbox" または上記キーワードを含む場合は対象
```

---

## 🅱️ カテゴリB: Complex Apps (Enter=送信系)

### 対象サイト
| サイト | ホスト名 | エディタ種類 |
|--------|----------|--------------|
| Discord | `discord.com` | カスタムエディタ |
| Microsoft Teams | `teams.microsoft.com`, `teams.live.com` | カスタムエディタ |
| Grok | `grok.com` | TipTap (ProseMirror) |
| Claude.ai | `claude.ai` | TipTap (ProseMirror) |

### 技術的特徴
- **デフォルトでEnterが送信**になっている
- Shift+Enterで改行が可能
- サイト側のイベントリスナーが強力で早い段階で処理を奪う

### 対応方法
```
イベント処理フェーズ:
├─ Plain Enter → Capture phase で処理（Shift+Enterシミュレーション）
└─ Ctrl+Enter → Capture phase で処理（Enterシミュレーション）

改行挿入方法:
└─ Shift+Enter キーイベントをシミュレーション

送信方法:
├─ Discord/Teams → Enter キーイベントをシミュレーション
└─ Grok / Claude.ai → 送信ボタンクリック
```

### コード例（送信時のEnterシミュレーション）
```typescript
// Discord/Teams: Ctrl+Enter で Enter をシミュレートして送信
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
```
### Grok / Claude.ai 専用の検出・送信ロジック
```typescript
// 検出: TipTap/ProseMirror エディタ (共通)
if (element.classList.contains('tiptap') && 
    element.classList.contains('ProseMirror') && 
    element.isContentEditable) {
    return true;
}

// 送信 (Grok): aria-label="送信" または "Send" のボタンを検索
const grokButton = container.querySelector('button[type="submit"][aria-label]') ||
    container.querySelector('button[aria-label="送信"]') ||
    container.querySelector('button[aria-label="Send"]');

// 送信 (Claude.ai): aria-label="メッセージを送信" または "Send message"
const claudeButton = container.querySelector('button[aria-label="メッセージを送信"]') ||
    container.querySelector('button[aria-label="Send message"]');
```

---

## 🅲️ カテゴリC: Complex Apps (ボタンクリック系)

### 対象サイト
| サイト | ホスト名 | エディタ種類 |
|--------|----------|--------------|
| Slack | `slack.com` | Quill (.ql-editor) |
| ChatGPT | `chatgpt.com`, `openai.com` | contenteditable |

### 技術的特徴
- **デフォルトでEnterが送信**
- Shift+Enterで改行
- ボタンクリックで送信するのが最も確実
- DOM構造が複雑（ボタンが入力エリアから遠い）

### 対応方法
```
イベント処理フェーズ:
├─ Plain Enter → Capture phase で処理（Shift+Enterシミュレーション）
└─ Ctrl+Enter → Capture phase で処理（送信ボタンクリック）

改行挿入方法:
└─ Shift+Enter キーイベントをシミュレーション

送信方法:
└─ サイト専用の送信ボタンを検索してクリック
```

### Slack専用ロジック
```typescript
// 検出: Quill エディタ
if (element.classList.contains('ql-editor') && element.isContentEditable) {
    return true;
}

// 送信: 複数の戦略でボタンを検索
// Strategy 1: コンテナから検索
let container = target.closest('.c-texty_input_unstyled__container') ||
    target.closest('.c-message_kit__editor') ||
    target.closest('[data-qa="message_editor"]');

let sendButton = container.querySelector('button[data-qa="texty_send_button"]');

// Strategy 2: 親要素をたどる
let current = target.parentElement;
for (let i = 0; i < 10 && current; i++) {
    const sendButton = current.querySelector('button[data-qa="texty_send_button"]');
    if (sendButton) { sendButton.click(); return; }
    current = current.parentElement;
}
```

---

## 🅳️ カテゴリD: Google Apps（独自属性系）

### 対象サイト
| サイト | ホスト名 | 特殊属性 |
|--------|----------|----------|
| Google Meet | `meet.google.com` | `id="bfTqV"`, `className.includes('qdOxv-fmcmS-wGMbrd')` |
| Google Chat | `chat.google.com`, `mail.google.com` | `g_editable="true"` |

### 技術的特徴
- Google独自のカスタム属性を使用
- Google Chat（standalone版）は `chat.google.com`
- Gmail内チャットは `mail.google.com` だが、メール作成画面とドメインを共有
- 入力エリアに `g_editable="true"` を持つ

### 対応方法
```
検出方法:
├─ chat.google.com → 全て対象
└─ mail.google.com → jsname="yrriRe"（チャット入力欄）のみを対象にし、
   Gmail本体のメール作成画面には干渉しないように制御

イベント処理:
└─ mail.google.com では Standard App として動作させる。
   これにより、Gmail本体が持つネイティブな Ctrl+Enter 送信を阻害せず、
   チャット側でCtrl+Enterが効かない場合のみボタンクリックを代行する。
```
送信方法:
└─ 汎用セレクタで送信ボタンを検索
    - 'div[role="button"][aria-label="Send message"]'
    - 'div[role="button"][aria-label="メッセージを送信"]'
    - 'button[aria-label="Send message"]'
    - 'button[jsname="GBTyxb"]' (Google Chat specific)
    - 'button[aria-label="メッセージを送信"]' (Meet specific)
    - 'button[jsname="SoqoBf"]' (Meet specific)
```

### iframe対応
```typescript
// Google Chat などは iframe 内に入力エリアがある
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLIFrameElement) {
                const iframeDoc = node.contentDocument;
                if (iframeDoc) {
                    attachListeners(iframeDoc);
                }
            }
        });
    });
});
```

---

## 🅴️ カテゴリE: Blocked Sites（対応除外）

### 対象サイト
| サイト | ホスト名 | 除外理由 |
|--------|----------|----------|
| Google Docs | `docs.google.com` | Enterの挙動が複雑すぎる（段落作成、リスト操作など） |
| Google Sheets | `docs.google.com` | セル移動などの独自動作 |
| Google Slides | `docs.google.com` | テキストボックス内の挙動が特殊 |

### 技術的理由
```typescript
// Google Docs/Sheets/Slides: Enter behavior is complex and custom.
if (hostname === 'docs.google.com') {
    return false;  // 検出対象外
}
```

---

## 🔧 新しいサイトを追加する際のチェックリスト

### 1. 情報収集
- [ ] 入力エリアのHTML（DevToolsからコピー）
- [ ] 送信ボタンのHTML（DevToolsからコピー）
- [ ] Enter/Shift+Enter/Ctrl+Enterの現在の挙動

### 2. カテゴリ判定
- [ ] EnterでデフォルトSend？ → カテゴリB or C
- [ ] 特殊なエディタ使用？ → カテゴリB, C, D
- [ ] 標準的な構成？ → カテゴリA（修正不要かも）

### 3. 修正ファイル
| ファイル | 修正内容 |
|----------|----------|
| `detector.ts` | サイト固有の入力エリア検出ロジック |
| `index.ts` | `isComplexApp` への追加 |
| `handler.ts` | 改行挿入・送信のサイト固有ロジック |

### 4. テスト項目
- [ ] Enter で改行が入る
- [ ] Ctrl+Enter (Mac: Cmd+Enter) で送信される
- [ ] Shift+Enter で改行が入る（既存動作を壊してない）
- [ ] IME入力中にEnterを押しても送信されない

---

## 📈 対応サイト一覧（2024年12月時点）

| サイト | カテゴリ | 状態 |
|--------|----------|------|
| Gmail | A | ✅ 動作 |
| Discord | B | ✅ 動作 |
| Microsoft Teams | B | ✅ 動作 |
| Grok | B | ✅ 動作 |
| Claude.ai | B | ✅ 動作 |
| Slack | C | ✅ 動作 |
| ChatGPT / OpenAI | C | ✅ 動作 |
| Google Meet | D | ✅ 動作 |
| Google Chat | D | ✅ 動作 |
| Google Docs | E | ❌ 除外 |
| その他一般サイト | A | ✅ 汎用ロジック |
