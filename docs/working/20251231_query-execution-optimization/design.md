# 設計書 - クエリ実行の最適化

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
    ↓ invoke('execute_query')
Tauri Commands (commands/query.rs)
    ↓ ConnectionService::get_by_id()
ConnectionService (connection/service.rs)
    ↓ CredentialStorage::get_password()
    ↓ [NEW] DecryptedPasswordCache::get() / set()
CredentialStorage (crypto/security_provider/)
    ↓ 復号化処理（PBKDF2 + AES-GCM）
```

### 影響範囲

- **フロントエンド**: 影響なし（バックエンドの内部実装のみ）
- **バックエンド**:
  - `src-tauri/src/crypto/password_cache.rs` - 新規追加
  - `src-tauri/src/connection/service.rs` - `get_by_id()` メソッド変更
  - `src-tauri/src/crypto/mod.rs` - モジュールexport追加
  - `src-tauri/src/main.rs` - アプリ終了時のクリーンアップ処理追加
  - `src-tauri/src/commands/connection.rs` - 接続更新・削除時のキャッシュクリア

## 実装方針

### 概要

復号化済みパスワードをメモリ上にキャッシュし、同一接続での再利用を可能にする。セキュリティを維持するため、以下の設計方針を採用する：

1. **TTL（Time-To-Live）ベースの自動期限切れ**: 各キャッシュエントリに24時間の有効期限を設定
2. **スレッドセーフな実装**: `Arc<Mutex<HashMap>>` を使用してマルチスレッド環境で安全にアクセス
3. **明示的なクリア処理**: 接続情報更新時、削除時、アプリ終了時に確実にクリア
4. **既存コードへの影響最小化**: `ConnectionService::get_by_id()` 内部でキャッシュをチェックする方式

### 詳細

1. **DecryptedPasswordCache の実装**:
   - `HashMap<String, CacheEntry>` でキャッシュを管理（キー: 接続ID）
   - `CacheEntry` は復号化済みパスワード（String）と有効期限（Instant）を保持
   - `get()`: キャッシュから取得（期限切れチェック付き）
   - `set()`: キャッシュに保存（有効期限を設定）
   - `invalidate()`: 特定の接続のキャッシュをクリア
   - `clear()`: すべてのキャッシュをクリア

2. **ConnectionService への統合**:
   - `ConnectionService` に `DecryptedPasswordCache` を保持
   - `get_by_id()` で `include_password_decrypted = true` の場合：
     1. キャッシュをチェック
     2. キャッシュヒット → 復号化をスキップしてキャッシュの値を使用
     3. キャッシュミス → 従来通り復号化し、結果をキャッシュに保存

3. **キャッシュ無効化処理**:
   - 接続情報更新時: `update_connection()` 内で `cache.invalidate(connection_id)` を呼び出し
   - 接続情報削除時: `delete_connection()` 内で `cache.invalidate(connection_id)` を呼び出し
   - アプリ終了時: `main.rs` の終了処理で `cache.clear()` を呼び出し
   - マスターパスワード変更時: プロバイダー切り替え時に `cache.clear()` を呼び出し

## データ構造

### 型定義（Rust）

```rust
// src-tauri/src/crypto/password_cache.rs

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// キャッシュエントリ
#[derive(Debug, Clone)]
struct CacheEntry {
    /// 復号化済みパスワード
    password: String,
    /// 有効期限
    expires_at: Instant,
}

impl CacheEntry {
    /// 新しいキャッシュエントリを作成
    fn new(password: String, ttl: Duration) -> Self {
        Self {
            password,
            expires_at: Instant::now() + ttl,
        }
    }

    /// 有効期限が切れているかチェック
    fn is_expired(&self) -> bool {
        Instant::now() > self.expires_at
    }
}

/// 復号化済みパスワードのキャッシュ
#[derive(Debug, Clone)]
pub struct DecryptedPasswordCache {
    /// キャッシュ（キー: 接続ID）
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
    /// TTL（デフォルト: 24時間）
    ttl: Duration,
}

impl DecryptedPasswordCache {
    /// 新しいキャッシュインスタンスを作成
    pub fn new(ttl_seconds: u64) -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    /// デフォルトのTTL（24時間）でキャッシュを作成
    pub fn default() -> Self {
        Self::new(86400) // 24時間 = 86400秒
    }

