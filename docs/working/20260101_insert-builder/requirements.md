# 要件定義書 - INSERTビルダー

## 概要

GUIでINSERT文を構築できる機能を実装します。データ変更クエリビルダー（`/mutation-builder`ページ）の一部として、テーブル選択・カラム値入力・複数行INSERT対応を含む直感的なINSERT文構築UIを提供します。

## 背景・目的

### 背景

- 現在、SELECTクエリビルダー（Phase 1.6）が完成し、クエリ実行・結果表示（Phase 2）、本番環境安全機能（Phase 3）、クエリ保存・履歴（Phase 4）が実装済み
- データ変更クエリ（INSERT/UPDATE/DELETE）をGUIで構築する機能が未実装
- Phase 8.1（共通基盤）の実装により、データ変更クエリビルダーの基盤が整う予定
- INSERTビルダーは、データ変更クエリビルダーの最初の実装として位置づけられる

### 目的

1. **直感的なINSERT文構築**: SQLを手書きせずに、GUIでINSERT文を構築できるようにする
2. **複数行INSERT対応**: 一度に複数行のデータを挿入できるようにする
3. **安全性の確保**: 本番環境での誤操作を防止する確認ダイアログと連携
4. **既存機能との統合**: クエリ保存・履歴機能との連携により、INSERT文の再利用を可能にする

## 要件一覧

### 機能要件

#### F-1: テーブル選択UI

- **説明**: 挿入先テーブルをGUIで選択できる
- **受け入れ条件**:
  - [ ] 左パネルのDatabaseTreeでテーブルをクリックすると、挿入先テーブルとして選択される
  - [ ] 右パネルに選択中のテーブル名が表示される
  - [ ] テーブル選択時に、そのテーブルのカラム情報が自動取得される

#### F-2: カラム・値入力UI

- **説明**: 選択したテーブルのカラムに対して値を入力できる
- **受け入れ条件**:
  - [ ] 選択テーブルの全カラムが一覧表示される
  - [ ] 各カラムの型情報（VARCHAR, INT, BOOLEAN等）が表示される
  - [ ] 型に応じた適切な入力コンポーネントが表示される（テキスト: UInput, 真偽値: UCheckbox等）
  - [ ] NULLを許可するカラムには「NULL」チェックボックスが表示される
  - [ ] PRIMARY KEYやAUTO_INCREMENTカラムには適切な注記が表示される

#### F-3: 複数行INSERT対応

- **説明**: 一度に複数行のデータを挿入できる
- **受け入れ条件**:
  - [ ] 「行追加」ボタンで新しい行の入力フォームが追加される
  - [ ] 各行ごとに独立した値入力が可能
  - [ ] 「行削除」ボタンで不要な行を削除できる
  - [ ] 最低1行は必須（全削除は不可）

#### F-4: INSERT SQL生成

- **説明**: 入力内容からINSERT文を自動生成する
- **受け入れ条件**:
  - [ ] 入力内容に応じてINSERT文が自動生成される
  - [ ] 複数行の場合は `INSERT INTO ... VALUES (...), (...), (...)` 形式で生成される
  - [ ] NULLチェックがある場合は値として `NULL` が設定される
  - [ ] 文字列値は適切にエスケープされる
  - [ ] データベース方言（PostgreSQL/MySQL/SQLite）に応じた構文が生成される

#### F-5: SQLプレビュー表示

- **説明**: 生成されたINSERT文を中央パネルでプレビュー表示する
- **受け入れ条件**:
  - [ ] 中央パネルに生成されたINSERT文が表示される
  - [ ] シンタックスハイライトが適用される
  - [ ] リアルタイムで入力内容に応じてプレビューが更新される

#### F-6: INSERT実行機能

- **説明**: 構築したINSERT文を実行できる
- **受け入れ条件**:
  - [ ] ツールバーの「実行」ボタンでINSERT文が実行される
  - [ ] 実行結果（挿入行数）が表示される
  - [ ] エラーが発生した場合は適切なエラーメッセージが表示される
  - [ ] 本番環境では確認ダイアログが表示される（Phase 3連携）

