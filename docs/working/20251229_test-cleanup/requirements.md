# テストコード整備 - 要件定義書

## 背景

開発を進める中でテストコードの整備が途中から止まっていた。現在、フロントエンド（Vue.js/Nuxt）とバックエンド（Rust/Tauri）のテストコードに以下の問題がある：

1. **不要なテストコード**: 削除済みのソースコードや古いAPI仕様に基づくテストが残っている
2. **壊れたテストコード**: ソースコードの変更に追従できていないテストが失敗している
3. **テストカバレッジの不足**: 重要な機能のテストが不足している

## 目的

1. 不要なテストコードを削除する
2. 壊れたテストコードを修正または削除する
3. 重要な機能に対するテストを追加する
4. テストが継続的に通る状態を維持できるようにする

## 現状分析

### バックエンド（Rust）テスト状況

**結果: 全138テストがパス** ✅

テストカバレッジが良好なモジュール：
- `connection/` - 接続管理（37テスト）
- `crypto/` - 暗号化・セキュリティプロバイダー（42テスト）
- `storage/` - ファイルストレージ（10テスト）
- `models/` - データモデル（15テスト）
- `services/` - データベースインスペクター（7テスト）
- `commands/` - Tauriコマンド（3テスト）
- `integration/` - 統合テスト（5テスト）

### フロントエンド（Vue/Nuxt）テスト状況

**結果: 11テスト失敗 / 36テスト中** ❌

#### 壊れているテスト

| ファイル | 問題 |
|---------|------|
| `tests/stores/theme.spec.ts` | `useThemeStore`の実装が完全に変更されている。テストは古いVuetify統合前提で書かれている |
| `tests/composables/useTheme.spec.ts` | 同上。`useTheme`の実装が変更されている |
| `tests/stores/settings.spec.ts` | `useSettingsStore`の実装が変更されている。古いプロパティ（`restoreWindowsOnStartup`等）が存在しない |
| `tests/components/EnvironmentHeader.spec.ts` | Vuetifyスタブが使用されているが、現在はNuxt UIを使用 |
| `tests/components/EnvironmentSelector.spec.ts` | 同上 |
| `tests/components/ThemePreview.spec.ts` | 同上 |

#### 不要なテスト

| ファイル | 理由 |
|---------|------|
| `tests/api/connection.spec.ts` | `app/api/connection.ts`が存在しない（削除済み） |
| `tests/utils/vuetifyStubs.ts` | Vuetifyはもう使用していない |

#### 動作するテスト

| ファイル | 状態 |
|---------|------|
| `tests/api/window.spec.ts` | ✅ パス |
| `tests/api/security.spec.ts` | ✅ パス |
| `tests/composables/useWindow.spec.ts` | ✅ パス |
| `tests/stores/window.spec.ts` | ✅ パス |

### フロントエンドソースコード構成

#### API層 (`app/api/`)
- `window.ts` - ウィンドウ管理API
- `database-structure.ts` - DB構造取得API
- `query.ts` - クエリ実行API

#### Stores (`app/stores/`)
- `theme.ts` - テーマ管理
- `settings.ts` - 設定管理
- `security.ts` - セキュリティ管理
- `connection.ts` - 接続管理
- `window.ts` - ウィンドウ状態管理
- `database-structure.ts` - DB構造管理
- `query-builder.ts` - クエリビルダー状態管理

#### Composables (`app/composables/`)
- `useTheme.ts` - テーマComposable
- `useEnvironment.ts` - 環境Composable
- `useTauri.ts` - Tauri APIラッパー
- `useWindow.ts` - ウィンドウComposable
- `useProviderChangeDialog.ts` - プロバイダー変更ダイアログ
- `useProviderSwitch.ts` - プロバイダー切り替え
- `useTableSelection.ts` - テーブル選択

#### Components (`app/components/`)
- `common/` - 共通コンポーネント
- `connection/` - 接続関連
- `launcher/` - ランチャー
- `security/` - セキュリティ
- `settings/` - 設定
- `query-builder/` - クエリビルダー

## スコープ

### In Scope

1. 不要なテストファイルの削除
2. 壊れたテストファイルの削除または修正
3. 現在の実装に合わせたテストの追加
4. テストユーティリティの整備（Nuxt UI対応）

### Out of Scope

1. E2Eテストの追加
2. バックエンドテストの変更（既にすべてパス）
3. テストカバレッジ100%達成

## 成功基準

1. `npm run test:run` が全テストパスする
2. 存在しないソースに対するテストがない
3. 主要なストア・Composableに対するテストが存在する
