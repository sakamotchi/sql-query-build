# タスクリスト - db-connection-timeout

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 1 |
| 進行中 | 0 |
| 未着手 | 3 |

## タスク一覧

### T-1: 要件定義・設計

- [x] 要件定義書の作成
- [x] 設計書の作成

### T-2: フロントエンド実装

- [ ] `app/composables/useTauri.ts` に `Promise.race()` タイムアウトを追加

### T-3: Rustバックエンド実装

- [ ] `src-tauri/src/commands/database_structure.rs` の各コマンドに `tokio::time::timeout` を追加

### T-4: テスト・ドキュメント

- [ ] `npm run typecheck` でTypeScriptエラーがないことを確認
- [ ] `cd src-tauri && cargo build` でコンパイルエラーがないことを確認
- [ ] 永続化ドキュメント更新（不要の場合はスキップ）

## 完了条件

- [ ] 全タスクが完了
- [ ] TypeScriptチェックがパス
- [ ] Rustビルドがパス
