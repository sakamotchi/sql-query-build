# 要件定義書 - データベース構造の段階的取得（パフォーマンス改善）

## 概要

SQLエディタ画面表示時にデータベース構造（テーブル・カラム・インデックス・外部キー等）を一括取得している現在の方式を、段階的な取得方式に変更する。テーブル数が多いデータベースでもコードアシスト（補完機能）が速やかに利用可能になることを目指す。

## 現状の問題点

### パフォーマンス課題

現在のデータベース構造取得処理は、接続確立時に `get_database_structure` コマンドで全スキーマ・全テーブル・全カラム・全インデックス・全外部キーを一括取得している。

- **症状**: テーブル数が多いデータベース（100テーブル以上）でSQLエディタを開くと、コードアシスト（テーブル名補完）が利用可能になるまで長時間待たされる
- **影響範囲**: SQLエディタ画面（`sql-editor.vue`）のコードアシスト機能、およびクエリビルダー（`DatabaseTree.vue`）のテーブルツリー表示
- **発生頻度**: テーブル数が多いデータベースに接続するたびに必ず発生

### 現状の測定値

- **PostgreSQL（100テーブル）**: 約5-10秒（スキーマ単位の一括クエリで最適化済み）
- **MySQL（100テーブル）**: 約20-60秒（テーブルごとに5クエリ × 100テーブル = 500クエリ実行）
- **SQLite（100テーブル）**: 約2-5秒（ローカルファイルアクセスだがテーブルごとに個別クエリ）
- **補完が利用可能になるまでの時間**: 上記の全構造取得完了後

### ボトルネック分析

1. **MySQL の N+1 クエリ問題**: テーブルごとに `get_columns`, `get_indexes`, `get_foreign_keys`, `get_foreign_key_references`, `get_primary_key` の5クエリを実行（`mysql_inspector.rs:114-162`）
2. **全データの一括取得**: コードアシストに必要なのはテーブル名だけだが、カラム・インデックス・外部キーも含めた全情報を取得完了するまで補完が使えない
3. **システムスキーマの不要な取得**: `information_schema` 等のシステムスキーマも取得対象に含まれている

## 目標値

### パフォーマンス目標

#### T-1: テーブル名補完が利用可能になるまでの時間

- **現状**: 全構造取得完了まで5-60秒（DB種別・テーブル数に依存）
- **目標**: 2秒以内（100テーブル規模、全DB種別共通）
- **優先度**: 高
- **達成条件**:
  - [ ] 接続確立後2秒以内にテーブル名の補完候補がコードアシストに表示される
  - [ ] テーブル名一覧の取得は各DB種別で1-2クエリのみ使用する

#### T-2: MySQL全構造取得時間

- **現状**: 100テーブルで20-60秒（500クエリ実行）
- **目標**: 5秒以内（バッチクエリ化で5-10クエリに削減）
- **優先度**: 高
- **達成条件**:
  - [ ] MySQL の構造取得がスキーマ単位の一括クエリで実行される
  - [ ] 100テーブル規模で現状比80%以上の時間短縮

#### T-3: カラム補完のオンデマンド取得時間

- **現状**: N/A（全構造取得完了後にのみ利用可能）
- **目標**: 1テーブルあたり500ms以内
- **優先度**: 中
- **達成条件**:
  - [ ] `.` 入力後500ms以内にカラム補完候補が表示される
  - [ ] 取得中はローディング状態が表示される

### 非機能要件

- **互換性**: 既存の `get_database_structure` コマンドおよびフロントエンドの `fetchDatabaseStructure` アクションを廃止せず、後方互換を維持する
- **保守性**: 新規コマンド・型定義は既存のパターン（`DatabaseInspector` トレイト、Tauri IPC、Piniaストア）に準拠する
- **テスト容易性**: パフォーマンス改善の効果を各DB種別で測定可能にする
- **エラー耐性**: 段階的取得の一部が失敗しても、取得済みデータでの補完は維持される

## 改善対象範囲

### 対象

- バックエンド: テーブル名一覧の高速取得コマンド新設（全3種DB対応）
- バックエンド: MySQLインスペクターのバッチクエリ化
- フロントエンド: ストアの段階的ロード状態管理
- フロントエンド: 補完機能のサマリーデータ対応・オンデマンドカラム取得
- フロントエンド: SQLエディタページの取得フロー変更
- フロントエンド: バックグラウンド詳細取得ロジック
- フロントエンド: ローディング状態のUI表示

