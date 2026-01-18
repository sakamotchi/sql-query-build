# 要件定義書 - SQLエディタ Phase 5: クエリ履歴機能

## 概要

SQLエディタで実行したクエリの履歴を自動保存し、後から参照・再実行できるようにする。実行履歴を確認することで、過去の作業を振り返り、トラブルシューティングや作業の効率化を支援する。

**重要**: この履歴機能は既存のQuery Builder用履歴機能（`app/stores/query-history.ts`）とは独立した、SQLエディタ専用の履歴機能です。

## 背景・目的

### 現在の状態（Phase 4完了時点）

- ✅ SQLエディタでクエリを記述・実行できる
- ✅ 実行結果がテーブル形式で表示される
- ✅ クエリに名前をつけて保存できる（保存クエリ機能）
- ✅ 保存済みクエリを検索・読み込み・実行できる

### 課題

1. **実行記録の不在**: 何を実行したか、いつ実行したか、結果はどうだったかの記録がない
2. **トラブルシューティングの困難さ**: エラーが発生した際に過去の実行内容を振り返れない
3. **作業履歴の可視性**: 今日何をしたか、どのクエリを実行したかが分からない
4. **再実行の手間**: 同じクエリを再度実行するには、エディタに再入力またはコピペが必要

### 目的

- クエリ実行時に自動で履歴を保存する
- 履歴を時系列で一覧表示し、過去の作業を振り返られるようにする
- 履歴からワンクリックでエディタに読み込み・再実行できるようにする
- 実行結果（成功/失敗、実行時間、影響行数）を記録し、パフォーマンス分析に役立てる
- アプリケーション再起動後も履歴が維持される

### 保存クエリ機能との違い

| 項目 | 保存クエリ（Phase 4） | 履歴機能（Phase 5） |
|------|---------------------|-------------------|
| 目的 | よく使うクエリの再利用 | 実行記録の参照 |
| 保存タイミング | 手動（保存ボタン） | 自動（実行時） |
| メタデータ | 名前・説明・タグ | 実行日時・結果・実行時間 |
| 保存対象 | 厳選したクエリのみ | 全ての実行クエリ |
| 削除 | 手動削除 | 自動削除（古いものから） |

## 要件一覧

### 機能要件

#### F-1: クエリ実行時の自動履歴保存

- **説明**: クエリ実行時に実行内容と結果を自動的に履歴として保存する
- **受け入れ条件**:
  - [ ] クエリ実行（Ctrl+Enter）時に履歴が自動保存される
  - [ ] 保存される情報:
    - [ ] 実行したSQL文
    - [ ] 実行日時（ISO 8601形式）
    - [ ] 接続ID
    - [ ] 実行ステータス（success/error）
    - [ ] 実行時間（ミリ秒）
    - [ ] 結果行数（SELECT時）またはエラーメッセージ（失敗時）
  - [ ] 保存処理は非同期で実行され、UIをブロックしない
  - [ ] 保存失敗時もクエリ実行自体は成功する（履歴保存は副次的処理）

#### F-2: 履歴パネルの表示

- **説明**: 実行履歴を時系列で一覧表示するパネルを提供する
- **受け入れ条件**:
  - [ ] SQLエディタの右側にサイドパネルが表示される
  - [ ] サイドパネルには現在の接続に紐づく履歴が一覧表示される
  - [ ] 各履歴には以下が表示される:
    - [ ] 実行日時（相対時間表示: 「5分前」「今日 14:32」）
    - [ ] SQL文（先頭1-2行を省略表示、最大80文字）
    - [ ] ステータスバッジ（成功：緑、失敗：赤）
    - [ ] 実行時間（例: 「0.123秒」）
    - [ ] 結果行数（成功時のみ、例: 「100行」）
  - [ ] 一覧は実行日時の降順（新しい順）で表示される
  - [ ] スクロールで過去の履歴を遡れる

#### F-3: 履歴の検索・フィルタリング

- **説明**: 履歴をキーワードやステータスで絞り込む
- **受け入れ条件**:
  - [ ] サイドパネルの上部に検索ボックスが表示される
  - [ ] 検索ボックスに入力すると、リアルタイムで一覧が絞り込まれる
  - [ ] 検索対象はSQL文（部分一致）
  - [ ] 「成功のみ表示」チェックボックスでステータスフィルタリングが可能
  - [ ] 検索ワードをクリアすると全件表示に戻る

#### F-4: 履歴からのエディタ読み込み

- **説明**: 履歴をクリックしてエディタに読み込む
- **受け入れ条件**:
  - [ ] 一覧の履歴をクリックすると、エディタにSQLが読み込まれる
  - [ ] 現在エディタに未保存の変更がある場合、警告ダイアログが表示される
  - [ ] 読み込み後、履歴の詳細情報（実行日時、結果）が表示される
  - [ ] 読み込んだクエリを編集しても、元の履歴は変更されない

