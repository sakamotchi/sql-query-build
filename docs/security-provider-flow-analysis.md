# セキュリティプロバイダー切り替えフロー分析

## 概要

このドキュメントは、セキュリティタブでプロバイダーをSimpleからマスターパスワードに変更する際の問題点と、あるべき業務フローについて記載します。

## 現状の問題点

### 1. マスターパスワード設定状態の不整合

**症状:**
- プロバイダーを`simple`から`master-password`に変更すると、`ProviderChangeDialog`で新しいマスターパスワードの設定を求められる
- しかし、設定完了後も`SecuritySettings`画面のマスターパスワードカードでは「設定する」ボタンが表示され、再度設定を求められる
- 本来は「変更する」ボタンが表示されるべき

**発生箇所:**

1. **フロントエンド:**
   - `app/components/security/ProviderChangeDialog.vue:243-276` - 初期化フェーズでパスワード設定
   - `app/components/settings/SecuritySettings.vue:67-70` - `masterPasswordSet`の状態で「設定」か「変更」かを判断
   - `app/stores/security.ts:26-48` - `loadSettings`で`get_security_settings`を呼び出し

2. **バックエンド:**
   - `src-tauri/src/commands/security.rs:122-157` - `switch_security_provider`コマンド
   - `src-tauri/src/commands/settings.rs:118-141` - `get_security_settings`コマンド
   - `src-tauri/src/crypto/security_provider/config.rs:136-154` - `change_provider`メソッド

### 2. 設定フラグの更新漏れ

**根本原因:**

```rust
// src-tauri/src/crypto/security_provider/config.rs:136-154
pub async fn change_provider(
    &self,
    provider_type: SecurityProviderType,
) -> Result<(), SecurityConfigError> {
    let mut config = self.load().await?;

    config.provider_type = provider_type;
    config.provider_config = match provider_type {
        SecurityProviderType::Simple => ProviderSpecificConfig::Simple,
        SecurityProviderType::MasterPassword => ProviderSpecificConfig::MasterPassword {
            is_configured: false,  // ← 常にfalseで初期化される
        },
        SecurityProviderType::Keychain => ProviderSpecificConfig::Keychain {
            is_initialized: false,
        },
    };

    self.save(&config).await
}
```

`change_provider`メソッドは、プロバイダー変更時に常に`is_configured: false`でリセットします。

**問題:**

`switch_security_provider`コマンドは、プロバイダー切り替え後に`is_configured`フラグを更新していません:

```rust
// src-tauri/src/commands/security.rs:122-157
#[tauri::command]
pub async fn switch_security_provider(
    switcher: State<'_, Arc<ProviderSwitcher>>,
    target_provider: SecurityProviderType,
    current_password: Option<String>,
    new_password: Option<String>,
    new_password_confirm: Option<String>,
) -> Result<SwitchResult, String> {
    // ... 切り替え処理 ...

    switcher
        .switch(SwitchParams {
            target_provider,
            current_auth,
            new_init,
        })
        .await
        .map_err(|e| e.to_string())

    // ← ここでis_configuredフラグを更新する処理がない
}
```

結果として、フロントエンドで`get_security_settings`を呼び出しても:

```rust
// src-tauri/src/commands/settings.rs:130-134
let master_password_set = matches!(
    config.provider_config,
    ProviderSpecificConfig::MasterPassword { is_configured: true }
);
```

この判定で`master_password_set`が常に`false`になります。

### 3. MasterPasswordSetupDialogとの役割の重複

**現状の2つのダイアログ:**

| ダイアログ | 用途 | ファイル |
|----------|------|---------|
| ProviderChangeDialog | プロバイダー切り替え時のパスワード設定 | `app/components/security/ProviderChangeDialog.vue` |
| MasterPasswordSetupDialog | マスターパスワードの初期設定・変更 | `app/components/security/MasterPasswordSetupDialog.vue` |

**問題:**
- 両者が同じようにパスワード設定を行う
- `ProviderChangeDialog`での設定後に`is_configured`フラグが更新されない
- その結果、`MasterPasswordSetupDialog`で再度設定を求められる

## あるべきユーザー業務フロー

### シナリオ1: 初めてマスターパスワードプロバイダーに切り替える

