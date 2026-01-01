# タスクリスト - INSERTビルダー

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 0 |
| 進行中 | 0 |
| 未着手 | 7 |

## タスク一覧

### T-1: 要件定義・設計

**状態**: 完了
**担当**: -
**期限**: -

- [x] 要件定義書の作成
- [x] 設計書の作成
- [ ] レビュー完了

**対応するWBSタスク**: なし（準備作業）

---

### T-2: InsertPanel.vue作成（8.2.1）

**状態**: 未着手
**担当**: -
**期限**: -
**依存**: Phase 8.1完了（MutationBuilderLayout, mutation-builderストア）

**作業内容**:
- [ ] `app/components/mutation-builder/InsertPanel.vue` 作成
- [ ] テーブル名表示部分の実装
- [ ] 行管理ロジック（rows配列、createEmptyRow()、addRow()、removeRow()）
- [ ] mutation-builderストアとの連携（watchで自動更新）
- [ ] スタイリング（Nuxt UI v4準拠）

**対応するWBSタスク**: 8.2.1

**完了条件**:
- InsertPanel.vueが存在し、基本的なレイアウトが表示される
- 行の追加・削除機能が動作する
- mutation-builderストアと連携し、queryModelが更新される

---

### T-3: ColumnInputField.vue作成（8.2.3の一部）

**状態**: 未着手
**担当**: -
**期限**: -
**依存**: T-2完了

**作業内容**:
- [ ] `app/components/mutation-builder/ColumnInputField.vue` 作成
- [ ] カラム型に応じた入力コンポーネントの切り替えロジック
  - [ ] UInput（テキスト、数値）
  - [ ] UCheckbox（BOOLEAN）
  - [ ] UTextarea（TEXT型）
- [ ] NULLチェックボックスの実装
- [ ] AUTO_INCREMENT/PRIMARY KEY判定ロジック
- [ ] 入力無効化ロジック（isNull時、AUTO_INCREMENT時）
- [ ] Nuxt UI v4記法の確認（UFormField、items属性）

**対応するWBSタスク**: 8.2.3

**完了条件**:
- 各カラム型に応じた適切な入力UIが表示される
- NULL許可カラムにはNULLチェックボックスが表示される
- AUTO_INCREMENTカラムは入力無効化される

---

### T-4: テーブル選択UI（8.2.2）とDatabaseTree連動

**状態**: 未着手
**担当**: -
**期限**: -
**依存**: T-2完了

**作業内容**:
- [ ] MutationBuilderLayoutでDatabaseTreeを配置（Phase 8.1で実装済みの可能性あり）
- [ ] DatabaseTreeのテーブルクリックイベントを`mutation-builderストア.setSelectedTable()`に接続
- [ ] InsertPanel内でテーブル名を表示
- [ ] テーブル選択時にカラム情報を取得（database-structureストア活用）
- [ ] テーブル変更時の行データリセット処理

**対応するWBSタスク**: 8.2.2

**完了条件**:
- DatabaseTreeでテーブルをクリックするとInsertPanelが更新される
- 選択テーブルのカラム情報が表示される
- テーブル変更時に入力データがリセットされる

---

### T-5: INSERT SQL生成エンジン（Rust）（8.2.5）

**状態**: 未着手
**担当**: -
**期限**: -
**依存**: なし（並行作業可能）

**作業内容**:
- [ ] `src-tauri/src/query/mutation.rs` 作成
  - [ ] `InsertQueryModel` 構造体定義
  - [ ] `generate_insert_sql()` 関数実装
  - [ ] データベース方言対応（PostgreSQL/MySQL/SQLite）
  - [ ] エスケープ処理（SQLインジェクション対策）
  - [ ] NULL値の処理
  - [ ] 複数行INSERT対応（VALUES句の複数行生成）
- [ ] ユニットテスト作成
  - [ ] 単一行INSERT
  - [ ] 複数行INSERT
  - [ ] NULL値を含むINSERT
  - [ ] 各データベース方言のテスト

**対応するWBSタスク**: 8.2.5

**完了条件**:
- `generate_insert_sql()` がINSERT文を正しく生成する
- PostgreSQL/MySQL/SQLite各方言で正しい構文が生成される
- ユニットテストがすべてパスする

---

### T-6: Tauriコマンド実装とフロントエンド統合（8.2.6, 8.2.7）

**状態**: 未着手
**担当**: -
**期限**: -
**依存**: T-5完了

**作業内容**:
- [ ] `src-tauri/src/commands/mutation_commands.rs` 作成
  - [ ] `generate_insert_sql` コマンド実装
  - [ ] `execute_mutation` コマンド実装（INSERT/UPDATE/DELETE共通）
  - [ ] MutationResult構造体定義
- [ ] mutation-builderストアのアクション実装
  - [ ] `generateInsertSql()`: Tauriコマンド呼び出し
  - [ ] `executeMutation()`: INSERT実行
  - [ ] エラーハンドリング
