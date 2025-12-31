# Phase 6A: 基本的なJOIN機能 - タスクリスト

**作成日**: 2025-12-30
**フェーズ**: 6A

---

## タスク概要

| タスクID | タスク名 | 担当 | 状態 | 優先度 | 見積 |
|---------|---------|------|------|--------|------|
| 6A.1 | JoinConfigDialog.vue | - | 📝 未着手 | 高 | 4h |
| 6A.2 | JoinConditionRow.vue | - | 📝 未着手 | 高 | 2h |
| 6A.3 | JOIN設定ストア統合 | - | 📝 未着手 | 高 | 3h |
| 6A.4 | JOIN SQL生成機能拡張（Rust） | - | 📝 未着手 | 高 | 6h |
| 6A.5 | JoinList.vueの実装 | - | 📝 未着手 | 中 | 2h |
| 6A.6 | QueryBuilder.vueへの統合 | - | 📝 未着手 | 中 | 2h |
| 6A.7 | 単体テスト実装 | - | 📝 未着手 | 中 | 4h |
| 6A.8 | 統合テスト・動作確認 | - | 📝 未着手 | 高 | 3h |

**合計見積**: 26時間

---

## タスク詳細

### 6A.4: JOIN SQL生成機能拡張（Rust）

**依存関係**: なし
**優先度**: 高（他のタスクの基盤となる）

**作業内容**:

1. Rust側の型定義確認
   - [ ] `src-tauri/src/models/query_model.rs` の確認
   - [ ] `JoinClause`、`JoinCondition` の型定義が存在するか確認
   - [ ] 存在しない場合は追加

2. SQL生成エンジンの拡張
   - [ ] `src-tauri/src/sql_generator/` の構造確認
   - [ ] JOIN句生成関数の実装
     - [ ] `generate_join_clause()` 関数
     - [ ] `generate_single_join()` 関数
     - [ ] `generate_join_conditions()` 関数
   - [ ] PostgreSQL方言対応
   - [ ] MySQL方言対応
   - [ ] SQLite方言対応

3. 単体テスト実装
   - [ ] INNER JOIN のテスト
   - [ ] LEFT JOIN のテスト
   - [ ] RIGHT JOIN のテスト
   - [ ] FULL OUTER JOIN のテスト
   - [ ] CROSS JOIN のテスト
   - [ ] 複数ON条件（AND）のテスト
   - [ ] 複数ON条件（OR）のテスト
   - [ ] 複数JOINのテスト

**完了条件**:
- ✅ JOIN句を含むSQLが正しく生成される
- ✅ 全ての単体テストがパスする
- ✅ PostgreSQL/MySQL/SQLiteの全方言で動作する

**参考ファイル**:
- 既存のSQL生成コード（WHERE句など）

---

### 6A.2: JoinConditionRow.vue

**依存関係**: なし
**優先度**: 高

**作業内容**:

1. コンポーネント作成
   - [ ] `app/components/query-builder/dialog/JoinConditionRow.vue` 作成
   - [ ] Props定義（condition, availableTables）
   - [ ] Emits定義（update, remove）

2. UI実装
   - [ ] 左側テーブル選択（USelectMenu）
   - [ ] 左側カラム選択（USelectMenu）
   - [ ] 演算子選択（USelectMenu）
   - [ ] 右側テーブル選択（USelectMenu）
   - [ ] 右側カラム選択（USelectMenu）
   - [ ] 削除ボタン（UButton）

3. ロジック実装
   - [ ] テーブル選択時にカラムリストを更新
   - [ ] 条件変更時にupdateイベントを発火
   - [ ] 削除ボタンクリック時にremoveイベントを発火

4. 単体テスト
   - [ ] 初期表示のテスト
   - [ ] テーブル選択時の動作テスト
   - [ ] カラム選択時の動作テスト
   - [ ] 演算子選択時の動作テスト
   - [ ] 削除ボタンのテスト

**完了条件**:
- ✅ ON条件1行が表示・編集できる
- ✅ 単体テストが全てパスする

---

### 6A.1: JoinConfigDialog.vue

**依存関係**: 6A.2
**優先度**: 高

**作業内容**:

1. コンポーネント作成
   - [ ] `app/components/query-builder/dialog/JoinConfigDialog.vue` 作成
   - [ ] Props定義（modelValue, join?）
   - [ ] Emits定義（update:modelValue, save）

2. UI実装
   - [ ] UModal の配置
   - [ ] JOIN種別選択（USelectMenu）
   - [ ] 結合テーブル選択（USelectMenu）
   - [ ] エイリアス入力（UInput）
   - [ ] ON条件リスト（JoinConditionRow x N）
   - [ ] 条件追加ボタン
   - [ ] 条件の結合方法選択（URadioGroup）
   - [ ] キャンセル・保存ボタン

3. ロジック実装
   - [ ] 新規作成時の初期化
   - [ ] 編集時の既存データ読み込み
   - [ ] CROSS JOIN時はON条件非表示
   - [ ] 条件追加・削除処理
   - [ ] バリデーション
     - [ ] エイリアスの重複チェック
     - [ ] ON条件が1つ以上（CROSS JOIN除く）
   - [ ] 保存処理

4. 単体テスト
   - [ ] 新規作成時の表示テスト
   - [ ] 編集時の表示テスト
   - [ ] JOIN種別変更時の動作テスト
   - [ ] 条件追加・削除のテスト
   - [ ] バリデーションのテスト
   - [ ] 保存処理のテスト

