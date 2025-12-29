use crate::models::safety_settings::SafetySettings;
use crate::storage::path_manager::PathManager;
use anyhow::Result;
use std::fs;
use std::path::PathBuf;

pub struct SafetyConfigStorage {
    file_path: PathBuf,
}

impl SafetyConfigStorage {
    pub fn new() -> Self {
        // PathManagerの初期化に失敗した場合はパニックする（アプリケーションの基本的なディレクトリ構成に依存するため）
        let path_manager = PathManager::new().expect("Failed to initialize PathManager");
        Self {
            file_path: path_manager.settings_dir().join("safety-settings.json"),
        }
    }

    /// 設定を読み込む（ファイルがなければデフォルトを返す）
    pub fn load(&self) -> Result<SafetySettings> {
        if !self.file_path.exists() {
            return Ok(SafetySettings::default());
        }

        let content = fs::read_to_string(&self.file_path)?;
        let settings: SafetySettings = serde_json::from_str(&content)?;
        Ok(settings)
    }

    /// 設定を保存する
    pub fn save(&self, settings: &SafetySettings) -> Result<()> {
        // 親ディレクトリがなければ作成
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(settings)?;
        fs::write(&self.file_path, content)?;
        Ok(())
    }

    /// デフォルト設定にリセット
    pub fn reset(&self) -> Result<SafetySettings> {
        let default = SafetySettings::default();
        self.save(&default)?;
        Ok(default)
    }
}