    /// キャッシュから復号化済みパスワードを取得
    /// 有効期限切れの場合は None を返す
    pub fn get(&self, connection_id: &str) -> Option<String> {
        let mut cache = self.cache.lock().unwrap();

        if let Some(entry) = cache.get(connection_id) {
            if entry.is_expired() {
                // 有効期限切れ → 削除して None を返す
                cache.remove(connection_id);
                None
            } else {
                // 有効 → パスワードを返す
                Some(entry.password.clone())
            }
        } else {
            None
        }
    }

    /// 復号化済みパスワードをキャッシュに保存
    pub fn set(&self, connection_id: &str, password: &str) {
        let mut cache = self.cache.lock().unwrap();
        cache.insert(
            connection_id.to_string(),
            CacheEntry::new(password.to_string(), self.ttl),
        );
    }

    /// 特定の接続のキャッシュを無効化
    pub fn invalidate(&self, connection_id: &str) {
        let mut cache = self.cache.lock().unwrap();
        cache.remove(connection_id);
    }

    /// すべてのキャッシュをクリア
    pub fn clear(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
    }
}
```

### ConnectionService の変更

```rust
// src-tauri/src/connection/service.rs

use crate::crypto::DecryptedPasswordCache;

pub struct ConnectionService {
    storage: Arc<ConnectionStorage>,
    credential_storage: Arc<CredentialStorage>,
    master_key_manager: Arc<MasterKeyManager>,
    password_cache: DecryptedPasswordCache, // 追加
}

impl ConnectionService {
    pub fn new(
        storage: Arc<ConnectionStorage>,
        credential_storage: Arc<CredentialStorage>,
        master_key_manager: Arc<MasterKeyManager>,
    ) -> Self {
        Self {
            storage,
            credential_storage,
            master_key_manager,
            password_cache: DecryptedPasswordCache::default(), // 追加
        }
    }

    pub async fn get_by_id(
        &self,
        id: &str,
        include_password_decrypted: bool,
    ) -> Result<Option<ConnectionInfo>, ConnectionError> {
        let mut connection = match self.storage.get_by_id(id)? {
            Some(conn) => conn,
            None => return Ok(None),
        };

        let legacy_password = Self::take_password_field(&mut connection);
        let mut password: Option<String> = None;

        if include_password_decrypted {
            // キャッシュをチェック
            if let Some(cached_password) = self.password_cache.get(id) {
                password = Some(cached_password);
            } else {
                // キャッシュミス → 復号化を実行
                password = self
                    .credential_storage
                    .get_password(&connection.id)
                    .await
                    .map_err(|e| ConnectionError::StorageError(e.to_string()))?;

                if password.is_none() {
                    if let Some(encrypted) = legacy_password {
                        if let Ok(decrypted) = self.decrypt_legacy_password(&encrypted).await {
                            let _ = self
                                .credential_storage
                                .save(&connection.id, Some(&decrypted), None, None)
                                .await;
                            password = Some(decrypted);
                        }
                    }
                }

                // 復号化成功 → キャッシュに保存
                if let Some(ref pwd) = password {
                    self.password_cache.set(id, pwd);
                }
            }
        }

        if let Some(pwd) = password {
            Self::apply_password(&mut connection, &pwd);
        }

        Ok(Some(connection))
    }

    // 接続情報更新時のキャッシュクリア
    pub async fn update(
        &self,
        id: &str,
        connection: ConnectionInfo,
    ) -> Result<(), ConnectionError> {
        // ... 既存の更新処理 ...

        // キャッシュを無効化
        self.password_cache.invalidate(id);

        Ok(())
    }

