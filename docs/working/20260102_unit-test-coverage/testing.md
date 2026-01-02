# テスト手順書：単体テストカバレッジの向上

## 概要

このドキュメントでは、実装した単体テストの実行手順と確認方法を記載します。

## 前提条件

### 環境

- Node.js: v20以上
- npm: v10以上
- 依存パッケージがインストール済み

### 初期セットアップ

```bash
# 依存パッケージのインストール
npm install

# Vitestが正しくインストールされていることを確認
npx vitest --version
```

## テスト実行コマンド

### 1. 全テスト実行

```bash
# 全テストを1回実行
npm run test:run

# ウォッチモードで実行（開発時）
npm run test
```

**期待される結果**:
```
 Test Files  29 passed | 2 skipped (31)
      Tests  211+ passed | 8 skipped (219+)
   Duration  < 5s
```

### 2. 特定のテストファイルのみ実行

```bash
# Store テストのみ
npm run test:run -- tests/stores/

# Composable テストのみ
npm run test:run -- tests/composables/

# 特定のファイル
npm run test:run -- app/stores/__tests__/saved-query.spec.ts
```

### 3. カバレッジ付きで実行

```bash
# カバレッジレポート生成
npm run test:coverage
```

**期待される結果**:
- `coverage/` ディレクトリにレポートが生成される
- HTMLレポート: `coverage/index.html`
- カバレッジ率がコンソールに表示される

カバレッジ目標:
- **Phase 1完了時**: 主要Store/Composable 80-90%、全体 30%以上
- **Phase 2完了時**: 全体 40%以上
- **Phase 3完了時**: 全体 50%以上

### 4. 特定のテストケースのみ実行

```bash
# パターンマッチで実行
npm run test:run -- --grep="saved-query"

# テストファイル内の特定のdescribeブロック
npm run test:run -- --grep="SavedQueryStore.*getters"
```

## Phase別テスト確認手順

### Phase 1: 優先度高（Stores/Composables/主要コンポーネント）

#### 1.1 Saved Query Store テスト確認

```bash
# テスト実行
npm run test:run -- app/stores/__tests__/saved-query.spec.ts

# カバレッジ確認
npm run test:coverage -- app/stores/saved-query.ts
```

**確認項目**:
- [ ] 全テストケースが合格
- [ ] カバレッジ90%以上
- [ ] エラーハンドリングが適切
- [ ] 非同期処理が正しく動作

**テストケース数**: 約15-20件

#### 1.2 useColumnResize Composable テスト確認

```bash
# テスト実行
npm run test:run -- tests/composables/useColumnResize.spec.ts

# カバレッジ確認
npm run test:coverage -- app/composables/useColumnResize.ts
```

**確認項目**:
- [ ] 全テストケースが合格
- [ ] カバレッジ80%以上
- [ ] イベントリスナーのクリーンアップが正しい
- [ ] リサイズ処理が正しく動作

**テストケース数**: 約8-10件

#### 1.3 useSqlFormatter Composable テスト確認

```bash
# テスト実行
npm run test:run -- tests/composables/useSqlFormatter.spec.ts

# カバレッジ確認
npm run test:coverage -- app/composables/useSqlFormatter.ts
```

**確認項目**:
- [ ] 全テストケースが合格
- [ ] カバレッジ80%以上
- [ ] INSERT/UPDATE/DELETE各形式が正しく整形される
- [ ] エッジケース（空文字、エラー）が処理される

**テストケース数**: 約12-15件

#### 1.4 Query Builder コンポーネントテスト確認

```bash
# 全Query Builderコンポーネントテスト実行
npm run test:run -- app/components/query-builder/

# 個別確認
npm run test:run -- app/components/query-builder/TableRelationArea.spec.ts
npm run test:run -- app/components/query-builder/where/WhereTab.spec.ts
npm run test:run -- app/components/query-builder/where/ConditionRow.spec.ts
npm run test:run -- app/components/query-builder/where/ConditionGroup.spec.ts
npm run test:run -- app/components/query-builder/panel/GroupByPanel.spec.ts
npm run test:run -- app/components/query-builder/panel/OrderByPanel.spec.ts
```

**確認項目（各コンポーネント共通）**:
- [ ] レンダリングテストが合格
- [ ] ユーザーインタラクションが正しく動作
- [ ] イベント発行が正しい
- [ ] ストアとの連携が正しい

**テストケース数**: 各5-10件、合計約40-60件

#### Phase 1 総合確認

```bash
# Phase 1で追加した全テスト実行
npm run test:run

# カバレッジレポート確認
npm run test:coverage
```

**確認項目**:
- [ ] 全テスト合格
- [ ] テスト実行時間が5秒以内
- [ ] カバレッジ30%以上達成
- [ ] CI/CDで自動実行される

### Phase 2: 優先度中（Connection/Securityコンポーネント）

#### 2.1 Connection Components テスト確認

```bash
# Connection関連テスト実行
npm run test:run -- app/components/connection/

# 個別確認
npm run test:run -- app/components/connection/ConnectionList.spec.ts
npm run test:run -- app/components/connection/ConnectionCard.spec.ts
npm run test:run -- app/components/connection/ConnectionTestResultDialog.spec.ts
npm run test:run -- app/components/connection/EnvironmentSelector.spec.ts
npm run test:run -- app/components/connection/EnvironmentBadge.spec.ts
```

