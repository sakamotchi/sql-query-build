# タスクリスト: データ変更クエリビルダー共通基盤（8.1）

## 概要

このタスクリストは、フェーズ8.1「共通基盤」の実装タスクを管理します。

## タスク一覧

### 8.1.1 MutationQueryModel型定義

**ファイル**: `app/types/mutation-query.ts`

- [ ] ファイル作成
- [ ] `MutationType` 型定義
- [ ] `InsertQueryModel` インターフェース定義
- [ ] `UpdateQueryModel` インターフェース定義
- [ ] `DeleteQueryModel` インターフェース定義
- [ ] `MutationQueryModel` ユニオン型定義
- [ ] `WhereCondition`、`ConditionGroup` の再エクスポート
- [ ] TypeScript型エラーチェック

**完了条件**: `mutation-query.ts`が作成され、型エラーがない

---

### 8.1.2 mutation-builderストア作成

**ファイル**: `app/stores/mutation-builder.ts`

- [ ] ファイル作成
- [ ] `MutationBuilderState` インターフェース定義
- [ ] Piniaストア定義（`defineStore`）
- [ ] 初期state実装
  - [ ] `mutationType: 'INSERT'`
  - [ ] `selectedTable: null`
  - [ ] `queryModel: null`
  - [ ] `generatedSql: ''`
  - [ ] その他の状態変数
- [ ] Getters実装
  - [ ] `canExecuteQuery`
  - [ ] `hasWhereConditions`
- [ ] Actions実装
  - [ ] `setMutationType(type)`
  - [ ] `setSelectedTable(table)`
  - [ ] `resetQueryModel()`
  - [ ] `resetState()`
- [ ] TypeScript型エラーチェック
- [ ] Vitestテスト作成（`tests/stores/mutation-builder.spec.ts`）
- [ ] テスト実行（`npm run test:run`）

**完了条件**: ストアが作成され、テストが全て通る

---

### 8.1.3 mutation-builder.vueページ作成

**ファイル**: `app/pages/mutation-builder.vue`

- [ ] ファイル作成
- [ ] `<script setup>`セクション実装
- [ ] `definePageMeta`設定
  - [ ] `title: 'データ変更'`
  - [ ] `layout: false`
- [ ] `<template>`セクション実装
  - [ ] MutationBuilderLayoutコンポーネント配置
  - [ ] フルスクリーンレイアウト（`h-screen w-screen`）
- [ ] ブラウザで `/mutation-builder` にアクセス確認

**完了条件**: `/mutation-builder` ページにアクセスできる

---

### 8.1.4 MutationBuilderLayout.vue作成

**ファイル**: `app/components/mutation-builder/MutationBuilderLayout.vue`

- [ ] ディレクトリ作成（`app/components/mutation-builder/`）
- [ ] ファイル作成
- [ ] `<script setup>`セクション実装
  - [ ] パネルサイズのref定義
  - [ ] パネル表示状態のref定義
  - [ ] リサイズハンドラー実装
  - [ ] パネル折りたたみハンドラー実装
- [ ] `<template>`セクション実装
  - [ ] 全体レイアウト（`flex flex-col h-screen`）
  - [ ] ツールバー配置
  - [ ] 3ペインレイアウト（左・中央・右）
  - [ ] ResizablePanel使用
- [ ] 左パネルにMutationBuilderLeftPanel配置
- [ ] 中央パネルにMutationBuilderCenterPanel配置
- [ ] 右パネルにMutationBuilderRightPanel配置
- [ ] レイアウト表示確認

**完了条件**: 3ペインレイアウトが表示される

---

### 8.1.5 MutationBuilderToolbar.vue作成

**ファイル**: `app/components/mutation-builder/MutationBuilderToolbar.vue`

- [ ] ファイル作成
- [ ] `<script setup>`セクション実装
  - [ ] mutation-builderストアのインポート
  - [ ] `mutationType` computed定義
  - [ ] `handleMutationTypeChange`ハンドラー実装
  - [ ] `handleExecute`プレースホルダー実装
  - [ ] `handleSave`プレースホルダー実装
  - [ ] `handleHistory`プレースホルダー実装
- [ ] `<template>`セクション実装
  - [ ] ツールバーレイアウト
  - [ ] 左側: クエリ種別切り替え（UButtonGroup）
    - [ ] INSERTボタン
    - [ ] UPDATEボタン
    - [ ] DELETEボタン
    - [ ] アクティブ状態の色分け
  - [ ] 右側: アクションボタン
    - [ ] 実行ボタン
    - [ ] 保存ボタン
    - [ ] 履歴ボタン
    - [ ] クエリビルダーへのリンク
