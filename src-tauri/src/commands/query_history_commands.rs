use crate::models::query_history::{
    AddHistoryRequest, QueryHistory, QueryHistoryMetadata, SearchHistoryRequest,
};
use crate::services::query_history::QueryHistoryService;
use crate::storage::path_manager::PathManager;
use std::sync::Mutex;
use tauri::State;

pub struct QueryHistoryState(pub Mutex<Option<QueryHistoryService>>);

impl Default for QueryHistoryState {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

fn get_service<'a>(
    state: &'a State<QueryHistoryState>,
    path_manager: &State<PathManager>,
) -> Result<std::sync::MutexGuard<'a, Option<QueryHistoryService>>, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        *guard = Some(QueryHistoryService::new(path_manager)?);
    }
    Ok(guard)
}

#[tauri::command]
pub fn add_query_history(
    request: AddHistoryRequest,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<QueryHistory, String> {
    let guard = get_service(&state, &path_manager)?;
    guard.as_ref().unwrap().add_history(request)
}

#[tauri::command]
pub fn load_query_history(
    id: String,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<QueryHistory, String> {
    let guard = get_service(&state, &path_manager)?;
    guard.as_ref().unwrap().load_history(&id)
}

#[tauri::command]
pub fn delete_query_history(
    id: String,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<(), String> {
    let guard = get_service(&state, &path_manager)?;
    guard.as_ref().unwrap().delete_history(&id)
}

#[tauri::command]
pub fn list_query_histories(
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<Vec<QueryHistoryMetadata>, String> {
    let guard = get_service(&state, &path_manager)?;
    guard.as_ref().unwrap().list_histories()
}

#[tauri::command]
pub fn search_query_histories(
    request: SearchHistoryRequest,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<Vec<QueryHistoryMetadata>, String> {
    let guard = get_service(&state, &path_manager)?;
    guard.as_ref().unwrap().search_histories(request)
}

#[tauri::command]
pub fn clear_old_query_histories(
    days: u32,
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<usize, String> {
    let guard = get_service(&state, &path_manager)?;
    guard.as_ref().unwrap().clear_old_histories(days)
}

#[tauri::command]
pub fn clear_all_query_histories(
    state: State<QueryHistoryState>,
    path_manager: State<PathManager>,
) -> Result<(), String> {
    let guard = get_service(&state, &path_manager)?;
    guard.as_ref().unwrap().clear_all_histories()
}
