# 設計書 - スキーマ取得最適化（パフォーマンス改善）

## ベンチマーク結果

### 測定環境

- **OS**: macOS 14.x (Darwin 25.2.0)
- **CPU**: Apple Silicon M1/M2
- **メモリ**: 16GB
- **測定ツール**: Rust `std::time::Instant`, ブラウザ `performance.now()`

### Before（改善前）

| 測定項目 | 測定値 | 測定日 | 備考 |
|---------|--------|--------|------|
| 初回構造取得時間（小規模DB） | 未測定 | - | 10テーブル |
| 初回構造取得時間（中規模DB） | 未測定 | - | 100テーブル |
| 初回構造取得時間（大規模DB） | 未測定 | - | 500テーブル |
| 2回目以降取得時間 | 未測定 | - | キャッシュなし |
| メモリ使用量 | 未測定 | - | - |

**注**: Phase 7.1.1で実測値を取得し、このセクションを更新します。

### 測定方法

#### バックエンド（Rust）

```rust
use std::time::Instant;

// src-tauri/src/commands/database_structure.rs
#[tauri::command]
pub async fn get_database_structure(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<DatabaseStructure, String> {
    let start = Instant::now();

    // 構造取得処理
    let inspector = DatabaseInspectorFactory::create(&connection, password.as_deref()).await?;
    let structure = inspector.get_database_structure().await?;

    let duration = start.elapsed();
    eprintln!("[PERF] get_database_structure: {:?}", duration);

    Ok(structure)
}
```

#### フロントエンド（TypeScript）

```typescript
// app/stores/database-structure.ts
async fetchDatabaseStructure(connectionId: string): Promise<void> {
  const start = performance.now();

  try {
    const structure = await databaseStructureApi.getDatabaseStructure(connectionId);
    const duration = performance.now() - start;
    console.log(`[PERF] fetchDatabaseStructure: ${duration.toFixed(2)}ms`);

    this.structures[connectionId] = structure;
  } catch (error) {
    // エラー処理
  }
}
```

## ボトルネック分析

### 特定されたボトルネック（仮説）

**注**: Phase 7.1.1のベンチマーク実行後、このセクションを実測データで更新します。

#### 1. SQL実行回数の多さ

- **箇所**: `src-tauri/src/database/postgresql_inspector.rs:73-109` (get_schemas)
- **原因**:
  - スキーマごとに `get_tables()` と `get_views()` を順次実行
  - テーブルごとに `get_columns()`, `get_indexes()`, `get_foreign_keys()`, `get_foreign_key_references()` を順次実行
  - N+1クエリ問題が発生している
- **影響**: 100テーブルのDBで数百回のSQL実行が発生
- **証拠**: コードレビューによる推測（Phase 7.1.1で実測）

#### 2. 同期的なループ処理

- **箇所**: `src-tauri/src/database/postgresql_inspector.rs:95-106`
- **原因**:
  ```rust
  for (name, is_system) in rows {
      let tables = self.get_tables(&name).await?;  // 順次await
      let views = self.get_views(&name).await?;    // 順次await
      // ...
  }
  ```
- **影響**: スキーマ数×テーブル数の待ち時間が累積
- **証拠**: コードレビュー

#### 3. キャッシュ機構の欠如

- **箇所**: `src-tauri/src/commands/database_structure.rs:8-33`
- **原因**: 毎回DBから全構造を取得している
- **影響**: 同じ接続で再度取得する際も初回と同じ時間がかかる
- **証拠**: 現在の実装にキャッシュコードが存在しない

#### 4. データシリアライズのオーバーヘッド

- **箇所**: Rust → JSON → TypeScript の変換
- **原因**: 大きな構造データの変換コスト
- **影響**: 500テーブル×30カラムのデータ変換に時間がかかる可能性
- **証拠**: Phase 7.1.1で実測予定

### プロファイリング結果

```
// Phase 7.1.1実行後に実測データを記載

Function Name               | Total Time | Call Count | Avg Time
----------------------------|------------|------------|----------
get_database_structure()    | TBD        | -          | -
get_schemas()               | TBD        | -          | -
get_tables() (per schema)   | TBD        | -          | -
get_columns() (per table)   | TBD        | -          | -
```

