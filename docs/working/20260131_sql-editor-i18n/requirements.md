# 要件定義書 - SQLエディタ画面の多言語対応

## 概要

SQLエディタ画面および関連コンポーネントの全ての表示文字列を多言語対応（日本語/英語）にします。現在ハードコードされている日本語文字列を i18n に置き換え、ロケールファイルで管理することで、言語設定の切り替えに対応します。

## 背景・目的

### 背景

- アプリケーション全体では i18n（@nuxtjs/i18n）が導入されており、設定画面で言語切り替えが可能
- SQLエディタ画面は最近実装された機能のため、多言語対応が未実施
- 各コンポーネントに日本語文字列がハードコードされており、英語環境では日本語が表示される問題がある

### 目的

- SQLエディタ画面を含む全ての画面で一貫した多言語対応を実現
- 非日本語ユーザーにも快適な使用体験を提供
- 将来的な他言語対応の基盤を整える

## 要件一覧

### 機能要件

#### F-1: ロケールファイルへの翻訳キー追加

- **説明**: `i18n/locales/ja.json` と `i18n/locales/en.json` に `sqlEditor` セクションを追加し、必要な翻訳キーを定義します
- **受け入れ条件**:
  - [ ] `sqlEditor` セクションが両ロケールファイルに追加されている
  - [ ] 全てのハードコード文字列に対応する翻訳キーが定義されている
  - [ ] 日本語版（ja.json）は既存の表示文字列と同じ内容である
  - [ ] 英語版（en.json）は適切な英訳が提供されている
  - [ ] キー構造は他のセクション（queryBuilder, mutationBuilder等）と一貫性がある

#### F-2: SqlEditorLayout.vue の多言語対応

- **説明**: レイアウトコンポーネントのハードコード文字列を `$t()` に置き換えます
- **受け入れ条件**:
  - [ ] "保存クエリ" が `$t('sqlEditor.savedPanel.title')` に置き換えられている
  - [ ] "実行履歴" が `$t('sqlEditor.historyPanel.title')` に置き換えられている
  - [ ] 言語切り替え時に表示が正しく更新される

#### F-3: SqlEditorToolbar.vue の多言語対応

- **説明**: ツールバーのボタンラベル、ダイアログ文言を多言語対応します
- **受け入れ条件**:
  - [ ] ボタンラベル（"実行", "停止", "整形", "保存"）が翻訳キーに置き換えられている
  - [ ] ツールチップ文言が翻訳キーに置き換えられている
  - [ ] 更新確認ダイアログの全ての文言が翻訳キーに置き換えられている
  - [ ] トースト通知メッセージが翻訳キーに置き換えられている

#### F-4: SqlEditorResultPanel.vue の多言語対応

- **説明**: 結果パネルの表示文言を多言語対応します
- **受け入れ条件**:
  - [ ] パネルタイトル、ステータスメッセージが翻訳キーに置き換えられている
  - [ ] 実行時間、行数表示が翻訳キーに置き換えられている
  - [ ] エラーメッセージが翻訳キーに置き換えられている
  - [ ] エクスポートボタンラベルが翻訳キーに置き換えられている

#### F-5: SqlEditorSavedPanel.vue の多言語対応

- **説明**: 保存クエリパネルの全ての文言を多言語対応します
- **受け入れ条件**:
  - [ ] 検索プレースホルダーが翻訳キーに置き換えられている
  - [ ] コンテキストメニュー項目が翻訳キーに置き換えられている
  - [ ] ダイアログ（確認、削除等）の文言が翻訳キーに置き換えられている
  - [ ] トースト通知メッセージが翻訳キーに置き換えられている
  - [ ] タグフィルタ関連の文言が翻訳キーに置き換えられている

#### F-6: SqlEditorHistoryPanel.vue の多言語対応

- **説明**: 履歴パネルの全ての文言を多言語対応します
- **受け入れ条件**:
  - [ ] 検索プレースホルダー、フィルタラベルが翻訳キーに置き換えられている
  - [ ] ステータス表示（"成功", "失敗"）が翻訳キーに置き換えられている
  - [ ] 相対時刻表示が多言語対応されている
  - [ ] ダイアログの文言が翻訳キーに置き換えられている
  - [ ] トースト通知メッセージが翻訳キーに置き換えられている

#### F-7: SqlEditorSaveDialog.vue の多言語対応

