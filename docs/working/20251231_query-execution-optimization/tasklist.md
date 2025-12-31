# タスクリスト - クエリ実行の最適化

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 7 |

## タスク一覧

### T-1: 要件定義・設計

- [x] 要件定義書の作成
- [x] 設計書の作成
- [ ] レビュー完了

**関連要件**: すべて
**担当**: -
**期限**: -

---

### T-2: DecryptedPasswordCache の実装

**概要**: 復号化済みパスワードをキャッシュするモジュールを実装する

**関連要件**: F-1, F-2

**実装内容**:
- [ ] `src-tauri/src/crypto/password_cache.rs` ファイル作成
- [ ] `CacheEntry` 構造体の実装
  - [ ] `new()` - 新規エントリ作成（TTL設定）
  - [ ] `is_expired()` - 有効期限チェック
- [ ] `DecryptedPasswordCache` 構造体の実装
  - [ ] `new(ttl_seconds)` - カスタムTTLでキャッシュ作成
  - [ ] `default()` - デフォルトTTL（24時間）でキャッシュ作成
  - [ ] `get(connection_id)` - キャッシュから取得（期限切れ自動削除）
  - [ ] `set(connection_id, password)` - キャッシュに保存
  - [ ] `invalidate(connection_id)` - 特定の接続のキャッシュクリア
  - [ ] `clear()` - すべてのキャッシュクリア
- [ ] ユニットテストの作成
  - [ ] キャッシュヒットのテスト
  - [ ] キャッシュミスのテスト
  - [ ] 有効期限切れのテスト
  - [ ] `invalidate()` のテスト
  - [ ] `clear()` のテスト
  - [ ] スレッドセーフティのテスト

**参照ファイル**: `design.md` - データ構造セクション

---

### T-3: crypto/mod.rs への export 追加

**概要**: DecryptedPasswordCache を公開APIとして export する

**関連要件**: F-1

**実装内容**:
- [ ] `src-tauri/src/crypto/mod.rs` に `password_cache` モジュールを追加
- [ ] `DecryptedPasswordCache` を pub use で export

**参照ファイル**: `src-tauri/src/crypto/mod.rs`

---

### T-4: ConnectionService への統合

**概要**: `ConnectionService::get_by_id()` でキャッシュを利用するよう変更

**関連要件**: F-3

**実装内容**:
- [ ] `ConnectionService` に `password_cache: DecryptedPasswordCache` フィールドを追加
- [ ] `ConnectionService::new()` でキャッシュを初期化（デフォルトTTL: 24時間）
- [ ] `get_by_id()` メソッドの変更
  - [ ] `include_password_decrypted = true` の場合、キャッシュをチェック
  - [ ] キャッシュヒット時、復号化をスキップしてキャッシュの値を使用
  - [ ] キャッシュミス時、従来通り復号化を実行
  - [ ] 復号化成功時、結果をキャッシュに保存
- [ ] 動作確認
  - [ ] キャッシュヒット時、復号化がスキップされることを確認（ログ出力等）
  - [ ] キャッシュミス時、復号化が実行されることを確認

**参照ファイル**:
- `src-tauri/src/connection/service.rs`
- `design.md` - ConnectionService の変更セクション

---

### T-5: キャッシュ無効化処理の実装

**概要**: 接続情報更新・削除時にキャッシュをクリアする

**関連要件**: F-4

**実装内容**:
- [ ] `ConnectionService::update()` に `password_cache.invalidate(id)` を追加
- [ ] `ConnectionService::delete()` に `password_cache.invalidate(id)` を追加
- [ ] 動作確認
  - [ ] 接続情報更新後、キャッシュがクリアされることを確認
  - [ ] 接続情報削除後、キャッシュがクリアされることを確認

**参照ファイル**:
- `src-tauri/src/connection/service.rs`
- `src-tauri/src/commands/connection.rs`

---

### T-6: アプリ終了時のクリーンアップ処理

**概要**: アプリ終了時にすべてのキャッシュをクリアする

**関連要件**: F-4

