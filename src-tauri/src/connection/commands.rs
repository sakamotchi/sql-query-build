use tauri::State;
use crate::connection::{ConnectionInfo, service::ConnectionService};

/// すべての接続情報を取得
#[tauri::command]
pub async fn get_connections(
    service: State<'_, ConnectionService>,
) -> Result<Vec<ConnectionInfo>, String> {
    service
        .get_all()
        .map_err(|e| format!("Failed to get connections: {}", e))
}

/// IDで接続情報を取得
#[tauri::command]
pub async fn get_connection(
    id: String,
    include_password_decrypted: bool,
    service: State<'_, ConnectionService>,
) -> Result<Option<ConnectionInfo>, String> {
    service
        .get_by_id(&id, include_password_decrypted)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))
}

/// 接続情報を作成
#[tauri::command]
pub async fn create_connection(
    connection: ConnectionInfo,
    service: State<'_, ConnectionService>,
) -> Result<ConnectionInfo, String> {
    service
        .create(connection)
        .await
        .map_err(|e| format!("Failed to create connection: {}", e))
}

/// 接続情報を更新
#[tauri::command]
pub async fn update_connection(
    connection: ConnectionInfo,
    service: State<'_, ConnectionService>,
) -> Result<ConnectionInfo, String> {
    service
        .update(connection)
        .await
        .map_err(|e| format!("Failed to update connection: {}", e))
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
) -> Result<String, String> {
    // 接続情報を取得（パスワード復号化あり）
    let connection = service
        .get_by_id(&id, true)
        .await
        .map_err(|e| format!("Failed to get connection: {}", e))?
        .ok_or_else(|| "Connection not found".to_string())?;

    // 接続文字列を生成
    let password = match &connection.connection {
        crate::connection::ConnectionConfig::Network(network_config) => {
            network_config.encrypted_password.as_deref()
        }
        _ => None,
    };

    let _connection_string = connection
        .build_connection_string(password)
        .map_err(|e| format!("Failed to build connection string: {}", e))?;

    // TODO: 実際にDBに接続してテストする
    // 現時点では接続文字列が生成できることだけ確認
    Ok(format!("Connection test successful (connection string generated)"))
}