**完了条件**:
- ✅ JOIN設定ダイアログが正しく動作する
- ✅ 単体テストが全てパスする

---

### 6A.3: JOIN設定ストア統合

**依存関係**: なし
**優先度**: 高

**作業内容**:

1. query-builder.tsの拡張
   - [ ] joins配列の追加（state）
   - [ ] `addJoin()` アクションの実装
   - [ ] `updateJoin()` アクションの実装
   - [ ] `removeJoin()` アクションの実装
   - [ ] `removeTable()` アクションの拡張（JOIN削除処理追加）
   - [ ] `regenerateSql()` の確認（JOIN対応）

2. ヘルパー関数
   - [ ] `generateId()` 関数（uuidv4など）
   - [ ] JOIN条件のフォーマット関数（表示用）

3. 単体テスト
   - [ ] `addJoin()` のテスト
   - [ ] `updateJoin()` のテスト
   - [ ] `removeJoin()` のテスト
   - [ ] テーブル削除時のJOIN削除テスト
   - [ ] SQL再生成のテスト

**完了条件**:
- ✅ JOIN関連のアクションが正しく動作する
- ✅ 単体テストが全てパスする

---

### 6A.5: JoinList.vueの実装

**依存関係**: 6A.3
**優先度**: 中

**作業内容**:

1. コンポーネント作成
   - [ ] `app/components/query-builder/JoinList.vue` 作成
   - [ ] Props定義（joins）
   - [ ] Emits定義（add-join, edit-join, remove-join）

2. UI実装
   - [ ] セクションヘッダー
   - [ ] JOINカード一覧（UCard）
   - [ ] 各JOINの表示（type, table, conditions）
   - [ ] 削除ボタン
   - [ ] 追加ボタン

3. ロジック実装
   - [ ] JOIN一覧の表示
   - [ ] JOIN条件のフォーマット表示
   - [ ] クリック時のedit-joinイベント発火
   - [ ] 削除ボタンクリック時のremove-joinイベント発火

**完了条件**:
- ✅ JOIN一覧が表示される
- ✅ クリックで編集ダイアログが開く
- ✅ 削除ボタンで削除できる

---

### 6A.6: QueryBuilder.vueへの統合

**依存関係**: 6A.1, 6A.5
**優先度**: 中

**作業内容**:

1. TableSelectionPanel.vueの拡張
   - [ ] JoinListコンポーネントの配置
   - [ ] 「JOINを追加」ボタンの配置

2. QueryBuilder.vueの拡張
   - [ ] JoinConfigDialogの配置
   - [ ] ダイアログの開閉状態管理
   - [ ] 編集対象のJOIN管理
   - [ ] イベントハンドラ実装
     - [ ] add-join
     - [ ] edit-join
     - [ ] remove-join
     - [ ] save（ダイアログから）

3. ストアとの連携
   - [ ] queryBuilderStore.addJoin() の呼び出し
   - [ ] queryBuilderStore.updateJoin() の呼び出し
   - [ ] queryBuilderStore.removeJoin() の呼び出し

**完了条件**:
- ✅ JOINの追加・編集・削除が画面から可能
- ✅ 生成されるSQLにJOINが含まれる

---

### 6A.7: 単体テスト実装

**依存関係**: 6A.1, 6A.2, 6A.3, 6A.4
**優先度**: 中

**作業内容**:

1. フロントエンドテスト
   - [ ] JoinConditionRow.vueのテスト
   - [ ] JoinConfigDialog.vueのテスト
   - [ ] JoinList.vueのテスト
   - [ ] query-builder.tsのテスト

2. Rust側テスト
   - [ ] JOIN SQL生成のテスト（各種パターン）

3. テストカバレッジ確認
   - [ ] カバレッジ80%以上を目標

**完了条件**:
- ✅ 全ての単体テストがパスする
- ✅ カバレッジが目標値以上

---

### 6A.8: 統合テスト・動作確認

**依存関係**: 6A.6
**優先度**: 高

**作業内容**:

1. 統合テスト
   - [ ] JOINを追加してSQLが生成されることを確認
   - [ ] 生成されたSQLが実際に実行可能であることを確認
   - [ ] PostgreSQLでの動作確認
   - [ ] MySQLでの動作確認
   - [ ] SQLiteでの動作確認

2. エッジケースのテスト
   - [ ] CROSS JOINの動作確認
   - [ ] 複数JOINの動作確認
   - [ ] テーブル削除時のJOIN削除確認
   - [ ] クエリ保存・復元時のJOIN確認

3. パフォーマンステスト
   - [ ] 10個のJOINを設定してもUI動作が正常
   - [ ] SQL生成が300ms以内

**完了条件**:
- ✅ 全ての統合テストがパスする
- ✅ パフォーマンス要件を満たす
- ✅ Phase 6Aの全ての完了条件を満たす

---

## 進捗管理

### 状態の定義

- 📝 未着手
- 🚧 作業中
- ✅ 完了
- ⚠️ ブロック中
- ❌ 中止

### 進捗率

- 完了タスク数 / 全タスク数 = 0 / 8 = 0%

---

## リスク・課題

| ID | 内容 | 状態 | 対応策 |
|----|------|------|--------|
| - | - | - | - |

---

## 備考

- 実装中に気づいたことや重要な決定事項をここに記録する
