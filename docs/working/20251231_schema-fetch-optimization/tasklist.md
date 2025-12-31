# タスクリスト - スキーマ取得最適化

## 進捗サマリー

| Phase | 完了 / 全体 | 進捗率 | 状態 |
|-------|------------|--------|------|
| 7.1.1 計測基盤整備 | 0 / 5 | 0% | 📝 未着手 |
| 7.1.2 キャッシュ機構設計 | 0 / 3 | 0% | 📝 未着手 |
| 7.1.3 スキーマキャッシュ実装 | 0 / 7 | 0% | 📝 未着手 |
| 7.1.4 増分取得API実装 | 0 / 5 | 0% | 📝 未着手 |
| 7.1.5 バックグラウンド更新 | 0 / 4 | 0% | 📝 未着手 |
| **全体** | **0 / 24** | **0%** | 📝 未着手 |

## Phase 7.1.1: DB構造取得処理の計測

**目的**: 現状のパフォーマンスを測定し、ボトルネックを特定する

### タスク一覧

- [ ] **7.1.1-1: ベンチマークDB準備**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 2h
  - 依存: なし
  - 説明:
    - PostgreSQL, MySQL, SQLiteの3種類のDBを準備
    - 各DBで3サイズ（小: 10テーブル、中: 100テーブル、大: 500テーブル）
    - スクリプトで自動生成できるようにする
  - 完了条件:
    - [ ] PostgreSQL Dockerコンテナを起動
    - [ ] MySQL Dockerコンテナを起動
    - [ ] SQLiteデータベースファイルを作成
    - [ ] 各DBに3サイズのテーブルを生成するスクリプトを作成
  - 成果物:
    - `scripts/benchmark/create-benchmark-db.sh`
    - `scripts/benchmark/README.md`

- [ ] **7.1.1-2: Rust側計測コード追加**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: なし
  - 説明:
    - `std::time::Instant`を使って各処理の所要時間を計測
    - `eprintln!`でログ出力（本番では無効化できるようにする）
  - 完了条件:
    - [ ] `get_database_structure`に計測コードを追加
    - [ ] `get_schemas`に計測コードを追加
    - [ ] `get_tables`に計測コードを追加
    - [ ] `get_columns`に計測コードを追加
  - 対象ファイル:
    - `src-tauri/src/commands/database_structure.rs`
    - `src-tauri/src/database/postgresql_inspector.rs`
    - `src-tauri/src/database/mysql_inspector.rs`
    - `src-tauri/src/database/sqlite_inspector.rs`

- [ ] **7.1.1-3: TypeScript側計測コード追加**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 0.5h
  - 依存: なし
  - 説明:
    - `performance.now()`を使って各処理の所要時間を計測
    - `console.log`でログ出力
  - 完了条件:
    - [ ] `fetchDatabaseStructure`に計測コードを追加
  - 対象ファイル:
    - `app/stores/database-structure.ts`

- [ ] **7.1.1-4: ベンチマーク実行とデータ収集**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 2h
  - 依存: 7.1.1-1, 7.1.1-2, 7.1.1-3
  - 説明:
    - 各DB種別×3サイズでベンチマークを実行
    - 結果をスプレッドシート or Markdown表にまとめる
  - 完了条件:
    - [ ] PostgreSQL（小/中/大）で計測完了
    - [ ] MySQL（小/中/大）で計測完了
    - [ ] SQLite（小/中/大）で計測完了
    - [ ] 結果を `docs/working/20251231_schema-fetch-optimization/benchmark-results.md` に記録
  - 成果物:
    - `docs/working/20251231_schema-fetch-optimization/benchmark-results.md`

- [ ] **7.1.1-5: ボトルネック分析とドキュメント更新**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.1-4
  - 説明:
    - ベンチマーク結果からボトルネックを特定
    - `design.md`の「Before」「ボトルネック分析」を実測データで更新
  - 完了条件:
    - [ ] ボトルネックトップ3を特定
    - [ ] `design.md`を更新
    - [ ] 次Phaseの優先順位を決定
  - 対象ファイル:
    - `docs/working/20251231_schema-fetch-optimization/design.md`

