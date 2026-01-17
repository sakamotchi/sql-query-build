# 要件定義書 - SQLエディタウィンドウ基盤構築

## 概要

SQLエディタ機能の第一段階として、新規ウィンドウタイプ「SQLエディタ」を追加し、ランチャーから起動できるようにする。Phase 1では、空のSQLエディタページを表示する基盤構築に注力し、エディタUI実装（Phase 2）への橋渡しを行う。

## 背景・目的

### 背景

現在のSQL Query Builderは、GUIベースのクエリビルダーとミューテーションビルダーを提供しているが、以下の課題がある：

- 複雑なクエリや手動でSQLを書きたいケースに対応できない
- ビルダーで表現できない高度なSQL機能（サブクエリ、CTE、ウィンドウ関数等）が使用できない
- 既存のSQLを貼り付けて実行する用途に向いていない

### 目的

- **新規ウィンドウタイプの追加**: 既存の「クエリビルダー」「ミューテーションビルダー」に加え、「SQLエディタ」を第3のウィンドウタイプとして追加
- **起動経路の確立**: ランチャーの接続カードから「エディタ」ボタンでSQLエディタウィンドウを起動できるようにする
- **環境識別の継承**: 既存のウィンドウ管理機能（環境色、ウィンドウタイトル、重複防止）を継承し、安全性を確保
- **Phase 2への基盤**: エディタUI実装（CodeMirrorやPrism.js等）をスムーズに組み込めるよう、ページとルーティングを整備

## 要件一覧

### 機能要件

#### F-1: ウィンドウタイプ定義の拡張

- **説明**: 既存の `WindowType` に `sql_editor` を追加し、型定義を更新する
- **受け入れ条件**:
  - [ ] `app/types/index.ts` の `WindowType` 型に `'sql_editor'` が追加されている
  - [ ] TypeScriptコンパイルエラーが発生しない
  - [ ] 既存のクエリビルダー/ミューテーションビルダーに影響がない

#### F-2: Rust側ウィンドウマネージャーの拡張

- **説明**: `src-tauri/src/services/window_manager.rs` に `sql_editor` ウィンドウタイプのサポートを追加
- **受け入れ条件**:
  - [ ] Rust側の `WindowType` enumに `SqlEditor` バリアントが追加されている
  - [ ] `open_sql_editor_window` 関数が実装されている
  - [ ] ウィンドウラベル形式は `sql_editor_{connection_id}` である
  - [ ] 同一接続で重複ウィンドウが開かないよう制御されている
  - [ ] 既存ウィンドウがある場合はフォーカスする挙動である

#### F-3: フロントエンドウィンドウAPIの拡張

- **説明**: `app/api/window.ts` に `openSqlEditorWindow()` 関数を追加
- **受け入れ条件**:
  - [ ] `openSqlEditorWindow(connectionId: string)` 関数が定義されている
  - [ ] Tauriコマンド `open_sql_editor_window` を呼び出している
  - [ ] 戻り値は `Promise<WindowInfo>` である
  - [ ] エラーハンドリングが実装されている

#### F-4: SQLエディタページの作成

- **説明**: `app/pages/sql-editor.vue` を作成し、空のページとして表示できるようにする
- **受け入れ条件**:
  - [ ] `app/pages/sql-editor.vue` が存在する
  - [ ] Nuxt 4のページ規約に従ったComposition API形式である
  - [ ] ウィンドウコンテキスト（接続ID、環境情報）を取得している
  - [ ] 環境ヘッダー（`EnvironmentHeader.vue`）が表示されている
  - [ ] 「SQLエディタ（準備中）」等のプレースホルダーテキストが表示されている

#### F-5: 接続カードへのボタン追加

- **説明**: `app/components/connection/ConnectionCard.vue` に「エディタ」ボタンを追加
- **受け入れ条件**:
  - [ ] 接続カードに「エディタ」ボタンが表示される
  - [ ] ボタンは既存の「クエリビルダー」「ミューテーション」ボタンと同じデザインパターンである
  - [ ] ボタンクリック時に `openSqlEditorWindow()` が呼び出される
  - [ ] ボタンのアイコンは適切なもの（例: `i-heroicons-code-bracket`）が使用されている

#### F-6: ランチャーのハンドラー追加

- **説明**: `app/pages/index.vue` にSQLエディタ起動のハンドラーを追加
- **受け入れ条件**:
  - [ ] `handleOpenSqlEditor(connectionId: string)` 関数が実装されている
  - [ ] `ConnectionCard` から `@open-sql-editor` イベントを受け取っている
  - [ ] `openSqlEditorWindow()` を呼び出し、エラーハンドリングを行っている

