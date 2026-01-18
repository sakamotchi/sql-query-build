use directories::ProjectDirs;
use std::path::PathBuf;

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
        self.saved_builder_dir()
    }

    /// クエリビルダー用の保存ディレクトリのパスを取得
    pub fn saved_builder_dir(&self) -> PathBuf {
        self.queries_dir().join("saved_builder")
    }

    /// SQLエディタ用の保存ディレクトリのパスを取得
    pub fn saved_editor_dir(&self) -> PathBuf {
        self.queries_dir().join("saved_editor")
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
        self.migrate_legacy_saved_queries_dir();

        let dirs = vec![
            self.connections_dir(),
            self.saved_queries_dir(),
            self.saved_editor_dir(),
            self.history_dir(),
            self.settings_dir(),
            self.audit_logs_dir(),
        ];

        for dir in dirs {
            std::fs::create_dir_all(dir)?;
        }

        Ok(())
    }

    fn migrate_legacy_saved_queries_dir(&self) {
        let legacy_dir = self.queries_dir().join("saved");
        let new_dir = self.saved_builder_dir();

        if !legacy_dir.exists() || new_dir.exists() {
            return;
        }

        if let Err(err) = std::fs::rename(&legacy_dir, &new_dir) {
            eprintln!(
                "Failed to migrate saved queries directory: {}. Trying to copy files.",
                err
            );

            if let Err(err) = std::fs::create_dir_all(&new_dir) {
                eprintln!("Failed to create saved_builder directory: {}", err);
                return;
            }

            let entries = match std::fs::read_dir(&legacy_dir) {
                Ok(entries) => entries,
                Err(err) => {
                    eprintln!("Failed to read legacy saved queries directory: {}", err);
                    return;
                }
            };

            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }

                if let Some(file_name) = path.file_name() {
                    let dest = new_dir.join(file_name);
                    if let Err(err) = std::fs::copy(&path, &dest) {
                        eprintln!("Failed to copy {}: {}", path.display(), err);
                    }
                }
            }
        }
    }
}

impl Default for PathManager {
    fn default() -> Self {
        Self::new().expect("Failed to initialize PathManager")
    }
}
