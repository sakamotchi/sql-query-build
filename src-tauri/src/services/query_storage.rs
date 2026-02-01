use crate::models::saved_query::{SavedQuery, SavedQueryMetadata, SearchQueryRequest};
use crate::storage::FileStorage;
use std::sync::Arc;
use uuid::Uuid;

pub struct QueryStorage {
    storage: Arc<FileStorage>,
}

impl QueryStorage {
    pub fn new(storage: Arc<FileStorage>) -> Self {
        Self { storage }
    }

    /// クエリを保存する
    pub fn save_query(&self, mut query: SavedQuery) -> Result<SavedQuery, String> {
        // IDがなければ生成
        if query.id.is_empty() {
            query.id = Uuid::new_v4().to_string();
        }

        let now = chrono::Utc::now().to_rfc3339();

        // 作成日時・更新日時の設定
        if query.created_at.is_empty() {
            query.created_at = now.clone();
        }
        query.updated_at = now;

        let key = &query.id;
        let value = serde_json::to_value(&query).map_err(|e| e.to_string())?;

        self.storage
            .write(&key, &value)
            .map_err(|e| e.to_string())?;

        Ok(query)
    }

    /// クエリを読み込む
    pub fn load_query(&self, id: &str) -> Result<SavedQuery, String> {
        let key = id;
        let value = self.storage.read(&key).map_err(|e| e.to_string())?;
        let query: SavedQuery = serde_json::from_value(value).map_err(|e| e.to_string())?;
        Ok(query)
    }

    /// クエリを削除する
    pub fn delete_query(&self, id: &str) -> Result<(), String> {
        let key = id;
        self.storage.delete(&key).map_err(|e| e.to_string())
    }

    /// 保存済みクエリの一覧を取得する（メタデータのみ）
    pub fn list_queries(&self) -> Result<Vec<SavedQueryMetadata>, String> {
        let keys = self.storage.list_keys().map_err(|e| e.to_string())?;
        let mut queries = Vec::new();

        for key in keys {
            if let Ok(value) = self.storage.read(&key) {
                if let Ok(query) = serde_json::from_value::<SavedQuery>(value) {
                    queries.push(SavedQueryMetadata {
                        id: query.id,
                        name: query.name,
                        description: query.description,
                        tags: query.tags,
                        folder_path: query.folder_path,
                        connection_id: query.connection_id,
                        created_at: query.created_at,
                        updated_at: query.updated_at,
                    });
                }
            }
        }

        // 更新日時順（降順）にソート
        queries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        Ok(queries)
    }

    /// フォルダ一覧を取得する
    pub fn list_folders(&self) -> Result<Vec<String>, String> {
        let queries = self.list_queries()?;

        let mut folders: Vec<String> = queries
            .into_iter()
            .filter_map(|q| q.folder_path)
            .collect();

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

        Ok(())
    }