## 最適化方針

### 概要

1. **計測基盤の整備** (7.1.1): ボトルネックを正確に特定
2. **キャッシュ機構の実装** (7.1.2-7.1.3): 再取得の高速化
3. **増分取得の実装** (7.1.4): 変更部分のみ取得
4. **並列化とバックグラウンド化** (7.1.5): UI非ブロック化

### 最適化戦略

#### 戦略1: スキーマキャッシュ機構（LRU + TTL）

- **対象**: ボトルネック3（キャッシュ欠如）
- **手法**:
  - Rust側でLRUキャッシュ実装（`lru` crate使用）
  - 接続IDをキーとしてキャッシュ
  - TTL（Time To Live）: デフォルト5分、手動リフレッシュで無効化
  - 最大キャッシュサイズ: 10接続分
- **期待効果**: 2回目以降の取得時間を100ms以内に短縮
- **リスク**:
  - DB構造の変更を検知できない（→手動リフレッシュで対応）
  - メモリ使用量の増加（→LRUで古いキャッシュを自動削除）

#### 戦略2: SQL実行の並列化

- **対象**: ボトルネック1, 2（SQL実行回数、同期処理）
- **手法**:
  - `tokio::join!` / `futures::join_all` でスキーマ/テーブルごとの取得を並列化
  - 接続プールを活用（sqlxのデフォルトプール設定）
- **期待効果**: スキーマ取得時間を最大50%短縮
- **リスク**:
  - DB接続数の増加（→プールサイズを適切に設定）
  - メモリ使用量の一時的な増加

#### 戦略3: 増分取得API

- **対象**: ボトルネック1（毎回フルスキャン）
- **手法**:
  - 構造データのハッシュ値を計算して保存
  - 前回のハッシュと比較して変更検知
  - 変更があったスキーマ/テーブルのみ再取得
- **期待効果**: 変更がない場合は100ms以内、変更部分のみなら500ms以内
- **リスク**:
  - ハッシュ計算のオーバーヘッド（→軽量なハッシュ関数を使用）
  - 複雑性の増加

#### 戦略4: バックグラウンド更新

- **対象**: ボトルネック全般、UI体験
- **手法**:
  - 構造取得を非同期タスクで実行
  - フロントエンド側でローディング状態を表示
  - キャッシュがある場合は即座に表示、バックグラウンドで更新
- **期待効果**: UIブロック時間をゼロに
- **リスク**: なし

### 実装計画

#### Phase 7.1.1: 計測基盤整備

1. ベンチマークDB準備（PostgreSQL, MySQL, SQLite × 3サイズ）
2. 計測コード追加（Rust側: `std::time::Instant`、TS側: `performance.now()`）
3. ベースライン測定とボトルネック特定
4. ドキュメント更新（実測データでベンチマーク結果を埋める）

#### Phase 7.1.2: キャッシュ機構設計

1. キャッシュ戦略の策定
   - LRU + TTL方式を採用
   - キャッシュキー設計: `connection_id`
   - キャッシュ無効化タイミング: 手動リフレッシュ、TTL満了、アプリ再起動
2. データ構造設計（`CacheMetadata`, `CacheEntry`）
3. 設計レビュー

#### Phase 7.1.3: スキーマキャッシュ実装（Rust）

1. `src-tauri/src/services/schema_cache.rs` 新規作成
2. `src-tauri/src/models/cache_metadata.rs` 新規作成
3. `DatabaseInspectorFactory` にキャッシュ統合
4. `get_database_structure` コマンドにキャッシュロジック追加
5. SQL並列化の実装（`tokio::join_all`）
6. ベンチマーク測定（改善効果確認）

#### Phase 7.1.4: 増分取得API実装

1. 構造データハッシュ計算機能追加
2. `get_database_structure_incremental` コマンド新規作成
3. フロントエンド側API追加（`databaseStructureApi.getDatabaseStructureIncremental`）
4. ストア側の差分適用ロジック実装
5. ベンチマーク測定

#### Phase 7.1.5: バックグラウンド更新機能