---

## Phase 7.1.2: キャッシュ機構の設計

**目的**: キャッシュ戦略を策定し、実装方針を決定する

### タスク一覧

- [ ] **7.1.2-1: キャッシュ戦略の策定**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.1-5
  - 説明:
    - LRU + TTL方式の詳細を決定
    - キャッシュサイズ（デフォルト: 10接続）
    - TTL（デフォルト: 5分）
    - 無効化タイミング（手動リフレッシュ、TTL満了、アプリ再起動）
  - 完了条件:
    - [ ] キャッシュサイズを決定
    - [ ] TTL値を決定
    - [ ] 無効化タイミングを定義
    - [ ] `design.md`に戦略を記載

- [ ] **7.1.2-2: データ構造設計**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.2-1
  - 説明:
    - `CacheMetadata`構造体の設計
    - `CacheEntry`構造体の設計
    - `SchemaCache`サービスのAPI設計
  - 完了条件:
    - [ ] `CacheMetadata`の型定義を作成
    - [ ] `CacheEntry`の型定義を作成
    - [ ] `SchemaCache`のトレイト/メソッドを定義
    - [ ] `design.md`に詳細を記載

- [ ] **7.1.2-3: 設計レビューと最終化**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 0.5h
  - 依存: 7.1.2-2
  - 説明:
    - 設計を見直し、問題点がないか確認
    - 必要に応じて修正
  - 完了条件:
    - [ ] 設計レビュー完了
    - [ ] Phase 7.1.3の実装準備完了

---

## Phase 7.1.3: スキーマキャッシュ実装（Rust）

**目的**: バックエンド側にキャッシュ機構を実装し、2回目以降の取得を高速化する

### タスク一覧

- [ ] **7.1.3-1: CacheMetadata型実装**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 0.5h
  - 依存: 7.1.2-3
  - 説明:
    - `src-tauri/src/models/cache_metadata.rs`を新規作成
    - `CacheMetadata`構造体を実装
    - `is_expired()`メソッドを実装
  - 完了条件:
    - [ ] `CacheMetadata`構造体を実装
    - [ ] TTLチェック機能を実装
    - [ ] ユニットテストを追加
  - 成果物:
    - `src-tauri/src/models/cache_metadata.rs`

- [ ] **7.1.3-2: SchemaCacheサービス実装**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 2h
  - 依存: 7.1.3-1
  - 説明:
    - `src-tauri/src/services/schema_cache.rs`を新規作成
    - `SchemaCache`構造体を実装（LRU + TTL）
    - `get()`, `put()`, `invalidate()`, `clear()`メソッドを実装
  - 完了条件:
    - [ ] `SchemaCache`構造体を実装
    - [ ] LRUキャッシュを統合（`lru` crate）
    - [ ] TTL機能を実装
    - [ ] ユニットテストを追加
  - 成果物:
    - `src-tauri/src/services/schema_cache.rs`
  - 依存パッケージ:
    - `lru = "0.12"` (Cargo.tomlに追加)

- [ ] **7.1.3-3: Tauriアプリ状態にキャッシュを追加**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 0.5h
  - 依存: 7.1.3-2
  - 説明:
    - `src-tauri/src/lib.rs`でアプリ起動時に`SchemaCache`を初期化
    - Tauriの状態管理に`SchemaCache`を追加
  - 完了条件:
    - [ ] `SchemaCache`をアプリ状態に追加
    - [ ] 全コマンドから`State<SchemaCache>`でアクセス可能
  - 対象ファイル:
    - `src-tauri/src/lib.rs`

- [ ] **7.1.3-4: get_database_structureコマンドにキャッシュ統合**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.3-3
  - 説明:
    - `get_database_structure`コマンドでキャッシュをチェック
    - キャッシュヒット時は即座に返却
    - キャッシュミス時はDB取得後にキャッシュに保存
  - 完了条件:
    - [ ] キャッシュヒット時のロジックを実装
    - [ ] キャッシュミス時のロジックを実装
    - [ ] ログ出力を追加（キャッシュヒット/ミスを記録）
  - 対象ファイル:
    - `src-tauri/src/commands/database_structure.rs`

