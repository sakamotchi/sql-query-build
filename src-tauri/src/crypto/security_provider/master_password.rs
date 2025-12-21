use std::sync::{Arc, RwLock};

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, SaltString},
    Argon2, PasswordHasher, PasswordVerifier,
};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use super::error::{SecurityProviderError, SecurityProviderResult};
use super::password_validator::{PasswordRequirements, PasswordValidator};
use super::traits::SecurityProvider;
use super::types::{InitializeParams, ProviderState, SecurityProviderType, UnlockParams};
use crate::storage::FileStorage;

/// マスターパスワード設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MasterPasswordConfig {
    /// 設定バージョン
    pub version: u32,
    /// パスワードハッシュ（Argon2id）
    pub password_hash: String,
    /// キー導出用ソルト
    pub key_salt: Vec<u8>,
    /// PBKDF2反復回数
    pub iterations: u32,
    /// 設定日時
    pub created_at: DateTime<Utc>,
    /// 最終更新日時
    pub updated_at: DateTime<Utc>,
}

/// マスターパスワードプロバイダー
pub struct MasterPasswordProvider {
    /// プロバイダーの状態
    state: RwLock<ProviderState>,

    /// 暗号化キー（メモリ上にキャッシュ）
    cached_key: RwLock<Option<Zeroizing<Vec<u8>>>>,

    /// 設定ストレージ
    storage: Option<Arc<FileStorage>>,

    /// パスワード検証器
    validator: PasswordValidator,
}

impl MasterPasswordProvider {
    /// PBKDF2のデフォルト反復回数
    const DEFAULT_ITERATIONS: u32 = 600_000;

    /// 設定ファイル名
    pub const CONFIG_KEY: &'static str = "master_password_config";

    pub fn new() -> Self {
        Self {
            state: RwLock::new(ProviderState::Uninitialized),
            cached_key: RwLock::new(None),
            storage: None,
            validator: PasswordValidator::new(PasswordRequirements::default()),
        }
    }

    pub fn with_storage(mut self, storage: Arc<FileStorage>) -> Self {
        self.storage = Some(storage);

        // 設定が存在すれば状態をLockedに
        if self.config_exists() {
            *self.state.write().unwrap() = ProviderState::Locked;
        }

        self
    }

    /// 設定が存在するかチェック
    fn config_exists(&self) -> bool {
        self.storage
            .as_ref()
            .map(|s| s.exists(Self::CONFIG_KEY))
            .unwrap_or(false)
    }

    /// 設定を読み込み
    fn load_config(&self) -> SecurityProviderResult<MasterPasswordConfig> {
        let storage = self
            .storage
            .as_ref()
            .ok_or_else(|| SecurityProviderError::Internal("Storage not configured".to_string()))?;

        storage
            .read::<MasterPasswordConfig>(Self::CONFIG_KEY)
            .map_err(|e| SecurityProviderError::StorageError(e.to_string()))
    }

    /// 設定を保存
    fn save_config(&self, config: &MasterPasswordConfig) -> SecurityProviderResult<()> {
        let storage = self
            .storage
            .as_ref()
            .ok_or_else(|| SecurityProviderError::Internal("Storage not configured".to_string()))?;

        storage
            .write(Self::CONFIG_KEY, config)
            .map_err(|e| SecurityProviderError::StorageError(e.to_string()))
    }

    /// パスワードハッシュを生成（Argon2id）
    fn hash_password(&self, password: &str) -> SecurityProviderResult<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();