- [ ] タブ切り替え動作確認

**完了条件**: タブが表示され、クリックで切り替わる

---

### 8.1.6 windowApi拡張

**ファイル**: `app/api/window.ts`（既存ファイル更新）

- [ ] ファイル読み込み
- [ ] `openMutationBuilder`メソッド追加
  - [ ] パラメータ: connectionId, connectionName, environment
  - [ ] invoke呼び出し: 'open_mutation_builder_window'
  - [ ] 戻り値: Promise<WindowInfo>
- [ ] TypeScript型エラーチェック

**完了条件**: windowApiに`openMutationBuilder`メソッドが追加される

---

### 8.1.7 ConnectionCard更新

**ファイル**: `app/components/connection/ConnectionCard.vue`（既存ファイル更新）

- [ ] ファイル読み込み
- [ ] emitsに`mutation`イベント追加
- [ ] `handleMutation`ハンドラー追加
- [ ] ボタンエリアを2列レイアウトに変更
  - [ ] 1行目: データ参照 / データ変更
  - [ ] 2行目: 編集 / 削除
- [ ] 「接続」ボタンを「データ参照」に変更
- [ ] 「データ変更」ボタン追加
- [ ] カード表示確認

**完了条件**: 接続カードに2つのボタンが表示される

---

### 8.1.8 index.vue更新（ランチャー画面）

**ファイル**: `app/pages/index.vue`（既存ファイル更新）

- [ ] ファイル読み込み
- [ ] `handleMutation`ハンドラー追加
  - [ ] 既存ウィンドウ検索ロジック
  - [ ] 新規ウィンドウ起動ロジック
  - [ ] トースト通知
  - [ ] エラーハンドリング
- [ ] ConnectionCardの`@mutation`イベントハンドリング追加
- [ ] ConnectionListの`@mutation`イベントハンドリング追加
- [ ] トップの「データ変更」カード削除（存在する場合）
- [ ] 動作確認

**完了条件**: 接続カードから「データ変更」を起動できる

---

### 8.1.9 Rustコマンド追加

**ファイル**: `src-tauri/src/commands/window.rs`（既存ファイル更新）

- [ ] ファイル読み込み
- [ ] `open_mutation_builder_window`コマンド追加
  - [ ] パラメータ: app, connection_id, connection_name, environment
  - [ ] ウィンドウラベル生成: `mutation-builder-{connection_id}`
  - [ ] ウィンドウタイトル生成: `データ変更 - {connection_name} ({environment})`
  - [ ] 既存ウィンドウチェック
  - [ ] 新規ウィンドウ作成
  - [ ] ウィンドウサイズ設定: 1400x900（最小1200x700）
  - [ ] ウィンドウ情報返却
- [ ] `src-tauri/src/main.rs`または`src-tauri/src/lib.rs`にコマンド登録
- [ ] Rustビルドエラーチェック

**完了条件**: Rustコマンドが追加され、ビルドが成功する

---

### 8.1.10 MutationBuilderLeftPanel.vue作成

**ファイル**: `app/components/mutation-builder/MutationBuilderLeftPanel.vue`

- [ ] ファイル作成
- [ ] `<script setup>`セクション実装
  - [ ] DatabaseTreeコンポーネントのインポート
  - [ ] mutation-builderストアのインポート
  - [ ] `handleTableSelect`ハンドラー実装
- [ ] `<template>`セクション実装
  - [ ] パネルヘッダー
  - [ ] DatabaseTree配置
  - [ ] `@table-select`イベントハンドリング
- [ ] DatabaseTreeが表示されることを確認
- [ ] テーブルクリックで選択されることを確認

**完了条件**: DatabaseTreeが表示され、テーブル選択が動作する

---

### 8.1.11 MutationBuilderCenterPanel.vue作成

**ファイル**: `app/components/mutation-builder/MutationBuilderCenterPanel.vue`

- [ ] ファイル作成
- [ ] `<script setup>`セクション実装
  - [ ] mutation-builderストアのインポート
  - [ ] SqlPreviewコンポーネントのインポート
  - [ ] `generatedSql` computed定義
  - [ ] `queryInfo` computed定義
  - [ ] `hasWhereConditions` computed定義
  - [ ] `mutationType` computed定義
  - [ ] `showWarning` computed定義
- [ ] `<template>`セクション実装
  - [ ] パネルヘッダー
  - [ ] WHERE句なし警告（条件付き表示）
  - [ ] SqlPreview配置
  - [ ] クエリ情報表示
