use async_trait::async_trait;

use super::error::SecurityProviderResult;
use super::types::{InitializeParams, ProviderState, SecurityProviderType, UnlockParams};

/// セキュリティプロバイダーのtrait
///
/// 各プロバイダーはこのtraitを実装することで、
/// 統一的なインターフェースで暗号化キーを提供する。
#[async_trait]
pub trait SecurityProvider: Send + Sync {
    /// プロバイダーの種別を取得
    fn provider_type(&self) -> SecurityProviderType;

    /// プロバイダーの現在の状態を取得
    fn state(&self) -> ProviderState;

    /// 初期化が必要かどうか
    fn needs_initialization(&self) -> bool;

    /// アンロックが必要かどうか
    fn needs_unlock(&self) -> bool;

    /// プロバイダーを初期化
    ///
    /// # Arguments
    /// * `params` - 初期化パラメータ（プロバイダーごとに異なる）
    ///
    /// # Returns
    /// 初期化に成功した場合は Ok(())
    async fn initialize(&mut self, params: InitializeParams) -> SecurityProviderResult<()>;

    /// プロバイダーをアンロック
    ///
    /// # Arguments
    /// * `params` - アンロックパラメータ（プロバイダーごとに異なる）
    ///
    /// # Returns
    /// アンロックに成功した場合は Ok(())
    async fn unlock(&mut self, params: UnlockParams) -> SecurityProviderResult<()>;

    /// プロバイダーをロック（メモリ上のキーをクリア）
    async fn lock(&mut self);

    /// 暗号化キーを取得
    ///
    /// # Returns
    /// 暗号化に使用する32バイトのキー
    ///
    /// # Errors
    /// プロバイダーがReadyでない場合はエラー
    async fn get_encryption_key(&self) -> SecurityProviderResult<Vec<u8>>;

    /// プロバイダーをリセット（すべての設定を削除）
    async fn reset(&mut self) -> SecurityProviderResult<()>;

    /// プロバイダーの設定を検証
    fn validate(&self) -> SecurityProviderResult<()>;
}