- [ ] **7.1.3-5: SQL並列化の実装**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 2h
  - 依存: 7.1.3-4
  - 説明:
    - `get_schemas()`でスキーマごとの取得を並列化
    - `tokio::join_all`を使用
  - 完了条件:
    - [ ] スキーマ取得を並列化
    - [ ] テーブル取得を並列化（オプション）
    - [ ] 接続プールサイズを適切に設定
  - 対象ファイル:
    - `src-tauri/src/database/postgresql_inspector.rs`
    - `src-tauri/src/database/mysql_inspector.rs`
    - `src-tauri/src/database/sqlite_inspector.rs`

- [ ] **7.1.3-6: キャッシュ無効化コマンド実装**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 0.5h
  - 依存: 7.1.3-4
  - 説明:
    - `invalidate_structure_cache`コマンドを追加
    - `clear_structure_cache`コマンドを追加
  - 完了条件:
    - [ ] `invalidate_structure_cache`を実装
    - [ ] `clear_structure_cache`を実装
  - 対象ファイル:
    - `src-tauri/src/commands/database_structure.rs`

- [ ] **7.1.3-7: ベンチマーク測定（改善効果確認）**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.3-6
  - 説明:
    - Phase 7.1.1と同じ条件でベンチマーク実行
    - 改善効果を確認（目標: キャッシュヒット時100ms以内）
  - 完了条件:
    - [ ] 初回取得時間を計測
    - [ ] 2回目取得時間を計測（キャッシュヒット）
    - [ ] 結果を `benchmark-results.md` に追記
    - [ ] `design.md`の「After」セクションを更新
  - 成果物:
    - `docs/working/20251231_schema-fetch-optimization/benchmark-results.md`（更新）

---

## Phase 7.1.4: 増分取得API実装

**目的**: 構造の変更部分のみを取得し、不要な再取得を削減する

### タスク一覧

- [ ] **7.1.4-1: 構造データハッシュ計算機能**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.3-7
  - 説明:
    - `DatabaseStructure`からハッシュ値を計算する関数を実装
    - 軽量なハッシュ関数を使用（`xxhash-rust`等）
  - 完了条件:
    - [ ] ハッシュ計算関数を実装
    - [ ] `CacheMetadata`にハッシュ値を保存
  - 対象ファイル:
    - `src-tauri/src/models/cache_metadata.rs`
  - 依存パッケージ:
    - `xxhash-rust = "0.8"` (Cargo.tomlに追加、検討中)

- [ ] **7.1.4-2: get_database_structure_incrementalコマンド実装**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 2h
  - 依存: 7.1.4-1
  - 説明:
    - 前回のハッシュ値を受け取り、現在のハッシュと比較
    - 変更がない場合は空のレスポンス
    - 変更がある場合は変更部分のみ返却
  - 完了条件:
    - [ ] `get_database_structure_incremental`コマンドを実装
    - [ ] ハッシュ比較ロジックを実装
    - [ ] 変更検知ロジックを実装
  - 対象ファイル:
    - `src-tauri/src/commands/database_structure.rs`

- [ ] **7.1.4-3: フロントエンド側API追加**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 0.5h
  - 依存: 7.1.4-2
  - 説明:
    - `getDatabaseStructureIncremental()`をAPIに追加
  - 完了条件:
    - [ ] `getDatabaseStructureIncremental()`を実装
  - 対象ファイル:
    - `app/api/database-structure.ts`

- [ ] **7.1.4-4: ストア側の差分適用ロジック実装**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 1.5h
  - 依存: 7.1.4-3
  - 説明:
    - 増分データを既存の構造データにマージ
    - ハッシュ値を保存
  - 完了条件:
    - [ ] 差分適用ロジックを実装
    - [ ] ハッシュ値の保存・比較を実装
  - 対象ファイル:
    - `app/stores/database-structure.ts`