- **説明**: 保存ダイアログの全ての文言を多言語対応します
- **受け入れ条件**:
  - [ ] ダイアログタイトル、説明が翻訳キーに置き換えられている
  - [ ] フォームラベル、プレースホルダーが翻訳キーに置き換えられている
  - [ ] バリデーションエラーメッセージが翻訳キーに置き換えられている
  - [ ] ボタンラベルが翻訳キーに置き換えられている
  - [ ] トースト通知メッセージが翻訳キーに置き換えられている

#### F-8: その他のSQLエディタ関連コンポーネントの多言語対応

- **説明**: EditorTabs.vue 等の関連コンポーネントも多言語対応します
- **受け入れ条件**:
  - [ ] 全てのハードコード文字列が翻訳キーに置き換えられている
  - [ ] タブ関連の文言が翻訳キーに置き換えられている

### 非機能要件

- **パフォーマンス**: i18n の導入による描画遅延が発生しないこと（既存の他画面と同等）
- **保守性**: 翻訳キーの命名規則が統一されており、追加・変更が容易であること
- **一貫性**: 他の画面（queryBuilder, mutationBuilder）と同じ翻訳キー構造・命名規則を使用すること

## スコープ

### 対象

- `app/components/sql-editor/` 配下の全コンポーネント
  - SqlEditorLayout.vue
  - SqlEditorToolbar.vue
  - SqlEditorResultPanel.vue
  - SqlEditorSavedPanel.vue
  - SqlEditorHistoryPanel.vue
  - SqlEditorSaveDialog.vue
  - EditorTabs.vue
  - その他関連コンポーネント
- `app/pages/sql-editor.vue`
- `i18n/locales/ja.json`
- `i18n/locales/en.json`

### 対象外

- SQLエディタ以外の画面（既に多言語対応済み）
- バックエンド（Rust側）のエラーメッセージ
- 外部ライブラリ（Monaco Editor）のUI

## 実装対象ファイル（予定）

### 修正が必要なファイル

- `i18n/locales/ja.json` - 日本語翻訳追加
- `i18n/locales/en.json` - 英語翻訳追加
- `app/components/sql-editor/SqlEditorLayout.vue`
- `app/components/sql-editor/SqlEditorToolbar.vue`
- `app/components/sql-editor/SqlEditorResultPanel.vue`
- `app/components/sql-editor/SqlEditorSavedPanel.vue`
- `app/components/sql-editor/SqlEditorHistoryPanel.vue`
- `app/components/sql-editor/SqlEditorSaveDialog.vue`
- `app/components/sql-editor/EditorTabs.vue`
- その他、SQLエディタ関連のダイアログコンポーネント

## 依存関係

- `@nuxtjs/i18n` - 既にインストール済み
- `nuxt.config.ts` の i18n 設定 - 既に設定済み
- `app/stores/settings.ts` の言語設定機能 - 既に実装済み

## 既知の制約

- 相対時刻表示（"数秒前", "5分前" 等）は各言語のフォーマットルールに従う必要がある
- 日付時刻のフォーマットは `toLocaleString()` を使用しているため、言語コードに応じた調整が必要
- 一部のエラーメッセージはバックエンドから返されるため、フロントエンドでの翻訳が必要

## 参考資料

- [Nuxt I18n ドキュメント](https://i18n.nuxtjs.org/)
- `docs/steering/02_functional_design.md` - 既存の多言語対応実装例
- `app/components/query-builder/` - 参考となる多言語対応実装
- `app/components/mutation-builder/` - 参考となる多言語対応実装

## 翻訳キー構造の方針

既存の `queryBuilder` セクションの構造を参考に、以下の階層でキーを定義します：

```
sqlEditor/
├── toolbar/           # ツールバー関連
├── layout/            # レイアウト関連
├── savedPanel/        # 保存クエリパネル
├── historyPanel/      # 履歴パネル
├── resultPanel/       # 結果パネル
├── saveDialog/        # 保存ダイアログ
├── tabs/              # タブ関連
└── common/            # 共通メッセージ
```

## ハードコード文字列の調査結果

以下のコンポーネントで多数のハードコード文字列を確認：

1. **SqlEditorLayout.vue** (69, 87行目)
2. **SqlEditorToolbar.vue** (95, 103, 112, 126, 134行目 他)
3. **SqlEditorResultPanel.vue** (64, 67, 71, 74, 82, 94, 107, 124行目 他)
4. **SqlEditorSavedPanel.vue** (424, 433, 438, 453行目 他多数)
5. **SqlEditorHistoryPanel.vue** (152, 158, 168, 186行目 他多数)
6. **SqlEditorSaveDialog.vue** (69, 71, 184, 189行目 他多数)

詳細な文字列リストは設計書で管理します。