1. フロントエンド側の非同期取得ロジック実装
2. ローディングUI改善（`DatabaseTree.vue`）
3. キャッシュヒット時の即座表示 + バックグラウンド更新
4. 最終ベンチマーク測定

## データ構造の変更

### キャッシュメタデータ（新規）

```rust
// src-tauri/src/models/cache_metadata.rs

use serde::{Deserialize, Serialize};
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheMetadata {
    /// キャッシュキー（接続ID）
    pub key: String,

    /// キャッシュされた時刻
    pub cached_at: SystemTime,

    /// TTL（秒）
    pub ttl_seconds: u64,

    /// 構造データのハッシュ値（増分取得用）
    pub structure_hash: Option<String>,
}

impl CacheMetadata {
    pub fn new(key: String, ttl_seconds: u64) -> Self {
        Self {
            key,
            cached_at: SystemTime::now(),
            ttl_seconds,
            structure_hash: None,
        }
    }

    pub fn is_expired(&self) -> bool {
        match self.cached_at.elapsed() {
            Ok(elapsed) => elapsed.as_secs() > self.ttl_seconds,
            Err(_) => true,
        }
    }
}
```

### キャッシュエントリ（新規）

```rust
// src-tauri/src/services/schema_cache.rs

use crate::models::cache_metadata::CacheMetadata;
use crate::models::database_structure::DatabaseStructure;

#[derive(Debug, Clone)]
pub struct CacheEntry {
    pub metadata: CacheMetadata,
    pub structure: DatabaseStructure,
}
```

### スキーマキャッシュサービス（新規）

```rust
// src-tauri/src/services/schema_cache.rs

use lru::LruCache;
use std::num::NonZeroUsize;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct SchemaCache {
    cache: Arc<RwLock<LruCache<String, CacheEntry>>>,
    default_ttl: u64,
}

impl SchemaCache {
    pub fn new(capacity: usize, default_ttl: u64) -> Self {
        Self {
            cache: Arc::new(RwLock::new(
                LruCache::new(NonZeroUsize::new(capacity).unwrap())
            )),
            default_ttl,
        }
    }

    pub async fn get(&self, key: &str) -> Option<DatabaseStructure> {
        let mut cache = self.cache.write().await;

        if let Some(entry) = cache.get(key) {
            if !entry.metadata.is_expired() {
                return Some(entry.structure.clone());
            } else {
                // 期限切れエントリを削除
                cache.pop(key);
            }
        }

        None
    }

    pub async fn put(&self, key: String, structure: DatabaseStructure) {
        let mut cache = self.cache.write().await;
        let metadata = CacheMetadata::new(key.clone(), self.default_ttl);
        let entry = CacheEntry { metadata, structure };
        cache.put(key, entry);
    }

    pub async fn invalidate(&self, key: &str) {
        let mut cache = self.cache.write().await;
        cache.pop(key);
    }

    pub async fn clear(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }
}
```

## API変更

### 既存APIの拡張（後方互換性あり）

| API名 | 変更内容 | 互換性 | 備考 |
|-------|---------|--------|------|
| `get_database_structure` | キャッシュロジック追加 | 完全互換 | 既存の呼び出し側は変更不要 |

### 新規API

| API名 | 説明 | パラメータ | 戻り値 |
|-------|------|-----------|--------|
| `get_database_structure_incremental` | 増分取得 | `connection_id`, `previous_hash` | `DatabaseStructure` + `current_hash` |
| `invalidate_structure_cache` | キャッシュ無効化 | `connection_id` | `Result<(), String>` |
| `clear_structure_cache` | 全キャッシュクリア | なし | `Result<(), String>` |

## 最適化コード例

### バックエンド最適化例

#### Before: 順次取得

```rust
// src-tauri/src/database/postgresql_inspector.rs (現在)

for (name, is_system) in rows {
    let tables = self.get_tables(&name).await?;
    let views = self.get_views(&name).await?;

    schemas.push(Schema {
        name,
        is_system,
        tables,
        views,
    });
}
```

#### After: 並列取得

