# ホワイトリスト/ブラックリストモード切替機能

Issue #1 と #3 の統合対応。現在の「デフォルトON（ブラックリスト方式）」に加えて、「デフォルトOFF（ホワイトリスト方式）」を選択可能にする。

## User Review Required

> [!IMPORTANT]
> **既存ユーザーへの影響なし**: 既存ユーザーはマイグレーションにより `activationMode: 'blacklist'` が自動設定され、従来通りの動作を維持します。

> [!IMPORTANT]
> **設計方針の確認**: オプションページにモード切替UIを追加します。ポップアップには置きません（シンプルさを維持するため）。モード切替はグローバル設定であり、ドメインごとではありません。この方針で問題ないでしょうか？

> [!WARNING]
> **ホワイトリスト時のデフォルト無効ドメインの扱い**: ホワイトリストモードではそもそも全サイトが「デフォルトOFF」なので、`DEFAULT_DISABLED_DOMAINS` は無視されます。UI上でもホワイトリストモード時は「初期設定済みドメイン」セクションを非表示にします。

## Proposed Changes

### 型定義

#### [MODIFY] [index.ts](file:///home/kimura512/dev/ctrlEnterSenderA/src/types/index.ts)

- `ActivationMode` 型を追加: `'blacklist' | 'whitelist'`
- `StorageSchema` に `activationMode` フィールドを追加

```diff
+export type ActivationMode = 'blacklist' | 'whitelist';
+
 export interface StorageSchema {
+    activationMode?: ActivationMode;  // undefined = 'blacklist'（後方互換性）
     domains: {
         [origin: string]: DomainConfig;
     };
 }
```

---

### ストレージロジック

#### [MODIFY] [storage.ts](file:///home/kimura512/dev/ctrlEnterSenderA/src/background/storage.ts)

- `getActivationMode()` / `setActivationMode()` を追加
- `getDomainConfig()` を修正: ホワイトリスト時はデフォルト `enabled: false` を返す
- `getAllConfigs()` を修正: ホワイトリスト時はデフォルト無効ドメインを挿入しない
- マイグレーションでは `activationMode` を明示的にセットしない（undefined = blacklist で後方互換）

主な変更ロジック:

```typescript
export async function getActivationMode(): Promise<ActivationMode> {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  const config = data[STORAGE_KEY] as StorageSchema | undefined;
  return config?.activationMode || "blacklist";
}

export async function setActivationMode(mode: ActivationMode): Promise<void> {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  const schema = (data[STORAGE_KEY] as StorageSchema) || { domains: {} };
  schema.activationMode = mode;
  await chrome.storage.sync.set({ [STORAGE_KEY]: schema });
}
```

`getDomainConfig()` の変更:

```diff
-    // Default config
-    return {
-        enabled: true
-    };
+    // Default config depends on activation mode
+    const mode = await getActivationMode();
+    if (mode === 'whitelist') {
+        return { enabled: false };
+    }
+    // Check if this is a default disabled domain (blacklist mode only)
+    if (isDefaultDisabledDomain(origin)) {
+        return { enabled: false };
+    }
+    return { enabled: true };
```

> [!NOTE]
> `getDomainConfig` は現在 `async` なのでそのまま `getActivationMode` を呼べます。パフォーマンスの観点では、content script 内では初回ロード時と storage 変更時のみ呼ばれるため問題ありません。

---

### コンテンツスクリプト

#### [MODIFY] [index.ts](file:///home/kimura512/dev/ctrlEnterSenderA/src/content/index.ts)

変更不要。`getDomainConfig` がモードに応じて正しい `enabled` 値を返すため、content script 側の変更は不要です。

---

### ポップアップUI

#### [MODIFY] [App.tsx](file:///home/kimura512/dev/ctrlEnterSenderA/src/popup/App.tsx)

- 現在のモードを表示する小さなインジケーターを追加（「Blacklist Mode」or「Whitelist Mode」）
- トグルの動作自体は変わらない（ドメインごとのON/OFF切替）

---

### オプションページUI

#### [MODIFY] [App.tsx](file:///home/kimura512/dev/ctrlEnterSenderA/src/options/App.tsx)

- **モード切替セクション**をページ上部に追加（タイトル直下）
- ラジオボタンまたはセグメントコントロールで Blacklist / Whitelist を切替可能に
- ホワイトリストモード時は「初期設定済みドメイン」セクションを非表示に
- モード切替時に確認ダイアログを表示（ドメイン設定は維持されるが、動作が変わることを通知）

---

### i18n メッセージ

#### [MODIFY] 全34言語の `messages.json`

追加するメッセージキー:
| Key | en | ja |
|---|---|---|
| `activationMode` | `Activation Mode` | `有効化モード` |
| `activationModeDescription` | `Choose how the extension is activated on websites.` | `拡張機能のウェブサイトでの有効化方法を選択します。` |
| `blacklistMode` | `Blacklist Mode (Default ON)` | `ブラックリストモード（デフォルトON）` |
| `blacklistModeDesc` | `Enabled on all sites by default. Disable specific sites.` | `デフォルトで全サイト有効。個別のサイトで無効化。` |
| `whitelistMode` | `Whitelist Mode (Default OFF)` | `ホワイトリストモード（デフォルトOFF）` |
| `whitelistModeDesc` | `Disabled on all sites by default. Enable specific sites.` | `デフォルトで全サイト無効。個別のサイトで有効化。` |
| `activationModeChangeConfirm` | `Changing the activation mode will affect how the extension works on all websites. Continue?` | `有効化モードを変更すると、全ウェブサイトでの拡張機能の動作が変わります。続行しますか？` |
| `modeBlacklist` | `Blacklist` | `ブラックリスト` |
| `modeWhitelist` | `Whitelist` | `ホワイトリスト` |

> [!NOTE]
> en/ja 以外の32言語は英語ベースで追加し、将来的にコミュニティ翻訳を受け付ける形とします。

---

## Verification Plan

### Automated Tests

テストフレームワークが未導入のため、自動テスト追加は今回のスコープ外とします。

### Manual Verification

1. **ビルド確認**: `pnpm build` が成功することを確認
2. **ユーザーによる動作確認**: Chrome にロードして以下のシナリオをテスト
   - デフォルト（ブラックリスト）モードで従来通り動作すること
   - ホワイトリストモードに切替えると、未設定サイトで拡張機能が無効になること
   - ホワイトリストモードで特定サイトを有効にすると、そのサイトでのみ動作すること
   - モード切替時に確認ダイアログが出ること
   - ポップアップにモード表示が出ること