```
┌─────────────────────────────────────────────┐
│ 1. プロバイダー選択                          │
│    Simple → マスターパスワード               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. ProviderChangeDialog表示                 │
│    ┌───────────────────────────────────┐   │
│    │ 確認フェーズ                      │   │
│    │ - 変更内容の確認                  │   │
│    │ - セキュリティレベル表示          │   │
│    └───────────────────────────────────┘   │
│                    ↓                        │
│    ┌───────────────────────────────────┐   │
│    │ 認証フェーズ（Simpleの場合スキップ）│   │
│    └───────────────────────────────────┘   │
│                    ↓                        │
│    ┌───────────────────────────────────┐   │
│    │ 初期化フェーズ                    │   │
│    │ - 新しいマスターパスワード入力    │   │
│    │ - パスワード確認                  │   │
│    │ - 強度チェック                    │   │
│    └───────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. バックエンドで切り替え実行               │
│    - switch_security_provider               │
│    - 既存接続情報の再暗号化                 │
│    - ✓ is_configured: true に更新          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. SecuritySettings画面に戻る               │
│    - masterPasswordSet: true                │
│    - 「変更する」ボタン表示                 │
└─────────────────────────────────────────────┘
```

### シナリオ2: マスターパスワードを変更する

```
┌─────────────────────────────────────────────┐
│ 1. 「変更する」ボタンクリック               │
│    (既にマスターパスワード設定済み)         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. MasterPasswordSetupDialog表示            │
│    (mode="change")                          │
│    ┌───────────────────────────────────┐   │
│    │ - 現在のパスワード入力            │   │
│    │ - 新しいパスワード入力            │   │
│    │ - パスワード確認                  │   │
│    │ - 強度チェック                    │   │
│    └───────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. バックエンドでパスワード変更             │
│    - change_master_password                 │
│    - Simple経由で一時切り替え               │
│    - 新パスワードで再初期化                 │
│    - 既存接続情報の再暗号化                 │
│    - ✓ is_configured: true 維持            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. ダイアログ閉じる                         │
│    - masterPasswordSet: true のまま         │
│    - 「変更する」ボタン継続表示             │
└─────────────────────────────────────────────┘
```

### シナリオ3: 他のプロバイダーからマスターパスワードに切り替える

```
┌─────────────────────────────────────────────┐
│ 1. プロバイダー選択                          │
│    OSキーチェーン → マスターパスワード       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. ProviderChangeDialog表示                 │
│    - 確認フェーズ                           │
│    - 認証フェーズ（OS認証が必要な場合）     │
│    - 初期化フェーズ（新パスワード入力）     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. バックエンドで切り替え実行               │
│    - 既存接続情報を復号（旧プロバイダー）   │
│    - 新パスワードで再暗号化                 │
│    - ✓ is_configured: true に更新          │
└─────────────────────────────────────────────┘
```

## 修正が必要な箇所

### 優先度1: バックエンド - switch_security_providerの修正

**ファイル:** `src-tauri/src/commands/security.rs:122-157`

**現状の問題:**
- プロバイダー切り替え後、`is_configured`フラグを更新していない

**修正方針:**
```rust
#[tauri::command]
pub async fn switch_security_provider(
    switcher: State<'_, Arc<ProviderSwitcher>>,
    storage: State<'_, Arc<SecurityConfigStorage>>,  // 追加
    target_provider: SecurityProviderType,
    current_password: Option<String>,
    new_password: Option<String>,
    new_password_confirm: Option<String>,
) -> Result<SwitchResult, String> {
    // ... 既存の切り替え処理 ...

    let result = switcher
        .switch(SwitchParams {
            target_provider,
            current_auth,
            new_init,
        })
        .await
        .map_err(|e| e.to_string())?;

    // マスターパスワードプロバイダーに切り替えた場合、is_configuredをtrueに更新
    if target_provider == SecurityProviderType::MasterPassword {
        storage
            .update_provider_config(ProviderSpecificConfig::MasterPassword {
                is_configured: true,
            })
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(result)
}
```

### 優先度2: バックエンド - change_master_passwordの確認

**ファイル:** `src-tauri/src/commands/security.rs:174-230`

**確認事項:**
- `change_master_password`コマンドが正しく`is_configured`を維持しているか
- Simple経由で切り替え後、再度MasterPasswordに戻す際に`is_configured: true`が保持されるか

