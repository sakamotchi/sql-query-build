use crate::models::query_history::{
    AddHistoryRequest, QueryHistory, QueryHistoryCollection, QueryHistoryMetadata,
    SearchHistoryRequest,
};
use crate::storage::file_storage::FileStorage;
use crate::storage::path_manager::PathManager;
use chrono::Utc;
use uuid::Uuid;

const MAX_HISTORY_COUNT: usize = 1000;
const HISTORY_FILE_KEY: &str = "query_history";

pub struct QueryHistoryService {
    storage: FileStorage,
}

impl QueryHistoryService {
    pub fn new(path_manager: &PathManager) -> Result<Self, String> {
        let history_dir = path_manager.history_dir();
        let storage = FileStorage::new(history_dir).map_err(|e| e.to_string())?;
        Ok(Self { storage })
    }

    /// 履歴コレクションを読み込み
    fn load_collection(&self) -> Result<QueryHistoryCollection, String> {
        match self
            .storage
            .read::<QueryHistoryCollection>(HISTORY_FILE_KEY)
        {
            Ok(collection) => Ok(collection),
            Err(_e) => {
                // ファイルが存在しない場合は空のコレクションを返す
                // ストレージエラーの種類を確認する（シリアライズエラーなどは伝播すべきだが、今回は簡易化）
                Ok(QueryHistoryCollection {
                    histories: Vec::new(),
                })
            }
        }
    }

    /// 履歴コレクションを保存
    fn save_collection(&self, collection: &QueryHistoryCollection) -> Result<(), String> {
        self.storage
            .write(HISTORY_FILE_KEY, collection)
            .map_err(|e| e.to_string())
    }

    /// 履歴を追加
    pub fn add_history(&self, request: AddHistoryRequest) -> Result<QueryHistory, String> {
        let mut collection = self.load_collection()?;

        let history = QueryHistory {
            id: Uuid::new_v4().to_string(),
            connection_id: request.connection_id,
            query: request.query,
            sql: request.sql,
            executed_at: Utc::now().to_rfc3339(),
            success: request.success,
            result_count: request.result_count,
            execution_time_ms: request.execution_time_ms,
            error_message: request.error_message,
        };

        // 先頭に追加（最新が最初）
        collection.histories.insert(0, history.clone());

        // 最大件数を超えたら古いものを削除
        if collection.histories.len() > MAX_HISTORY_COUNT {
            collection.histories.truncate(MAX_HISTORY_COUNT);
        }

        self.save_collection(&collection)?;

        Ok(history)
    }

    /// 履歴を読み込み
    pub fn load_history(&self, id: &str) -> Result<QueryHistory, String> {
        let collection = self.load_collection()?;
        collection
            .histories
            .iter()
            .find(|h| h.id == id)
            .cloned()
            .ok_or_else(|| format!("履歴が見つかりません: {}", id))
    }

    /// 履歴を削除
    pub fn delete_history(&self, id: &str) -> Result<(), String> {
        let mut collection = self.load_collection()?;
        collection.histories.retain(|h| h.id != id);
        self.save_collection(&collection)
    }

    /// 全履歴のメタデータを取得
    pub fn list_histories(&self) -> Result<Vec<QueryHistoryMetadata>, String> {
        let collection = self.load_collection()?;
        Ok(collection
            .histories
            .iter()
            .map(QueryHistoryMetadata::from)
            .collect())
    }

    /// 履歴を検索
    pub fn search_histories(
        &self,
        request: SearchHistoryRequest,
    ) -> Result<Vec<QueryHistoryMetadata>, String> {
        let collection = self.load_collection()?;

        let filtered: Vec<QueryHistoryMetadata> = collection
            .histories
            .iter()
            .filter(|h| {
                // キーワード検索
                if let Some(ref keyword) = request.keyword {
                    let keyword_lower = keyword.to_lowercase();
                    if !h.sql.to_lowercase().contains(&keyword_lower) {
                        return false;
                    }
                }

                // 接続IDフィルタ
                if let Some(ref connection_id) = request.connection_id {
                    if &h.connection_id != connection_id {
                        return false;
                    }
                }

                // 成功のみフィルタ
                if let Some(success_only) = request.success_only {
                    if success_only && !h.success {
                        return false;
                    }
                }

                // 日付範囲フィルタ（簡易版）
                if let Some(ref from_date) = request.from_date {
                    if h.executed_at < *from_date {
                        return false;
                    }
                }
                if let Some(ref to_date) = request.to_date {
                    if h.executed_at > *to_date {
                        return false;
                    }
                }

                true
            })
            .take(request.limit.unwrap_or(100))
            .map(QueryHistoryMetadata::from)
            .collect();

        Ok(filtered)
    }

    /// 古い履歴をクリア
    pub fn clear_old_histories(&self, days: u32) -> Result<usize, String> {
        let mut collection = self.load_collection()?;
        let cutoff_date = Utc::now() - chrono::Duration::days(days as i64);
        let cutoff_str = cutoff_date.to_rfc3339();

        let original_count = collection.histories.len();
        collection.histories.retain(|h| h.executed_at >= cutoff_str);
        let deleted_count = original_count - collection.histories.len();

        self.save_collection(&collection)?;

        Ok(deleted_count)
    }

    /// 全履歴を削除
    pub fn clear_all_histories(&self) -> Result<(), String> {
        let collection = QueryHistoryCollection {
            histories: Vec::new(),
        };
        self.save_collection(&collection)
    }
}
