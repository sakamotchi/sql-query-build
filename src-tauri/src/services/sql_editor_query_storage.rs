use crate::models::sql_editor_query::{
    SearchSqlEditorQueryRequest, SqlEditorQuery, SqlEditorQueryMetadata,
};
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use uuid::Uuid;

pub struct SqlEditorQueryStorage {
    base_dir: PathBuf,
    lock: RwLock<()>,
}

impl SqlEditorQueryStorage {
    pub fn new(base_dir: PathBuf) -> Result<Self, String> {
        if !base_dir.exists() {
            fs::create_dir_all(&base_dir).map_err(|e| e.to_string())?;
        }

        Ok(Self {
            base_dir,
            lock: RwLock::new(()),
        })
    }

    fn metadata_path(&self, id: &str) -> PathBuf {
        self.base_dir.join(format!("{}.json", id))
    }

    fn sql_path(&self, id: &str) -> PathBuf {
        self.base_dir.join(format!("{}.sql", id))
    }

    fn folders_metadata_path(&self) -> PathBuf {
        self.base_dir.join(".folders.json")
    }

    fn read_metadata_file(path: &Path) -> Result<SqlEditorQueryMetadata, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    fn write_metadata_file(path: &Path, metadata: &SqlEditorQueryMetadata) -> Result<(), String> {
        let json = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())?;
        set_secure_permissions(path)?;
        Ok(())
    }

    fn write_sql_file(path: &Path, sql: &str) -> Result<(), String> {
        fs::write(path, sql).map_err(|e| e.to_string())?;
        set_secure_permissions(path)?;
        Ok(())
    }

    /// クエリを保存する
    pub fn save_query(&self, mut query: SqlEditorQuery) -> Result<SqlEditorQuery, String> {
        let _guard = self
            .lock
            .write()
            .map_err(|_| "Failed to acquire lock".to_string())?;

        if query.id.is_empty() {
            query.id = Uuid::new_v4().to_string();
        }

        if query.created_at.is_empty() {
            let metadata_path = self.metadata_path(&query.id);
            if metadata_path.exists() {
                if let Ok(existing) = Self::read_metadata_file(&metadata_path) {
                    query.created_at = existing.created_at;
                }
            }
        }

        let now = Utc::now().to_rfc3339();
        if query.created_at.is_empty() {
            query.created_at = now.clone();
        }
        query.updated_at = now;

        let metadata = SqlEditorQueryMetadata {
            id: query.id.clone(),
            connection_id: query.connection_id.clone(),
            name: query.name.clone(),
            description: query.description.clone(),
            tags: query.tags.clone(),
            folder_path: query.folder_path.clone(),
            created_at: query.created_at.clone(),
            updated_at: query.updated_at.clone(),
        };

        let metadata_path = self.metadata_path(&query.id);
        let sql_path = self.sql_path(&query.id);
        Self::write_metadata_file(&metadata_path, &metadata)?;
        Self::write_sql_file(&sql_path, &query.sql)?;

        Ok(query)
    }

    /// クエリを読み込む
    pub fn load_query(&self, id: &str) -> Result<SqlEditorQuery, String> {
        let _guard = self
            .lock
            .read()
            .map_err(|_| "Failed to acquire lock".to_string())?;

        let metadata_path = self.metadata_path(id);
        let sql_path = self.sql_path(id);

        if !metadata_path.exists() {
            return Err("クエリが見つかりません".to_string());
        }
        if !sql_path.exists() {
            return Err("SQLファイルが見つかりません".to_string());
        }

        let metadata = Self::read_metadata_file(&metadata_path)?;
        let sql = fs::read_to_string(&sql_path).map_err(|e| e.to_string())?;

        Ok(SqlEditorQuery {
            id: metadata.id,
            connection_id: metadata.connection_id,
            name: metadata.name,
            description: metadata.description,
            sql,
            tags: metadata.tags,
            folder_path: metadata.folder_path,
            created_at: metadata.created_at,
            updated_at: metadata.updated_at,
        })
    }

    /// クエリを削除する
    pub fn delete_query(&self, id: &str) -> Result<(), String> {
        let _guard = self
            .lock
            .write()
            .map_err(|_| "Failed to acquire lock".to_string())?;

        let metadata_path = self.metadata_path(id);
        let sql_path = self.sql_path(id);

        if !metadata_path.exists() || !sql_path.exists() {
            return Err("クエリが見つかりません".to_string());
        }

        fs::remove_file(&metadata_path).map_err(|e| e.to_string())?;
        fs::remove_file(&sql_path).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// 保存済みクエリの一覧を取得する（メタデータのみ）
    pub fn list_queries(&self) -> Result<Vec<SqlEditorQueryMetadata>, String> {
        let _guard = self
            .lock
            .read()
            .map_err(|_| "Failed to acquire lock".to_string())?;

        let mut queries = Vec::new();

        if !self.base_dir.exists() {
            return Ok(queries);
        }

        let entries = fs::read_dir(&self.base_dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(metadata) = Self::read_metadata_file(&path) {
                    queries.push(metadata);
                }
            }
        }

        queries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        Ok(queries)
    }

    /// フォルダメタデータを読み込む
    fn read_folders_metadata(&self) -> Result<Vec<String>, String> {
        let path = self.folders_metadata_path();
        if !path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    /// フォルダメタデータを保存する
    fn write_folders_metadata(&self, folders: &[String]) -> Result<(), String> {
        let path = self.folders_metadata_path();
        let json = serde_json::to_string_pretty(folders).map_err(|e| e.to_string())?;
        fs::write(&path, json).map_err(|e| e.to_string())?;
        set_secure_permissions(&path)?;
        Ok(())
    }

    /// フォルダを作成する
    pub fn create_folder(&self, folder_path: String) -> Result<(), String> {
        let _lock = self.lock.write().map_err(|e| e.to_string())?;

        let mut folders = self.read_folders_metadata()?;

        if folders.contains(&folder_path) {
            return Err(format!("フォルダは既に存在します: {}", folder_path));
        }

        folders.push(folder_path);
        folders.sort();
        self.write_folders_metadata(&folders)?;

        Ok(())
    }

    /// フォルダ一覧を取得する
    pub fn list_folders(&self) -> Result<Vec<String>, String> {
        let queries = self.list_queries()?;

        // クエリから抽出したフォルダ
        let mut folders: Vec<String> = queries
            .into_iter()
            .filter_map(|q| q.folder_path)
            .collect();

        // メタデータに保存されたフォルダを追加
        let metadata_folders = self.read_folders_metadata()?;
        folders.extend(metadata_folders);

        folders.sort();
        folders.dedup();

        Ok(folders)
    }

    /// クエリを指定フォルダに移動する
    pub fn move_query(&self, query_id: &str, folder_path: Option<String>) -> Result<(), String> {
        let mut query = self.load_query(query_id)?;

        query.folder_path = folder_path;
        query.updated_at = chrono::Utc::now().to_rfc3339();

        self.save_query(query)?;

        Ok(())
    }

    /// フォルダ名を変更し、配下の全クエリのfolder_pathも更新する
    pub fn rename_folder(&self, old_path: &str, new_path: &str) -> Result<(), String> {
        let all_queries = self.list_queries()?;

        let target_queries: Vec<_> = all_queries
            .into_iter()
            .filter(|q| match &q.folder_path {
                Some(folder_path) => {
                    folder_path == old_path
                        || folder_path.starts_with(&format!("{}/", old_path))
                }
                None => false,
            })
            .collect();

        for metadata in target_queries {
            let mut query = self.load_query(&metadata.id)?;

            if let Some(current_path) = &query.folder_path {
                let new_folder_path = if current_path == old_path {
                    new_path.to_string()
                } else if let Some(suffix) = current_path.strip_prefix(old_path) {
                    format!("{}{}", new_path, suffix)
                } else {
                    continue;
                };

                query.folder_path = Some(new_folder_path);
                query.updated_at = chrono::Utc::now().to_rfc3339();

                self.save_query(query)?;
            }
        }

        Ok(())
    }

    /// フォルダを削除する（空のフォルダのみ）
    pub fn delete_folder(&self, folder_path: &str) -> Result<(), String> {
        let _lock = self.lock.write().map_err(|e| e.to_string())?;

        let all_queries = self.list_queries()?;

        let has_queries = all_queries.iter().any(|q| match &q.folder_path {
            Some(path) => path == folder_path || path.starts_with(&format!("{}/", folder_path)),
            None => false,
        });

        if has_queries {
            return Err(format!(
                "フォルダにクエリが含まれているため削除できません: {}",
                folder_path
            ));
        }

        // メタデータからフォルダを削除
        let mut folders = self.read_folders_metadata()?;
        folders.retain(|f| f != folder_path && !f.starts_with(&format!("{}/", folder_path)));
        self.write_folders_metadata(&folders)?;

        Ok(())
    }

    /// クエリを検索する
    pub fn search_queries(
        &self,
        request: SearchSqlEditorQueryRequest,
    ) -> Result<Vec<SqlEditorQueryMetadata>, String> {
        let all_queries = self.list_queries()?;

        let keyword = request.keyword.as_ref().map(|k| k.to_lowercase());

        let mut filtered = Vec::new();
        for query in all_queries {
            if let Some(ref keyword) = keyword {
                let name_match = query.name.to_lowercase().contains(keyword);
                let desc_match = query.description.to_lowercase().contains(keyword);
                let tag_match = query.tags.iter().any(|tag| tag.to_lowercase().contains(keyword));
                let mut matched = name_match || desc_match || tag_match;

                if !matched {
                    let sql_path = self.sql_path(&query.id);
                    if let Ok(sql_content) = fs::read_to_string(&sql_path) {
                        matched = sql_content.to_lowercase().contains(keyword);
                    }
                }

                if !matched {
                    continue;
                }
            }

            if let Some(ref tags) = request.tags {
                if !tags.is_empty() {
                    let has_tag = tags.iter().any(|t| query.tags.contains(t));
                    if !has_tag {
                        continue;
                    }
                }
            }

            if let Some(ref connection_id) = request.connection_id {
                if &query.connection_id != connection_id {
                    continue;
                }
            }

            if let Some(ref folder_path) = request.folder_path {
                if query.folder_path.as_deref() != Some(folder_path.as_str()) {
                    continue;
                }
            }

            filtered.push(query);
        }

        Ok(filtered)
    }
}

