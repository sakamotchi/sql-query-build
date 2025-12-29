# 要件定義書 - テストコード追加

## 概要

フロントエンド（Vue/Nuxt）およびバックエンド（Rust/Tauri）のテストカバレッジを向上させるため、不足しているテストコードを追加します。

## 背景・目的

現状のテストカバレッジ：
- **フロントエンド**: 12%（85ファイル中10ファイルにテスト）
- **バックエンド**: 30%（76ファイル中23ファイルにテスト）

特に以下の重要機能にテストがないため、品質担保とリグレッション防止のためにテストを追加します：
- SQL Generator（バックエンド）- アプリのコア機能、完全未テスト
- Query Builder Store（フロントエンド）- メイン機能の状態管理
- Query Converter Utils（フロントエンド）- SQL変換ロジック

## 要件一覧

### 機能要件

#### F-1: バックエンド SQL Generator のテスト追加

- **説明**: SQL生成機能（sql_generator/）の全13ファイルにテストを追加
- **受け入れ条件**:
  - [ ] SqlBuilder のユニットテストが存在する
  - [ ] SELECT/FROM/WHERE/JOIN/ORDER BY/GROUP BY/LIMIT 各句のテストが存在する
  - [ ] MySQL/PostgreSQL/SQLite 各Dialectのテストが存在する
  - [ ] `cargo test` が全てパスする

#### F-2: バックエンド Commands 層のテスト追加

- **説明**: query.rs, database_structure.rs, security.rs のテスト追加
- **受け入れ条件**:
  - [ ] 各コマンドの正常系テストが存在する
  - [ ] エラーハンドリングのテストが存在する

#### F-3: フロントエンド Stores のテスト追加

- **説明**: query-builder.ts, database-structure.ts のテスト追加
- **受け入れ条件**:
  - [ ] ストアの初期状態テストが存在する
  - [ ] 各アクションのテストが存在する
  - [ ] `npm run test:run` が全てパスする

#### F-4: フロントエンド Utils のテスト追加

- **説明**: query-converter.ts のテスト追加
- **受け入れ条件**:
  - [ ] 各変換関数のテストが存在する
  - [ ] エッジケースのテストが存在する

#### F-5: フロントエンド API のテスト追加

- **説明**: database-structure.ts, query.ts のテスト追加
- **受け入れ条件**:
  - [ ] Tauri invoke のモック化ができている
  - [ ] 正常系・異常系のテストが存在する

#### F-6: フロントエンド Composables のテスト追加

- **説明**: useProviderChangeDialog.ts, useProviderSwitch.ts, useTableSelection.ts のテスト追加
- **受け入れ条件**:
  - [ ] 各composableの基本動作テストが存在する

### 非機能要件

- **保守性**: テストコードは既存のテストパターンに準拠すること
- **実行速度**: 全テストが2分以内に完了すること

## スコープ

### 対象

- バックエンド: `src-tauri/src/sql_generator/`（13ファイル）
- バックエンド: `src-tauri/src/commands/`（3ファイル）
- フロントエンド: `app/stores/`（2ファイル）
- フロントエンド: `app/utils/`（1ファイル）
- フロントエンド: `app/api/`（2ファイル）
- フロントエンド: `app/composables/`（3ファイル）

### 対象外

- コンポーネントテスト（63ファイル）- 工数が大きいため別作業とする
- ページテスト（4ファイル）- E2Eテストとして別作業とする
- Database Inspectors のインテグレーションテスト - DB接続が必要なため別作業とする

## 実装対象ファイル（予定）

### バックエンド（新規作成）

- `src-tauri/src/sql_generator/builder_test.rs`
- `src-tauri/src/sql_generator/clause/select_test.rs`
- `src-tauri/src/sql_generator/clause/from_test.rs`
- `src-tauri/src/sql_generator/clause/where_test.rs`
- `src-tauri/src/sql_generator/clause/join_test.rs`
- `src-tauri/src/sql_generator/clause/order_by_test.rs`
- `src-tauri/src/sql_generator/clause/group_by_test.rs`
- `src-tauri/src/sql_generator/clause/limit_test.rs`
- `src-tauri/src/sql_generator/dialects/mysql_test.rs`
- `src-tauri/src/sql_generator/dialects/postgres_test.rs`
- `src-tauri/src/sql_generator/dialects/sqlite_test.rs`

### フロントエンド（新規作成）

- `tests/stores/query-builder.spec.ts`
- `tests/stores/database-structure.spec.ts`
- `tests/utils/query-converter.spec.ts`
- `tests/api/database-structure.spec.ts`
- `tests/api/query.spec.ts`
- `tests/composables/useProviderChangeDialog.spec.ts`
- `tests/composables/useProviderSwitch.spec.ts`
- `tests/composables/useTableSelection.spec.ts`

## 依存関係

- 既存のテストフレームワーク（Vitest, Rust test）
- 既存のモック設定

## 既知の制約

- フロントエンドのComposablesテストでNuxt環境問題（`[nuxt] instance unavailable`）が発生する可能性がある
- Database Inspectorsは実際のDB接続が必要なためスコープ外

## 参考資料

- 既存テストファイル: `tests/`, `src-tauri/src/**/tests.rs`
- テストパターン: `tests/stores/connection.spec.ts`, `src-tauri/src/crypto/encryption.rs`
