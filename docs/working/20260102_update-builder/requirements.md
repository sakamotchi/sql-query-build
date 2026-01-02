# 要件定義書 - UPDATEビルダー

## 概要

GUIでUPDATE文を構築できる機能を実装します。データ変更クエリビルダー（`/mutation-builder`ページ）の一部として、テーブル選択・SET句設定・WHERE条件設定を含む直感的なUPDATE文構築UIを提供します。

## 背景・目的

### 背景

- Phase 8.1（共通基盤）およびPhase 8.2（INSERTビルダー）の実装により、データ変更クエリビルダーの基盤とINSERT機能が完成
- UPDATE/DELETEクエリをGUIで構築する機能が未実装
- UPDATEビルダーは、INSERTビルダーに続く2番目のデータ変更機能として位置づけられる
- WHERE句なし更新の危険性を警告する安全機能が必要

### 目的

1. **直感的なUPDATE文構築**: SQLを手書きせずに、GUIでUPDATE文を構築できるようにする
2. **SET句とWHERE句の設定**: 更新するカラムと条件を分かりやすく設定できるようにする
3. **安全性の確保**: WHERE句なし更新の危険性を強く警告し、誤操作を防止する
4. **既存機能との統合**: クエリ保存・履歴機能、WhereTab再利用により、開発効率と一貫性を向上

## 要件一覧

### 機能要件

#### F-1: テーブル選択UI

- **説明**: 更新対象テーブルをGUIで選択できる
- **受け入れ条件**:
  - [ ] テーブルセレクトボックスでテーブルを選択できる（検索フィルター付き）
  - [ ] テーブル選択時に、そのテーブルのカラム情報が自動取得される
  - [ ] 選択中のテーブル名が上部に表示される

#### F-2: SET句設定UI（SETタブ）

- **説明**: 更新するカラムと値を設定できる
- **受け入れ条件**:
  - [ ] タブ構成で「SET」タブが表示される
  - [ ] 更新対象カラムを選択できる（ドロップダウン）
  - [ ] 選択したカラムに対して新しい値を入力できる
  - [ ] カラムの型情報（VARCHAR, INT, BOOLEAN等）が表示される
  - [ ] 型に応じた適切な入力コンポーネントが表示される
  - [ ] NULLを許可するカラムには「NULL」チェックボックスが表示される
  - [ ] 複数カラムの更新が可能
  - [ ] カラムの追加・削除ができる
  - [ ] 少なくとも1つのカラムを選択する必要がある（SET句が空の場合はエラー）

#### F-3: WHERE条件設定（WHEREタブ）

- **説明**: 更新対象行を絞り込む条件を設定できる
- **受け入れ条件**:
  - [ ] タブ構成で「WHERE」タブが表示される
  - [ ] WhereTab.vueコンポーネントを再利用してWHERE条件を設定できる
  - [ ] 複数条件の組み合わせ（AND/OR）が可能
  - [ ] 各種演算子（=, !=, >, <, LIKE, IN等）が使用可能

#### F-4: WHERE句なし警告

- **説明**: WHERE句がない場合に強い警告を表示する
- **受け入れ条件**:
  - [ ] WHERE条件が設定されていない場合、警告メッセージが表示される
  - [ ] 警告は目立つ色（赤色・オレンジ色）で表示される
  - [ ] 「全行が更新されます」という明示的なメッセージが表示される
  - [ ] SQLプレビューにも警告が表示される

#### F-5: UPDATE SQL生成

- **説明**: 入力内容からUPDATE文を自動生成する
- **受け入れ条件**:
  - [ ] SET句とWHERE句の設定に応じてUPDATE文が自動生成される
  - [ ] NULLチェックがある場合は値として `NULL` が設定される
  - [ ] 文字列値は適切にエスケープされる
  - [ ] データベース方言（PostgreSQL/MySQL/SQLite）に応じた構文が生成される
  - [ ] WHERE句がない場合も正しいSQL文が生成される

#### F-6: SQLプレビュー表示

- **説明**: 生成されたUPDATE文を下部パネルでプレビュー表示する
- **受け入れ条件**:
  - [ ] 下部パネルに生成されたUPDATE文が表示される
  - [ ] シンタックスハイライトが適用される
  - [ ] リアルタイムで入力内容に応じてプレビューが更新される
  - [ ] WHERE句がない場合は警告が表示される

#### F-7: UPDATE実行機能