**潜在的な問題:**
```rust
// 現在の実装では、一旦Simpleに切り替えた際に is_configured: false になる可能性
switcher
    .switch(SwitchParams {
        target_provider: SecurityProviderType::Simple,
        current_auth: UnlockParams::MasterPassword {
            password: current_password.clone(),
        },
        new_init: InitializeParams::Simple,
    })
    .await
    .map_err(|e| e.to_string())?;

// この時点で SecurityConfigStorage.change_provider が呼ばれ、
// is_configured: false にリセットされる可能性がある
```

**修正方針:**
- `change_master_password`でも明示的に`is_configured: true`を設定する

### 優先度3: フロントエンド - 状態管理の見直し

**ファイル:** `app/components/security/ProviderChangeDialog.vue:89-131`

**現状:**
```typescript
const switchProvider = async () => {
  try {
    // ... 切り替え処理 ...

    currentPhase.value = 'complete'

    await securityStore.loadSettings()  // これだけでは不十分

    setTimeout(() => {
      isOpen.value = false
      reset()
    }, 2000)
  } catch (error) {
    // ...
  }
}
```

**修正不要の可能性:**
- バックエンドで`is_configured`が正しく更新されれば、`loadSettings()`で自動的に反映されるため、フロントエンド側の修正は不要かもしれません
- ただし、確実に最新状態を取得するため、キャッシュクリアを検討

### 優先度4: lib.rsの修正

**ファイル:** `src-tauri/src/lib.rs:156-185`

**修正方針:**
```rust
commands::security::switch_security_provider,
```
このコマンドのシグネチャが変更されるため、`invoke_handler`の登録は自動的に更新されます（特に修正不要）。

## 修正後の期待される動作

### テストケース1: SimpleからMasterPasswordへの切り替え

1. **初期状態:**
   - `provider: "simple"`
   - `masterPasswordSet: false`

2. **操作:**
   - プロバイダーを"master-password"に変更
   - ProviderChangeDialogで新しいパスワード"Test1234!"を設定

3. **期待される結果:**
   - `provider: "master-password"`
   - `masterPasswordSet: true`
   - `is_configured: true` (バックエンド)
   - SecuritySettings画面に「変更する」ボタンが表示される

### テストケース2: マスターパスワードの変更

1. **初期状態:**
   - `provider: "master-password"`
   - `masterPasswordSet: true`
   - 現在のパスワード: "Test1234!"

2. **操作:**
   - 「変更する」ボタンクリック
   - MasterPasswordSetupDialog (mode="change") が表示
   - 現在のパスワード"Test1234!"を入力
   - 新しいパスワード"NewPass5678!"を設定

3. **期待される結果:**
   - `provider: "master-password"` (変更なし)
   - `masterPasswordSet: true` (維持)
   - `is_configured: true` (維持)
   - パスワードのみが更新される
   - 引き続き「変更する」ボタンが表示される

### テストケース3: MasterPasswordからSimpleへの切り替え

1. **初期状態:**
   - `provider: "master-password"`
   - `masterPasswordSet: true`

2. **操作:**
   - プロバイダーを"simple"に変更
   - ProviderChangeDialogで現在のパスワードを認証

3. **期待される結果:**
   - `provider: "simple"`
   - `masterPasswordSet: false`
   - マスターパスワード設定カードが非表示になる

## データフロー図

### 現状の問題フロー

```
[User] プロバイダー変更
   ↓
[SecuritySettings.vue] updateProvider()
   ↓
[ProviderChangeDialog.vue] 表示
   ↓ nextPhase() → switchProvider()
[Tauri] switch_security_provider
   ↓
[ProviderSwitcher] switch() - 再暗号化実行
   ↓
[SecurityConfigStorage] change_provider()
   └─→ is_configured: false に設定 ← ❌ 問題
   ↓
[ProviderChangeDialog.vue] securityStore.loadSettings()
   ↓
[Tauri] get_security_settings
   ↓
   masterPasswordSet = matches!(
       config.provider_config,
       ProviderSpecificConfig::MasterPassword { is_configured: true }
   ) ← false を返す ❌
   ↓
[SecuritySettings.vue] 「設定する」ボタン表示 ← ❌ 本来は「変更する」
```

### 修正後の正しいフロー

