# SQLエディタ機能 詳細仕様

**バージョン**: 1.0
**作成日**: 2026年2月7日
**最終更新**: 2026年2月7日
**状態**: ✅ 完了（Phase 7）

---

## 1. 機能概要

フリーフォームでSQL文を直接入力・編集・実行できる機能。Monaco Editorをベースに、シンタックスハイライト、コード補完、SQLフォーマッターなどを備えたSQL開発環境を提供する。クエリビルダー（GUI）では対応しきれない複雑なクエリや、上級ユーザーの高速な作業フローをサポートする。

---

## 2. レイアウト構成

### 2.1 画面レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ 環境識別ヘッダー（環境色・接続名・警告バナー）                │
├─────────────────────────────────────────────────────────────┤
│ ツールバー（実行・停止・整形・保存 | DB/スキーマ選択）        │
├───────────────┬─────────────────────────────────────────────┤
│ 左パネル       │   エディタエリア                             │
│               │   タブバー [Tab1] [Tab2] [+]                 │
│ 保存クエリ     │   ┌─────────────────────────────────────┐  │
│ ツリービュー   │   │ Monaco Editor                       │  │
│               │   │ (シンタックスハイライト・コード補完)   │  │
│               │   └─────────────────────────────────────┘  │
│ ──────────── │   ─────────────────────────────────────────  │
│ クエリ履歴     │   結果パネル                                 │
│               │   実行結果テーブル / エラー表示 / エクスポート │
└───────────────┴─────────────────────────────────────────────┘
```

### 2.2 パネル構成

| パネル | コンポーネント | 説明 |
|--------|--------------|------|
| ツールバー | `SqlEditorToolbar.vue` | 実行・停止・整形・保存ボタン、DB/スキーマ切替 |
| 左パネル（保存クエリ） | `SqlEditorSavedPanel.vue` | フォルダ構造での保存クエリ管理 |
| 左パネル（履歴） | `SqlEditorHistoryPanel.vue` | クエリ実行履歴の表示・検索 |
| タブバー | `EditorTabs.vue` | マルチタブ管理（追加・切替・閉じる・名前変更） |
| エディタ | `SqlTextEditor.vue` | Monaco EditorベースのSQL入力 |
| 結果パネル | `SqlEditorResultPanel.vue` | 実行結果・エラー・エクスポート |
| レイアウト | `SqlEditorLayout.vue` | 全体レイアウト管理 |

---

## 3. データモデル

### 3.1 SqlEditorTab（エディタタブ）

```typescript
interface SqlEditorTab {
  id: string
  name: string
  sql: string
  dirty: boolean
  result?: QueryResult
  error?: string
  executionTime?: number
  savedQueryId?: string
}
```

### 3.2 SavedQuery（保存クエリ）

```typescript
interface SavedQuery {
  id: string
  name: string
  sql: string
  description?: string
  tags?: string[]
  folderPath: string | null
  connectionId?: string
  databaseType?: string
  createdAt: string
  updatedAt: string
}
```

### 3.3 SqlEditorHistoryEntry（実行履歴）

```typescript
interface SqlEditorHistoryEntry {
  id: string
  sql: string
  executionStatus: 'success' | 'error'
  executionTime?: number
  rowCount?: number
  errorMessage?: string
  connectionId: string
  database?: string
  schema?: string
  executedAt: string
}
```

### 3.4 TreeNode（ツリーノード）

```typescript
interface TreeNode {
  id: string
  type: 'folder' | 'query'
  name: string
  children?: TreeNode[]
  query?: SavedQueryMetadata
}
```

---

## 4. 機能詳細

### 4.1 テキストエディタ

| 機能 | 説明 |
|------|------|
| シンタックスハイライト | SQLキーワード、文字列、数値、コメントの色分け |
| コード補完 | テーブル名、カラム名、SQLキーワード、SQL関数の自動補完 |
| エラーデコレーション | エラー発生行・列のハイライト表示 |
| 選択範囲実行 | テキスト選択範囲のみの実行 |
| SQLフォーマッター | `sql-formatter`ライブラリによるSQL自動整形 |
| DB構造ロードインジケーター | 補完データ取得中の進捗表示 |

### 4.2 マルチタブ

| 機能 | 説明 |
|------|------|
| タブ追加 | 新しい空のSQLタブを追加 |
| タブ切替 | タブクリックでアクティブタブを切替 |
| タブ閉じる | 未保存変更がある場合は確認ダイアログを表示 |
| タブ名変更 | ダブルクリックでタブ名をインライン編集 |
| ダーティ表示 | 未保存の変更があるタブにインジケーター表示 |

### 4.3 クエリ実行

| 機能 | 説明 |
|------|------|
| 全文実行 | エディタ内の全SQLを実行 |
| 選択範囲実行 | 選択部分のみを実行 |
| DB/スキーマ切替 | 実行対象のデータベース・スキーマを選択（PostgreSQL） |
| 結果表示 | テーブル形式での結果表示 |
| エラー表示 | エラーメッセージとエラー位置の表示 |
| エクスポート | CSV/Excel/JSON形式での結果エクスポート |

### 4.4 保存クエリ管理

| 機能 | 説明 |
|------|------|
| クエリ保存 | 名前・説明・タグ付きでクエリを保存 |
| フォルダ管理 | フォルダ作成・名前変更・削除 |
| クエリ移動 | クエリを別フォルダに移動 |
| ツリー表示 | フォルダ階層でのクエリ表示 |
| クエリ読込 | 保存済みクエリをエディタに読み込み |
| 接続非依存 | クエリは特定の接続に紐づかない |

### 4.5 クエリ履歴

| 機能 | 説明 |
|------|------|
| 自動記録 | クエリ実行時に自動で履歴に記録 |
| 検索・フィルタ | SQL文・実行結果での検索 |
| 履歴読込 | 履歴からエディタにSQL読み込み |
| 履歴削除 | 個別の履歴エントリを削除 |

### 4.6 段階的DB構造取得

大量のテーブル（100以上）を持つデータベースでの補完パフォーマンスを最適化するために、3段階のロードを実施する。

| フェーズ | 内容 | 所要時間目安 |
|---------|------|-------------|
| Phase 1 | テーブル名サマリーのみ取得 → テーブル名補完が即座に利用可能 | ~2秒 |
| Phase 2 | バックグラウンドで各テーブルのカラム情報を順次取得 | バックグラウンド |
| Phase 3 | ユーザーが`.`を入力した時、該当テーブルのカラム取得を優先 | オンデマンド |

---

## 5. キーボードショートカット

| ショートカット | 機能 |
|--------------|------|
| `Ctrl+Enter` / `Cmd+Enter` | クエリ実行 |
| `Ctrl+S` / `Cmd+S` | クエリ保存 |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | SQL整形 |

---

## 6. Tauriコマンド

### 6.1 保存クエリ

| コマンド | 説明 |
|---------|------|
| `save_sql_query` | クエリを保存（新規/更新） |
| `load_sql_query` | 保存済みクエリを読込 |
| `list_sql_queries` | 保存済みクエリの一覧取得 |
| `search_sql_queries` | クエリの検索 |
| `delete_sql_query` | クエリの削除 |

### 6.2 フォルダ管理

| コマンド | 説明 |
|---------|------|
| `list_sql_editor_folders` | フォルダ一覧取得 |
| `create_sql_editor_folder` | フォルダ作成 |
| `rename_sql_editor_folder` | フォルダ名変更 |
| `delete_sql_editor_folder` | フォルダ削除 |
| `move_sql_editor_query` | クエリのフォルダ移動 |

### 6.3 実行履歴

| コマンド | 説明 |
|---------|------|
| `add_sql_editor_history` | 履歴エントリ追加 |
| `get_sql_editor_histories` | 履歴一覧取得 |
| `delete_sql_editor_history` | 履歴エントリ削除 |

### 6.4 DB構造

| コマンド | 説明 |
|---------|------|
| `get_database_structure_summary` | 軽量なDB構造サマリーの取得 |

---

## 7. データ永続化

| ファイル | 内容 |
|---------|------|
| `~/.sql-query-build/sql-editor-queries/{id}.json` | 保存済みクエリ |
| `~/.sql-query-build/sql-editor-folders.json` | フォルダ構造 |
| `~/.sql-query-build/sql-editor-history.json` | 実行履歴 |

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-02-07 | 1.0 | 初版作成 | - |
