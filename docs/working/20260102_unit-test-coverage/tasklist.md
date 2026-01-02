# タスクリスト：単体テストカバレッジの向上

## Phase 1: 優先度高（2週間）

### 1.1 Saved Query Store テスト

- [ ] **Task 1-1**: saved-query.spec.ts ファイル作成とセットアップ
  - ファイル作成: `app/stores/__tests__/saved-query.spec.ts`
  - 基本的なモック設定
  - 初期状態のテスト実装
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 1-2**: Getters のテスト実装
  - `filteredQueries` のテスト
  - `uniqueTags` のテスト（正常系、空配列）
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 1-3**: fetchQueries のテスト実装
  - 正常系（通常取得、検索条件付き）
  - 異常系（エラー処理）
  - ローディング状態の検証
  - 担当者: -
  - 見積もり: 1日

- [ ] **Task 1-4**: saveQuery のテスト実装
  - SELECT/INSERT/UPDATE/DELETE クエリの保存
  - タグ付き保存
  - エラー処理
  - 担当者: -
  - 見積もり: 1日

- [ ] **Task 1-5**: loadQuery のテスト実装
  - SELECT/INSERT/UPDATE/DELETE クエリのロード
  - ストア状態の復元検証
  - 担当者: -
  - 見積もり: 1日

- [ ] **Task 1-6**: その他アクションのテスト実装
  - deleteQuery
  - updateSearchKeyword
  - toggleTag
  - clearFilters
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 1-7**: カバレッジ確認と修正
  - カバレッジ90%以上達成確認
  - 不足箇所の追加テスト
  - 担当者: -
  - 見積もり: 0.5日

**Phase 1.1 合計見積もり**: 5日

### 1.2 useColumnResize Composable テスト

- [ ] **Task 2-1**: useColumnResize.spec.ts ファイル作成
  - ファイル作成: `tests/composables/useColumnResize.spec.ts`
  - イベントリスナーのモック設定
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 2-2**: getColumnWidth のテスト実装
  - デフォルト値テスト
  - 設定値テスト
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 2-3**: リサイズ機能のテスト実装
  - startResize のテスト
  - handleMouseMove のテスト
  - stopResize のテスト
  - 最小幅検証
  - 担当者: -
  - 見積もり: 1日

- [ ] **Task 2-4**: resetColumnWidths のテスト実装
  - リセット機能の検証
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 2-5**: カバレッジ確認
  - カバレッジ80%以上達成確認
  - 担当者: -
  - 見積もり: 0.25日

**Phase 1.2 合計見積もり**: 2日

### 1.3 useSqlFormatter Composable テスト

- [ ] **Task 3-1**: useSqlFormatter.spec.ts ファイル作成
  - ファイル作成: `tests/composables/useSqlFormatter.spec.ts`
  - 基本セットアップ
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 3-2**: formatInsertSql のテスト実装
  - 単一行INSERT整形
  - 複数行VALUES整形
  - セミコロン処理
  - エッジケース（空文字、エラー）
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 3-3**: formatUpdateSql のテスト実装
  - UPDATE文整形
  - 複数SET処理
  - WHERE句処理
  - エッジケース
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 3-4**: formatDeleteSql のテスト実装
  - DELETE文整形
  - WHERE句処理
  - エッジケース
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 3-5**: formatMutationSql のテスト実装
  - タイプ別フォーマッター選択
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 3-6**: カバレッジ確認
  - カバレッジ80%以上達成確認
  - 担当者: -
  - 見積もり: 0.25日

**Phase 1.3 合計見積もり**: 2日

### 1.4 Query Builder コンポーネントテスト

#### 共通準備

- [ ] **Task 4-0**: Nuxt UIスタブユーティリティ作成
  - ファイル作成: `tests/utils/nuxt-ui-stubs.ts`
  - 共通スタブ定義
  - 担当者: -
  - 見積もり: 0.5日

#### TableRelationArea.vue

- [ ] **Task 4-1**: TableRelationArea.spec.ts 作成と基本テスト
  - ファイル作成
  - レンダリングテスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 4-2**: ドラッグ&ドロップテスト
  - ドロップ処理テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 4-3**: テーブル削除テスト
  - 削除処理テスト
  - 担当者: -
  - 見積もり: 0.25日

#### WhereTab.vue

- [ ] **Task 4-4**: WhereTab.spec.ts 作成
  - ファイル作成
  - 条件追加テスト
  - グループ追加テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 4-5**: 条件削除と論理演算子テスト
  - 削除処理テスト
  - AND/OR切り替えテスト
  - 担当者: -
  - 見積もり: 0.5日

#### ConditionRow.vue

- [ ] **Task 4-6**: ConditionRow.spec.ts 作成
  - ファイル作成
  - カラム選択テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 4-7**: 演算子と値入力テスト
  - 演算子選択テスト
  - 値入力テスト
  - IS NULL/IN/BETWEEN対応テスト
  - 担当者: -
  - 見積もり: 1日

#### ConditionGroup.vue

- [ ] **Task 4-8**: ConditionGroup.spec.ts 作成
  - ファイル作成
  - ネスト条件テスト
  - グループ削除テスト
  - 担当者: -
  - 見積もり: 0.5日

#### GroupByTab.vue

- [ ] **Task 4-9**: GroupByTab.spec.ts 作成
  - ファイル作成
  - カラム追加/削除テスト
  - 順序変更テスト
  - 担当者: -
  - 見積もり: 0.5日

#### OrderByTab.vue

- [ ] **Task 4-10**: OrderByTab.spec.ts 作成
  - ファイル作成
  - カラム追加/削除テスト
  - ソート順変更テスト
  - 順序変更テスト
  - 担当者: -
  - 見積もり: 0.5日

