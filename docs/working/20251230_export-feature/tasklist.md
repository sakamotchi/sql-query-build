# フェーズ5: エクスポート機能 - タスクリスト

**作成日**: 2025-12-30
**WBS参照**: `docs/sql_editor_wbs_v3.md` Phase 5

## タスク一覧

| タスクID | タスク名 | 依存関係 | 担当 | 状態 | 備考 |
|---------|---------|---------|------|------|------|
| 5.1 | CSVエクスポート実装（Rust） | Phase 2 | - | 📝 待機中 | - |
| 5.2 | Excelエクスポート実装（Rust） | 5.1 | - | 📝 待機中 | - |
| 5.3 | JSONエクスポート実装 | 5.1 | - | 📝 待機中 | - |
| 5.4 | ExportDialog.vue | 5.1-3 | - | 📝 待機中 | - |
| 5.5 | ファイル保存ダイアログ連携 | 5.4 | - | 📝 待機中 | tauri-plugin-dialog使用 |
| 5.6 | 大量データ時の進捗表示 | 5.5 | - | 📝 待機中 | 将来拡張 |

## 詳細タスク分解

### 5.1 CSVエクスポート実装（Rust）

#### 5.1.1 型定義
- [ ] `src-tauri/src/models/export.rs` 作成
- [ ] `ExportFormat` enum定義
- [ ] `ExportOptions` struct定義
- [ ] `ExportResult` struct定義

#### 5.1.2 CSVエクスポーター実装
- [ ] `src-tauri/src/services/exporter.rs` 作成
- [ ] `CsvExporter` struct実装
- [ ] UTF-8 BOM付きCSV出力
- [ ] ヘッダー行出力
- [ ] NULL値の空文字列変換
- [ ] 改行・カンマのエスケープ処理

#### 5.1.3 単体テスト
- [ ] テストデータ生成関数
- [ ] CSV出力テスト
- [ ] ヘッダー有無のテスト
- [ ] NULL値処理のテスト
- [ ] 特殊文字エスケープテスト

#### 5.1.4 依存関係追加
- [ ] `Cargo.toml`に`csv`クレート追加
- [ ] ビルド確認

### 5.2 Excelエクスポート実装（Rust）

#### 5.2.1 Excelエクスポーター実装
- [ ] `ExcelExporter` struct実装
- [ ] `.xlsx`ファイル生成
- [ ] ヘッダー行（太字）出力
- [ ] データ行出力
- [ ] カラム幅自動調整
- [ ] NULL値の空セル処理

#### 5.2.2 単体テスト
- [ ] Excel出力テスト
- [ ] フォーマット確認テスト

#### 5.2.3 依存関係追加
- [ ] `Cargo.toml`に`rust_xlsxwriter`クレート追加
- [ ] ビルド確認

### 5.3 JSONエクスポート実装

#### 5.3.1 JSONエクスポーター実装
- [ ] `JsonExporter` struct実装
- [ ] Pretty-print JSON出力
- [ ] NULL値の`null`変換

#### 5.3.2 単体テスト
- [ ] JSON出力テスト
- [ ] Pretty-print確認
- [ ] NULL値処理テスト

#### 5.3.3 依存関係追加
- [ ] `serde_json`クレートの確認（既存）

### 5.4 ExportDialog.vue

#### 5.4.1 TypeScript型定義
- [ ] `app/types/export.ts` 作成
- [ ] `ExportFormat`型定義
- [ ] `ExportOptions`型定義
- [ ] `ExportResult`型定義

#### 5.4.2 Export API
- [ ] `app/api/export.ts` 作成
- [ ] `exportApi.exportResult()` 実装
- [ ] Tauri IPCラッパー

#### 5.4.3 Tauriコマンド
- [ ] `src-tauri/src/commands/export_commands.rs` 作成
- [ ] `export_result` コマンド実装
- [ ] `lib.rs`にコマンド登録

#### 5.4.4 ExportDialog.vue実装
- [ ] `app/components/query-builder/dialog/ExportDialog.vue` 作成
- [ ] ファイル形式選択UI
- [ ] 行数表示
- [ ] エラーメッセージ表示
- [ ] Export/Cancelボタン

#### 5.4.5 単体テスト
- [ ] `ExportDialog.test.ts` 作成
- [ ] 形式選択テスト
- [ ] 行数表示テスト
- [ ] イベント発火テスト

### 5.5 ファイル保存ダイアログ連携

#### 5.5.1 ファイルダイアログ統合
- [ ] `tauri-plugin-dialog`の`save()`使用
- [ ] デフォルトファイル名生成（タイムスタンプ付き）
- [ ] ファイル形式フィルタ設定
- [ ] ユーザーキャンセル処理

#### 5.5.2 ResultPanel統合
- [ ] `ResultPanel.vue`にExportボタン追加
- [ ] ExportDialogの表示/非表示制御
- [ ] 成功通知処理

#### 5.5.3 エラーハンドリング
- [ ] `app/utils/export-errors.ts` 作成
- [ ] エラーメッセージフォーマット関数
- [ ] ファイル書き込みエラー処理
- [ ] 権限エラー処理
- [ ] ディスク容量不足エラー処理

#### 5.5.4 統合テスト（手動）
- [ ] CSV出力の動作確認
- [ ] Excel出力の動作確認
- [ ] JSON出力の動作確認
- [ ] キャンセル動作確認
- [ ] エラーケースの動作確認

### 5.6 大量データ時の進捗表示（将来拡張）

**注**: Phase 5の初期リリースでは実装せず、将来拡張として設計のみ記載

#### 設計項目
- [ ] 進捗通知の設計（Tauri Event使用）
- [ ] `ExportProgressDialog.vue`の設計
- [ ] キャンセル処理の設計
- [ ] ストリーミング書き込みの設計

## 完了条件

- [ ] ✅ PostgreSQL/MySQL/SQLiteで実行した結果をCSV/Excel/JSONで出力できる
- [ ] ✅ ファイル保存先を選択できる
- [ ] ✅ エクスポート成功時に通知が表示される
- [ ] ✅ エラー時に適切なエラーメッセージが表示される
- [ ] ✅ NULL値が適切に処理される
- [ ] ✅ 特殊文字（改行、カンマ等）が適切にエスケープされる
- [ ] ✅ すべての単体テストが通過する

## メモ

- タスク5.6（進捗表示）は初期リリースでは実装しない（設計のみ）
- 10,000行以下のデータでパフォーマンス確認
- エラーハンドリングを重視（ファイル書き込みエラーは頻発しやすい）