### 対象外

- IndexedDB等への永続化キャッシュ（将来対応）
- サーバーサイドでの補完候補生成
- データベース構造の差分更新機能
- 新規DB種別の対応

## ボトルネック仮説

現時点で推測されるボトルネック：

- **MySQL**: テーブルごとに5クエリを実行する N+1 問題が最大のボトルネック（`mysql_inspector.rs` の `get_tables` メソッド）
- **全DB共通**: コードアシストに不要な詳細情報（インデックス、外部キー等）も含めて一括取得しているため、初期表示が遅い
- **全DB共通**: システムスキーマの不要な取得がオーバーヘッドとなっている

## 最適化対象ファイル（予定）

### バックエンド（Rust）

| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/src/models/database_structure.rs` | 軽量構造体（`DatabaseStructureSummary`, `SchemaSummary`, `TableSummary`）追加 |
| `src-tauri/src/database/inspector.rs` | `DatabaseInspector` トレイトに `get_table_summaries` メソッド追加 |
| `src-tauri/src/database/postgresql_inspector.rs` | テーブル名のみ高速取得メソッド実装 |
| `src-tauri/src/database/mysql_inspector.rs` | テーブル名高速取得 + バッチクエリ化（`get_all_columns_in_schema` 等） |
| `src-tauri/src/database/sqlite_inspector.rs` | テーブル名のみ高速取得メソッド実装 |
| `src-tauri/src/commands/database_structure.rs` | `get_database_structure_summary` コマンド追加 |
| `src-tauri/src/lib.rs` | 新コマンドの登録 |

### フロントエンド（TypeScript/Vue）

| ファイル | 変更内容 |
|---------|---------|
| `app/types/database-structure.ts` | `DatabaseStructureSummary`, `SchemaSummary`, `TableSummary` 型追加 |
| `app/api/database-structure.ts` | `getDatabaseStructureSummary` API メソッド追加 |
| `app/stores/database-structure.ts` | 段階的ロード状態管理、バックグラウンド取得ロジック |
| `app/composables/useSqlCompletion.ts` | サマリーデータ対応、オンデマンドカラム取得 |
| `app/pages/sql-editor.vue` | フェーズ1取得への切り替え |
| `app/components/sql-editor/SqlTextEditor.vue` | ローディング状態UI表示 |

## 依存関係

- 既存の接続管理機能（`Connection`, `connectionId`, パスワード取得）
- `DatabaseInspector` トレイト（`src-tauri/src/database/inspector.rs`）
- Monaco Editor の `CompletionItemProvider` API
- 各データベースの `information_schema` 系テーブル / `sqlite_master`
- Tauri IPC（`invoke()` API）

## 既知の制約

- バックグラウンド取得の順序制御はベストエフォートとする（厳密な優先度制御は行わない）
- SQLite はローカルファイルアクセスのため、段階的ロードの効果は限定的（ただし統一的なAPIとして対応する）
- システムスキーマの除外判定はDB種別ごとに異なるため、各インスペクターで個別実装する
- 既存のクエリビルダー・ミューテーションビルダーは当面 `fetchDatabaseStructure`（全構造取得）を継続使用する

## ベンチマーク方針

### 測定方法

- **Rust側**: `std::time::Instant` を使用して各クエリの実行時間を計測、ログ出力
- **フロントエンド側**: `performance.now()` でコマンド呼び出しからレスポンスまでの時間を計測
- **ユーザー体感**: 接続確立からテーブル名補完が利用可能になるまでの経過時間

### 測定環境

- **OS**: macOS（開発環境）
- **テストDB**: PostgreSQL / MySQL / SQLite の各種別で100テーブル規模のサンプルDB

## 参考資料

- 現行のデータベース構造取得: `src-tauri/src/commands/database_structure.rs`
- PostgreSQL最適化済み実装（バッチクエリ参考）: `src-tauri/src/database/postgresql_inspector.rs`
- 補完機能: `app/composables/useSqlCompletion.ts`
- ストア: `app/stores/database-structure.ts`
- 技術仕様書: `docs/steering/03_architecture_specifications.md`
- ユビキタス言語定義書: `docs/steering/06_ubiquitous_language.md`