```rust
// src-tauri/src/database/postgresql_inspector.rs (最適化後)

use futures::future::join_all;

let futures: Vec<_> = rows
    .into_iter()
    .map(|(name, is_system)| async move {
        let tables = self.get_tables(&name).await?;
        let views = self.get_views(&name).await?;

        Ok::<Schema, String>(Schema {
            name,
            is_system,
            tables,
            views,
        })
    })
    .collect();

let schemas = join_all(futures)
    .await
    .into_iter()
    .collect::<Result<Vec<_>, _>>()?;
```

#### キャッシュ統合

```rust
// src-tauri/src/commands/database_structure.rs (最適化後)

#[tauri::command]
pub async fn get_database_structure(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
    schema_cache: State<'_, SchemaCache>,
) -> Result<DatabaseStructure, String> {
    // キャッシュチェック
    if let Some(cached) = schema_cache.get(&connection_id).await {
        eprintln!("[PERF] Cache hit for connection: {}", connection_id);
        return Ok(cached);
    }

    eprintln!("[PERF] Cache miss, fetching from database...");

    // DB取得
    let connection = connection_service
        .get_by_id(&connection_id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let password = match &connection.connection {
        ConnectionConfig::Network(cfg) => cfg.encrypted_password.clone(),
        _ => None,
    };

    let inspector = DatabaseInspectorFactory::create(&connection, password.as_deref()).await?;
    let mut structure = inspector.get_database_structure().await?;
    structure.connection_id = connection_id.clone();

    // キャッシュに保存
    schema_cache.put(connection_id, structure.clone()).await;

    Ok(structure)
}
```

### フロントエンド最適化例

#### Before: 同期待機

```typescript
// app/stores/database-structure.ts (現在)

async fetchDatabaseStructure(connectionId: string): Promise<void> {
  if (this.loadingIds.has(connectionId)) return;

  this.loadingIds.add(connectionId);
  delete this.errors[connectionId];

  try {
    const structure = await databaseStructureApi.getDatabaseStructure(connectionId);
    this.structures[connectionId] = structure;
  } catch (error) {
    // エラー処理
  } finally {
    this.loadingIds.delete(connectionId);
  }
}
```

#### After: バックグラウンド更新

```typescript
// app/stores/database-structure.ts (最適化後)

async fetchDatabaseStructure(connectionId: string, background = false): Promise<void> {
  // キャッシュがあり、バックグラウンドモードの場合は即座にリターン
  if (background && this.structures[connectionId]) {
    console.log('[database-structure] Using cached structure, updating in background');
    // バックグラウンドで更新を続行
  } else if (this.loadingIds.has(connectionId)) {
    return;
  }

  this.loadingIds.add(connectionId);
  delete this.errors[connectionId];

  try {
    const start = performance.now();
    const structure = await databaseStructureApi.getDatabaseStructure(connectionId);
    const duration = performance.now() - start;

    console.log(`[PERF] fetchDatabaseStructure: ${duration.toFixed(2)}ms`);

    this.structures[connectionId] = structure;
  } catch (error) {
    console.error('[database-structure] fetch error:', error);
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = JSON.stringify(error) || 'Unknown error';
    }
    this.errors[connectionId] = errorMessage;
    throw error;
  } finally {
    this.loadingIds.delete(connectionId);
  }
}

/**
 * 手動リフレッシュ（キャッシュ無効化）
 */
async refreshDatabaseStructure(connectionId: string): Promise<void> {
  // バックエンドのキャッシュを無効化
  await databaseStructureApi.invalidateCache(connectionId);

  // フロントエンドのキャッシュを削除
  delete this.structures[connectionId];

  // 再取得
  await this.fetchDatabaseStructure(connectionId);
}
```

## パフォーマンステスト

### ベンチマークテスト例（Rust）

