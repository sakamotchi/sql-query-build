# タスクリスト：SQLエディタ起動処理改善

## タスク一覧

| # | タスク | ファイル | 状態 |
|---|-------|---------|------|
| 1 | `DatabaseInspector` トレイトに `get_columns_by_schema()` を追加 | `src-tauri/src/services/database_inspector.rs` | 📝 未着手 |
| 2 | PostgreSQL: `get_columns_by_schema()` 実装 | `src-tauri/src/database/postgresql_inspector.rs` | 📝 未着手 |
| 3 | MySQL: `get_columns_by_schema()` 実装 | `src-tauri/src/database/mysql_inspector.rs` | 📝 未着手 |
| 4 | SQLite: `get_columns_by_schema()` 実装 | `src-tauri/src/database/sqlite_inspector.rs` | 📝 未着手 |
| 5 | Tauriコマンド `get_columns_by_schema` を追加 | `src-tauri/src/commands/database_structure.rs` | 📝 未着手 |
| 6 | `lib.rs` にコマンドを登録 | `src-tauri/src/lib.rs` | 📝 未着手 |
| 7 | API層に `getColumnsBySchema()` を追加 | `app/api/database-structure.ts` | 📝 未着手 |
| 8 | ストアの `startBackgroundFetch()` をスキーマ単位に改修 | `app/stores/database-structure.ts` | 📝 未着手 |
| 9 | 動作確認（ローカル接続） | — | 📝 未着手 |
| 10 | 動作確認（RDS ポートフォワード） | — | 📝 未着手 |

## 実装順序

```
タスク1（トレイト定義）
  └── タスク2, 3, 4（各DB実装）並行可能
        └── タスク5（Rustコマンド追加）
              └── タスク6（コマンド登録）
                    └── タスク7（API層）
                          └── タスク8（ストア改修）
                                └── タスク9, 10（動作確認）
```

## 実装上の注意点

### タスク1: トレイト定義

`DatabaseInspector` トレイトに以下を追加する。デフォルト実装を提供するかどうか検討すること。

```rust
async fn get_columns_by_schema(
    &self,
    schema: &str,
) -> Result<HashMap<String, Vec<Column>>, String>;
```

`HashMap` の import が必要（`use std::collections::HashMap`）。

### タスク2: PostgreSQL

`get_all_columns_in_schema()` がプライベートメソッドであることを確認してから使用する。
既に `information_schema.columns` を使った単一クエリで実装されているため、委譲するだけでよい。

### タスク3: MySQL

MySQL版の `get_all_columns_in_schema()` も同様に確認して流用する。

### タスク4: SQLite

SQLiteはスキーマが実質1つ（`main`）のため、全テーブル名を取得してから各テーブルの `PRAGMA table_info()` を呼ぶ形になる。
パフォーマンス改善効果はローカルファイルのためほぼないが、インターフェース統一のために実装する。

### タスク8: ストア改修

`startBackgroundFetch()` の改修では、以下の点を注意する：

1. `inflightColumnRequests` は `fetchColumnsForTable()` を使わなくなるため、スキーマ単位の重複リクエスト制御が別途必要か検討する（同一スキーマが同時に複数リクエストされるケースはほぼないため、まずは不要と判断してよい）
2. キャンセルトークンのチェックはスキーマのループ先頭で行う（テーブル単位でなくてよい）
3. 進捗カウントはスキーマ取得完了後にそのスキーマのテーブル数を一括加算する