- [ ] SQLプレビューエリア表示確認
- [ ] WHERE句なし警告の表示/非表示確認

**完了条件**: SQLプレビューと警告が表示される

---

### 8.1.12 MutationBuilderRightPanel.vue作成

**ファイル**: `app/components/mutation-builder/MutationBuilderRightPanel.vue`

- [ ] ファイル作成
- [ ] `<script setup>`セクション実装
  - [ ] mutation-builderストアのインポート
  - [ ] `mutationType` computed定義
  - [ ] `selectedTable` computed定義
- [ ] `<template>`セクション実装
  - [ ] パネルヘッダー（クエリ種別表示）
  - [ ] テーブル未選択時のメッセージ
  - [ ] テーブル選択済み時の表示
  - [ ] プレースホルダーメッセージ
- [ ] テーブル未選択時の表示確認
- [ ] テーブル選択時の表示確認

**完了条件**: 右パネルが表示され、テーブル選択状態が反映される

---

### 8.1.13 統合テスト・動作確認

- [ ] ランチャー画面の接続カードに「データ参照」「データ変更」の2ボタンが表示される
- [ ] 「データ変更」ボタンをクリックすると新しいウィンドウで`/mutation-builder`が開く
- [ ] ウィンドウタイトルが「データ変更 - {接続名} ({環境})」形式で表示される
- [ ] 同じ接続で既にmutation-builderが開いている場合はフォーカスされる
- [ ] `/mutation-builder` にアクセスできる
- [ ] INSERT/UPDATE/DELETEタブが表示される
- [ ] タブをクリックすると切り替わる
- [ ] 左パネルにDatabaseTreeが表示される
- [ ] 左パネルでテーブルをクリックすると選択される
- [ ] 右パネルに選択テーブル名が表示される
- [ ] 中央パネルにSQLプレビューエリアが表示される
- [ ] UPDATE/DELETEタブでWHERE句なし警告が表示される
- [ ] ツールバーの「クエリビルダーへ」ボタンで`/query-builder`に遷移する
- [ ] 既存の`/query-builder`が正常に動作する（影響がない）
- [ ] TypeScript型エラーがない（`npm run typecheck`）
- [ ] テストが全て通る（`npm run test:run`）
- [ ] `npm run tauri:dev`でアプリが起動する
- [ ] パネルのリサイズが動作する
- [ ] ダークモードでも正常に表示される

**完了条件**: 全てのチェック項目がクリアされる

---

## 進捗状況

| タスクID | タスク名 | 状態 | 担当 | 備考 |
|---------|---------|------|------|------|
| 8.1.1 | MutationQueryModel型定義 | 未着手 | - | - |
| 8.1.2 | mutation-builderストア作成 | 未着手 | - | - |
| 8.1.3 | mutation-builder.vueページ作成 | 未着手 | - | - |
| 8.1.4 | MutationBuilderLayout.vue作成 | 未着手 | - | - |
| 8.1.5 | MutationBuilderToolbar.vue作成 | 未着手 | - | - |
| 8.1.6 | windowApi拡張 | 未着手 | - | - |
| 8.1.7 | ConnectionCard更新 | 未着手 | - | - |
| 8.1.8 | index.vue更新 | 未着手 | - | - |
| 8.1.9 | Rustコマンド追加 | 未着手 | - | - |
| 8.1.10 | MutationBuilderLeftPanel.vue作成 | 未着手 | - | - |
| 8.1.11 | MutationBuilderCenterPanel.vue作成 | 未着手 | - | - |
| 8.1.12 | MutationBuilderRightPanel.vue作成 | 未着手 | - | - |
| 8.1.13 | 統合テスト・動作確認 | 未着手 | - | - |

**全体進捗**: 0/13 (0%)

---

## ブロッカー・課題

現時点でブロッカーはありません。

---

## メモ

- DatabaseTreeコンポーネントの`@table-select`イベントの確認が必要
- ResizablePanelコンポーネントの使い方を既存のQueryBuilderLayoutから確認
- SqlPreviewコンポーネントのpropsを確認

---

## 次のステップ

8.1完了後は以下のタスクに進みます:

1. **8.2 INSERTビルダー**: InsertPanel.vueの実装
2. **8.3 UPDATEビルダー**: UpdatePanel.vueの実装
3. **8.4 DELETEビルダー**: DeletePanel.vueの実装
4. **8.5 安全機能統合**: DangerousQueryDialog拡張