#[cfg(unix)]
fn set_secure_permissions(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let mut permissions = fs::metadata(path)
        .map_err(|e| e.to_string())?
        .permissions();
    permissions.set_mode(0o600);
    fs::set_permissions(path, permissions).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(unix))]
fn set_secure_permissions(_path: &Path) -> Result<(), String> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_save_and_load_query() {
        let dir = tempdir().unwrap();
        let storage = SqlEditorQueryStorage::new(dir.path().to_path_buf()).unwrap();

        let query = SqlEditorQuery {
            id: String::new(),
            connection_id: "conn-1".to_string(),
            name: "Test Query".to_string(),
            description: "desc".to_string(),
            sql: "SELECT * FROM users".to_string(),
            tags: vec!["test".to_string()],
            folder_path: None,
            created_at: String::new(),
            updated_at: String::new(),
        };

        let saved = storage.save_query(query).unwrap();
        assert!(!saved.id.is_empty());
        assert!(!saved.created_at.is_empty());
        assert!(!saved.updated_at.is_empty());

        let loaded = storage.load_query(&saved.id).unwrap();
        assert_eq!(loaded.name, "Test Query");
        assert_eq!(loaded.sql, "SELECT * FROM users");
    }

    #[test]
    fn test_search_queries_by_sql() {
        let dir = tempdir().unwrap();
        let storage = SqlEditorQueryStorage::new(dir.path().to_path_buf()).unwrap();

        let query = SqlEditorQuery {
            id: String::new(),
            connection_id: "conn-1".to_string(),
            name: "Search Target".to_string(),
            description: "desc".to_string(),
            sql: "SELECT * FROM orders".to_string(),
            tags: vec!["report".to_string()],
            folder_path: None,
            created_at: String::new(),
            updated_at: String::new(),
        };
        storage.save_query(query).unwrap();

        let result = storage
            .search_queries(SearchSqlEditorQueryRequest {
                keyword: Some("orders".to_string()),
                tags: None,
                connection_id: None,
                folder_path: None,
            })
            .unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "Search Target");
    }
}
