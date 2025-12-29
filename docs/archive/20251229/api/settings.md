# Settings API

**作成日**: 2025-12-14
**バージョン**: 1.0.0

---

## 概要

アプリケーション設定とセキュリティ設定を管理するTauri APIコマンド群。

---

## データ型

### AppSettings

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,           // "auto" | "light" | "dark"
    pub language: String,        // "ja" | "en"
    pub auto_save: bool,         // 自動保存の有効/無効
    pub window_restore: bool,    // ウィンドウ状態復元の有効/無効
}
```

### SecuritySettings

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    pub provider: String,               // "simple" | "master-password" | "keychain"
    pub level: String,                  // "low" | "medium" | "high"
    pub master_password_set: bool,      // マスターパスワードが設定済みか
}
```

---

## コマンド一覧

### 一般設定コマンド

#### `get_settings`

アプリケーション設定を取得する。

**パラメータ**: なし

**戻り値**: `AppSettings`

**エラー**:
- ストレージ読み取りエラー時は文字列でエラーメッセージを返す

**使用例**:
```typescript
const settings = await invoke<AppSettings>('get_settings')
```

---

#### `update_settings`

アプリケーション設定を更新する。

**パラメータ**:
- `settings: Partial<AppSettings>` - 更新する設定（部分更新可能）

**戻り値**: `AppSettings` - 更新後の設定全体

**エラー**:
- ストレージ読み取り/書き込みエラー時は文字列でエラーメッセージを返す

**使用例**:
```typescript
const updated = await invoke<AppSettings>('update_settings', {
  settings: { theme: 'dark', autoSave: true }
})
```

---

#### `reset_settings`

アプリケーション設定をデフォルト値にリセットする。

**パラメータ**: なし

**戻り値**: `AppSettings` - リセット後の設定

**エラー**:
- ストレージ書き込みエラー時は文字列でエラーメッセージを返す

**使用例**:
```typescript
const defaultSettings = await invoke<AppSettings>('reset_settings')
```

---

### セキュリティ設定コマンド

#### `get_security_settings`

セキュリティ設定を取得する。

**パラメータ**: なし

**戻り値**: `SecuritySettings`

**エラー**:
- ストレージ読み取りエラー時は文字列でエラーメッセージを返す

**使用例**:
```typescript
const securitySettings = await invoke<SecuritySettings>('get_security_settings')
```

---

#### `set_security_provider`

セキュリティプロバイダーを変更する。

**パラメータ**:
- `provider: String` - 新しいプロバイダー ("simple" | "master-password" | "keychain")

**戻り値**: `SecuritySettings` - 更新後のセキュリティ設定

**エラー**:
- 無効なプロバイダー名
- データ再暗号化エラー
- ストレージ書き込みエラー

**注意事項**:
- プロバイダー変更時は既存の認証情報を新しい方式で再暗号化する
- 変更前に現在のプロバイダーでの認証が必要な場合がある

**使用例**:
```typescript
const updated = await invoke<SecuritySettings>('set_security_provider', {
  provider: 'master-password'
})
```

---

#### `set_security_level`

セキュリティレベルを変更する。

**パラメータ**:
- `level: String` - 新しいセキュリティレベル ("low" | "medium" | "high")

**戻り値**: `SecuritySettings` - 更新後のセキュリティ設定

**エラー**:
- 無効なセキュリティレベル
- ストレージ書き込みエラー

**使用例**:
```typescript
const updated = await invoke<SecuritySettings>('set_security_level', {
  level: 'high'
})
```

---

#### `set_master_password`

マスターパスワードを設定する。

**パラメータ**:
- `password: String` - 新しいマスターパスワード

**戻り値**: `()`

**エラー**:
- プロバイダーが "master-password" でない場合
- パスワードが要件を満たさない場合
- ストレージ書き込みエラー

**セキュリティ考慮事項**:
- パスワードは即座にPBKDF2でハッシュ化される
- 平文パスワードはログに記録されない
- メモリ上のパスワードは処理完了後にクリアされる

**使用例**:
```typescript
await invoke('set_master_password', { password: 'MySecurePassword123!' })
```

---

#### `verify_master_password`

マスターパスワードを検証する。

**パラメータ**:
- `password: String` - 検証するパスワード

**戻り値**: `bool` - パスワードが正しい場合 `true`、そうでない場合 `false`

**エラー**:
- プロバイダーが "master-password" でない場合
- ストレージ読み取りエラー

**セキュリティ考慮事項**:
- 検証失敗時はログに記録される
- ブルートフォース対策として、一定時間の遅延が追加される場合がある

**使用例**:
```typescript
const isValid = await invoke<boolean>('verify_master_password', {
  password: 'MySecurePassword123!'
})
```

---

## データ保存場所

### ストレージディレクトリ

```
~/.sql-query-build/
├── settings/
│   ├── app-settings.json         # アプリケーション設定
│   └── security-config.json      # セキュリティ設定
└── data/
    └── credentials.json          # 暗号化された認証情報
```

### app-settings.json の例

```json
{
  "theme": "auto",
  "language": "ja",
  "auto_save": true,
  "window_restore": true
}
```

### security-config.json の例

```json
{
  "version": 1,
  "provider": "simple",
  "level": "medium",
  "master_password_set": false
}
```

---

## エラーハンドリング

すべてのコマンドは `Result<T, String>` を返す。エラー時は以下の形式のメッセージが返される:

```typescript
try {
  const settings = await invoke('get_settings')
} catch (error) {
  // error は string 型
  console.error('Failed to load settings:', error)
}
```

---

## セキュリティ考慮事項

### パスワード管理

1. **平文保存の禁止**: マスターパスワードは決して平文で保存されない
2. **ハッシュ化**: PBKDF2（600,000回反復）でハッシュ化
3. **メモリ管理**: 処理完了後は即座にメモリから削除
4. **ログ制限**: パスワードはログに記録されない

### プロバイダー変更

1. **データ整合性**: 変更時は既存データを新方式で再暗号化
2. **ロールバック**: 失敗時は元の状態に戻す
3. **認証確認**: 変更前に現在のプロバイダーでの認証を要求する場合がある

---

## 実装詳細

### デフォルト値

**AppSettings**:
```rust
AppSettings {
    theme: "auto".to_string(),
    language: "ja".to_string(),
    auto_save: true,
    window_restore: true,
}
```

**SecuritySettings**:
```rust
SecuritySettings {
    provider: "simple".to_string(),
    level: "medium".to_string(),
    master_password_set: false,
}
```

---

## 関連ドキュメント

- [Storage API](./storage.md) - 低レベルストレージAPI
- [Security Provider Requirements](../sql_editor_requirements_md.md#35-セキュリティプロバイダー要件) - セキュリティ要件
- [Security Settings Design](../design/1.5b.3/3.1.3_security_settings.md) - フロントエンド設計

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 1.0.0 | 2025-12-14 | 初版作成 |