#### F-5: 履歴からの直接再実行

- **説明**: 履歴を読み込まずに直接再実行する
- **受け入れ条件**:
  - [ ] 一覧の履歴にホバーすると「再実行」ボタンが表示される
  - [ ] 再実行ボタンをクリックすると、エディタの内容を変更せずにクエリが実行される
  - [ ] 再実行結果は結果パネルに表示される
  - [ ] 再実行自体も新しい履歴として記録される

#### F-6: 履歴の削除

- **説明**: 不要な履歴を手動で削除する
- **受け入れ条件**:
  - [ ] 一覧の履歴にホバーすると「削除」ボタンが表示される
  - [ ] 削除ボタンをクリックすると確認ダイアログが表示される
  - [ ] 確定すると即座に一覧から削除される
  - [ ] 削除成功時にトースト通知が表示される
  - [ ] 削除は取り消し不可（確認ダイアログで注意喚起）

#### F-7: 古い履歴の自動削除

- **説明**: 履歴が一定件数を超えた場合、古いものから自動削除する
- **受け入れ条件**:
  - [ ] 最大保持件数: 1000件（接続ごと）
  - [ ] 新しい履歴が追加された際、1000件を超える場合は古いものから削除される
  - [ ] 削除は自動で行われ、ユーザーに通知されない
  - [ ] 将来的には設定で上限件数を変更可能にする（Phase 5では固定）

### 非機能要件

#### NFR-1: パフォーマンス

- 履歴の一覧表示: 1000件でも1秒以内
- 検索レスポンス: 入力後200ms以内に絞り込み結果を表示
- 履歴保存: クエリ実行のレスポンスタイムに影響を与えない（非同期処理）

#### NFR-2: データ永続化

- **保存場所**: `~/.sql-query-builder/sql_editor_histories/` ディレクトリ
  - Query Builder用履歴（`query_histories/`）とは別ディレクトリに分離
- **ファイル形式**: JSON Lines形式（1行1履歴、追記型）
  - 例: `{connection_id}_history.jsonl`
- **メリット**:
  - 追記型なので新規履歴の保存が高速
  - 行単位で読み取り可能（大量履歴でもメモリ効率が良い）
  - 削除時は再構築（フィルタして新規ファイルに書き出し）
- アプリケーション再起動後も履歴が維持される

#### NFR-3: セキュリティ

- 履歴ファイルのパーミッション: 0600（所有者のみ読み書き可能）
- SQL文にパスワード等の機密情報が含まれる可能性を考慮し、ファイルアクセスを制限

#### NFR-4: 保守性

- Query Builder用履歴機能（`app/stores/query-history.ts`）とは完全に独立
- TypeScript型定義を厳密に定義（`SqlEditorHistoryEntry`）
- RustとTypeScriptで同一のデータモデルを共有

## スコープ

### 対象

- クエリ実行時の自動履歴保存
- 履歴の一覧表示（時系列）
- 履歴の検索・フィルタリング
- 履歴からのエディタ読み込み
- 履歴からの直接再実行
- 履歴の手動削除
- 古い履歴の自動削除（1000件上限）
- 接続ごとの履歴管理

### 対象外（将来検討）

- 履歴のエクスポート・インポート機能（JSON一括出力/入力）
- 履歴の統計情報（実行回数ランキング、平均実行時間等）
- 履歴の詳細ビュー（実行結果の保存・表示）
- 履歴の星付け・お気に入り機能
- 複数接続間での履歴検索
- 履歴の保持件数の設定UI（Phase 5では1000件固定）

## 実装対象ファイル（予定）

### バックエンド（Rust）

- `src-tauri/src/models/sql_editor_history.rs` - 履歴モデル定義
- `src-tauri/src/services/sql_editor_history.rs` - 履歴管理サービス（CRUD操作、自動削除）
- `src-tauri/src/commands/sql_editor.rs` - Tauriコマンド追加（`add_history`, `get_histories`, `delete_history`）

### フロントエンド（Vue/Nuxt）

- `app/api/sql-editor.ts` - SQLエディタAPI更新（履歴関連メソッド追加）
- `app/types/sql-editor.ts` - 型定義追加（`SqlEditorHistoryEntry`インターフェース）
- `app/stores/sql-editor.ts` - SQLエディタストア更新（自動保存ロジック、履歴管理）
- `app/components/sql-editor/SqlEditorHistoryPanel.vue` - 履歴パネルコンポーネント（新規作成）
- `app/components/sql-editor/SqlEditorLayout.vue` - レイアウト更新（履歴パネル追加）
- `app/components/sql-editor/SqlEditorToolbar.vue` - ツールバー更新（履歴パネル開閉ボタン追加、任意）

### テスト

- `app/tests/stores/sql-editor.test.ts` - ストアのユニットテスト（履歴機能）
- `src-tauri/src/services/sql_editor_history.rs` 内のテスト関数

## 依存関係

### 前提条件