**Phase 1.4 合計見積もり**: 5.75日

### Phase 1 レビューとまとめ

- [ ] **Task 5-1**: Phase 1全体のテスト実行確認
  - 全テスト合格確認
  - カバレッジレポート作成
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 5-2**: コードレビュー対応
  - レビュー指摘対応
  - 担当者: -
  - 見積もり: 1日

**Phase 1 合計見積もり**: 16日（約2週間）

---

## Phase 2: 優先度中（2週間）

### 2.1 Connection Components テスト

- [ ] **Task 6-1**: ConnectionList.spec.ts 作成
  - 一覧表示テスト
  - フィルタリングテスト
  - 選択/削除テスト
  - 担当者: -
  - 見積もり: 1日

- [ ] **Task 6-2**: ConnectionCard.spec.ts 作成
  - 情報表示テスト
  - アクティブ状態テスト
  - イベントテスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 6-3**: ConnectionTestResultDialog.spec.ts 作成
  - 成功/失敗表示テスト
  - ダイアログ開閉テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 6-4**: EnvironmentSelector.spec.ts 作成
  - 環境選択テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 6-5**: EnvironmentBadge.spec.ts 作成
  - バッジ表示テスト
  - 担当者: -
  - 見積もり: 0.25日

**Phase 2.1 合計見積もり**: 2.75日

### 2.2 Security Components テスト

- [ ] **Task 7-1**: MasterPasswordSetupDialog.spec.ts 作成
  - パスワード入力テスト
  - バリデーションテスト
  - 送信処理テスト
  - 担当者: -
  - 見積もり: 1日

- [ ] **Task 7-2**: PasswordStrengthMeter.spec.ts 作成
  - 強度計算テスト
  - 表示テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 7-3**: SecurityProviderComparison.spec.ts 作成
  - 比較表示テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 7-4**: FromSimpleDialog.spec.ts 作成
  - ダイアログ動作テスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 7-5**: FromMasterPasswordDialog.spec.ts 作成
  - ダイアログ動作テスト
  - 担当者: -
  - 見積もり: 0.5日

**Phase 2.2 合計見積もり**: 3日

### Phase 2 レビューとまとめ

- [ ] **Task 8-1**: Phase 2全体のテスト実行確認
  - 全テスト合格確認
  - カバレッジレポート更新
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 8-2**: コードレビュー対応
  - レビュー指摘対応
  - 担当者: -
  - 見積もり: 1日

**Phase 2 合計見積もり**: 7日

---

## Phase 3: 優先度低（1週間）

### 3.1 Settings Components テスト（簡易版）

- [ ] **Task 9-1**: GeneralSettings.spec.ts 作成
  - 基本的なレンダリングテスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 9-2**: SecuritySettings.spec.ts 作成
  - 基本的なレンダリングテスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 9-3**: SafetySettingsPanel.spec.ts 作成
  - 基本的なレンダリングテスト
  - 担当者: -
  - 見積もり: 0.5日

**Phase 3.1 合計見積もり**: 1.5日

### 3.2 Launcher Components テスト（簡易版）

- [ ] **Task 10-1**: LauncherToolbar.spec.ts 作成
  - 基本的なレンダリングテスト
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 10-2**: SearchFilter.spec.ts 作成
  - 基本的なフィルタリングテスト
  - 担当者: -
  - 見積もり: 0.5日

**Phase 3.2 合計見積もり**: 1日

### Phase 3 レビューと最終まとめ

- [ ] **Task 11-1**: Phase 3全体のテスト実行確認
  - 全テスト合格確認
  - 担当者: -
  - 見積もり: 0.25日

- [ ] **Task 11-2**: 最終カバレッジレポート作成
  - 全体カバレッジ50%以上確認
  - レポート作成
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 11-3**: ドキュメント更新
  - テスト実装ガイド更新
  - README更新
  - 担当者: -
  - 見積もり: 0.5日

- [ ] **Task 11-4**: 最終コードレビュー
  - 全体レビュー
  - 担当者: -
  - 見積もり: 0.75日

**Phase 3 合計見積もり**: 4日

---

## 全体サマリー

| Phase | タスク数 | 見積もり日数 | 期間 |
|-------|---------|------------|------|
| Phase 1 | 30 | 16日 | 2週間 |
| Phase 2 | 10 | 7日 | 2週間 |
| Phase 3 | 9 | 4日 | 1週間 |
| **合計** | **49** | **27日** | **5週間** |

## 進捗管理

### 完了基準

各タスクは以下の条件を満たした時点で完了とする：

1. テストコードが実装されている
2. 全テストが合格している
3. コードレビューが完了している
4. カバレッジ目標を達成している（Phase毎）

### 報告タイミング

- **日次**: 完了したタスクをチェック
- **週次**: Phase進捗レポート作成
- **Phase完了時**: カバレッジレポート作成

## リスク管理タスク

- [ ] **継続タスク**: テスト実行時間の監視
  - 目標: 全テスト5秒以内
  - 超過時はモック戦略の見直し

- [ ] **継続タスク**: テストの脆弱性チェック
  - 実装変更で壊れやすいテストの特定
  - リファクタリング

## 補足

### テスト実装の優先順位

各Phaseで、以下の順序で実装を推奨：

1. **Store/Composable**: ロジックテストが容易
2. **単純なコンポーネント**: 依存が少ない
3. **複雑なコンポーネント**: 依存が多い

### 並行作業の可能性

以下のタスクは並行実装可能：
- Store/Composableテストと、異なるコンポーネントのテスト
- 異なるコンポーネント同士のテスト

1人での実装の場合、Phase内で順次実施。