```rust
// src-tauri/src/commands/database_structure.rs

#[cfg(test)]
mod benchmarks {
    use super::*;
    use std::time::Instant;

    #[tokio::test]
    async fn bench_get_database_structure_small() {
        // 10テーブルのDB
        let start = Instant::now();
        let _ = get_database_structure(/* ... */).await;
        let duration = start.elapsed();

        assert!(
            duration.as_millis() < 1000,
            "Expected < 1000ms for small DB, got {:?}",
            duration
        );
    }

    #[tokio::test]
    async fn bench_get_database_structure_large() {
        // 500テーブルのDB
        let start = Instant::now();
        let _ = get_database_structure(/* ... */).await;
        let duration = start.elapsed();

        assert!(
            duration.as_millis() < 5000,
            "Expected < 5000ms for large DB, got {:?}",
            duration
        );
    }

    #[tokio::test]
    async fn bench_cache_hit() {
        // 2回目取得（キャッシュヒット）
        let _ = get_database_structure(/* ... */).await; // 1回目

        let start = Instant::now();
        let _ = get_database_structure(/* ... */).await; // 2回目
        let duration = start.elapsed();

        assert!(
            duration.as_millis() < 100,
            "Expected < 100ms for cache hit, got {:?}",
            duration
        );
    }
}
```

### ベンチマークテスト例（TypeScript）

```typescript
// app/stores/__tests__/database-structure.bench.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDatabaseStructureStore } from '../database-structure';

describe('Database Structure Store - Performance', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should fetch structure within 2 seconds (small DB)', async () => {
    const store = useDatabaseStructureStore();
    const connectionId = 'test-connection-small';

    const start = performance.now();
    await store.fetchDatabaseStructure(connectionId);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(2000);
  });

  it('should use cache on second fetch (< 100ms)', async () => {
    const store = useDatabaseStructureStore();
    const connectionId = 'test-connection-cached';

    // 1回目取得
    await store.fetchDatabaseStructure(connectionId);

    // 2回目取得（キャッシュヒット）
    const start = performance.now();
    await store.fetchDatabaseStructure(connectionId);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 | 選択理由 |
|---------|------|--------|---------|
| LRU + TTLキャッシュを採用 | バランスが良い | ディスクキャッシュ、無期限キャッシュ | 実装がシンプルで、メモリ使用量を抑えられる |
| TTL: 5分 | DBスキーマは頻繁に変更されないため | 1分、10分、無期限 | 変更検知とメモリ効率のバランス |
| キャッシュサイズ: 10接続 | 通常の使用では十分 | 5接続、無制限 | メモリ使用量を抑えつつ、複数接続に対応 |
| `lru` crateを使用 | 軽量で高速 | `moka`, `cached` | シンプルな要件に対して十分 |
| SQL並列化に`tokio::join_all`を使用 | Tokioエコシステムとの親和性 | `rayon` | 非同期処理に適している |
| 増分取得は後回し（Phase 7.1.4） | キャッシュ実装が優先 | 同時実装 | 段階的な最適化でリスク管理 |

## 未解決事項

- [ ] キャッシュサイズ・TTLの最適値（Phase 7.1.1の計測後に決定）
- [ ] 並列化時の最適な接続プールサイズ（Phase 7.1.3で調整）
- [ ] 増分取得のハッシュアルゴリズム選定（Phase 7.1.4で決定）
- [ ] メモリリーク調査（Phase 7.1.5で実施）

## After（改善後の目標）

| 測定項目 | 目標値 | 測定日 | 達成状況 |
|---------|--------|--------|---------|
| 初回構造取得時間（小規模DB） | 500ms以下 | - | 未測定 |
| 初回構造取得時間（中規模DB） | 2秒以内 | - | 未測定 |
| 初回構造取得時間（大規模DB） | 5秒以内 | - | 未測定 |
| 2回目以降取得時間（キャッシュヒット） | 100ms以内 | - | 未測定 |
| メモリ使用量増加 | 10MB以内 | - | 未測定 |
| UIブロック時間 | 0秒（バックグラウンド取得） | - | 未測定 |

**注**: Phase 7.1.3〜7.1.5の実装完了後、このセクションを実測値で更新してください。

## 次のステップ

1. Phase 7.1.1を開始し、ベンチマークDBの準備と計測コードの実装を行う
2. 実測データでこのドキュメントの「Before」「ボトルネック分析」「プロファイリング結果」を更新
3. tasklist.mdに従ってPhase 7.1.2〜7.1.5を順次実装