**実装内容**:
- [ ] `ConnectionService` に `clear_password_cache()` メソッドを追加
- [ ] アプリ終了時の処理を調査（Tauriのライフサイクルフック）
- [ ] 終了時に `clear_password_cache()` を呼び出す処理を実装
- [ ] 動作確認
  - [ ] アプリ終了時、キャッシュがクリアされることを確認

**参照ファイル**:
- `src-tauri/src/main.rs`
- Tauriドキュメント（ライフサイクルフック）

**注意**:
- Tauriアプリの終了フックは複数の方法がある（`on_window_event`, `on_app_close` など）
- 最適な方法を調査して実装する

---

### T-7: パフォーマンス計測とテスト

**概要**: キャッシュ導入前後のパフォーマンスを計測し、改善効果を確認する

**関連要件**: すべて

**実装内容**:
- [ ] ベンチマークスクリプト作成
  - [ ] 同一接続で100回クエリを実行
  - [ ] 1回目: 復号化あり（キャッシュミス）
  - [ ] 2-100回目: 復号化なし（キャッシュヒット）
  - [ ] 実行時間を計測・比較
- [ ] セキュリティテスト
  - [ ] 5分後にキャッシュが期限切れになることを確認
  - [ ] 接続情報更新時にキャッシュがクリアされることを確認
  - [ ] アプリ終了時にキャッシュがクリアされることを確認
- [ ] 統合テスト
  - [ ] 複数接続で並行してクエリ実行（スレッドセーフティ確認）
  - [ ] マスターパスワード変更時のキャッシュクリア確認
- [ ] パフォーマンス改善レポート作成
  - [ ] Before/Afterの実行時間を記録
  - [ ] 改善率を計算
  - [ ] `testing.md` に結果を記載

**参照ファイル**: `testing.md`

---

### T-8: ドキュメント更新

**概要**: 永続化ドキュメントとWBSを更新する

**関連要件**: すべて

**実装内容**:
- [ ] WBS Phase 7.2 のタスクを完了状態に更新
  - [ ] `docs/sql_editor_wbs_v3.md` の 7.2.1〜7.2.5 を ✅ に変更
  - [ ] 完了日を記載
- [ ] 技術仕様書の更新（必要に応じて）
  - [ ] `docs/03_architecture_specifications.md` にキャッシュ機構を追加
- [ ] リポジトリ構造定義書の更新（必要に応じて）
  - [ ] `docs/04_repository_structure.md` に `password_cache.rs` を追加
- [ ] コードレビュー完了

**参照ファイル**:
- `docs/sql_editor_wbs_v3.md`
- `docs/03_architecture_specifications.md`
- `docs/04_repository_structure.md`

---

## 完了条件

- [ ] すべてのタスク（T-1〜T-8）が完了
- [ ] ユニットテストがすべてパス
- [ ] パフォーマンステストで改善効果が確認できた
- [ ] セキュリティテストがすべてパス（有効期限切れ、キャッシュクリア等）
- [ ] 永続化ドキュメントが更新済み
- [ ] WBS Phase 7.2 が完了状態に更新済み

## タスク依存関係

```
T-1 (要件定義・設計)
 ↓
T-2 (DecryptedPasswordCache実装)
 ↓
T-3 (mod.rs export)
 ↓
T-4 (ConnectionService統合)
 ↓
T-5 (キャッシュ無効化) + T-6 (終了時クリーンアップ)
 ↓
T-7 (パフォーマンス計測)
 ↓
T-8 (ドキュメント更新)
```

## メモ

### セキュリティ考慮事項（再掲）

- メモリに平文パスワードを保持する期間を最小限に（TTL: 5分）
- アプリ終了時、メモリ上のパスワードを確実にクリア
- 接続情報更新時、古いパスワードのキャッシュを確実にクリア
- より高いセキュリティが必要な場合、`zeroize` クレートでゼロクリアを保証

### パフォーマンス改善の見込み

- キャッシュヒット時、復号化処理時間（数十ms〜数百ms）を削減
- 同一接続で連続クエリ実行時、体感的な速度向上が期待できる
- 特に、クエリビルダーでの試行錯誤時に効果が大きい