        argon2
            .hash_password(password.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|e| SecurityProviderError::EncryptionError(e.to_string()))
    }

    /// パスワードを検証（Argon2id）
    fn verify_password(&self, password: &str, hash: &str) -> SecurityProviderResult<bool> {
        let argon2 = Argon2::default();
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| SecurityProviderError::EncryptionError(e.to_string()))?;

        Ok(argon2
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    /// 暗号化キーを導出（PBKDF2）
    fn derive_key(&self, password: &str, salt: &[u8], iterations: u32) -> Zeroizing<Vec<u8>> {
        use pbkdf2::pbkdf2_hmac;
        use sha2::Sha256;

        let mut key = Zeroizing::new(vec![0u8; 32]);
        pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, iterations, &mut key);
        key
    }

    /// ランダムなソルトを生成
    fn generate_salt() -> Vec<u8> {
        use rand::RngCore;
        let mut salt = vec![0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);
        salt
    }

    /// マスターパスワードを変更
    pub async fn change_password(
        &mut self,
        current_password: &str,
        new_password: &str,
        new_password_confirm: &str,
    ) -> SecurityProviderResult<()> {
        // 現在のパスワードを検証
        let config = self.load_config()?;
        if !self.verify_password(current_password, &config.password_hash)? {
            return Err(SecurityProviderError::AuthenticationFailed);
        }

        // 新しいパスワードの一致チェック
        if new_password != new_password_confirm {
            return Err(SecurityProviderError::PasswordMismatch);
        }

        // 新しいパスワードの強度チェック
        let validation = self.validator.validate(new_password);
        if !validation.is_valid {
            return Err(SecurityProviderError::WeakPassword(
                validation.errors.join(", "),
            ));
        }

        // 新しいパスワードハッシュを生成
        let new_password_hash = self.hash_password(new_password)?;

        // 新しいキー導出用ソルトを生成
        let new_key_salt = Self::generate_salt();

        // 新しい暗号化キーを導出
        let new_key = self.derive_key(new_password, &new_key_salt, Self::DEFAULT_ITERATIONS);

        // 設定を更新
        let new_config = MasterPasswordConfig {
            version: config.version,
            password_hash: new_password_hash,
            key_salt: new_key_salt,
            iterations: Self::DEFAULT_ITERATIONS,
            created_at: config.created_at,
            updated_at: Utc::now(),
        };
        self.save_config(&new_config)?;

        // キーをキャッシュ
        *self.cached_key.write().unwrap() = Some(new_key);

        Ok(())
    }
}

#[async_trait]
impl SecurityProvider for MasterPasswordProvider {
    fn provider_type(&self) -> SecurityProviderType {
        SecurityProviderType::MasterPassword
    }

    fn state(&self) -> ProviderState {
        self.state.read().unwrap().clone()
    }

    fn needs_initialization(&self) -> bool {
        !self.config_exists()
    }

    fn needs_unlock(&self) -> bool {
        matches!(*self.state.read().unwrap(), ProviderState::Locked)
    }

    async fn initialize(&mut self, params: InitializeParams) -> SecurityProviderResult<()> {
        let (password, password_confirm) = match params {
            InitializeParams::MasterPassword {
                password,
                password_confirm,
            } => (password, password_confirm),
            _ => {
                return Err(SecurityProviderError::InvalidParams(
                    "MasterPassword provider requires MasterPassword params".to_string(),
                ));
            }
        };

        // 既に初期化済みの場合はエラー
        if self.config_exists() {
            return Err(SecurityProviderError::AlreadyInitialized);
        }

        // パスワード一致チェック
        if password != password_confirm {
            return Err(SecurityProviderError::PasswordMismatch);
        }

        // パスワード強度チェック
        let validation = self.validator.validate(&password);
        if !validation.is_valid {
            return Err(SecurityProviderError::WeakPassword(
                validation.errors.join(", "),
            ));
        }

        // パスワードハッシュを生成
        let password_hash = self.hash_password(&password)?;

        // キー導出用ソルトを生成
        let key_salt = Self::generate_salt();

        // 暗号化キーを導出
        let key = self.derive_key(&password, &key_salt, Self::DEFAULT_ITERATIONS);

        // 設定を保存
        let now = Utc::now();
        let config = MasterPasswordConfig {
            version: 1,
            password_hash,
            key_salt: key_salt.clone(),
            iterations: Self::DEFAULT_ITERATIONS,
            created_at: now,
            updated_at: now,
        };
        self.save_config(&config)?;

        // キーをキャッシュ
        *self.cached_key.write().unwrap() = Some(key);

        // 状態を更新
        *self.state.write().unwrap() = ProviderState::Ready;

        Ok(())
    }

    async fn unlock(&mut self, params: UnlockParams) -> SecurityProviderResult<()> {
        let password = match params {
            UnlockParams::MasterPassword { password } => password,
            _ => {
                return Err(SecurityProviderError::InvalidParams(
                    "MasterPassword provider requires MasterPassword params".to_string(),
                ));
            }
        };

        // 設定を読み込み
        let config = self.load_config()?;

        // パスワードを検証
        if !self.verify_password(&password, &config.password_hash)? {
            return Err(SecurityProviderError::AuthenticationFailed);
        }

        // 暗号化キーを導出
        let key = self.derive_key(&password, &config.key_salt, config.iterations);

        // キーをキャッシュ
        *self.cached_key.write().unwrap() = Some(key);

        // 状態を更新
        *self.state.write().unwrap() = ProviderState::Ready;

        Ok(())
    }

