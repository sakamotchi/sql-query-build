# 要件定義書 - db-connection-timeout

## 概要

クエリビルダー画面・SQLエディタ画面を開いた際に、データベースが起動していない場合にローディングスピナーが永遠に回り続ける問題を修正する。フロントエンドとRustバックエンドの両方にタイムアウトを実装する。

## 背景・目的

現状、データベースへの接続要求が応答を返さない場合（DBサーバーダウン、ネットワーク障害等）、`invoke()` の Promise と Rust の `sqlx` 接続処理がいずれもタイムアウトせずハング状態になる。ユーザーには永遠にローディングスピナーが表示され、アプリが応答していないように見える。

## 要件一覧

### 機能要件

#### F-1: Rustバックエンドに接続タイムアウトを追加

- **説明**: データベース構造取得コマンド（`get_database_structure`・`get_database_structure_summary`・`get_schemas`・`get_tables`・`get_columns`・`get_columns_by_schema`）のasync処理全体を `tokio::time::timeout` でラップする
- **受け入れ条件**:
  - [ ] DBが起動していない状態で接続を試みると、30秒以内に `Err` が返る
  - [ ] タイムアウトエラーメッセージが日本語で分かりやすく表示される
  - [ ] PostgreSQL・MySQL・SQLiteのすべてで有効に動作する

#### F-2: フロントエンドに invoke タイムアウトを追加

- **説明**: `useTauri` Composableの `invokeCommand` に `Promise.race()` によるタイムアウトを追加し、Rustバックエンドが応答しない場合でも一定時間後にエラーになるようにする
- **受け入れ条件**:
  - [ ] 35秒後に `invoke()` がタイムアウトしてエラーを投げる
  - [ ] タイムアウト時にローディング状態が解除される
  - [ ] 既存の `safeInvokeCommand` も同様にタイムアウトが効く

### 非機能要件

- **パフォーマンス**: 正常接続時のレスポンスタイムに影響を与えない
- **保守性**: タイムアウト秒数を定数として管理し、変更しやすくする
- **ユーザー体験**: タイムアウト後は明確なエラーメッセージが表示され、再試行できる

## スコープ

### 対象

- `app/composables/useTauri.ts` - フロントエンドタイムアウト
- `src-tauri/src/commands/database_structure.rs` - Rustバックエンドタイムアウト

### 対象外

- クエリ実行（`execute_query`）のタイムアウト（別途実装済み・またはキャンセル機能で対応）
- 接続設定画面の `test_connection` コマンド（既に短い処理）
- UI側のエラー表示コンポーネントの改修

## 実装対象ファイル（予定）

- `app/composables/useTauri.ts`
- `src-tauri/src/commands/database_structure.rs`

## 依存関係

- `tokio` - Rustバックエンドで既に依存済み（Tauri組み込み）

## 既知の制約

- フロントエンドのタイムアウト（35秒）はRust側（30秒）より長くすること（Rustのタイムアウトエラーメッセージを受け取れるようにするため）

## 参考資料

- [tokio::time::timeout ドキュメント](https://docs.rs/tokio/latest/tokio/time/fn.timeout.html)
