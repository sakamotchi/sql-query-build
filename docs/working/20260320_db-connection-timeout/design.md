# 設計書 - db-connection-timeout

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
    ↓ invokeCommand() ← タイムアウト追加（35秒）
Tauri IPC
    ↓
Rust Backend (commands/database_structure.rs) ← タイムアウト追加（30秒）
    ↓
sqlx (PgPool / MySqlPool / SqlitePool)
    ↓
外部DBサーバー
```

### 影響範囲

- **フロントエンド**: `useTauri.ts` の `invokeCommand` のみ変更。全コマンド呼び出しに自動的に適用される
- **バックエンド**: `commands/database_structure.rs` の各コマンド関数をラップ

## 実装方針

### 概要

- フロントエンドは `Promise.race()` でタイムアウトを実装
- バックエンドは `tokio::time::timeout()` でasync処理全体をラップ
- タイムアウト時間はフロントエンド（35秒）＞バックエンド（30秒）とし、Rustのエラーメッセージが確実にフロントエンドに届くようにする

### 詳細

1. **フロントエンド**: `invokeCommand` 内で `Promise.race([invoke(...), timeoutPromise])` を実装。タイムアウトPromiseは `setTimeout` を使用
2. **バックエンド**: `tokio::time::timeout(Duration::from_secs(30), async { ... })` で各コマンドの処理をラップ。タイムアウト時は `Elapsed` エラーを `String` に変換して返す

## データ構造

変更なし。既存の型定義をそのまま使用する。

## API設計

### 変更なし（既存コマンドの動作変更のみ）

| コマンド名 | 変更内容 |
|-----------|----------|
| `get_database_structure` | 処理全体を30秒タイムアウトでラップ |
| `get_database_structure_summary` | 処理全体を30秒タイムアウトでラップ |
| `get_schemas` | 処理全体を30秒タイムアウトでラップ |
| `get_tables` | 処理全体を30秒タイムアウトでラップ |
| `get_columns` | 処理全体を30秒タイムアウトでラップ |
| `get_columns_by_schema` | 処理全体を30秒タイムアウトでラップ |

## 実装コード

### フロントエンド（useTauri.ts）

```typescript
const INVOKE_TIMEOUT_MS = 35_000

const invokeCommand = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isAvailable.value) {
    throw new Error('Tauri is not available. Running in browser mode.')
  }

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Command "${command}" timed out after ${INVOKE_TIMEOUT_MS / 1000}s`)),
      INVOKE_TIMEOUT_MS
    )
  )

  return Promise.race([invoke<T>(command, args), timeoutPromise])
}
```

### バックエンド（commands/database_structure.rs）

```rust
use tokio::time::{timeout, Duration};

const DB_COMMAND_TIMEOUT_SECS: u64 = 30;

#[tauri::command]
pub async fn get_database_structure_summary(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<DatabaseStructureSummary, String> {
    timeout(Duration::from_secs(DB_COMMAND_TIMEOUT_SECS), async {
        // ... 既存の処理 ...
    })
    .await
    .map_err(|_| format!("データベース接続がタイムアウトしました（{}秒）", DB_COMMAND_TIMEOUT_SECS))?
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| フロントエンドタイムアウトをRustより長くする（35秒 vs 30秒） | Rustのタイムアウトエラーメッセージを確実にフロントエンドで受け取るため | 同じ秒数にする（競合の可能性がある） |
| Rustで `tokio::time::timeout` を使う | 全DB種類に統一的に対応できる。sqlxの接続オプションは種類ごとに設定が異なるため | PgPoolOptions等のDB固有オプションを使う |
| コマンドの処理全体をラップする | `inspector.create()` と実際のクエリ両方にタイムアウトが効く | インスペクター生成とクエリそれぞれにタイムアウト |

## 未解決事項

- [ ] クエリ実行（`execute_query`）のタイムアウトは別途検討
