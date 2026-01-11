# セキュリティ機能 詳細仕様

**バージョン**: 1.0
**作成日**: 2025年12月29日
**状態**: ⚠️ 一部完了（Phase 1.5a）

---

## 1. 機能概要

データベース認証情報（パスワード等）の暗号化保存を管理する機能。DBeaverの設計を参考に、3つのセキュリティプロバイダーを設計。

**実装状況**:
- **Simple**: ✅ フロントエンド・バックエンド完了
- **MasterPassword**: ✅ フロントエンド・バックエンド完了
- **Keychain**: ⚠️ バックエンド実装済み、フロントエンド未実装

---

## 2. セキュリティプロバイダー

### 2.1 一覧

| プロバイダー | セキュリティレベル | 説明 | 推奨用途 | 状態 |
|------------|------------------|------|---------|------|
| Simple | 低（カジュアル保護） | アプリ固定キーで暗号化 | 個人開発、ローカル環境 | ✅ 完了 |
| MasterPassword | 高 | ユーザー設定パスワードで暗号化 | チーム共有PC、高セキュリティ | ✅ 完了 |
| Keychain | 最高 | OS提供のセキュアストレージ | 企業環境、最高セキュリティ | ⚠️ バックエンドのみ |

### 2.2 Simpleプロバイダー

#### 特徴
- パスワード入力不要、即座にアプリ起動可能
- アプリケーション内蔵の固定キー + ランダムソルトで暗号化
- 暗号化方式: AES-256-GCM

#### 利点と欠点
- **利点**: 手軽に利用可能
- **欠点**: ソースコードにアクセスできれば理論上は復号可能

#### 実装
- `src-tauri/src/crypto/security_provider/simple.rs`
- `src-tauri/src/crypto/security_provider/simple_key.rs`

### 2.3 MasterPasswordプロバイダー

#### 特徴
- ユーザー設定のマスターパスワードから暗号化キーを導出
- 起動時に毎回パスワード入力が必要
- 暗号化方式: AES-256-GCM + PBKDF2（600,000回反復）

#### フロー
1. 初回設定時: マスターパスワードを設定
2. 以降の起動時: マスターパスワードを入力
3. セッション中: メモリにキーをキャッシュ

#### パスワード要件
- 最小8文字
- 大文字を含む
- 小文字を含む
- 数字を含む
- 記号を含む（推奨）

#### 実装
- `src-tauri/src/crypto/security_provider/master_password.rs`
- `src-tauri/src/crypto/master_key/manager.rs`

### 2.4 Keychainプロバイダー

> ⚠️ **注意**: バックエンド（Rust）は実装済みですが、フロントエンド（Vue）のUIは未実装です。
> 設定画面のプロバイダー選択肢にKeychainは表示されません。

#### 特徴
- OS提供のセキュアストレージを使用
- OSレベルのセキュリティ、生体認証対応
- OSの認証プロンプトが表示される場合がある

#### 対応OS
| OS | セキュアストレージ |
|----|------------------|
| macOS | Keychain Access |
| Windows | Credential Manager |
| Linux | Secret Service API (GNOME Keyring等) |

#### 実装状況
- ✅ `src-tauri/src/crypto/security_provider/keychain.rs` - Rustプロバイダー実装
- ✅ `src-tauri/src/crypto/master_key/keychain.rs` - OSキーチェーンアクセス
- ❌ フロントエンドUI - 未実装（`SecuritySettings.vue`のproviderOptionsに含まれていない）
- ❌ プロバイダー切替ダイアログ - 未実装

---

## 3. データ保存構造

### 3.1 ファイル構成

```
~/.sql-query-build/
├── connections.json          # 接続情報（パスワード以外）- 平文
├── credentials.json          # パスワード等の機密情報 - 暗号化
└── security-config.json      # セキュリティ設定
```

### 3.2 security-config.json

```json
{
  "version": 1,
  "provider": "master_password",
  "provider_config": {
    "master_password_hash": "...",
    "salt": "...",
    "verification_data": "..."
  }
}
```

### 3.3 credentials.json

```json
{
  "version": 1,
  "encryption_method": "aes-256-gcm",
  "credentials": {
    "connection-uuid-1": {
      "encrypted_data": "base64...",
      "nonce": "base64...",
      "salt": "base64..."
    }
  }
}
```

---

## 4. プロバイダー切替

### 4.1 切替フロー

```
現在のプロバイダーで認証
    ↓
全認証情報を復号
    ↓
新しいプロバイダーの設定
    ↓
全認証情報を再暗号化
    ↓
設定ファイル更新
```