- [ ] 中央パネルのSQLプレビュー表示（MutationBuilderLayoutで実装済みの可能性あり）
- [ ] ツールバーの「実行」ボタンとの連携（Phase 8.1で実装済みの可能性あり）

**対応するWBSタスク**: 8.2.6, 8.2.7

**完了条件**:
- InsertPanelで入力した内容がINSERT文として生成される
- 中央パネルにSQLプレビューが表示される
- 「実行」ボタンでINSERTが実行され、結果が表示される

---

### T-7: クエリ保存・履歴連携と安全機能統合

**状態**: 未着手
**担当**: -
**期限**: -
**依存**: T-6完了

**作業内容**:
- [ ] SaveQueryDialogとの連携
  - [ ] mutation-builderストアから保存対象のクエリを取得
  - [ ] INSERT文を保存済みクエリとして保存
- [ ] QueryHistorySlideoverとの連携
  - [ ] INSERT実行時に履歴を記録
  - [ ] 履歴からINSERT文を復元
- [ ] DangerousQueryDialogとの連携（Phase 3）
  - [ ] 本番環境でINSERT実行前に確認ダイアログ表示
  - [ ] 警告レベル: info（INSERTは比較的安全）
- [ ] MutationBuilderToolbarへの統合
  - [ ] 保存ボタンの動作確認
  - [ ] 履歴ボタンの動作確認

**対応するWBSタスク**: なし（統合作業）

**完了条件**:
- INSERT文を保存できる
- INSERT実行履歴が記録される
- 履歴から復元できる
- 本番環境で確認ダイアログが表示される

---

### T-8: テスト・ドキュメント

**状態**: 未着手
**担当**: -
**期限**: -
**依存**: T-7完了

**作業内容**:
- [ ] ユニットテスト作成
  - [ ] InsertPanel.vueのテスト（T-2で一部作成済み）
  - [ ] ColumnInputField.vueのテスト
  - [ ] mutation-builderストアのテスト
- [ ] 統合テスト
  - [ ] テーブル選択→カラム入力→SQL生成→実行のフロー
  - [ ] 複数行INSERT
  - [ ] NULL値を含むINSERT
  - [ ] 保存・履歴との連携
- [ ] 永続化ドキュメント更新
  - [ ] `docs/02_functional_design.md` にINSERTビルダー追加
  - [ ] `docs/features/query-builder.md` 更新（mutation-builder追加）
  - [ ] `docs/sql_editor_wbs_v3.md` のPhase 8.2を完了状態に更新
- [ ] コードレビュー
  - [ ] セキュリティ確認（SQLインジェクション対策）
  - [ ] Nuxt UI v4記法の確認
  - [ ] エラーハンドリングの確認

**対応するWBSタスク**: なし（品質保証）

**完了条件**:
- すべてのテストがパスする
- 永続化ドキュメントが更新されている
- コードレビューが完了している

---

## タスク依存関係図

```
T-1 (要件定義・設計)
 │
 ├─→ T-2 (InsertPanel.vue)
 │    ├─→ T-3 (ColumnInputField.vue)
 │    └─→ T-4 (テーブル選択UI)
 │
 └─→ T-5 (Rust SQL生成)
      └─→ T-6 (Tauriコマンド・統合)
           └─→ T-7 (保存・履歴・安全機能)
                └─→ T-8 (テスト・ドキュメント)
```

## 完了条件

Phase 8.2（INSERTビルダー）の完了条件:

- [ ] 全タスク（T-1〜T-8）が完了
- [ ] テストがすべてパス
- [ ] 永続化ドキュメントが更新済み
- [ ] 以下の機能要件がすべて満たされている:
  - [ ] F-1: テーブル選択UI
  - [ ] F-2: カラム・値入力UI
  - [ ] F-3: 複数行INSERT対応
  - [ ] F-4: INSERT SQL生成
  - [ ] F-5: SQLプレビュー表示
  - [ ] F-6: INSERT実行機能
  - [ ] F-7: クエリ保存・履歴連携

## 注意事項

### Phase 8.1との依存関係

このタスクリストはPhase 8.1（共通基盤）が完了していることを前提としています。
Phase 8.1で実装される以下のコンポーネントを活用します:

- `app/pages/mutation-builder.vue`
- `app/components/mutation-builder/MutationBuilderLayout.vue`
- `app/components/mutation-builder/MutationBuilderToolbar.vue`
- `app/stores/mutation-builder.ts`（基本構造）
- `app/types/mutation-query.ts`

### Nuxt UI v4記法の厳守

**重要**: 実装時は必ずNuxt UI v4の記法を使用してください。

- ✅ `UFormField`（v4）を使用
- ❌ `UFormGroup`（v3）は使用禁止
- ✅ `items` 属性を使用
- ❌ `options` 属性は使用禁止

### セキュリティ重要事項

- SQL生成は必ずRust側で実装すること（フロントエンド側での文字列結合は禁止）
- エスケープ処理を確実に行うこと
- 本番環境では必ず確認ダイアログを表示すること
