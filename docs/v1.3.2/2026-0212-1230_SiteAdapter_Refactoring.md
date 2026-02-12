# Site Adapter Architecture リファクタリング

## 変更概要

サイト固有ロジックが3ファイルに散在する旧アーキテクチャを、**サイトごとに独立したアダプタファイル**に分離。

## 新ファイル構成

```
src/content/
├── index.ts           # エンジン（サイト非依存）
├── types.ts           # SiteAdapter インターフェース
└── adapters/
    ├── registry.ts    # アダプタ登録・取得
    ├── default.ts     # 汎用フォールバック
    ├── discord.ts     # listenerTarget: document
    ├── claude.ts      # listenerTarget: window ← 隔離！
    ├── slack.ts       # listenerTarget: document
    ├── grok.ts        # listenerTarget: document
    ├── chatgpt.ts     # listenerTarget: document
    └── teams.ts       # listenerTarget: document
```

## 削除ファイル

- `src/content/handler.ts` → ロジックは各アダプタに分散
- `src/content/detector.ts` → 各アダプタの `isEditable()` に移行

## キーポイント

- **`listenerTarget`** がアダプタ単位 → Claude 用 `window` が Discord に影響しない
- **Discord に専用 `triggerSend`** を追加（ボタン検索 + Enter シミュレーション）
- 新サイト追加 = アダプタ1ファイル + registry に1行

## 検証結果

- **ビルド**: `tsc && vite build` 成功 ✅
- **手動テスト**: ユーザー側で実施予定
