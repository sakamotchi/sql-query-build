# テストコード整備 - タスクリスト

## フェーズ1: 不要なテストの削除

- [ ] `tests/api/connection.spec.ts` を削除
- [ ] `tests/components/EnvironmentHeader.spec.ts` を削除
- [ ] `tests/components/EnvironmentSelector.spec.ts` を削除
- [ ] `tests/components/ThemePreview.spec.ts` を削除
- [ ] `tests/utils/vuetifyStubs.ts` を削除
- [ ] `tests/stores/theme.spec.ts` を削除（古い実装のテスト）
- [ ] `tests/composables/useTheme.spec.ts` を削除（古い実装のテスト）
- [ ] `tests/stores/settings.spec.ts` を削除（古い実装のテスト）

## フェーズ2: 新規テストの作成

### 高優先度

- [ ] `tests/stores/theme.spec.ts` を新規作成
  - [ ] 初期状態のテスト
  - [ ] gettersのテスト
  - [ ] actionsのテスト（モック使用）

- [ ] `tests/stores/settings.spec.ts` を新規作成
  - [ ] 初期状態のテスト
  - [ ] gettersのテスト
  - [ ] actionsのテスト（ブラウザモード対応）

- [ ] `tests/stores/connection.spec.ts` を新規作成
  - [ ] 初期状態のテスト
  - [ ] gettersのテスト
  - [ ] actionsのテスト

- [ ] `tests/stores/security.spec.ts` を新規作成
  - [ ] 初期状態のテスト
  - [ ] gettersのテスト
  - [ ] actionsのテスト

### 中優先度

- [ ] `tests/composables/useTheme.spec.ts` を新規作成
- [ ] `tests/composables/useEnvironment.spec.ts` を新規作成
- [ ] `tests/composables/useTauri.spec.ts` を新規作成

### 低優先度（オプション）

- [ ] `tests/utils/nuxtStubs.ts` を作成（コンポーネントテスト用）
- [ ] コンポーネントテストの追加

## フェーズ3: 検証

- [ ] `npm run test:run` で全テストがパスすることを確認
- [ ] 不要なテストファイルが残っていないことを確認

## 完了条件

1. `npm run test:run` が全テストパス
2. 存在しないソースに対するテストがない
3. 主要なストアに対するテストが存在する
