# v1.3.3 IME確定Enterバグ修正

MacでGemini・Slackなどの日本語IME入力時に、漢字変換確定のEnterが改行として誤処理される不具合を修正する。

## 根本原因

[index.ts](file:///Users/kimura512/dev/ctrlEnterSenderA/src/content/index.ts) のキャプチャフェーズリスナー（L36-78）で、`isPlainEnter` 判定に `event.isComposing` チェックが**一切ない**。

```typescript
// 現在のコード (L49-50)
const isPlainEnter = event.key === 'Enter'
    && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
```

IME変換確定のEnterは `event.isComposing === true` で `event.key === 'Enter'` になるため、`isPlainEnter` が `true` と判定され、`adapter.insertNewline()` が呼ばれて改行が挿入される。

> [!IMPORTANT]
> この問題は**全サイト・全アダプター**に影響する共通ロジックのバグ。Gemini（defaultアダプター使用）もSlack（専用アダプター使用）も同じ `index.ts` のロジックを通る。

## Proposed Changes

### コンテンツスクリプト共通ロジック

#### [MODIFY] [index.ts](file:///Users/kimura512/dev/ctrlEnterSenderA/src/content/index.ts)

**キャプチャフェーズリスナー（L36-78）の先頭**に IME composing ガードを追加:

```diff
     captureTarget.addEventListener('keydown', (evt) => {
         const event = evt as KeyboardEvent;
         if (!event.isTrusted) return;
+        if (event.isComposing || event.keyCode === 229) return;
         if (!currentConfig || !currentConfig.enabled) return;
```

**バブルフェーズリスナー（L84-104）にも**同様のガードを追加:

```diff
     doc.addEventListener('keydown', (event) => {
         if (!event.isTrusted) return;
+        if (event.isComposing || event.keyCode === 229) return;
         if (!currentConfig || !currentConfig.enabled) return;
```

> [!NOTE]
> `keyCode === 229` は古いブラウザ互換のためのフォールバック。`isComposing` が `undefined` のケースや、一部ブラウザ（特にChrome on Mac）で `compositionend` 直後の `keydown` イベントで `isComposing` が正しくセットされないケースに対応する。

---

### バージョンバンプ

#### [MODIFY] [package.json](file:///Users/kimura512/dev/ctrlEnterSenderA/package.json)
#### [MODIFY] [manifest.json](file:///Users/kimura512/dev/ctrlEnterSenderA/manifest.json)

`1.3.2` → `1.3.3`

---

### テスト

#### [NEW] [jest.config.ts](file:///Users/kimura512/dev/ctrlEnterSenderA/jest.config.ts)

Jest + ts-jest でのテスト環境セットアップ。

#### [NEW] [src/content/\_\_tests\_\_/keyhandler.test.ts](file:///Users/kimura512/dev/ctrlEnterSenderA/src/content/__tests__/keyhandler.test.ts)

キーイベント処理のユニットテスト。以下のケースをカバー:

| # | ケース | `isComposing` | `keyCode` | 期待動作 |
|---|--------|--------------|-----------|---------|
| 1 | IME変換中のEnter | `true` | `13` | **何もしない**（イベントスルー） |
| 2 | IME変換中（keyCode=229） | `false` | `229` | **何もしない** |
| 3 | 通常のEnter | `false` | `13` | `insertNewline()` 呼ばれる |
| 4 | Ctrl+Enter（send） | `false` | `13` | `triggerSend()` 呼ばれる |
| 5 | Shift+Enter | `false` | `13` | **何もしない**（既存動作維持） |

## Verification Plan

### Automated Tests

```bash
cd /Users/kimura512/dev/ctrlEnterSenderA
pnpm add -D jest ts-jest @types/jest
pnpm jest --verbose
```

### Manual Verification（ユーザー実施）

1. `pnpm build` でビルド成功を確認
2. Chrome拡張をリロード
3. **Gemini** で日本語入力 → 漢字変換確定Enter → 改行が入らないことを確認
4. **Slack** で同様のテスト
5. 通常のEnter改行・Ctrl+Enter送信が引き続き動作することを確認
