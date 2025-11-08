use tauri::State;
use crate::connection::{ConnectionInfo, FrontendConnection, service::ConnectionService};

/// すべての接続情報を取得
#[tauri::command]
pub async fn get_connections(
    service: State<'_, ConnectionService>,
) -> Result<Vec<FrontendConnection>, String> {
    let connections = service
        .get_all()
        .map_err(|e| format!("Failed to get connections: {}", e))?;

    Ok(connections.into_iter().map(FrontendConnection::from).collect())
}

/// IDで接続情報を取得
#[tauri::command]
pub async fn get_connection(
    id: String,
    include_password_decrypted: bool,
    service: State<'_, ConnectionService>,
) -> Result<Option<FrontendConnection>, String> {
    let connection = service
        .get_by_id(&id, include_password_decrypted)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?;

    Ok(connection.map(FrontendConnection::from))
}

/// 接続情報を作成
#[tauri::command]
pub async fn create_connection(
    connection: FrontendConnection,
    service: State<'_, ConnectionService>,
) -> Result<FrontendConnection, String> {
    let conn_info: ConnectionInfo = connection.try_into()
        .map_err(|e: String| format!("Failed to convert connection: {}", e))?;

    let created = service
        .create(conn_info)
        .await
        .map_err(|e| format!("Failed to create connection: {}", e))?;

    Ok(FrontendConnection::from(created))
}

/// 接続情報を更新
#[tauri::command]
pub async fn update_connection(
    connection: FrontendConnection,
    service: State<'_, ConnectionService>,
) -> Result<FrontendConnection, String> {
    let conn_info: ConnectionInfo = connection.try_into()
        .map_err(|e: String| format!("Failed to convert connection: {}", e))?;

    let updated = service
        .update(conn_info)
        .await
        .map_err(|e| format!("Failed to update connection: {}", e))?;

    Ok(FrontendConnection::from(updated))
}

/// 接続情報を削除
#[tauri::command]
pub async fn delete_connection(
    id: String,
    service: State<'_, ConnectionService>,
) -> Result<(), String> {
    service
        .delete(&id)
        .map_err(|e| format!("Failed to delete connection: {}", e))
}

/// 最終使用日時を更新
#[tauri::command]
pub async fn mark_connection_used(
    id: String,
    service: State<'_, ConnectionService>,
) -> Result<(), String> {
    service
        .mark_as_used(&id)
        .map_err(|e| format!("Failed to mark connection as used: {}", e))
}

/// 接続をテスト（実際にDBに接続してみる）
#[tauri::command]
pub async fn test_connection(
    id: String,
    service: State<'_, ConnectionService>,
) -> Result<crate::connection::TestConnectionResult, String> {
    use crate::connection::ConnectionTestService;

    // 接続情報を取得（パスワード復号化あり）
    let connection = service
        .get_by_id(&id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| "Connection not found".to_string())?;

    // 接続テストを実行（デフォルトタイムアウト30秒）
    ConnectionTestService::test_connection(&connection, 30)
        .await
        .map_err(|e| format!("Connection test failed: {}", e))
}
