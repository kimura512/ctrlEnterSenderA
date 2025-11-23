# Ctrl+Enter Sender 仕様書（v1）

## 1. 概要

### 1.1 目的

ブラウザ上のテキスト入力（チャットやコメントなど）において、以下のキーバインドを可能な限り一貫して提供する。

- Enter: 改行
- Ctrl+Enter（macOS は Cmd+Enter）: メッセージ送信

これにより、

- Slack, Discord, ChatGPT, Notion, 各種 Web チャットサービスなどで、
- 日本語 IME を含む各種 IME 利用時にも安定して、

誤送信や意図しない送信を防ぐことを主目的とする。

### 1.2 非目標

- すべてのサイト・すべての入力欄で 100% 完全に期待通りに動くこと。
- ブラウザ外（ネイティブアプリ、VSCode 等）でのキーバインド制御。
- 入力内容（テキスト）の保存・解析・送信。


## 2. 対象範囲

### 2.1 対象とする入力要素

以下の条件を満たす要素を「多行テキスト入力エリア（マルチラインエディタ）」とみなし、拡張機能の対象とする。

- `<textarea>`
  - `rows` が 2 以上、または
  - CSS 上の高さが一定以上（例: 40px 以上）
- `contenteditable="true"` を持つ要素
  - `class` または `id` に以下のいずれかを含むもの（キーワード例）
    - `chat`, `message`, `input`, `prompt`, `comment`, `editor`, `ProseMirror`
  - または ARIA 属性ベースで以下に該当するもの
    - `role="textbox"` かつ `aria-multiline="true"`

### 2.2 デフォルトで対象外とする入力要素

以下は原則として拡張機能の対象外（介入しない）。

- `<input>` 要素全般
  - `type="text"`, `search`, `email`, `password`, `number` 等
- ログインフォーム（ID/パスワードなど）
- 検索ボックス（Google 検索、サイト内検索等）
  - `type="search"`
  - `role="searchbox"`
  - `placeholder` / `aria-label` に `検索`, `search`, `find` など含むもの
- 一行入力が前提のフォーム（氏名、金額、メールアドレス等）

サイト別設定で、これらのデフォルト判定は上書き可能とする（後述）。


## 3. キーハンドリング仕様

### 3.1 前提

- イベントは `content script` により `document` もしくは対象要素に対して `keydown` リスナを登録して処理する。
- IME 入力中かどうかは以下で判定する。
  - `KeyboardEvent.isComposing === true`
  - または `KeyboardEvent.keyCode === 229`（一部ブラウザ・IME のためのフォールバック）

### 3.2 IME 入力中の Enter

- 条件
  - `event.isComposing === true` または `keyCode === 229`
- 挙動
  - 拡張機能は一切介入せず、そのままサイト側・ブラウザ側のデフォルト挙動に任せる。

### 3.3 単体 Enter（改行）

- 対象
  - フォーカス中の要素が「多行テキスト入力エリア」と判定されている場合
- 条件
  - `event.key === 'Enter'`
  - `event.shiftKey === false`
  - `event.ctrlKey === false`
  - `event.metaKey === false`
  - IME 入力中ではない
- 挙動
  - `event.preventDefault()` を呼び出し、元の「送信」等の挙動をキャンセルする。
  - 改行を挿入する。
    - `contenteditable` の場合:
      - 可能であれば `document.execCommand('insertLineBreak')` を使用
      - それが非推奨のため、将来的には Selection/Range API での挿入に移行する余地を残す
    - `<textarea>` の場合:
      - 現在のキャレット位置に `"\n"` を挿入する（value を手動更新）

### 3.4 Ctrl+Enter / Cmd+Enter（送信）

- 対象
  - フォーカス中の要素が「多行テキスト入力エリア」と判定されている場合
- 条件
  - Windows / Linux: `event.ctrlKey === true && event.key === 'Enter'`
  - macOS: `event.metaKey === true && event.key === 'Enter'`
  - IME 入力中ではない
- 挙動
  - `event.preventDefault()` で改行挿入等の挙動をキャンセル。
  - サイトの「送信」動作を模倣して実行する。
  - 実装優先順位案:
    1. フォーカス中要素から最も近い `<form>` 要素を探索し、`form.requestSubmit()` もしくは `form.submit()` を呼ぶ。
    2. 周辺の「送信ボタン」を探索し `click()` を呼ぶ。
       - 候補セレクタ例:
         - `button[type="submit"]`
         - `button[aria-label*="送信"]`
         - `[data-testid*="send"]`
       - サイト別設定によりカスタムセレクタを追加可能とする。
    3. 上記が見つからない場合、最後の手段として、元の Enter 送信に近い `KeyboardEvent` を再度 dispatch する。

### 3.5 Shift+Enter

- 条件
  - `event.shiftKey === true && event.key === 'Enter'`
- 挙動
  - 既存の挙動（ほぼ全てのチャットサービスで「改行」）を尊重し、拡張機能側では特に介入しない。


## 4. 対象エディタ判定ロジック

### 4.1 判定関数（イメージ）

```ts
function isMultiLineEditable(el: Element, config: DomainConfig): boolean
```

`DomainConfig` はサイト別設定（後述）とし、カスタムターゲット / 除外ルールを考慮しつつ以下のような判定を行う。

### 4.2 true 判定条件

