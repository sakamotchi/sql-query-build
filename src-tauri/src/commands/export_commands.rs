use crate::models::export::{ExportOptions, ExportResult};
use crate::models::query_result::QueryResult;
use crate::services::exporter;

#[tauri::command]
pub async fn export_query_result(
    result: QueryResult,
    options: ExportOptions,
) -> Result<ExportResult, String> {
    // Run blocking export task on a separate thread to avoid blocking the async runtime
    let result = result.clone();
    let options = options.clone();

    // Using spawn_blocking for CPU/IO intensive work
    let export_result =
        tokio::task::spawn_blocking(move || exporter::export_data(&result, &options))
            .await
            .map_err(|e| e.to_string())??;

    Ok(export_result)
}