### 4.2 切替パターン

| 現在 | 切替先 | 必要な操作 | 実装状況 |
|------|--------|-----------|---------|
| Simple | MasterPassword | 新パスワード設定 | ✅ 実装済み |
| Simple | Keychain | OS認証 | ❌ 未実装 |
| MasterPassword | Simple | 現パスワード入力 | ✅ 実装済み |
| MasterPassword | Keychain | 現パスワード入力 + OS認証 | ❌ 未実装 |
| Keychain | Simple | OS認証 | ❌ 未実装 |
| Keychain | MasterPassword | OS認証 + 新パスワード設定 | ❌ 未実装 |

### 4.3 エラー時のロールバック

プロバイダー切替中にエラーが発生した場合、元の状態にロールバック可能。

---

## 5. API仕様

### 5.1 Tauri Commands

#### get_security_settings
現在のセキュリティ設定を取得する。

```rust
#[tauri::command]
async fn get_security_settings() -> Result<SecuritySettings, SecurityError>
```

#### switch_security_provider
セキュリティプロバイダーを切り替える。

```rust
#[tauri::command]
async fn switch_security_provider(
    target_provider: SecurityProvider,
    current_password: Option<String>,
    new_password: Option<String>
) -> Result<(), SecurityError>
```

#### verify_master_password
マスターパスワードを検証する。

```rust
#[tauri::command]
async fn verify_master_password(password: String) -> Result<bool, SecurityError>
```

#### setup_master_password
マスターパスワードを設定する。

```rust
#[tauri::command]
async fn setup_master_password(password: String) -> Result<(), SecurityError>
```

#### change_master_password
マスターパスワードを変更する。

```rust
#[tauri::command]
async fn change_master_password(
    current_password: String,
    new_password: String
) -> Result<(), SecurityError>
```

---

## 6. 関連コンポーネント

### 6.1 フロントエンド

| コンポーネント | パス | 説明 |
|--------------|------|------|
| SecuritySettings | `components/settings/SecuritySettings.vue` | セキュリティ設定画面 |
| SecurityProviderComparison | `components/security/SecurityProviderComparison.vue` | プロバイダー比較表示 |
| MasterPasswordSetupDialog | `components/security/MasterPasswordSetupDialog.vue` | パスワード設定ダイアログ |
| MasterPasswordVerifyDialog | `components/security/MasterPasswordVerifyDialog.vue` | パスワード確認ダイアログ |
| PasswordStrengthMeter | `components/security/PasswordStrengthMeter.vue` | パスワード強度表示 |
| PasswordRequirements | `components/security/PasswordRequirements.vue` | パスワード要件表示 |
| FromSimpleDialog | `components/security/provider-change/FromSimpleDialog.vue` | Simple→他への切替 |
| FromMasterPasswordDialog | `components/security/provider-change/FromMasterPasswordDialog.vue` | MasterPassword→他への切替 |

### 6.2 バックエンド

| モジュール | パス | 説明 |
|-----------|------|------|
| security_provider/mod.rs | プロバイダーモジュール |
| security_provider/traits.rs | プロバイダートレイト |
| security_provider/simple.rs | Simpleプロバイダー |
| security_provider/master_password.rs | MasterPasswordプロバイダー |
| security_provider/keychain.rs | Keychainプロバイダー |
| security_provider/manager.rs | プロバイダー管理 |
| security_provider/config.rs | 設定永続化 |
| security_provider/provider_switcher.rs | プロバイダー切替 |
| crypto/encryption.rs | 暗号化ユーティリティ |

### 6.3 ストア

| ストア | パス | 説明 |
|--------|------|------|
| securityStore | `stores/security.ts` | セキュリティ状態管理 |

---

## 7. セキュリティ考慮事項

### 7.1 暗号化仕様

| 項目 | 仕様 |
|------|------|
| 暗号化アルゴリズム | AES-256-GCM |
| キー導出 | PBKDF2 (600,000回反復) |
| ソルト | ランダム生成、接続ごとに一意 |
| Nonce | ランダム生成、暗号化ごとに一意 |

### 7.2 メモリ上のセキュリティ

- パスワードは使用後にゼロ化（`zeroize`クレート使用）
- 復号されたデータはメモリ上に長時間保持しない
- セッションキーはアプリ終了時に破棄

### 7.3 ファイルアクセス

- 設定ファイルはユーザーホームディレクトリに保存
- ファイルパーミッション: 0600（所有者のみ読み書き可）

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-12-29 | 1.0 | 初版作成 |