- Phase 3（クエリ実行機能）が完了していること
- SQLエディタウィンドウが起動できること
- 既存のクエリ実行APIが動作していること

### 既存コンポーネントの利用

- `app/api/query.ts` - クエリ実行APIは既存を流用（再実行に使用）
- `app/components/query-builder/QueryHistorySlideover.vue` - UIデザインの参考（ただし実装は完全に独立）

### 外部ライブラリ

- Rust側:
  - `serde_json` - JSON シリアライズ/デシリアライズ
  - `chrono` - 日時処理（executedAt）
  - `uuid` - 履歴IDの生成
- フロントエンド側:
  - Nuxt UI v4コンポーネント（UButton, UInput, UCard, UBadge等）

## データモデル

### SqlEditorHistoryEntry

```typescript
/**
 * SQLエディタの実行履歴エントリ
 * 注: Query Builder用の QueryHistory とは別の型です
 */
interface SqlEditorHistoryEntry {
  id: string                 // UUID
  connectionId: string       // 接続ID
  sql: string                // 実行したSQL文
  executedAt: string         // 実行日時（ISO 8601形式）
  executionTimeMs: number    // 実行時間（ミリ秒）
  status: 'success' | 'error' // 実行ステータス
  rowCount?: number          // 結果行数（SELECT成功時のみ）
  errorMessage?: string      // エラーメッセージ（失敗時のみ）
}
```

### Rust側の型定義

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlEditorHistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub sql: String,
    pub executed_at: String,
    pub execution_time_ms: u64,
    pub status: ExecutionStatus,
    pub row_count: Option<u64>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    Success,
    Error,
}
```

## 既知の制約

### 技術的制約

- Phase 5では単一接続に対する履歴のみを扱う（複数接続間での横断検索は対象外）
- 履歴の保持件数は1000件固定（設定UIは将来実装）
- 実行結果の詳細（全行データ）は保存しない（メタデータのみ）
- 検索はクライアントサイドで実施（全履歴をメモリに読み込み）

### ビジネス制約

- Phase 5完了後がv1.0（基本機能完成）として位置付け
- 履歴機能はPhase 4（保存クエリ）と並行実装可能

### データ制約

- 履歴ファイルサイズ: 1000件で約1-2MB（SQL文の長さに依存）
- 長いSQL文（10,000文字超）も保存可能だが、一覧表示では省略

## 既存システムとの分離方針

Phase 5の履歴機能は、既存のQuery Builder用履歴機能とは完全に独立しています。

| 項目 | Query Builder用 | SQLエディタ用（Phase 5） |
|------|----------------|------------------------|
| Rustモデル | `models/query_history.rs` | `models/sql_editor_history.rs` |
| Rustサービス | `services/query_history.rs` | `services/sql_editor_history.rs` |
| フロントエンド型 | `QueryHistory` | `SqlEditorHistoryEntry` |
| ストアAPI | `app/api/query-history.ts` | `app/api/sql-editor.ts` |
| コンポーネント | `QueryHistorySlideover.vue` | `SqlEditorHistoryPanel.vue` |
| データ保存先 | `query_histories/` | `sql_editor_histories/` |
| データ形式 | JSON（QueryState含む） | JSON Lines（SQL文のみ） |

**重要**: この分離により、Query BuilderとSQLエディタの両方が独立して履歴を管理でき、互いに影響を与えません。

## 参考資料

### プロジェクト内ドキュメント

- [WBS全体](../../local/20260117_エディタ機能/wbs.md) - Phase 5の位置づけと依存関係
- [全体要件定義書](../../local/20260117_エディタ機能/requirements.md) - FR-5章（クエリ履歴機能）
- [技術仕様書](../../steering/03_architecture_specifications.md) - Tauri/Rust/Nuxt技術スタック
- [リポジトリ構造定義書](../../steering/04_repository_structure.md) - ファイル配置規則
- [開発ガイドライン](../../steering/05_development_guidelines.md) - コーディング規約
- [ユビキタス言語定義書](../../steering/06_ubiquitous_language.md) - プロジェクト用語

### 関連する既存実装

- `app/stores/query-history.ts` - Query Builder用履歴ストア（参考）
- `app/components/query-builder/QueryHistorySlideover.vue` - Query Builder用履歴UI（参考）
- `src-tauri/src/models/query_history.rs` - Query Builder用履歴モデル（参考）

## 受け入れ基準

Phase 5完了の定義：

- [ ] クエリ実行時に履歴が自動保存される
- [ ] 履歴パネルに実行履歴が時系列で表示される
- [ ] 履歴をクリックするとエディタに読み込まれる
- [ ] 履歴から直接再実行できる
- [ ] 履歴を検索できる
- [ ] 古い履歴を手動削除できる
- [ ] 1000件を超える履歴は自動削除される
- [ ] アプリ再起動後も履歴が維持される
- [ ] Query Builder用履歴機能に影響を与えない（リグレッションテスト）
