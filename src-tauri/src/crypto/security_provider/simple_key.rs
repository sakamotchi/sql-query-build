use pbkdf2::pbkdf2_hmac;
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

use crate::storage::PathManager;

/// 環境情報をキー生成に利用する
pub(crate) struct EnvironmentInfo {
    pub(crate) hostname: String,
    pub(crate) username: String,
    pub(crate) app_data_path: String,
}

impl EnvironmentInfo {
    /// ホスト名・ユーザー名・アプリデータディレクトリを収集
    pub(crate) fn collect() -> Self {
        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let username = whoami::username();

        let app_data_path = PathManager::new()
            .map(|pm| pm.data_dir().to_string_lossy().to_string())
            .or_else(|| dirs::data_dir().map(|p| p.to_string_lossy().to_string()))
            .unwrap_or_else(|| "default".to_string());

        Self {
            hostname,
            username,
            app_data_path,
        }
    }

    /// 収集した情報をバイト列にまとめる
    pub(crate) fn to_bytes(&self) -> Vec<u8> {
        format!(
            "{}:{}:{}",
            self.hostname, self.username, self.app_data_path
        )
        .into_bytes()
    }
}

/// シンプルプロバイダー用にマスターキーを導出
pub(crate) fn derive_master_key(app_seed: &[u8], user_salt: &[u8]) -> Zeroizing<Vec<u8>> {
    // 環境情報を収集
    let env_info = EnvironmentInfo::collect();
    let env_bytes = env_info.to_bytes();

    // シード材料を結合
    let mut seed_material = Vec::new();
    seed_material.extend_from_slice(app_seed);
    seed_material.extend_from_slice(&env_bytes);
    seed_material.extend_from_slice(user_salt);

    // SHA-256でハッシュ化
    let mut hasher = Sha256::new();
    hasher.update(&seed_material);
    let seed = hasher.finalize();

    // PBKDF2でキー導出
    let mut key = Zeroizing::new(vec![0u8; 32]);
    pbkdf2_hmac::<Sha256>(&seed, user_salt, 100_000, &mut key);

    key
}