- [ ] **7.1.4-5: ベンチマーク測定**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.4-4
  - 説明:
    - 増分取得のパフォーマンスを測定
    - 変更なし/一部変更のケースを測定
  - 完了条件:
    - [ ] 変更なしケースで100ms以内を確認
    - [ ] 一部変更ケースで500ms以内を確認
    - [ ] 結果を `benchmark-results.md` に追記

---

## Phase 7.1.5: バックグラウンド更新機能

**目的**: UI非ブロックでの構造取得を実現し、ユーザー体験を向上させる

### タスク一覧

- [ ] **7.1.5-1: フロントエンド側の非同期取得ロジック実装**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.4-5
  - 説明:
    - `fetchDatabaseStructure()`に`background`パラメータを追加
    - キャッシュがある場合は即座に表示、バックグラウンドで更新
  - 完了条件:
    - [ ] バックグラウンド取得モードを実装
    - [ ] キャッシュ表示 + バックグラウンド更新のロジックを実装
  - 対象ファイル:
    - `app/stores/database-structure.ts`

- [ ] **7.1.5-2: ローディングUI改善**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.5-1
  - 説明:
    - `DatabaseTree.vue`のローディング表示を改善
    - スケルトンローディングまたはプログレスバーを追加
  - 完了条件:
    - [ ] ローディング中の視覚的フィードバックを追加
    - [ ] キャッシュ表示中の「更新中」インジケーターを追加
  - 対象ファイル:
    - `app/components/query-builder/DatabaseTree.vue`

- [ ] **7.1.5-3: 手動リフレッシュ機能の実装**
  - 優先度: 中
  - 担当者: -
  - 見積もり: 0.5h
  - 依存: 7.1.5-2
  - 説明:
    - リフレッシュボタンをUIに追加
    - `refreshDatabaseStructure()`を呼び出してキャッシュを無効化し再取得
  - 完了条件:
    - [ ] リフレッシュボタンをUIに追加
    - [ ] `refreshDatabaseStructure()`が正しく動作
  - 対象ファイル:
    - `app/components/query-builder/DatabaseTree.vue`
    - `app/stores/database-structure.ts`

- [ ] **7.1.5-4: 最終ベンチマーク測定**
  - 優先度: 高
  - 担当者: -
  - 見積もり: 1h
  - 依存: 7.1.5-3
  - 説明:
    - 全機能統合後の最終パフォーマンス測定
    - 目標値の達成確認
  - 完了条件:
    - [ ] UIブロック時間がゼロであることを確認
    - [ ] 全目標値（T-1〜T-4）の達成を確認
    - [ ] `design.md`の「After」セクションを最終更新
    - [ ] `requirements.md`の達成条件にチェックを入れる
  - 成果物:
    - `docs/working/20251231_schema-fetch-optimization/benchmark-results.md`（最終版）

---

## 未解決事項

- [ ] キャッシュサイズ・TTLの最適値（Phase 7.1.1の計測後に決定）
- [ ] 並列化時の最適な接続プールサイズ（Phase 7.1.3で調整）
- [ ] 増分取得のハッシュアルゴリズム選定（Phase 7.1.4で決定）
- [ ] メモリリーク調査（Phase 7.1.5で実施）

## 完了条件（Phase 7.1全体）

- [ ] T-1: DB構造取得時間（初回）が目標値以内
  - [ ] 小規模DB（10テーブル）: 500ms以下
  - [ ] 中規模DB（100テーブル）: 2秒以内
  - [ ] 大規模DB（500テーブル）: 5秒以内
- [ ] T-2: DB構造取得時間（2回目以降）が目標値以内
  - [ ] キャッシュヒット時: 100ms以内
- [ ] T-3: メモリ使用量増加が目標値以内
  - [ ] 大規模DB（500テーブル）で10MB以内の増加
- [ ] T-4: UIブロック時間がゼロ
  - [ ] 構造取得中もUI操作可能
  - [ ] ローディング状態を視覚的に表示
  - [ ] 取得完了時に自動更新

## 次のステップ

1. Phase 7.1.1を開始し、ベンチマークDBの準備と計測コードの実装を行う
2. 実測データで`design.md`を更新
3. Phase 7.1.2〜7.1.5を順次実装
4. 最終的に`testing.md`に従って総合テストを実施
