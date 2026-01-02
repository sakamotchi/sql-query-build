# 要件定義書：単体テストカバレッジの向上

## 背景

現在のプロジェクトは、フロントエンドの単体テストが部分的にしか実装されていない状況です。
既存のテストは合格していますが、多くのコンポーネント、Store、Composableがテストされていません。

### 現状のテストカバレッジ

- **総ソースファイル数**: 157ファイル
- **総テストファイル数**: 31ファイル
- **カバレッジ率**: 約20%

#### カテゴリ別カバレッジ

| カテゴリ | 総数 | テスト数 | カバレッジ | 未テストの主要ファイル |
|---------|------|---------|-----------|---------------------|
| **Stores** | 11 | 10 | 91% | saved-query.ts |
| **Composables** | 9 | 7 | 78% | useColumnResize.ts, useSqlFormatter.ts |
| **Query Builder Components** | 57 | 8 | 14% | 多数（後述） |
| **その他のComponents** | 約80 | 約6 | 8% | connection, security, settings, launcher系 |

## 目的

このプロジェクトの目的は、以下の通りです：

1. **テストカバレッジの向上**: 最低50%、目標70%のカバレッジ達成
2. **品質の向上**: バグの早期発見と回帰防止
3. **開発速度の向上**: リファクタリングや機能追加時の安心感
4. **ドキュメント化**: テストコードによる仕様の明文化

## スコープ

### 対象範囲

#### 優先度：高（Phase 1）

**Stores（未テスト）**
- `saved-query.ts` - 保存クエリ管理

**Composables（未テスト）**
- `useColumnResize.ts` - カラムリサイズ機能
- `useSqlFormatter.ts` - SQL整形機能

**Query Builder Components（重要度が高いもの）**
- `QueryBuilderArea.vue` - クエリビルダーのメインコンポーネント
- `TableRelationArea.vue` - テーブル関連図
- `WhereBuilder.vue` - WHERE句ビルダー
- `ConditionRow.vue` - 条件行コンポーネント
- `ConditionGroup.vue` - 条件グループコンポーネント
- `GroupByTab.vue` - GROUP BY パネル
- `OrderByTab.vue` - ORDER BY パネル

#### 優先度：中（Phase 2）

**Connection Components**
- `ConnectionList.vue`
- `ConnectionCard.vue`
- `ConnectionTestResultDialog.vue`
- `EnvironmentSelector.vue`
- `EnvironmentBadge.vue`

**Security Components**
- `MasterPasswordSetupDialog.vue`
- `PasswordStrengthMeter.vue`
- `SecurityProviderComparison.vue`
- `FromSimpleDialog.vue`
- `FromMasterPasswordDialog.vue`

#### 優先度：低（Phase 3）

**Settings Components**
- `GeneralSettings.vue`
- `SecuritySettings.vue`
- `SafetySettingsPanel.vue`

**Launcher Components**
- `LauncherToolbar.vue`
- `SearchFilter.vue`

### 対象外

- E2Eテスト（別タスク）
- パフォーマンステスト（別タスク）
- ビジュアルリグレッションテスト（別タスク）

## 要件

### 機能要件

#### FR-1: Store テストの追加
- saved-queryストアの全アクションとゲッターをテスト
- CRUD操作の正常系・異常系をカバー

#### FR-2: Composable テストの追加
- useColumnResize: カラムリサイズ機能のロジックテスト
- useSqlFormatter: SQL整形ロジックのテスト

#### FR-3: Query Builder コンポーネントテストの追加
- ユーザーインタラクション（クリック、入力など）のテスト
- 状態変更の確認
- イベント発行の確認
- エッジケースの処理

#### FR-4: Connection/Security コンポーネントテストの追加
- フォーム入力検証のテスト
- ダイアログの開閉テスト
- バリデーションエラー表示のテスト

### 非機能要件

#### NFR-1: テストコードの品質
- 読みやすく保守しやすいテストコード
- AAAパターン（Arrange-Act-Assert）に従う
- テスト名は日本語で明確に記述

#### NFR-2: テスト実行速度
- 全テスト実行時間は5秒以内を維持
- 個別テストは100ms以内

#### NFR-3: モック戦略
- 既存のモックパターンを踏襲
- Nuxt UIコンポーネントは適切にスタブ化
- Tauri APIはモック化

## 制約条件

### 技術的制約
- Vitest 3.2.4を使用
- @vue/test-utils を使用
- 既存のテストパターンに準拠

### スケジュール制約
- Phase 1: 2週間（優先度高）
- Phase 2: 2週間（優先度中）
- Phase 3: 1週間（優先度低）

### リソース制約
- 開発者1名
- コードレビュー必須

## 成功基準

### Phase 1 完了条件
- [ ] saved-query ストアのテストカバレッジ 90%以上
- [ ] useColumnResize, useSqlFormatter のテストカバレッジ 80%以上
- [ ] Query Builder主要7コンポーネントのテスト実装
- [ ] 全テスト合格（既存テストを含む）

### Phase 2 完了条件
- [ ] Connection関連コンポーネント5つのテスト実装
- [ ] Security関連コンポーネント5つのテスト実装
- [ ] テスト合格率100%維持

### Phase 3 完了条件
- [ ] Settings/Launcher関連コンポーネントのテスト実装
- [ ] プロジェクト全体のテストカバレッジ50%以上達成

## リスクと対策

### リスク1: テスト実装の複雑性
- **リスク**: コンポーネントが複雑でテストが困難
- **対策**: 必要に応じてコンポーネントをリファクタリング

### リスク2: テスト実行時間の増加
- **リスク**: テスト数増加で実行時間が長くなる
- **対策**: 並列実行、適切なモック化で速度維持

### リスク3: テストの脆弱性
- **リスク**: 実装変更でテストが頻繁に壊れる
- **対策**: 実装詳細ではなくユーザー行動をテスト

## 参考資料

- 既存テストファイル
  - `tests/stores/query-builder.spec.ts`
  - `tests/components/query-builder/error/ErrorHint.spec.ts`
  - `tests/components/query-builder/SqlPreview.spec.ts`
- Vitest公式ドキュメント: https://vitest.dev/
- Vue Test Utils公式ドキュメント: https://test-utils.vuejs.org/
