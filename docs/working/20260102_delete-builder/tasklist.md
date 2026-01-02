# タスクリスト: 8.4 DELETEビルダー

## 概要

このタスクリストは、[docs/sql_editor_wbs_v3.md](../../sql_editor_wbs_v3.md)のフェーズ8.4に基づいています。

## 進捗状況

- **全体進捗**: 0/6タスク完了（0%）
- **開始日**: 2026-01-02
- **目標完了日**: TBD

## タスク一覧

### 8.4.1 DeletePanel.vue作成 ⏳

**説明**: mutation-builder専用の右パネルコンポーネント作成（シンプル構成）

**依存関係**: 8.1.5（MutationBuilderToolbar作成完了）

**完了条件**:
- ✅ DeletePanel.vueファイルが作成されている
- ✅ テーブル選択UIが表示される
- ✅ WHERE条件設定エリアが表示される
- ✅ WHERE句なし警告が表示される

**実装内容**:
- `app/components/mutation-builder/DeletePanel.vue`を作成
- TableSelector.vueを配置
- MutationWhereTab.vueを配置
- WHERE句なし時の赤色アラートを実装
- mutation-builderストアと連携

**担当者**: TBD

**実装時間見積もり**: 2-3時間

**状態**: ⏳ 未着手

---

### 8.4.2 テーブル選択UI ⏳

**説明**: ドロップダウンで削除対象テーブル選択

**依存関係**: 8.4.1

**完了条件**:
- ✅ TableSelectorでテーブルを選択できる
- ✅ 選択したテーブルがmutation-builderストアに保存される
- ✅ テーブル変更時にWHERE条件がリセットされる

**実装内容**:
- 既存のTableSelector.vueを再利用
- mutation-builderストアの`setSelectedTable()`を使用
- テーブル変更時の初期化処理を確認

**担当者**: TBD

**実装時間見積もり**: 1時間

**状態**: ⏳ 未着手

---

### 8.4.3 WHERE条件設定 ⏳

**説明**: WhereTab.vueを再利用（mutation-builder用にインポート）

**依存関係**: 8.4.2

**完了条件**:
- ✅ MutationWhereTabでWHERE条件を設定できる
- ✅ 条件の追加・削除・編集ができる
- ✅ 複数条件のAND/OR結合ができる
- ✅ グループ化（ネスト）ができる

**実装内容**:
- 既存のMutationWhereTab.vueを再利用
- mutation-builderストアの`addWhereCondition()`等を使用
- WHERE条件の表示確認

**担当者**: TBD

**実装時間見積もり**: 1時間

**状態**: ⏳ 未着手

---

### 8.4.4 DELETE SQL生成（Rust） ⏳

**説明**: `generate_delete_sql`コマンド実装（src-tauri/src/query/mutation.rs）

**依存関係**: 8.4.3

**完了条件**:
- ✅ `generate_delete_sql`関数が実装されている
- ✅ DELETE文が正しく生成される
- ✅ WHERE句がある場合とない場合の両方に対応
- ✅ DB方言（PostgreSQL/MySQL/SQLite）に対応
- ✅ 単体テストが通る

**実装内容**:
- `src-tauri/src/query/mutation.rs`に`generate_delete_sql`関数追加
- `src-tauri/src/commands/mutation_commands.rs`に`generate_delete_sql`コマンド追加
- `app/types/mutation-query.ts`に`DeleteQueryModel`型定義追加
- `app/api/mutation-builder.ts`に`generateDeleteSql`関数追加
- 単体テスト作成

**参考実装**:
- `src-tauri/src/query/mutation.rs`の`generate_update_sql()`

**担当者**: TBD

**実装時間見積もり**: 3-4時間

**状態**: ⏳ 未着手

---

### 8.4.5 WHERE句なし警告（最重要） ⏳

**説明**: WHERE句がない場合の最も強い警告表示（赤色、全行削除の危険性）

**依存関係**: 8.4.4

**完了条件**:
- ✅ WHERE句がない場合、DeletePanel内に赤色アラートが表示される
- ✅ 実行時にDangerousQueryDialogが表示される（dangerレベル）
- ✅ 確認チェックボックスが表示される
- ✅ チェックしないと実行できない

**実装内容**:
- DeletePanel.vueに赤色UAlert追加
- mutation-builderストアの`executeQuery()`でWHERE句チェック実装
- `warningLevel: 'danger'`設定
- DangerousQueryDialogの表示ロジック実装

**参考実装**:
- `app/components/mutation-builder/UpdatePanel.vue`のWHERE句なし警告
- `app/stores/mutation-builder.ts`の`executeQuery()`

**担当者**: TBD

**実装時間見積もり**: 2-3時間

**状態**: ⏳ 未着手

---

### 8.4.6 DELETE実行機能 ⏳

**説明**: ツールバーの実行ボタンでDELETE実行、削除行数表示

**依存関係**: 8.4.5

**完了条件**:
- ✅ ツールバーの実行ボタンでDELETE文を実行できる
- ✅ 削除行数が結果パネルに表示される
- ✅ エラー発生時に適切なエラーメッセージが表示される
- ✅ 実行履歴に記録される

**実装内容**:
- mutation-builderストアの`executeQuery()`でDELETE対応確認
- 結果パネルに削除行数表示
- エラーハンドリング実装
- クエリ履歴への記録確認

**参考実装**:
- `app/stores/mutation-builder.ts`の`executeQuery()`
- `app/components/mutation-builder/MutationBuilderCenterPanel.vue`の結果表示

**担当者**: TBD

**実装時間見積もり**: 2-3時間

**状態**: ⏳ 未着手

---

## タスク依存関係図

```
8.4.1 DeletePanel.vue作成
  ↓
8.4.2 テーブル選択UI
  ↓
8.4.3 WHERE条件設定
  ↓
8.4.4 DELETE SQL生成（Rust）
  ↓
8.4.5 WHERE句なし警告（最重要）
  ↓
8.4.6 DELETE実行機能
```

## リスク管理

| リスクID | リスク内容 | 影響度 | 発生確率 | 対策 |
|---------|-----------|--------|---------|------|
| R1 | WHERE句なし警告が見落とされる | 高 | 低 | 赤色アラート + dangerレベルダイアログで強調 |
| R2 | 既存のINSERT/UPDATEビルダーへの影響 | 中 | 低 | 既存コンポーネントを変更せず再利用 |
| R3 | DB方言対応の漏れ | 中 | 低 | 単体テストで全方言をカバー |

## 完了の定義（Definition of Done）

各タスクは以下の条件を満たした時点で完了とします:

1. ✅ 完了条件がすべて満たされている
2. ✅ コードレビューが完了している
3. ✅ 単体テストが通っている（該当する場合）
4. ✅ E2Eテストが通っている（該当する場合）
5. ✅ ドキュメントが更新されている（該当する場合）

## 次のステップ

1. タスク8.4.1から順番に実装を開始
2. 各タスク完了後、このファイルの進捗状況を更新
3. 全タスク完了後、testing.mdに従ってテストを実施
4. テスト完了後、永続化ドキュメント（docs/features/）を更新
