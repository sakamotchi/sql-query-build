use crate::models::sql_editor_history::{
    AddSqlEditorHistoryRequest, ExecutionStatus, SearchSqlEditorHistoryRequest,
    SqlEditorHistoryEntry,
};
use crate::storage::path_manager::PathManager;
use chrono::Utc;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const MAX_HISTORY_COUNT: usize = 1000;

pub struct SqlEditorHistoryService {
    histories_dir: PathBuf,
}

impl SqlEditorHistoryService {
    pub fn new(path_manager: &PathManager) -> Result<Self, String> {
        let histories_dir = path_manager.sql_editor_histories_dir();
        fs::create_dir_all(&histories_dir).map_err(|e| e.to_string())?;
        Ok(Self { histories_dir })
    }

    #[cfg(test)]
    fn new_for_test(histories_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&histories_dir).map_err(|e| e.to_string())?;
        Ok(Self { histories_dir })
    }

    fn history_file_path(&self, connection_id: &str) -> PathBuf {
        self.histories_dir
            .join(format!("{}_history.jsonl", connection_id))
    }

    pub fn add_history(
        &self,
        request: AddSqlEditorHistoryRequest,
    ) -> Result<SqlEditorHistoryEntry, String> {
        let entry = SqlEditorHistoryEntry {
            id: Uuid::new_v4().to_string(),
            connection_id: request.connection_id.clone(),
            sql: request.sql,
            executed_at: Utc::now().to_rfc3339(),
            execution_time_ms: request.execution_time_ms,
            status: request.status,
            row_count: request.row_count,
            error_message: request.error_message,
        };

        let file_path = self.history_file_path(&entry.connection_id);
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)
            .map_err(|e| e.to_string())?;

        let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
        writeln!(file, "{}", json).map_err(|e| e.to_string())?;
        set_secure_permissions(&file_path)?;

        self.cleanup_if_needed(&entry.connection_id)?;

        Ok(entry)
    }

    pub fn get_histories(
        &self,
        request: SearchSqlEditorHistoryRequest,
    ) -> Result<Vec<SqlEditorHistoryEntry>, String> {
        let connection_id = request
            .connection_id
            .ok_or("connection_id is required")?;

        let file_path = self.history_file_path(&connection_id);
        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let histories = read_histories(&file_path)?;
        let keyword = request.keyword.as_ref().map(|k| k.to_lowercase());

        let mut filtered: Vec<SqlEditorHistoryEntry> = histories
            .into_iter()
            .filter(|entry| {
                if let Some(ref keyword) = keyword {
                    if !entry.sql.to_lowercase().contains(keyword) {
                        return false;
                    }
                }

                if request.success_only == Some(true)
                    && !matches!(entry.status, ExecutionStatus::Success)
                {
                    return false;
                }

                true
            })
            .collect();

        filtered.reverse();

        if let Some(limit) = request.limit {
            filtered.truncate(limit);
        }

        Ok(filtered)
    }

    pub fn delete_history(&self, connection_id: &str, id: &str) -> Result<(), String> {
        let file_path = self.history_file_path(connection_id);

        if !file_path.exists() {
            return Err("History file not found".to_string());
        }

        let histories = read_histories(&file_path)?;
        let mut file = File::create(&file_path).map_err(|e| e.to_string())?;

        for entry in histories.into_iter().filter(|entry| entry.id != id) {
            let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
            writeln!(file, "{}", json).map_err(|e| e.to_string())?;
        }

        set_secure_permissions(&file_path)?;

        Ok(())
    }

    fn cleanup_if_needed(&self, connection_id: &str) -> Result<(), String> {
        let file_path = self.history_file_path(connection_id);

        if !file_path.exists() {
            return Ok(());
        }

        let mut histories = read_histories(&file_path)?;

        if histories.len() <= MAX_HISTORY_COUNT {
            return Ok(());
        }

        histories.drain(0..(histories.len() - MAX_HISTORY_COUNT));

        let mut file = File::create(&file_path).map_err(|e| e.to_string())?;
        for entry in histories {
            let json = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
            writeln!(file, "{}", json).map_err(|e| e.to_string())?;
        }

        set_secure_permissions(&file_path)?;

        Ok(())
    }
}

fn read_histories(file_path: &Path) -> Result<Vec<SqlEditorHistoryEntry>, String> {
    let file = File::open(file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);

    let mut histories = Vec::new();
    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        if let Ok(entry) = serde_json::from_str::<SqlEditorHistoryEntry>(&line) {
            histories.push(entry);
        }
    }

    Ok(histories)
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
    use tempfile::TempDir;

    #[test]
    fn test_add_history() {
        let temp_dir = TempDir::new().unwrap();
        let service = SqlEditorHistoryService::new_for_test(temp_dir.path().to_path_buf()).unwrap();

        let request = AddSqlEditorHistoryRequest {
            connection_id: "test-conn".to_string(),
            sql: "SELECT * FROM users".to_string(),
            status: ExecutionStatus::Success,
            execution_time_ms: 120,
            row_count: Some(2),
            error_message: None,
        };

        let result = service.add_history(request).unwrap();

        assert_eq!(result.connection_id, "test-conn");
        assert_eq!(result.sql, "SELECT * FROM users");
        assert!(matches!(result.status, ExecutionStatus::Success));
    }

    #[test]
    fn test_get_histories() {
        let temp_dir = TempDir::new().unwrap();
        let service = SqlEditorHistoryService::new_for_test(temp_dir.path().to_path_buf()).unwrap();

        for i in 1..=3 {
            service
                .add_history(AddSqlEditorHistoryRequest {
                    connection_id: "test-conn".to_string(),
                    sql: format!("SELECT {}", i),
                    status: ExecutionStatus::Success,
                    execution_time_ms: 100,
                    row_count: Some(1),
                    error_message: None,
                })
                .unwrap();
        }

        let histories = service
            .get_histories(SearchSqlEditorHistoryRequest {
                connection_id: Some("test-conn".to_string()),
                keyword: None,
                success_only: None,
                limit: None,
            })
            .unwrap();

        assert_eq!(histories.len(), 3);
        assert!(histories[0].sql.contains("3"));
    }

    #[test]
    fn test_cleanup_if_needed() {
        let temp_dir = TempDir::new().unwrap();
        let service = SqlEditorHistoryService::new_for_test(temp_dir.path().to_path_buf()).unwrap();

        for i in 1..=(MAX_HISTORY_COUNT + 5) {
            service
                .add_history(AddSqlEditorHistoryRequest {
                    connection_id: "test-conn".to_string(),
                    sql: format!("SELECT {}", i),
                    status: ExecutionStatus::Success,
                    execution_time_ms: 100,
                    row_count: Some(1),
                    error_message: None,
                })
                .unwrap();
        }

        let histories = service
            .get_histories(SearchSqlEditorHistoryRequest {
                connection_id: Some("test-conn".to_string()),
                keyword: None,
                success_only: None,
                limit: None,
            })
            .unwrap();

        assert_eq!(histories.len(), MAX_HISTORY_COUNT);
    }
}
