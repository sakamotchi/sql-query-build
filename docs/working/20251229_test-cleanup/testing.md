# テストコード整備 - テスト手順書

## 検証手順

### 1. フロントエンドテストの実行

```bash
npm run test:run
```

**期待結果:**
- 全テストがパス（緑色表示）
- 失敗テストが0件

### 2. バックエンドテストの実行（参考）

```bash
cd src-tauri && cargo test
```

**期待結果:**
- 全138テストがパス（変更なし）

### 3. テストカバレッジの確認（オプション）

```bash
npm run test:run -- --coverage
```

## 手動確認項目

### 削除確認

以下のファイルが存在しないことを確認：

- [ ] `tests/api/connection.spec.ts`
- [ ] `tests/components/EnvironmentHeader.spec.ts`
- [ ] `tests/components/EnvironmentSelector.spec.ts`
- [ ] `tests/components/ThemePreview.spec.ts`
- [ ] `tests/utils/vuetifyStubs.ts`

### 新規作成確認

以下のファイルが存在することを確認：

- [ ] `tests/stores/theme.spec.ts`（新実装対応）
- [ ] `tests/stores/settings.spec.ts`（新実装対応）
- [ ] `tests/stores/connection.spec.ts`
- [ ] `tests/stores/security.spec.ts`

### 既存テスト動作確認

以下のテストが引き続き動作することを確認：

- [ ] `tests/api/window.spec.ts`
- [ ] `tests/api/security.spec.ts`
- [ ] `tests/composables/useWindow.spec.ts`
- [ ] `tests/stores/window.spec.ts`

## トラブルシューティング

### よくある問題

1. **Nuxt Composableが見つからない**
   - `vi.mock()` でモックが正しく設定されているか確認
   - `@nuxt/test-utils` の設定を確認

2. **Tauri APIが見つからない**
   - `useTauri` のモックが正しく設定されているか確認
   - `isAvailable.value: false` でブラウザモードをシミュレート

3. **Pinia ストアのエラー**
   - `beforeEach` で `setActivePinia(createPinia())` が呼ばれているか確認

## 整備後のテスト構成

```
フロントエンド (Vitest)
├── api/          2ファイル (window, security)
├── composables/  1-4ファイル (useWindow + 新規)
└── stores/       5ファイル (window + 新規4つ)

バックエンド (cargo test)
├── unit tests    138テスト
└── integration   5テスト
```