    // 接続情報削除時のキャッシュクリア
    pub fn delete(&self, id: &str) -> Result<(), ConnectionError> {
        // ... 既存の削除処理 ...

        // キャッシュを無効化
        self.password_cache.invalidate(id);

        Ok(())
    }
}
```

## API設計

### 変更なし

Tauriコマンドの変更は不要です。`ConnectionService` 内部でキャッシュを利用するため、フロントエンドからは透過的に動作します。

## UI設計

### 変更なし

フロントエンド側の変更は不要です。

## テストコード

### Rustユニットテスト

```rust
// src-tauri/src/crypto/password_cache.rs

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_cache_hit() {
        let cache = DecryptedPasswordCache::new(300);
        cache.set("conn1", "password123");

        let result = cache.get("conn1");
        assert_eq!(result, Some("password123".to_string()));
    }

    #[test]
    fn test_cache_miss() {
        let cache = DecryptedPasswordCache::new(300);

        let result = cache.get("conn1");
        assert_eq!(result, None);
    }

    #[test]
    fn test_cache_expiration() {
        let cache = DecryptedPasswordCache::new(1); // 1秒で期限切れ
        cache.set("conn1", "password123");

        // 1秒待機
        thread::sleep(Duration::from_secs(2));

        let result = cache.get("conn1");
        assert_eq!(result, None);
    }

    #[test]
    fn test_invalidate() {
        let cache = DecryptedPasswordCache::new(300);
        cache.set("conn1", "password123");

        cache.invalidate("conn1");

        let result = cache.get("conn1");
        assert_eq!(result, None);
    }

    #[test]
    fn test_clear() {
        let cache = DecryptedPasswordCache::new(300);
        cache.set("conn1", "password1");
        cache.set("conn2", "password2");

        cache.clear();

        assert_eq!(cache.get("conn1"), None);
        assert_eq!(cache.get("conn2"), None);
    }

    #[test]
    fn test_thread_safety() {
        let cache = DecryptedPasswordCache::new(300);
        let cache_clone = cache.clone();

        // スレッド1: 書き込み
        let handle1 = thread::spawn(move || {
            for i in 0..100 {
                cache_clone.set(&format!("conn{}", i), &format!("password{}", i));
            }
        });

        // スレッド2: 読み込み
        let cache_clone2 = cache.clone();
        let handle2 = thread::spawn(move || {
            for i in 0..100 {
                cache_clone2.get(&format!("conn{}", i));
            }
        });

        handle1.join().unwrap();
        handle2.join().unwrap();

        // デッドロックが発生しないことを確認
    }
}
```

### 統合テスト（手動テスト）

```rust
// 手動テスト手順（testing.md に記載）

// 1. キャッシュヒット時のパフォーマンス計測
// - 同一接続で100回クエリを実行
// - 1回目: 復号化あり（キャッシュミス）
// - 2-100回目: 復号化なし（キャッシュヒット）
// - 実行時間を比較

// 2. 有効期限切れの確認
// - クエリ実行後、24時間待機
// - 再度クエリ実行 → 復号化が実行されることを確認（ログ出力で確認）

// 3. キャッシュ無効化の確認
// - クエリ実行（キャッシュに保存）
// - 接続情報を更新
// - 再度クエリ実行 → 復号化が実行されることを確認
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| TTLを24時間に設定 | 1日の作業セッション中はキャッシュを維持し、パフォーマンスを最大化。アプリ終了時・接続更新時に明示的にクリアすることでセキュリティを担保 | 5分（パフォーマンス改善効果減）、無期限（セキュリティリスク大） |
| `Arc<Mutex<HashMap>>` を使用 | スレッドセーフで実装がシンプル。パフォーマンスへの影響も最小限 | `DashMap`（外部クレート依存）、`RwLock`（読み込み優先だが複雑） |
| ConnectionService内部でキャッシュ | フロントエンドやTauriコマンドへの影響を最小化 | Tauriコマンド側でキャッシュ（影響範囲が広い） |
| メモリ上にキャッシュ | 永続化よりセキュアで、アプリ再起動時に自動クリアされる | ファイルキャッシュ（セキュリティリスク大） |

## 未解決事項

- [ ] ログ出力でキャッシュヒット/ミスを確認できるようにするか？（デバッグ用）
- [ ] TTLを設定可能にするか？（現時点では24時間固定）
- [ ] キャッシュサイズの上限を設定するか？（現時点では無制限）

## セキュリティ考慮事項

1. **メモリ上の平文パスワード**:
   - TTL（24時間）で自動的にクリアされる
   - 接続情報更新時・削除時に明示的にクリア
   - アプリ終了時に確実にクリア

2. **Drop時のゼロクリア**:
   - 現状、`String` は Drop 時に自動的にメモリが解放されるが、ゼロクリアされるとは限らない
   - より高いセキュリティが必要な場合、`zeroize` クレートを使用してゼロクリアを保証する
   - ただし、実用上は TTL による自動期限切れで十分と判断

3. **マルチスレッド環境での安全性**:
   - `Arc<Mutex<HashMap>>` により、複数スレッドから同時アクセスしても安全
   - デッドロックのリスクは低い（Mutex の保持時間が短い）
