# 設定機能 詳細仕様

**バージョン**: 1.1
**作成日**: 2025年12月29日
**最終更新**: 2026年1月17日
**状態**: ✅ 完了

---

## 1. 機能概要

アプリケーション全体の設定を管理する機能。一般設定、安全設定、セキュリティ設定、バージョン情報を含む。

---

## 2. 設定画面構成

### 2.1 タブ構成

| タブ | コンポーネント | 説明 |
|-----|--------------|------|
| 一般 | `GeneralSettings.vue` | アプリケーション全般の設定 |
| 安全設定 | `SafetySettingsPanel.vue` | 環境別の安全設定 |
| セキュリティ | `SecuritySettings.vue` | セキュリティプロバイダー設定 |
| バージョン情報 | `AboutSection.vue` | アプリ情報、ライセンス |

---

## 3. 一般設定

### 3.1 設定項目

| 項目 | 型 | デフォルト | 説明 |
|------|---|---------|------|
| テーマ | `'light' \| 'dark' \| 'auto'` | `'auto'` | カラーモード |
| 言語 | `'ja' \| 'en'` | `'ja'` | 表示言語 |
| 自動保存 | `boolean` | `true` | クエリの自動保存 |
| ウィンドウ復元 | `boolean` | `true` | 起動時のウィンドウ状態復元 |

### 3.2 データモデル

```typescript
interface AppSettings {
  theme: ColorMode
  language: Language
  autoSave: boolean
  windowRestore: boolean
}

type ColorMode = 'light' | 'dark' | 'auto'
type Language = 'ja' | 'en'
```

---

## 4. 安全設定

### 4.1 概要

環境（development/test/staging/production）ごとに、危険なクエリ実行時の確認動作を設定する機能。

### 4.2 環境別設定項目

| 項目 | 型 | デフォルト | 説明 |
|------|---|---------|------|
| 確認ダイアログ表示 | `boolean` | 環境による | UPDATE/DELETE/DROP/TRUNCATE時に確認ダイアログを表示 |
| テーブル名入力必須 | `boolean` | 環境による | 確認時にテーブル名の入力を必須とする |
| 遅延実行 | `number` | 0 | 実行ボタン有効化までの遅延秒数 |

### 4.3 環境別デフォルト値

| 環境 | 確認ダイアログ | テーブル名入力 | 遅延秒数 |
|------|--------------|--------------|---------|
| development | false | false | 0 |
| test | false | false | 0 |
| staging | true | false | 0 |
| production | true | true | 3 |

### 4.4 データモデル

```typescript
interface SafetySettings {
  environments: {
    [key in Environment]: EnvironmentSafetySetting
  }
}

interface EnvironmentSafetySetting {
  requireConfirmation: boolean
  requireTableName: boolean
  delaySeconds: number
}

type Environment = 'development' | 'test' | 'staging' | 'production'
```

### 4.5 関連コンポーネント

| コンポーネント | パス | 説明 |
|--------------|------|------|
| SafetySettingsPanel | `components/settings/SafetySettingsPanel.vue` | 安全設定パネル |
| EnvironmentSafetyCard | `components/settings/EnvironmentSafetyCard.vue` | 環境別設定カード |

### 4.6 API

```rust
#[tauri::command]
async fn get_safety_settings() -> Result<SafetySettings, Error>

#[tauri::command]
async fn save_safety_settings(settings: SafetySettings) -> Result<(), Error>
```

---

## 5. セキュリティ設定

詳細は [security.md](security.md) を参照。

### 5.1 設定項目

| 項目 | 説明 |
|------|------|
| セキュリティプロバイダー | Simple / MasterPassword / Keychain |
| マスターパスワード | 設定/変更（MasterPassword選択時） |

---

## 6. バージョン情報

### 6.1 表示内容

| 項目 | 説明 |
|------|------|
| アプリ名 | SQL Query Builder |
| バージョン | パッケージバージョン |
| ビルド日 | ビルド日時 |
| ライセンス | ライセンス情報 |
| 技術スタック | Tauri, Nuxt, Vue, Rust |

---

## 7. API仕様

### 7.1 Tauri Commands

#### get_settings
設定を取得する。

```rust
#[tauri::command]
async fn get_settings() -> Result<AppSettings, SettingsError>
```

#### save_settings
設定を保存する。

```rust
#[tauri::command]
async fn save_settings(settings: AppSettings) -> Result<(), SettingsError>
```

---

## 8. 関連コンポーネント

### 8.1 フロントエンド

| コンポーネント | パス | 説明 |
|--------------|------|------|
| settings.vue | `pages/settings.vue` | 設定ページ |
| GeneralSettings | `components/settings/GeneralSettings.vue` | 一般設定 |
| SafetySettingsPanel | `components/settings/SafetySettingsPanel.vue` | 安全設定パネル |
| EnvironmentSafetyCard | `components/settings/EnvironmentSafetyCard.vue` | 環境別安全設定 |
| SecuritySettings | `components/settings/SecuritySettings.vue` | セキュリティ設定 |
| AboutSection | `components/settings/AboutSection.vue` | バージョン情報 |

### 8.2 バックエンド

| モジュール | パス | 説明 |
|-----------|------|------|
| commands/settings.rs | 設定関連コマンド |
| commands/safety.rs | 安全設定コマンド |
| services/safety_config.rs | 安全設定サービス |
| models/safety_settings.rs | 安全設定モデル |

### 8.3 ストア

| ストア | パス | 説明 |
|--------|------|------|
| settingsStore | `stores/settings.ts` | 設定状態管理 |
| safetyStore | `stores/safety.ts` | 安全設定状態管理 |

---

## 9. 設定の永続化

### 9.1 保存先

```
~/.sql-query-build/
├── settings.json          # アプリ設定
└── safety-settings.json   # 安全設定
```

### 9.2 ファイル形式

#### settings.json

```json
{
  "version": 1,
  "theme": "auto",
  "language": "ja",
  "autoSave": true,
  "windowRestore": true
}
```

#### safety-settings.json

```json
{
  "version": 1,
  "environments": {
    "development": {
      "requireConfirmation": false,
      "requireTableName": false,
      "delaySeconds": 0
    },
    "test": {
      "requireConfirmation": false,
      "requireTableName": false,
      "delaySeconds": 0
    },
    "staging": {
      "requireConfirmation": true,
      "requireTableName": false,
      "delaySeconds": 0
    },
    "production": {
      "requireConfirmation": true,
      "requireTableName": true,
      "delaySeconds": 3
    }
  }
}
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-12-29 | 1.0 | 初版作成 |
| 2026-01-17 | 1.1 | 安全設定機能を追加（環境別の確認ダイアログ設定） |
