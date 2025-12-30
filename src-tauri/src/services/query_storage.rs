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
                    if &q.connection_id != conn_id {
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
            connection_id: "conn1".to_string(),
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
            connection_id: "conn1".to_string(),
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
            connection_id: "conn2".to_string(),
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
            })
            .unwrap();
        assert_eq!(res.len(), 2);

        // Search by connection_id
        let res = query_storage
            .search_queries(SearchQueryRequest {
                keyword: None,
                tags: None,
                connection_id: Some("conn2".to_string()),
            })
            .unwrap();
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].name, "Beta Query");
    }
}