#### F-7: クエリ保存・履歴連携

- **説明**: 構築したINSERT文を保存・履歴に記録できる
- **受け入れ条件**:
  - [ ] ツールバーの「保存」ボタンでINSERT文を保存できる
  - [ ] INSERT実行時に履歴が自動記録される
  - [ ] 保存済みINSERT文を読み込んで再編集できる
  - [ ] 履歴からINSERT文を復元できる

### 非機能要件

- **パフォーマンス**:
  - カラム情報の取得は既存のDatabaseTree機構を活用し、高速に表示する
  - 100カラム以上のテーブルでも快適に操作できる
- **セキュリティ**:
  - SQLインジェクション対策として、値は適切にエスケープされる
  - 本番環境では確認ダイアログが表示される（Phase 3連携）
- **保守性**:
  - mutation-builderストアで状態管理を一元化
  - コンポーネントは責務を明確に分離（InsertPanel = 入力UI、Rust側 = SQL生成）

## スコープ

### 対象

- `/mutation-builder` ページのINSERTタブ機能
- テーブル選択・カラム値入力UI
- 複数行INSERT対応
- INSERT SQL生成エンジン（Rust）
- INSERT実行機能
- クエリ保存・履歴連携

### 対象外

- UPDATE/DELETEビルダー（Phase 8.3, 8.4で実装）
- 外部キー制約のバリデーション（Phase 8では実装しない）
- テーブル作成・ALTER TABLE等のDDL（当面対象外）
- トランザクション制御（当面対象外）

## 実装対象ファイル（予定）

### フロントエンド

- `app/components/mutation-builder/InsertPanel.vue` - INSERT入力UI（新規）
- `app/stores/mutation-builder.ts` - データ変更クエリストア（Phase 8.1で作成）
- `app/types/mutation-query.ts` - INSERT/UPDATE/DELETE型定義（Phase 8.1で作成）

### バックエンド（Rust）

- `src-tauri/src/query/mutation.rs` - INSERT/UPDATE/DELETE SQL生成エンジン（新規）
- `src-tauri/src/commands/mutation_commands.rs` - INSERT/UPDATE/DELETEコマンド（新規）

## 依存関係

### 前提条件

- **Phase 8.1（共通基盤）完了**:
  - MutationQueryModel型定義
  - mutation-builderストア
  - mutation-builder.vueページ
  - MutationBuilderLayout/Toolbar
  - トップページナビゲーション

### 既存機能との連携

- **Phase 1.6（クエリビルダー基盤）**: DatabaseTreeコンポーネントを再利用
- **Phase 2（クエリ実行・結果表示）**: execute_queryコマンドを活用
- **Phase 3（本番環境安全機能）**: DangerousQueryDialogと連携
- **Phase 4（クエリ保存・履歴）**: SaveQueryDialog、QueryHistorySlideoverと連携

## 既知の制約

- **データベース方言依存**: PostgreSQL/MySQL/SQLiteで構文が異なる部分がある（特にデフォルト値、RETURNING句等）
- **AUTO_INCREMENT対応**: データベースごとに自動採番の扱いが異なる（PostgreSQL: SERIAL、MySQL: AUTO_INCREMENT、SQLite: INTEGER PRIMARY KEY）
- **NULL許可判定**: データベース構造取得APIで`is_nullable`情報を取得できる前提
- **複雑な値**: JSON、ARRAY等の複雑な型は単純なテキスト入力で対応（高度な入力UIは将来実装）

## 参考資料

- `docs/sql_editor_wbs_v3.md` - Phase 8.2 INSERTビルダー仕様
- `docs/02_functional_design.md` - 機能設計書
- `docs/03_architecture_specifications.md` - 技術仕様書
- `app/components/query-builder/` - SELECTビルダーの実装パターン参考
- `src-tauri/src/query/builder.rs` - SELECTクエリ生成エンジン参考
