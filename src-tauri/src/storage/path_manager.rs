use std::path::PathBuf;
use directories::ProjectDirs;

pub struct PathManager {
    project_dirs: ProjectDirs,
}

impl PathManager {
    /// 新しいPathManagerインスタンスを作成
    pub fn new() -> Option<Self> {
        ProjectDirs::from("com", "sqlquerybuilder", "sql-query-builder")
            .map(|project_dirs| Self { project_dirs })
    }

    /// データディレクトリのパスを取得
    pub fn data_dir(&self) -> PathBuf {
        self.project_dirs.data_dir().to_path_buf()
    }

    /// 接続情報ディレクトリのパスを取得
    pub fn connections_dir(&self) -> PathBuf {
        self.data_dir().join("connections")
    }

    /// クエリディレクトリのパスを取得
    pub fn queries_dir(&self) -> PathBuf {
        self.data_dir().join("queries")
    }

    /// 保存済みクエリディレクトリのパスを取得
    pub fn saved_queries_dir(&self) -> PathBuf {
        self.queries_dir().join("saved")
    }

    /// クエリ履歴ディレクトリのパスを取得
    pub fn history_dir(&self) -> PathBuf {
        self.queries_dir().join("history")
    }

    /// 設定ディレクトリのパスを取得
    pub fn settings_dir(&self) -> PathBuf {
        self.data_dir().join("settings")
    }

    /// ログディレクトリのパスを取得
    pub fn logs_dir(&self) -> PathBuf {
        self.data_dir().join("logs")
    }

    /// 監査ログディレクトリのパスを取得
    pub fn audit_logs_dir(&self) -> PathBuf {
        self.logs_dir().join("audit")
    }

    /// 全ての必要なディレクトリを初期化
    pub fn initialize_directories(&self) -> std::io::Result<()> {
        let dirs = vec![
            self.connections_dir(),
            self.saved_queries_dir(),
            self.history_dir(),
            self.settings_dir(),
            self.audit_logs_dir(),
        ];

        for dir in dirs {
            std::fs::create_dir_all(dir)?;
        }

        Ok(())
    }
}

impl Default for PathManager {
    fn default() -> Self {
        Self::new().expect("Failed to initialize PathManager")
    }
}