```
[User] プロバイダー変更
   ↓
[SecuritySettings.vue] updateProvider()
   ↓
[ProviderChangeDialog.vue] 表示
   ↓ nextPhase() → switchProvider()
[Tauri] switch_security_provider
   ↓
[ProviderSwitcher] switch() - 再暗号化実行
   ↓
[SecurityConfigStorage] change_provider()
   └─→ is_configured: false に設定
   ↓
✅ [switch_security_provider] is_configured: true に更新 ← 修正箇所
   ↓
[ProviderChangeDialog.vue] securityStore.loadSettings()
   ↓
[Tauri] get_security_settings
   ↓
   masterPasswordSet = matches!(
       config.provider_config,
       ProviderSpecificConfig::MasterPassword { is_configured: true }
   ) ← ✅ true を返す
   ↓
[SecuritySettings.vue] ✅ 「変更する」ボタン表示
```

## 関連ファイル一覧

### フロントエンド

| ファイル | 役割 |
|---------|------|
| `app/components/security/MasterPasswordSetupDialog.vue` | マスターパスワードの初期設定・変更ダイアログ |
| `app/components/security/ProviderChangeDialog.vue` | プロバイダー切り替えダイアログ |
| `app/components/settings/SecuritySettings.vue` | セキュリティ設定画面（メイン） |
| `app/stores/security.ts` | セキュリティ設定のPiniaストア |
| `app/types/index.ts` | TypeScript型定義 |

### バックエンド

| ファイル | 役割 |
|---------|------|
| `src-tauri/src/commands/security.rs` | セキュリティ関連のTauriコマンド |
| `src-tauri/src/commands/settings.rs` | 設定関連のTauriコマンド |
| `src-tauri/src/crypto/security_provider/config.rs` | セキュリティ設定ストレージ |
| `src-tauri/src/crypto/security_provider/manager.rs` | プロバイダーマネージャー |
| `src-tauri/src/lib.rs` | Tauriアプリのエントリーポイント |

## 次のステップ

1. ✅ このドキュメントをレビュー
2. ✅ 優先度1の修正を実装（`switch_security_provider`コマンド）
3. ✅ 優先度2の確認・修正（`change_master_password`コマンド）
4. ⬜ テストケースを実行して動作確認
5. ⬜ 必要に応じてフロントエンド側も調整

## 実装した修正内容

### 修正1: switch_security_providerコマンド

**ファイル:** `src-tauri/src/commands/security.rs:121-180`

**変更内容:**
1. `SecurityConfigStorage`パラメータを追加
2. プロバイダー切り替え後、`is_configured`フラグを更新する処理を追加
3. MasterPasswordプロバイダーの場合: `is_configured: true`
4. Keychainプロバイダーの場合: `is_initialized: true`

```rust
// マスターパスワードプロバイダーに切り替えた場合、is_configuredをtrueに更新
if target_provider == SecurityProviderType::MasterPassword {
    storage
        .update_provider_config(ProviderSpecificConfig::MasterPassword {
            is_configured: true,
        })
        .await
        .map_err(|e| e.to_string())?;
}

// キーチェーンプロバイダーに切り替えた場合、is_initializedをtrueに更新
if target_provider == SecurityProviderType::Keychain {
    storage
        .update_provider_config(ProviderSpecificConfig::Keychain {
            is_initialized: true,
        })
        .await
        .map_err(|e| e.to_string())?;
}
```

### 修正2: change_master_passwordコマンド

**ファイル:** `src-tauri/src/commands/security.rs:197-275`

**変更内容:**
1. `SecurityConfigStorage`パラメータを追加
2. パスワード変更成功時に`is_configured: true`を明示的に設定
3. エラー発生時の復元処理でも`is_configured: true`を設定

```rust
match result {
    Ok(res) => {
        // 切り替え成功時、is_configuredをtrueに更新
        storage
            .update_provider_config(ProviderSpecificConfig::MasterPassword {
                is_configured: true,
            })
            .await
            .map_err(|e| e.to_string())?;
        Ok(res)
    }
    Err(err) => {
        // エラー時は元のパスワードで復元を試みる
        let _ = switcher.switch(...).await;

        // 復元成功時もis_configuredをtrueに戻す
        let _ = storage
            .update_provider_config(ProviderSpecificConfig::MasterPassword {
                is_configured: true,
            })
            .await;

        Err(err.to_string())
    }
}
```

### 修正3: インポート追加

**ファイル:** `src-tauri/src/commands/security.rs:5-10`

