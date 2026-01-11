# 設定機能 詳細仕様

**バージョン**: 1.0
**作成日**: 2025年12月29日
**状態**: ✅ 完了

---

## 1. 機能概要

アプリケーション全体の設定を管理する機能。一般設定、セキュリティ設定、バージョン情報を含む。

---

## 2. 設定画面構成

### 2.1 タブ構成

| タブ | コンポーネント | 説明 |
|-----|--------------|------|
| 一般 | `GeneralSettings.vue` | アプリケーション全般の設定 |
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

## 4. セキュリティ設定

詳細は [security.md](security.md) を参照。

### 4.1 設定項目

| 項目 | 説明 |
|------|------|
| セキュリティプロバイダー | Simple / MasterPassword / Keychain |
| マスターパスワード | 設定/変更（MasterPassword選択時） |

---

## 5. バージョン情報

### 5.1 表示内容

| 項目 | 説明 |
|------|------|
| アプリ名 | SQL Query Builder |
| バージョン | パッケージバージョン |
| ビルド日 | ビルド日時 |
| ライセンス | ライセンス情報 |
| 技術スタック | Tauri, Nuxt, Vue, Rust |

---

## 6. API仕様

### 6.1 Tauri Commands

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

## 7. 関連コンポーネント

### 7.1 フロントエンド

| コンポーネント | パス | 説明 |
|--------------|------|------|
| settings.vue | `pages/settings.vue` | 設定ページ |
| GeneralSettings | `components/settings/GeneralSettings.vue` | 一般設定 |
| SecuritySettings | `components/settings/SecuritySettings.vue` | セキュリティ設定 |
| AboutSection | `components/settings/AboutSection.vue` | バージョン情報 |

### 7.2 バックエンド

| モジュール | パス | 説明 |
|-----------|------|------|
| commands/settings.rs | 設定関連コマンド |

### 7.3 ストア

| ストア | パス | 説明 |
|--------|------|------|
| settingsStore | `stores/settings.ts` | 設定状態管理 |

---

## 8. 設定の永続化

### 8.1 保存先

```
~/.sql-query-build/
└── settings.json
```

### 8.2 ファイル形式

```json
{
  "version": 1,
  "theme": "auto",
  "language": "ja",
  "autoSave": true,
  "windowRestore": true
}
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-12-29 | 1.0 | 初版作成 |