- `config.customTargets` にマッチする CSS セレクタに該当する要素
- それ以外で、以下のどれかを満たす要素:
  - `<textarea>` かつ
    - `rows >= 2` または
    - レイアウト計算後の高さが閾値以上
  - `contenteditable="true"` を持つ要素 かつ
    - `className` もしくは `id` に以下のいずれかを含む
      - `chat`, `message`, `input`, `prompt`, `comment`, `editor`, `ProseMirror`
    - もしくは `role="textbox"` かつ `aria-multiline="true"`

### 4.3 false 判定条件

- `config.customExcludes` にマッチする CSS セレクタに該当する要素
- `<input>` 要素
- `type="search"` / `role="searchbox"`
- `placeholder` / `aria-label` に検索を示唆する文字列を含む要素
  - 例: `"検索"`, `"search"`, `"find"`

サイト別の設定で `mode: 'forceOn'` の場合は、true 側の条件を甘くし、`forceOff` の場合は常に false を返すようにする。


## 5. サイト別設定

### 5.1 DomainConfig 型

```ts
type DomainMode = 'default' | 'forceOn' | 'forceOff';

type DomainConfig = {
  enabled: boolean;            // このドメインで拡張機能を使うか
  mode: DomainMode;            // 判定モード
  customTargets?: string[];    // 追加で対象にする CSS セレクタ
  customExcludes?: string[];   // 対象から除外する CSS セレクタ
};
```

- `default`:
  - 本仕様で定義した判定ロジックに従う。
- `forceOn`:
  - 多行テキスト入力であれば、多少怪しくても積極的に対象とする。
- `forceOff`:
  - 当該ドメインでは一切キーハンドリングを行わない。

### 5.2 ストレージ

- `chrome.storage.sync` を使用し、ドメインごとの設定を同期可能にする。
- 保存形式は以下を想定:

```ts
// key: origin (例: "https://chat.openai.com")

interface StorageSchema {
  domains: {
    [origin: string]: DomainConfig;
  };
  // 全体共通設定があればここに追加（例: 送信ショートカットのカスタマイズ）
}
```


## 6. UI 仕様

### 6.1 ブラウザアクション（ポップアップ）

- 表示内容（簡易版）
  - 現在のドメイン / オリジン
  - 有効 / 無効トグル（`enabled` の切り替え）
  - モード選択
    - ラジオボタンまたはセレクトボックスで `default / forceOn / forceOff`
  - 「詳細設定を開く」ボタン（オプションページを開く）

### 6.2 オプションページ

- 構成案
  1. 全体設定
     - 今回は最小限から開始（必要に応じて将来拡張）
  2. ドメイン別設定一覧
     - ドメイン（origin）
     - 有効 / 無効
     - モード
     - 編集ボタン（モーダルや詳細編集画面へ）
  3. ドメイン設定詳細編集
     - customTargets（複数行テキスト、カンマ区切りまたは1行1セレクタ）
     - customExcludes
  4. 設定のエクスポート / インポート（将来的な拡張）

- UI 実装には React + TypeScript を用いる。


## 7. 技術スタック

### 7.1 全体

- Chrome 拡張: Manifest V3
- 言語: TypeScript
- バンドラ: Vite
- UI ライブラリ: React
- コード品質:
  - ESLint
  - Prettier

### 7.2 構成

- `manifest.json`（V3）
  - `background.service_worker`: TypeScript で記述し、ビルドで JS 出力
  - `content_scripts`: TypeScript
  - `action.default_popup`: React で実装したポップアップ
  - `options_page`: React で実装したオプションページ

- ディレクトリ構成案

```text
src/
  content/
    index.ts        // content script のエントリ
    handler.ts      // キーハンドリング関連のロジック
    detector.ts     // isMultiLineEditable 等の判定ロジック
  background/
    index.ts        // service worker エントリ
    storage.ts      // chrome.storage アクセスラッパ
  popup/
    main.tsx        // ポップアップエントリ
    App.tsx
    components/
  options/
    main.tsx        // オプションページエントリ
    App.tsx
    components/
  types/
    config.ts       // DomainConfig, StorageSchema 等

public/
  manifest.json
  icons/
```


## 8. 開発ロードマップ

### フェーズ 1: ChatGPT 専用 MVP

- `matches: ["https://chat.openai.com/*"]` で content script を適用。
- ChatGPT の入力エリア
  - `#prompt-textarea.ProseMirror[contenteditable="true"]`
  を対象として強制的に以下を実現。
  - Enter: 改行
  - Ctrl+Enter / Cmd+Enter: 送信
- サイト固有の「送信」挙動を確認し、必要なら専用ハンドラを実装。

### フェーズ 2: 汎用対応

- `matches: ["<all_urls>"]` に拡大。
- `isMultiLineEditable` による自動判定を導入。
- 典型的なチャットサービス（Slack Web, Discord Web 等）で動作確認。
- 問題が出たサイトに対しては `DomainConfig` による `forceOff` などで回避。

### フェーズ 3: 設定 UI

- ブラウザアクションポップアップで、ドメインごとの
  - 有効 / 無効
  - モード切り替え
  を行えるようにする。
- オプションページで
  - ドメイン一覧
  - customTargets / customExcludes
  の編集を可能にする。

### フェーズ 4: 改良・拡張（任意）

- Selection/Range API を用いた、より安全で将来互換性の高い改行挿入ロジックへの切り替え。
- Undo や「送信直後の短時間だけ取り消し可能」な慎重モードの検討。
- サイト別のプリセット（Slack / Discord / ChatGPT 用テンプレ設定）などの提供。