`ProviderSpecificConfig`をインポートリストに追加:

```rust
use crate::crypto::security_provider::{
    InitializeParams, PasswordRequirements, PasswordValidationResult, PasswordValidator,
    ProviderSpecificConfig, // ← 追加
    ProviderSwitcher, SecurityConfig, SecurityConfigStorage,
    SecurityProviderInfo, SecurityProviderManager, SecurityProviderType, SwitchParams,
    SwitchResult, UnlockParams,
};
```

### 修正4: SecuritySettingsのUI改善

**ファイル:** `app/components/settings/SecuritySettings.vue:174-208`

**変更内容:**
1. ボタンのラベルを改善: 「設定する」→「初期設定」、「変更する」→「パスワード変更」
2. 説明文をより明確に
3. 未設定時の警告アラートを追加
4. ボタンの色を設定済み/未設定で変更

```vue
<div class="flex items-center justify-between">
  <div>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      接続情報を暗号化するパスワードを管理します
    </p>
    <p class="text-xs text-gray-500">
      状態: {{ settings.masterPasswordSet ? '設定済み' : '未設定' }}
    </p>
  </div>
  <UButton
    :variant="settings.masterPasswordSet ? 'outline' : 'solid'"
    :color="settings.masterPasswordSet ? 'gray' : 'primary'"
    :disabled="loading"
    @click="openMasterPasswordDialog"
  >
    {{ settings.masterPasswordSet ? 'パスワード変更' : '初期設定' }}
  </UButton>
</div>

<UAlert
  v-if="!settings.masterPasswordSet"
  color="amber"
  variant="soft"
  icon="i-heroicons-exclamation-triangle"
>
  マスターパスワードが未設定です。プロバイダー切り替え時に設定されます。
</UAlert>
```

**目的:**
- ユーザーが「パスワード変更」の用途を理解しやすくする
- 未設定の場合は警告を表示し、プロバイダー切り替えで設定する必要があることを明示

### ビルド確認

✅ `cargo check` - コンパイル成功
⚠️ `npm run typecheck` - 既存の型エラーあり（今回の修正とは無関係）

## MasterPasswordSetupDialogの役割について

### 2つのダイアログの使い分け

当初の懸念として「`MasterPasswordSetupDialog`が使われないのでは？」という疑問がありましたが、以下のように役割が明確に分かれています：

#### ProviderChangeDialog（プロバイダー切り替え）
- **使用タイミング:** セキュリティプロバイダーを変更する時
- **役割:**
  - プロバイダー切り替えの確認
  - 現在のプロバイダーでの認証
  - 新しいプロバイダーの初期設定（マスターパスワードの**初回**設定を含む）
  - 既存の接続情報の再暗号化
- **呼び出し:** `updateProvider`関数から

#### MasterPasswordSetupDialog（パスワード変更）
- **使用タイミング:** 既にマスターパスワードプロバイダーを使用中で、パスワードだけを変更したい時
- **役割:**
  - 現在のパスワードを検証
  - 新しいパスワードを設定
  - パスワード強度チェック
  - プロバイダーは変更せず、パスワードのみを更新
- **呼び出し:** 「パスワード変更」ボタンから

### ユーザーフロー

**シナリオA: 初めてマスターパスワードに切り替える**
```
Simple → MasterPassword に変更
  ↓
ProviderChangeDialog で初回設定
  ↓
is_configured: true
  ↓
「パスワード変更」ボタン表示
```

**シナリオB: パスワードを変更したい**
```
「パスワード変更」ボタンクリック
  ↓
MasterPasswordSetupDialog (mode="change")
  - 現在のパスワード入力
  - 新しいパスワード入力
  ↓
change_master_passwordコマンド実行
  ↓
is_configured: true 維持
```

### なぜ両方必要か

1. **UXの観点:** パスワード変更のためだけにプロバイダー切り替えを強制するのは不自然
2. **セキュリティ:** プロバイダー切り替えとパスワード変更は別の操作として管理すべき
3. **バックエンド設計:** `change_master_password`コマンドが既に実装されている

**結論:** `MasterPasswordSetupDialog`は必要であり、今回の修正により正しく機能するようになります。

---

**作成日:** 2025-12-14
**更新日:** 2025-12-14
**作成者:** Claude Code
**バージョン:** 1.2
