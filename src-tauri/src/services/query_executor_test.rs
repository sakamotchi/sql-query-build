use crate::services::query_executor::QueryCancellationManager;
use tokio::time::Duration;

#[tokio::test]
async fn test_cancellation_manager() {
    let manager = QueryCancellationManager::new();

    // トークン作成
    let (query_id, token) = manager.create_token().await;
    assert!(!token.is_cancelled());

    // キャンセル実行
    let cancelled = manager.cancel(&query_id).await;
    assert!(cancelled);
    assert!(token.is_cancelled());

    // 存在しないIDのキャンセル
    let cancelled = manager.cancel("non-existent").await;
    assert!(!cancelled);

    // 削除
    manager.remove(&query_id).await;
    let cancelled = manager.cancel(&query_id).await;
    assert!(!cancelled);
}

#[tokio::test]
async fn test_cancel_async_wait() {
    let manager = QueryCancellationManager::new();
    let (query_id, token) = manager.create_token().await;

    let handle = tokio::spawn(async move {
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_secs(10)) => "timeout",
            _ = token.cancelled() => "cancelled",
        }
    });

    // 少し待ってからキャンセル
    tokio::time::sleep(Duration::from_millis(10)).await;
    manager.cancel(&query_id).await;

    let result = handle.await.unwrap();
    assert_eq!(result, "cancelled");
}