    async fn lock(&mut self) {
        // キーをクリア（zeroize）
        *self.cached_key.write().unwrap() = None;

        // 状態を更新
        *self.state.write().unwrap() = ProviderState::Locked;
    }

    async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>> {
        let cached = self.cached_key.read().unwrap();
        cached
            .as_ref()
            .map(|k| k.to_vec())
            .ok_or(SecurityProviderError::Locked)
    }

    async fn reset(&mut self) -> SecurityProviderResult<()> {
        // キーをクリア
        *self.cached_key.write().unwrap() = None;

        // 設定を削除
        if let Some(storage) = &self.storage {
            let _ = storage.delete(Self::CONFIG_KEY);
        }

        // 状態を更新
        *self.state.write().unwrap() = ProviderState::Uninitialized;

        Ok(())
    }

    fn validate(&self) -> SecurityProviderResult<()> {
        Ok(())
    }
}

impl Default for MasterPasswordProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::security_provider::PasswordStrength;
    use tempfile::TempDir;

    fn create_test_storage() -> (Arc<FileStorage>, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let storage = Arc::new(FileStorage::new(temp_dir.path().to_path_buf()).unwrap());
        (storage, temp_dir)
    }

    #[tokio::test]
    async fn test_master_password_initialization() {
        let (storage, _temp) = create_test_storage();
        let mut provider = MasterPasswordProvider::new().with_storage(storage);

        assert!(provider.needs_initialization());

        provider
            .initialize(InitializeParams::MasterPassword {
                password: "StrongP@ssw0rd!".to_string(),
                password_confirm: "StrongP@ssw0rd!".to_string(),
            })
            .await
            .unwrap();

        assert!(!provider.needs_initialization());
        assert!(provider.state().is_ready());
    }

    #[tokio::test]
    async fn test_master_password_mismatch() {
        let (storage, _temp) = create_test_storage();
        let mut provider = MasterPasswordProvider::new().with_storage(storage);

        let result = provider
            .initialize(InitializeParams::MasterPassword {
                password: "password1".to_string(),
                password_confirm: "password2".to_string(),
            })
            .await;

        assert!(matches!(
            result,
            Err(SecurityProviderError::PasswordMismatch)
        ));
    }

    #[tokio::test]
    async fn test_master_password_unlock() {
        let (storage, _temp) = create_test_storage();
        let mut provider = MasterPasswordProvider::new().with_storage(storage.clone());

        let password = "StrongP@ssw0rd!";
        provider
            .initialize(InitializeParams::MasterPassword {
                password: password.to_string(),
                password_confirm: password.to_string(),
            })
            .await
            .unwrap();

        provider.lock().await;
        assert!(provider.needs_unlock());

        provider
            .unlock(UnlockParams::MasterPassword {
                password: password.to_string(),
            })
            .await
            .unwrap();

        assert!(!provider.needs_unlock());
        assert!(provider.state().is_ready());
    }

    #[tokio::test]
    async fn test_master_password_wrong_password() {
        let (storage, _temp) = create_test_storage();
        let mut provider = MasterPasswordProvider::new().with_storage(storage);

        provider
            .initialize(InitializeParams::MasterPassword {
                password: "CorrectPassword123!".to_string(),
                password_confirm: "CorrectPassword123!".to_string(),
            })
            .await
            .unwrap();

        provider.lock().await;

        let result = provider
            .unlock(UnlockParams::MasterPassword {
                password: "WrongPassword".to_string(),
            })
            .await;

        assert!(matches!(
            result,
            Err(SecurityProviderError::AuthenticationFailed)
        ));
    }

    #[test]
    fn test_password_validation() {
        let validator = PasswordValidator::new(PasswordRequirements::default());

        // 弱いパスワード
        let result = validator.validate("short");
        assert!(!result.is_valid);

        // 強いパスワード
        let result = validator.validate("StrongP@ssw0rd!");
        assert!(result.is_valid);
        assert!(matches!(
            result.strength,
            PasswordStrength::Strong | PasswordStrength::VeryStrong
        ));
    }
}
