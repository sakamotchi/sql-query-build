# タスクリスト - UPDATEビルダー

## 概要

UPDATEビルダーの実装タスクを管理するドキュメントです。Phase 8.3の仕様に基づき、SET句・WHERE句設定、SQL生成、実行機能を実装します。

## タスク一覧

### 1. 型定義・ストア拡張

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 1.1 | UpdateQueryModel型定義追加 | 📝 | - | app/types/mutation-query.ts |
| 1.2 | SetColumnConfig型定義追加 | 📝 | - | SetTab.vue内部 |
| 1.3 | mutation-builderストア拡張（UPDATE用アクション） | 📝 | - | updateSetClause, updateWhereClause, generateUpdateSql |
| 1.4 | mutation-builderストア拡張（WHERE句判定ゲッター） | 📝 | - | checkWhereClause |

### 2. フロントエンド実装（コンポーネント）

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 2.1 | UpdatePanel.vueコンポーネント作成 | 📝 | - | タブ切り替え（SET / WHERE） |
| 2.2 | SetTab.vueコンポーネント作成 | 📝 | - | SET句設定UI |
| 2.3 | SetColumnField.vueコンポーネント作成 | 📝 | - | カラム個別の値入力フィールド |
| 2.4 | MutationWhereTab.vue再利用対応 | 📝 | - | mutation-builderストアとの連携調整 |
| 2.5 | TableSelector.vue拡張（UPDATE対応） | 📝 | - | 既存コンポーネント、必要に応じて拡張 |

### 3. フロントエンド実装（UI機能）

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 3.1 | カラム追加・削除機能実装 | 📝 | - | SetTab.vue |
| 3.2 | 型に応じた入力コンポーネント切り替え | 📝 | - | SetColumnField.vue |
| 3.3 | NULL入力対応 | 📝 | - | SetColumnField.vue |
| 3.4 | WHERE句なし警告バナー実装 | 📝 | - | SqlPreviewPanel.vue拡張 |
| 3.5 | リアルタイムSQLプレビュー更新 | 📝 | - | watch機構 |

### 4. バックエンド実装（Rust）

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 4.1 | UpdateQueryModel型定義追加（Rust） | 📝 | - | src-tauri/src/query/mutation.rs |
| 4.2 | generate_update_sql関数実装 | 📝 | - | SET句生成ロジック |
| 4.3 | generate_update_sql関数実装 | 📝 | - | WHERE句生成ロジック |
| 4.4 | データベース方言対応（PostgreSQL） | 📝 | - | エスケープ処理、識別子クォート |
| 4.5 | データベース方言対応（MySQL） | 📝 | - | エスケープ処理、識別子クォート |
| 4.6 | データベース方言対応（SQLite） | 📝 | - | エスケープ処理、識別子クォート |
| 4.7 | Tauriコマンド登録 | 📝 | - | generate_update_sqlコマンド |

### 5. 実行機能実装

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 5.1 | UPDATE実行ボタン連携 | 📝 | - | MutationBuilderToolbar.vue |
| 5.2 | WHERE句なし確認ダイアログ表示 | 📝 | - | DangerousQueryDialog連携 |
| 5.3 | 影響行数表示 | 📝 | - | execute_mutation結果表示 |
| 5.4 | エラーハンドリング | 📝 | - | SQL構文エラー、DB接続エラー等 |

### 6. クエリ保存・履歴連携

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 6.1 | UPDATE文保存機能 | 📝 | - | SaveQueryDialog連携 |
| 6.2 | UPDATE実行履歴記録 | 📝 | - | QueryHistorySlideover連携 |
| 6.3 | 保存済みUPDATE文読み込み | 📝 | - | クエリ復元機能 |
| 6.4 | 履歴からUPDATE文復元 | 📝 | - | クエリ復元機能 |

### 7. テスト実装

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 7.1 | UpdatePanel.vueユニットテスト | 📝 | - | Vitest + @vue/test-utils |
| 7.2 | SetTab.vueユニットテスト | 📝 | - | カラム追加・削除テスト |
| 7.3 | SetColumnField.vueユニットテスト | 📝 | - | 入力コンポーネント切り替えテスト |
| 7.4 | mutation-builderストアテスト | 📝 | - | UPDATE関連アクションテスト |
| 7.5 | generate_update_sql Rustテスト | 📝 | - | WHERE句あり/なし、NULL値テスト |
| 7.6 | データベース方言テスト（Rust） | 📝 | - | PostgreSQL/MySQL/SQLiteテスト |
| 7.7 | 統合テスト | 📝 | - | 実際のDBでUPDATE実行テスト |

### 8. ドキュメント・仕上げ

| ID | タスク | 状態 | 担当 | 備考 |
|----|--------|------|------|------|
| 8.1 | 永続化ドキュメント更新 | 📝 | - | docs/02_functional_design.md等 |
| 8.2 | コードレビュー | 📝 | - | 全実装コードレビュー |
| 8.3 | リファクタリング | 📝 | - | コード品質向上 |
| 8.4 | 手動動作確認 | 📝 | - | testing.mdに基づく確認 |

## 進捗管理

### 状態の凡例

- 📝 計画中（未着手）
- 🔄 作業中
- ✅ 完了
- ⚠️ 一部完了・保留
- ❌ 中止

### マイルストーン

| マイルストーン | 完了条件 | 状態 |
|--------------|---------|------|
| M1: 型定義・ストア拡張完了 | タスク1.1-1.4完了 | 📝 |
| M2: コンポーネント基盤完了 | タスク2.1-2.5完了 | 📝 |
| M3: UI機能完了 | タスク3.1-3.5完了 | 📝 |
| M4: Rust実装完了 | タスク4.1-4.7完了 | 📝 |
| M5: 実行機能完了 | タスク5.1-5.4完了 | 📝 |
| M6: 統合機能完了 | タスク6.1-6.4完了 | 📝 |
| M7: テスト完了 | タスク7.1-7.7完了 | 📝 |
| M8: リリース準備完了 | タスク8.1-8.4完了 | 📝 |

## 依存関係

```
1. 型定義・ストア拡張
    ↓
2. コンポーネント基盤
    ↓
3. UI機能 ← 4. Rust実装
    ↓         ↓
5. 実行機能
    ↓
6. 統合機能
    ↓
7. テスト
    ↓
8. ドキュメント・仕上げ
```

## メモ・決定事項

### 2026-01-02
- UPDATEビルダーの開発作業ドキュメントを作成
- INSERTビルダーの実装パターンを参考に設計
- MutationWhereTab.vueでWhereTab構成を再利用し、WHERE句設定は既存コンポーネントを活用
- WHERE句なし警告を強調表示することで、安全性を向上

## 参考リンク

- [WBS Phase 8.3](../../sql_editor_wbs_v3.md#83-updateビルダー)
- [要件定義書](./requirements.md)
- [設計書](./design.md)
- [テスト手順書](./testing.md)
- [INSERTビルダー実装](../20260101_insert-builder/)