**確認項目**:
- [ ] 一覧表示が正しい
- [ ] フィルタリングが正しい
- [ ] ダイアログ動作が正しい

**テストケース数**: 各3-7件、合計約20-30件

#### 2.2 Security Components テスト確認

```bash
# Security関連テスト実行
npm run test:run -- app/components/security/

# 個別確認
npm run test:run -- app/components/security/MasterPasswordSetupDialog.spec.ts
npm run test:run -- app/components/security/PasswordStrengthMeter.spec.ts
npm run test:run -- app/components/security/SecurityProviderComparison.spec.ts
npm run test:run -- app/components/security/provider-change/FromSimpleDialog.spec.ts
npm run test:run -- app/components/security/provider-change/FromMasterPasswordDialog.spec.ts
```

**確認項目**:
- [ ] バリデーションが正しい
- [ ] パスワード強度計算が正しい
- [ ] ダイアログ動作が正しい

**テストケース数**: 各3-7件、合計約20-30件

#### Phase 2 総合確認

```bash
# カバレッジレポート確認
npm run test:coverage
```

**確認項目**:
- [ ] 全テスト合格
- [ ] カバレッジ40%以上達成

### Phase 3: 優先度低（Settings/Launcherコンポーネント）

#### 3.1 Settings/Launcher Components テスト確認

```bash
# Settings関連テスト実行
npm run test:run -- app/components/settings/

# Launcher関連テスト実行
npm run test:run -- app/components/launcher/
```

**確認項目**:
- [ ] 基本的なレンダリングが正しい
- [ ] 主要な操作が動作する

**テストケース数**: 各2-4件、合計約10-15件

#### Phase 3 最終確認

```bash
# 全テスト実行
npm run test:run

# 最終カバレッジレポート
npm run test:coverage

# HTMLレポートを開く
open coverage/index.html
```

**確認項目**:
- [ ] 全テスト合格
- [ ] テスト実行時間が5秒以内
- [ ] カバレッジ50%以上達成
- [ ] カバレッジレポートが生成されている

## 継続的なテスト確認

### 1. 開発時の確認（ウォッチモード）

```bash
# ウォッチモードで開発
npm run test

# 特定のファイルのみウォッチ
npm run test -- app/stores/__tests__/saved-query.spec.ts
```

### 2. コミット前の確認

```bash
# 全テスト実行（必須）
npm run test:run

# 型チェック
npm run typecheck

# ビルド確認
npm run build
```

**確認項目**:
- [ ] 全テストが合格
- [ ] 型エラーがない
- [ ] ビルドが成功する

### 3. CI/CDでの確認

GitHub Actionsなどで自動実行される想定。

```yaml
# .github/workflows/test.yml (例)
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## トラブルシューティング

### テストが失敗する場合

#### 1. モックの問題

**症状**: `Cannot read properties of undefined`

**対処**:
```bash
# モックの定義を確認
# vi.mock() が適切に設定されているか確認
```

#### 2. Nuxt UIコンポーネントの問題

**症状**: `[nuxt] instance unavailable`

**対処**:
- Nuxt UIコンポーネントのスタブが設定されているか確認
- `global.stubs` にスタブを追加

```typescript
const stubs = {
  UIcon: { template: '<i></i>', props: ['name'] },
  UButton: { template: '<button><slot /></button>', props: ['color', 'variant'] }
}

mount(Component, {
  global: { stubs }
})
```

#### 3. 非同期処理の問題

**症状**: テストがタイムアウトする

**対処**:
```typescript
// async/await を使用
it('非同期テスト', async () => {
  await store.someAsyncAction()
  expect(store.state).toBe(expected)
})
```

#### 4. テスト実行時間が長い

**対処**:
- 不要な `await` を削除
- モックを適切に設定
- 並列実行を活用（デフォルトで有効）

### カバレッジが低い場合

```bash
# カバレッジレポートで未テスト箇所を確認
npm run test:coverage
open coverage/index.html

# 赤い部分（未カバー）を確認
# テストケースを追加
```

## ベストプラクティス

### テスト実装時

1. **テストを先に実行**: 既存テストが壊れていないか確認
2. **小さく実装**: 1つのテストケースごとに確認
3. **頻繁にコミット**: 動作するテストごとにコミット

### テスト確認時

1. **ウォッチモード活用**: 開発中は常時実行
2. **カバレッジ確認**: 定期的にカバレッジを確認
3. **コミット前確認**: 必ず全テストを実行

## 参考資料

### コマンドリファレンス

```bash
# テスト実行
npm run test              # ウォッチモード
npm run test:run          # 1回実行
npm run test:coverage     # カバレッジ付き

# オプション
--grep="pattern"          # パターンマッチ
--reporter=verbose        # 詳細出力
--ui                      # UIモード
```

### 関連ドキュメント

- Vitest公式: https://vitest.dev/
- Vue Test Utils: https://test-utils.vuejs.org/
- カバレッジレポート: `coverage/index.html`

## まとめ

このテスト手順書に従い、以下を実施してください：

1. **Phase毎の確認**: 各Phase完了時に該当セクションの手順を実施
2. **継続的な確認**: 開発時はウォッチモード、コミット前は全テスト実行
3. **カバレッジ監視**: 定期的にカバレッジを確認し、目標達成を確認

全テストが合格し、カバレッジ目標を達成することで、高品質なコードベースを維持できます。