- **説明**: 構築したUPDATE文を実行できる
- **受け入れ条件**:
  - [ ] ツールバーの「実行」ボタンでUPDATE文が実行される
  - [ ] 実行結果（影響行数）が表示される
  - [ ] エラーが発生した場合は適切なエラーメッセージが表示される
  - [ ] WHERE句がない場合は確認ダイアログが表示される（DangerousQueryDialog連携）
  - [ ] 本番環境では追加の確認ダイアログが表示される（Phase 3連携）

#### F-8: クエリ保存・履歴連携

- **説明**: 構築したUPDATE文を保存・履歴に記録できる
- **受け入れ条件**:
  - [ ] ツールバーの「保存」ボタンでUPDATE文を保存できる
  - [ ] UPDATE実行時に履歴が自動記録される
  - [ ] 保存済みUPDATE文を読み込んで再編集できる
  - [ ] 履歴からUPDATE文を復元できる

### 非機能要件

- **パフォーマンス**:
  - カラム情報の取得は既存の機構を活用し、高速に表示する
  - 100カラム以上のテーブルでも快適に操作できる
- **セキュリティ**:
  - SQLインジェクション対策として、値は適切にエスケープされる
  - WHERE句なし更新は強く警告される
  - 本番環境では確認ダイアログが表示される（Phase 3連携）
- **保守性**:
  - mutation-builderストアで状態管理を一元化
  - WhereTab.vueを再利用し、コードの重複を避ける
  - コンポーネントは責務を明確に分離（UpdatePanel = 入力UI、Rust側 = SQL生成）

## スコープ

### 対象

- `/mutation-builder` ページのUPDATEタブ機能
- テーブル選択・SET句設定UI
- WHERE条件設定UI（WhereTab再利用）
- UPDATE SQL生成エンジン（Rust）
- WHERE句なし警告機能
- UPDATE実行機能
- クエリ保存・履歴連携

### 対象外

- DELETEビルダー（Phase 8.4で実装）
- 外部キー制約のバリデーション（Phase 8では実装しない）
- テーブル作成・ALTER TABLE等のDDL（当面対象外）
- トランザクション制御（当面対象外）
- JOIN句を含むUPDATE（当面対象外）

## 実装対象ファイル（予定）

### フロントエンド

- `app/components/mutation-builder/UpdatePanel.vue` - UPDATE入力UI（新規）
- `app/components/mutation-builder/SetTab.vue` - SET句設定タブ（新規）
- `app/components/mutation-builder/WhereTab.vue` - WHERE条件設定タブ（既存を再利用、必要に応じて拡張）
- `app/stores/mutation-builder.ts` - データ変更クエリストア（拡張）
- `app/types/mutation-query.ts` - UPDATE型定義（拡張）

### バックエンド（Rust）

- `src-tauri/src/query/mutation.rs` - UPDATE SQL生成エンジン（拡張）
- `src-tauri/src/commands/mutation_commands.rs` - UPDATEコマンド（拡張）

## 依存関係

### 前提条件

- **Phase 8.1（共通基盤）完了**:
  - MutationQueryModel型定義
  - mutation-builderストア
  - mutation-builder.vueページ
  - MutationBuilderLayout/Toolbar
- **Phase 8.2（INSERTビルダー）完了**:
  - InsertPanel.vue
  - generate_insert_sql, execute_mutation コマンド

### 既存機能との連携

- **Phase 1.6（クエリビルダー基盤）**: DatabaseTree、WhereTab.vueコンポーネントを再利用
- **Phase 2（クエリ実行・結果表示）**: execute_queryコマンドを活用
- **Phase 3（本番環境安全機能）**: DangerousQueryDialogと連携
- **Phase 4（クエリ保存・履歴）**: SaveQueryDialog、QueryHistorySlideoverと連携

## 既知の制約

- **データベース方言依存**: PostgreSQL/MySQL/SQLiteで構文が異なる部分がある
- **JOIN句を含むUPDATE**: PostgreSQL/MySQL/SQLiteで構文が大きく異なるため、Phase 8では単一テーブルのUPDATEのみ対応
- **複雑な値**: JSON、ARRAY等の複雑な型は単純なテキスト入力で対応（高度な入力UIは将来実装）
- **WHERE句なしの危険性**: ユーザーの誤操作を完全に防ぐことはできないため、警告の強化と確認ダイアログで対応

## 参考資料

- `docs/sql_editor_wbs_v3.md` - Phase 8.3 UPDATEビルダー仕様
- `docs/02_functional_design.md` - 機能設計書
- `docs/03_architecture_specifications.md` - 技術仕様書
- `docs/working/20260101_insert-builder/` - INSERTビルダー実装パターン参考
- `app/components/query-builder/WhereTab.vue` - WHERE条件設定UI参考
- `src-tauri/src/query/mutation.rs` - SQL生成エンジン参考