#### F-7: ウィンドウタイトルの設定

- **説明**: SQLエディタウィンドウのタイトルに接続名と環境が表示されるようにする
- **受け入れ条件**:
  - [ ] ウィンドウタイトルが `[環境名] 接続名 - SQLエディタ` の形式である
  - [ ] 本番環境の場合は `[本番] 接続名 - SQLエディタ ⚠️` のように警告記号が追加される
  - [ ] Rust側の `open_sql_editor_window` で適切なタイトルが設定されている

### 非機能要件

- **パフォーマンス**: ウィンドウ起動は2秒以内に完了すること
- **セキュリティ**: 接続情報（パスワード等）をウィンドウ間で不適切に共有しないこと
- **保守性**: 既存のウィンドウ管理パターンと一貫性を保つこと
- **拡張性**: Phase 2でエディタUIコンポーネントを追加しやすい構造であること

## スコープ

### 対象

- ウィンドウタイプ定義の拡張（フロントエンド・バックエンド両方）
- ランチャーからの起動経路の確立
- 空のSQLエディタページの作成
- 環境識別機能の継承（ヘッダー、タイトル、色分け）
- 重複ウィンドウ防止機能

### 対象外（Phase 2以降で実装）

- SQLエディタのテキストエディタUI（CodeMirrorやPrism.js等）
- 構文ハイライト、行番号表示
- Undo/Redo機能
- クエリ実行機能
- クエリ保存・履歴機能

## 実装対象ファイル（予定）

### フロントエンド

- `app/types/index.ts` - WindowType型の拡張
- `app/api/window.ts` - openSqlEditorWindow関数の追加
- `app/pages/sql-editor.vue` - 新規作成（空ページ）
- `app/components/connection/ConnectionCard.vue` - エディタボタン追加
- `app/pages/index.vue` - ハンドラー追加

### バックエンド

- `src-tauri/src/models/window.rs` - WindowType enumの拡張
- `src-tauri/src/services/window_manager.rs` - open_sql_editor_window関数の追加
- `src-tauri/src/commands/window.rs` - Tauriコマンドの追加

## 依存関係

### 前提条件

- 既存のウィンドウ管理機能が正常に動作していること（`docs/steering/features/window.md` 参照）
- 環境識別機能（EnvironmentHeader、EnvironmentBadge等）が実装済みであること
- Nuxt 4のページルーティングが正しく設定されていること

### 技術的依存

- Tauri 2.x
- Nuxt 4.2.2
- Nuxt UI v4.2.1
- TypeScript 5.7.2

## 既知の制約

- SQLエディタウィンドウは、クエリビルダーと同様に接続ごとに1つまで起動可能
- Phase 1では空ページのみ表示し、実際のエディタUIはPhase 2で実装
- ウィンドウサイズのデフォルトは `1280x900`（クエリビルダーと同じ）
- 最小サイズは `1024x768`（クエリビルダーと同じ）

## 参考資料

- [WBS: SQLエディタ機能](../../local/20260117_エディタ機能/wbs.md) - Phase 1の詳細タスクリスト
- [ウィンドウ管理機能 詳細仕様](../../steering/features/window.md) - 既存のウィンドウ管理パターン
- [リポジトリ構造定義書](../../steering/04_repository_structure.md) - ファイル配置の規約
- [開発ガイドライン](../../steering/05_development_guidelines.md) - コーディング規約
- [Nuxt 4 ドキュメント](https://nuxt.com/docs) - Nuxt 4のページルーティング
- [Tauri 2 ドキュメント](https://v2.tauri.app) - ウィンドウ管理API

## 完了条件

Phase 1は以下の条件を満たした時点で完了とする：

- [x] ランチャーの接続カードに「エディタ」ボタンが表示される
- [x] ボタンクリックでSQLエディタウィンドウが開く
- [x] 同一接続で重複ウィンドウが開かない（既存にフォーカス）
- [x] ウィンドウタイトルに接続名と環境が表示される
- [x] 環境ヘッダーが表示され、環境色が適用される
- [x] 既存のクエリビルダー・ミューテーションビルダーに影響がない
- [x] TypeScriptコンパイルエラーがない
- [x] 動作確認テストが完了している

## 次のステップ

Phase 1完了後、以下の作業に進む：

1. **Phase 2: エディタUI基本構築** - CodeMirror 6またはPrism.jsを使用したテキストエディタの実装
2. **Phase 3: クエリ実行機能** - エディタに入力したSQLを実行し、結果を表示
3. **永続化ドキュメント更新** - `docs/steering/features/sql-editor.md` の作成（Phase 1-3完了後）