    /// クエリを検索する
    pub fn search_queries(
        &self,
        request: SearchQueryRequest,
    ) -> Result<Vec<SavedQueryMetadata>, String> {
        let all_queries = self.list_queries()?;

        let filtered = all_queries
            .into_iter()
            .filter(|q| {
                // キーワード検索（名前または説明）
                if let Some(keyword) = &request.keyword {
                    let keyword = keyword.to_lowercase();
                    if !q.name.to_lowercase().contains(&keyword)
                        && !q.description.to_lowercase().contains(&keyword)
                    {
                        return false;
                    }
                }

                // タグ検索（いずれかのタグが含まれているか）
                if let Some(tags) = &request.tags {
                    if !tags.is_empty() {
                        let has_tag = tags.iter().any(|t| q.tags.contains(t));
                        if !has_tag {
                            return false;
                        }
                    }
                }

                // 接続IDでフィルタ
                if let Some(conn_id) = &request.connection_id {
                    if q.connection_id.as_deref() != Some(conn_id.as_str()) {
                        return false;
                    }
                }

                // フォルダパスでフィルタ
                if let Some(folder_path) = &request.folder_path {
                    if q.folder_path.as_deref() != Some(folder_path.as_str()) {
                        return false;
                    }
                }

                true
            })
            .collect();

        Ok(filtered)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_save_and_load_query() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let query = SavedQuery {
            id: "".to_string(),
            name: "Test Query".to_string(),
            description: "Desc".to_string(),
            tags: vec!["tag1".to_string()],
            folder_path: None,
            connection_id: Some("conn1".to_string()),
            query: serde_json::json!({"sql": "SELECT 1"}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };

        let saved = query_storage.save_query(query).unwrap();
        assert!(!saved.id.is_empty());
        assert!(!saved.created_at.is_empty());
        assert!(!saved.updated_at.is_empty());

        let loaded = query_storage.load_query(&saved.id).unwrap();
        assert_eq!(loaded.name, "Test Query");
        assert_eq!(loaded.description, "Desc");
        assert_eq!(loaded.tags, vec!["tag1".to_string()]);
    }

    #[test]
    fn test_search_queries() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let q1 = SavedQuery {
            id: "1".to_string(),
            name: "Alpha Query".to_string(),
            description: "First query".to_string(),
            tags: vec!["a".to_string(), "b".to_string()],
            folder_path: Some("/開発環境".to_string()),
            connection_id: Some("conn1".to_string()),
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };
        query_storage.save_query(q1).unwrap();

        let q2 = SavedQuery {
            id: "2".to_string(),
            name: "Beta Query".to_string(),
            description: "Second query".to_string(),
            tags: vec!["b".to_string(), "c".to_string()],
            folder_path: Some("/本番".to_string()),
            connection_id: Some("conn2".to_string()),
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };
        query_storage.save_query(q2).unwrap();

        // Search by name
        let res = query_storage
            .search_queries(SearchQueryRequest {
                keyword: Some("Alpha".to_string()),
                tags: None,
                connection_id: None,
                folder_path: None,
            })
            .unwrap();
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].name, "Alpha Query");

        // Search by tag
        let res = query_storage
            .search_queries(SearchQueryRequest {
                keyword: None,
                tags: Some(vec!["b".to_string()]),
                connection_id: None,
                folder_path: None,
            })
            .unwrap();
        assert_eq!(res.len(), 2);

        // Search by connection_id
        let res = query_storage
            .search_queries(SearchQueryRequest {
                keyword: None,
                tags: None,
                connection_id: Some("conn2".to_string()),
                folder_path: None,
            })
            .unwrap();
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].name, "Beta Query");

        // Search by folder_path
        let res = query_storage
            .search_queries(SearchQueryRequest {
                keyword: None,
                tags: None,
                connection_id: None,
                folder_path: Some("/開発環境".to_string()),
            })
            .unwrap();
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].name, "Alpha Query");
    }

    #[test]
    fn test_list_folders() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let query1 = SavedQuery {
            id: "".to_string(),
            name: "Query1".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/開発環境".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };
        let query2 = SavedQuery {
            id: "".to_string(),
            name: "Query2".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/開発環境/ユーザー管理".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };
        let query3 = SavedQuery {
            id: "".to_string(),
            name: "Query3".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: None,
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };
        let query4 = SavedQuery {
            id: "".to_string(),
            name: "Query4".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/本番環境".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };

        query_storage.save_query(query1).unwrap();
        query_storage.save_query(query2).unwrap();
        query_storage.save_query(query3).unwrap();
        query_storage.save_query(query4).unwrap();

        let folders = query_storage.list_folders().unwrap();

        assert_eq!(folders.len(), 3);
        assert!(folders.contains(&"/開発環境".to_string()));
        assert!(folders.contains(&"/開発環境/ユーザー管理".to_string()));
        assert!(folders.contains(&"/本番環境".to_string()));

        let mut sorted = folders.clone();
        sorted.sort();
        assert_eq!(folders, sorted);
    }

    #[test]
    fn test_move_query() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let query = SavedQuery {
            id: "".to_string(),
            name: "Test Query".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/開発環境".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };

        let saved = query_storage.save_query(query).unwrap();
        let id = saved.id.clone();

        query_storage
            .move_query(&id, Some("/本番環境".to_string()))
            .unwrap();

        let loaded = query_storage.load_query(&id).unwrap();
        assert_eq!(loaded.folder_path, Some("/本番環境".to_string()));
    }

    #[test]
    fn test_rename_folder() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let query1 = SavedQuery {
            id: "".to_string(),
            name: "Query1".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/開発環境".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };
        let query2 = SavedQuery {
            id: "".to_string(),
            name: "Query2".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/開発環境/ユーザー管理".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };
        let query3 = SavedQuery {
            id: "".to_string(),
            name: "Query3".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/別環境".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };

        let saved1 = query_storage.save_query(query1).unwrap();
        let saved2 = query_storage.save_query(query2).unwrap();
        let saved3 = query_storage.save_query(query3).unwrap();

        query_storage.rename_folder("/開発環境", "/Dev").unwrap();

        let loaded1 = query_storage.load_query(&saved1.id).unwrap();
        let loaded2 = query_storage.load_query(&saved2.id).unwrap();
        let loaded3 = query_storage.load_query(&saved3.id).unwrap();

        assert_eq!(loaded1.folder_path, Some("/Dev".to_string()));
        assert_eq!(loaded2.folder_path, Some("/Dev/ユーザー管理".to_string()));
        assert_eq!(loaded3.folder_path, Some("/別環境".to_string()));
    }

    #[test]
    fn test_delete_folder_empty() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let result = query_storage.delete_folder("/開発環境");
        assert!(result.is_ok());
    }

    #[test]
    fn test_delete_folder_with_queries() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());
        let query_storage = QueryStorage::new(storage);

        let query = SavedQuery {
            id: "".to_string(),
            name: "Test Query".to_string(),
            description: "".to_string(),
            tags: vec![],
            folder_path: Some("/開発環境/ユーザー管理".to_string()),
            connection_id: None,
            query: serde_json::json!({}),
            created_at: "".to_string(),
            updated_at: "".to_string(),
        };

        query_storage.save_query(query).unwrap();

        let result = query_storage.delete_folder("/開発環境");
        assert!(result.is_err());
    }

    #[test]
    fn test_backward_compatibility() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(FileStorage::new(dir.path().to_path_buf()).unwrap());

        let json = serde_json::json!({
            "id": "test-001",
            "name": "Old Query",
            "description": "Description",
            "tags": [],
            "connectionId": "conn-001",
            "query": {},
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
        });

        storage.write("test-001", &json).unwrap();

        let query_storage = QueryStorage::new(Arc::clone(&storage));
        let loaded = query_storage.load_query("test-001").unwrap();

        assert_eq!(loaded.folder_path, None);
        assert_eq!(loaded.name, "Old Query");
    }
}
