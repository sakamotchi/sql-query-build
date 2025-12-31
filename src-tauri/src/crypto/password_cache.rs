use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
struct CacheEntry {
    password: String,
    expires_at: Instant,
}

impl CacheEntry {
    fn new(password: String, ttl: Duration) -> Self {
        Self {
            password,
            expires_at: Instant::now() + ttl,
        }
    }

    fn is_expired(&self) -> bool {
        Instant::now() > self.expires_at
    }
}

/// 復号化済みパスワードのキャッシュ
#[derive(Debug, Clone)]
pub struct DecryptedPasswordCache {
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
    ttl: Duration,
}

impl DecryptedPasswordCache {
    const DEFAULT_TTL_SECONDS: u64 = 86_400; // 24時間

    /// カスタムTTL（秒）でキャッシュを作成
    pub fn new(ttl_seconds: u64) -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    /// デフォルトTTL（24時間）でキャッシュを作成
    pub fn default() -> Self {
        Self::new(Self::DEFAULT_TTL_SECONDS)
    }

    /// キャッシュから取得（期限切れなら削除してNoneを返す）
    pub fn get(&self, connection_id: &str) -> Option<String> {
        let mut cache = self.cache.lock().ok()?;

        if let Some(entry) = cache.get(connection_id) {
            if entry.is_expired() {
                cache.remove(connection_id);
                None
            } else {
                Some(entry.password.clone())
            }
        } else {
            None
        }
    }

    /// キャッシュに保存
    pub fn set(&self, connection_id: &str, password: &str) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(
                connection_id.to_string(),
                CacheEntry::new(password.to_string(), self.ttl),
            );
        }
    }

    /// 指定IDのキャッシュを無効化
    pub fn invalidate(&self, connection_id: &str) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.remove(connection_id);
        }
    }

    /// 全キャッシュをクリア
    pub fn clear(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn cache_hit_returns_password() {
        let cache = DecryptedPasswordCache::new(300);
        cache.set("conn1", "password123");

        assert_eq!(cache.get("conn1"), Some("password123".to_string()));
    }

    #[test]
    fn cache_miss_returns_none() {
        let cache = DecryptedPasswordCache::new(300);

        assert_eq!(cache.get("conn1"), None);
    }

    #[test]
    fn cache_expires_after_ttl() {
        let cache = DecryptedPasswordCache::new(1);
        cache.set("conn1", "password123");

        thread::sleep(Duration::from_secs(2));

        assert_eq!(cache.get("conn1"), None);
    }

    #[test]
    fn invalidate_removes_entry() {
        let cache = DecryptedPasswordCache::new(300);
        cache.set("conn1", "password123");

        cache.invalidate("conn1");

        assert_eq!(cache.get("conn1"), None);
    }

    #[test]
    fn clear_removes_all_entries() {
        let cache = DecryptedPasswordCache::new(300);
        cache.set("conn1", "password1");
        cache.set("conn2", "password2");

        cache.clear();

        assert_eq!(cache.get("conn1"), None);
        assert_eq!(cache.get("conn2"), None);
    }

    #[test]
    fn concurrent_access_does_not_deadlock() {
        let cache = DecryptedPasswordCache::new(300);
        let writer = cache.clone();
        let reader = cache.clone();

        let writer_handle = thread::spawn(move || {
            for i in 0..100 {
                writer.set(&format!("conn{}", i), &format!("password{}", i));
            }
        });

        let reader_handle = thread::spawn(move || {
            for i in 0..100 {
                let _ = reader.get(&format!("conn{}", i));
            }
        });

        writer_handle.join().unwrap();
        reader_handle.join().unwrap();
    }
}
