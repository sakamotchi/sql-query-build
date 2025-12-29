# 設計書: 環境別安全設定

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.3 環境別安全設定

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                        フロントエンド                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SafetySettingsPanel.vue                                  │   │
│  │  - 環境別設定カードの表示                                   │   │
│  │  - 設定変更UI                                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  safetyStore.ts                                           │   │
│  │  - 環境別設定の状態管理                                     │   │
│  │  - 設定のCRUD操作                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  safetyApi.ts                                             │   │
│  │  - Tauri IPC呼び出し                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ invoke()
┌─────────────────────────────────────────────────────────────────┐
│                        バックエンド (Rust)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  commands/safety.rs                                       │   │
│  │  - get_safety_settings                                    │   │
│  │  - update_safety_settings                                 │   │
│  │  - reset_safety_settings                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  services/safety_config.rs                                │   │
│  │  - SafetyConfigStorage                                    │   │
│  │  - ファイルへの永続化                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ~/.sql-query-build/safety-settings.json                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. データ構造設計

### 2.1 型定義（TypeScript）

**ファイル**: `app/types/safety-settings.ts`

```typescript
import type { Environment } from '~/types'

/**
 * 確認ダイアログを表示する危険度レベルの閾値
 */
export type ConfirmationThreshold = 'warning' | 'danger'

/**
 * 環境別の安全設定
 */
export interface EnvironmentSafetyConfig {
  /** 確認ダイアログを有効にするか */
  confirmationEnabled: boolean

  /** 確認ダイアログを表示する危険度の閾値 */
  confirmationThreshold: ConfirmationThreshold

  /** カウントダウン秒数（0〜10） */
  countdownSeconds: number

  /** DROPクエリを禁止するか */
  disableDrop: boolean

  /** TRUNCATEクエリを禁止するか */
  disableTruncate: boolean
}

/**
 * 全環境の安全設定
 */
export interface SafetySettings {
  version: number
  environments: Record<Environment, EnvironmentSafetyConfig>
}

/**
 * デフォルト設定
 */
export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  version: 1,
  environments: {
    development: {
      confirmationEnabled: true,
      confirmationThreshold: 'danger',
      countdownSeconds: 0,
      disableDrop: false,
      disableTruncate: false,
    },
    test: {
      confirmationEnabled: true,
      confirmationThreshold: 'danger',
      countdownSeconds: 0,
      disableDrop: false,
      disableTruncate: false,
    },
    staging: {
      confirmationEnabled: true,
      confirmationThreshold: 'warning',
      countdownSeconds: 3,
      disableDrop: false,
      disableTruncate: false,
    },
    production: {
      confirmationEnabled: true,
      confirmationThreshold: 'warning',
      countdownSeconds: 5,
      disableDrop: true,
      disableTruncate: true,
    },
  },
}
```

### 2.2 型定義（Rust）

**ファイル**: `src-tauri/src/models/safety_settings.rs`

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConfirmationThreshold {
    Warning,
    Danger,
}

impl Default for ConfirmationThreshold {
    fn default() -> Self {
        Self::Warning
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentSafetyConfig {
    pub confirmation_enabled: bool,
    pub confirmation_threshold: ConfirmationThreshold,
    pub countdown_seconds: u8,
    pub disable_drop: bool,
    pub disable_truncate: bool,
}

impl Default for EnvironmentSafetyConfig {
    fn default() -> Self {
        Self {
            confirmation_enabled: true,
            confirmation_threshold: ConfirmationThreshold::Warning,
            countdown_seconds: 3,
            disable_drop: false,
            disable_truncate: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SafetySettings {
    pub version: u32,
    pub environments: HashMap<String, EnvironmentSafetyConfig>,
}

impl Default for SafetySettings {
    fn default() -> Self {
        let mut environments = HashMap::new();

        environments.insert(
            "development".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Danger,
                countdown_seconds: 0,
                disable_drop: false,
                disable_truncate: false,
            },
        );

        environments.insert(
            "test".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Danger,
                countdown_seconds: 0,
                disable_drop: false,
                disable_truncate: false,
            },
        );

        environments.insert(
            "staging".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Warning,
                countdown_seconds: 3,
                disable_drop: false,
                disable_truncate: false,
            },
        );

        environments.insert(
            "production".to_string(),
            EnvironmentSafetyConfig {
                confirmation_enabled: true,
                confirmation_threshold: ConfirmationThreshold::Warning,
                countdown_seconds: 5,
                disable_drop: true,
                disable_truncate: true,
            },
        );

        Self {
            version: 1,
            environments,
        }
    }
}
```

---

## 3. バックエンド設計

### 3.1 ファイル構造

```
src-tauri/src/
├── commands/
│   ├── mod.rs              # 変更（safety追加）
│   └── safety.rs           # 新規作成
├── models/
│   ├── mod.rs              # 変更（safety_settings追加）
│   └── safety_settings.rs  # 新規作成
└── services/
    ├── mod.rs              # 変更（safety_config追加）
    └── safety_config.rs    # 新規作成
```

### 3.2 SafetyConfigStorage

**ファイル**: `src-tauri/src/services/safety_config.rs`

```rust
use crate::models::safety_settings::SafetySettings;
use crate::services::path_manager::PathManager;
use anyhow::Result;
use std::fs;
use std::path::PathBuf;

pub struct SafetyConfigStorage {
    file_path: PathBuf,
}

impl SafetyConfigStorage {
    pub fn new() -> Self {
        let path_manager = PathManager::new();
        Self {
            file_path: path_manager.get_data_dir().join("safety-settings.json"),
        }
    }

    /// 設定を読み込む（ファイルがなければデフォルトを返す）
    pub fn load(&self) -> Result<SafetySettings> {
        if !self.file_path.exists() {
            return Ok(SafetySettings::default());
        }

        let content = fs::read_to_string(&self.file_path)?;
        let settings: SafetySettings = serde_json::from_str(&content)?;
        Ok(settings)
    }

    /// 設定を保存する
    pub fn save(&self, settings: &SafetySettings) -> Result<()> {
        // 親ディレクトリがなければ作成
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(settings)?;
        fs::write(&self.file_path, content)?;
        Ok(())
    }

    /// デフォルト設定にリセット
    pub fn reset(&self) -> Result<SafetySettings> {
        let default = SafetySettings::default();
        self.save(&default)?;
        Ok(default)
    }
}
```

### 3.3 Tauriコマンド

**ファイル**: `src-tauri/src/commands/safety.rs`

```rust
use crate::models::safety_settings::{EnvironmentSafetyConfig, SafetySettings};
use crate::services::safety_config::SafetyConfigStorage;

#[tauri::command]
pub async fn get_safety_settings() -> Result<SafetySettings, String> {
    let storage = SafetyConfigStorage::new();
    storage.load().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_environment_safety(
    environment: String,
    config: EnvironmentSafetyConfig,
) -> Result<SafetySettings, String> {
    let storage = SafetyConfigStorage::new();
    let mut settings = storage.load().map_err(|e| e.to_string())?;

    settings.environments.insert(environment, config);
    storage.save(&settings).map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
pub async fn reset_safety_settings() -> Result<SafetySettings, String> {
    let storage = SafetyConfigStorage::new();
    storage.reset().map_err(|e| e.to_string())
}
```

---

## 4. フロントエンド設計

### 4.1 ファイル構造

```
app/
├── api/
│   └── safetyApi.ts                    # 新規作成
├── components/
│   └── settings/
│       ├── SafetySettingsPanel.vue     # 新規作成
│       └── EnvironmentSafetyCard.vue   # 新規作成
├── stores/
│   └── safety.ts                       # 新規作成
└── types/
    └── safety-settings.ts              # 新規作成
```

### 4.2 API層

**ファイル**: `app/api/safetyApi.ts`

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { SafetySettings, EnvironmentSafetyConfig } from '~/types/safety-settings'
import type { Environment } from '~/types'

export const safetyApi = {
  /**
   * 安全設定を取得
   */
  async getSettings(): Promise<SafetySettings> {
    return await invoke('get_safety_settings')
  },

  /**
   * 環境別の安全設定を更新
   */
  async updateEnvironmentSafety(
    environment: Environment,
    config: EnvironmentSafetyConfig
  ): Promise<SafetySettings> {
    return await invoke('update_environment_safety', { environment, config })
  },

  /**
   * 安全設定をデフォルトにリセット
   */
  async resetSettings(): Promise<SafetySettings> {
    return await invoke('reset_safety_settings')
  },
}
```

### 4.3 Piniaストア

**ファイル**: `app/stores/safety.ts`

```typescript
import { defineStore } from 'pinia'
import { safetyApi } from '~/api/safetyApi'
import type { SafetySettings, EnvironmentSafetyConfig } from '~/types/safety-settings'
import type { Environment } from '~/types'
import { DEFAULT_SAFETY_SETTINGS } from '~/types/safety-settings'

interface SafetyState {
  settings: SafetySettings
  loading: boolean
  error: string | null
}

export const useSafetyStore = defineStore('safety', {
  state: (): SafetyState => ({
    settings: DEFAULT_SAFETY_SETTINGS,
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * 指定環境の安全設定を取得
     */
    getConfigForEnvironment: (state) => {
      return (env: Environment): EnvironmentSafetyConfig => {
        return state.settings.environments[env] || DEFAULT_SAFETY_SETTINGS.environments[env]
      }
    },
  },

  actions: {
    /**
     * 設定を読み込む
     */
    async loadSettings() {
      this.loading = true
      this.error = null
      try {
        this.settings = await safetyApi.getSettings()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '設定の読み込みに失敗しました'
        // エラー時はデフォルト設定を使用
        this.settings = DEFAULT_SAFETY_SETTINGS
      } finally {
        this.loading = false
      }
    },

    /**
     * 環境別の設定を更新
     */
    async updateEnvironmentConfig(env: Environment, config: EnvironmentSafetyConfig) {
      this.loading = true
      this.error = null
      try {
        this.settings = await safetyApi.updateEnvironmentSafety(env, config)
      } catch (e) {
        this.error = e instanceof Error ? e.message : '設定の保存に失敗しました'
        throw e
      } finally {
        this.loading = false
      }
    },

    /**
     * デフォルト設定にリセット
     */
    async resetToDefault() {
      this.loading = true
      this.error = null
      try {
        this.settings = await safetyApi.resetSettings()
      } catch (e) {
        this.error = e instanceof Error ? e.message : '設定のリセットに失敗しました'
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
```

### 4.4 設定UIコンポーネント

**ファイル**: `app/components/settings/SafetySettingsPanel.vue`

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSafetyStore } from '~/stores/safety'
import type { Environment } from '~/types'

const safetyStore = useSafetyStore()
const { settings, loading, error } = storeToRefs(safetyStore)

const environments: { key: Environment; label: string; description: string }[] = [
  { key: 'development', label: '開発環境', description: 'ローカル開発用' },
  { key: 'test', label: 'テスト環境', description: '自動テスト・検証用' },
  { key: 'staging', label: 'ステージング環境', description: '本番前の最終確認用' },
  { key: 'production', label: '本番環境', description: '実運用環境' },
]

const resetConfirmOpen = ref(false)

onMounted(() => {
  safetyStore.loadSettings()
})

const handleReset = async () => {
  await safetyStore.resetToDefault()
  resetConfirmOpen.value = false
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold">環境別安全設定</h3>
          <p class="text-sm text-muted mt-1">
            接続先の環境ごとに、クエリ実行時の安全確認を設定します
          </p>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="resetConfirmOpen = true"
        >
          デフォルトに戻す
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert v-if="error" color="red" variant="soft" icon="i-heroicons-exclamation-circle">
        {{ error }}
      </UAlert>

      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EnvironmentSafetyCard
          v-for="env in environments"
          :key="env.key"
          :environment="env.key"
          :label="env.label"
          :description="env.description"
          :config="settings.environments[env.key]"
        />
      </div>
    </div>

    <!-- リセット確認モーダル -->
    <UModal v-model:open="resetConfirmOpen" title="設定をリセット">
      <template #body>
        <p>すべての環境の安全設定をデフォルトに戻しますか？</p>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton color="neutral" variant="outline" @click="resetConfirmOpen = false">
            キャンセル
          </UButton>
          <UButton color="red" @click="handleReset">
            リセット
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
```

### 4.5 環境別設定カード

**ファイル**: `app/components/settings/EnvironmentSafetyCard.vue`

```vue
<script setup lang="ts">
import { useSafetyStore } from '~/stores/safety'
import type { Environment } from '~/types'
import type { EnvironmentSafetyConfig, ConfirmationThreshold } from '~/types/safety-settings'

const props = defineProps<{
  environment: Environment
  label: string
  description: string
  config: EnvironmentSafetyConfig
}>()

const safetyStore = useSafetyStore()

// ローカル状態（編集用）
const localConfig = reactive<EnvironmentSafetyConfig>({ ...props.config })

// propsの変更を反映
watch(
  () => props.config,
  (newConfig) => {
    Object.assign(localConfig, newConfig)
  },
  { deep: true }
)

// 設定変更時に保存
const saveConfig = async () => {
  await safetyStore.updateEnvironmentConfig(props.environment, { ...localConfig })
}

// 変更をデバウンスして保存
const debouncedSave = useDebounceFn(saveConfig, 500)

// 各フィールドの変更を監視
watch(localConfig, () => {
  debouncedSave()
}, { deep: true })

// 環境に応じた色
const environmentColor = computed(() => {
  const colors: Record<Environment, string> = {
    development: 'blue',
    test: 'green',
    staging: 'amber',
    production: 'red',
  }
  return colors[props.environment]
})

// 本番環境かどうか
const isProduction = computed(() => props.environment === 'production')

// 閾値オプション
const thresholdOptions = [
  { label: 'Warning以上', value: 'warning' as ConfirmationThreshold },
  { label: 'Dangerのみ', value: 'danger' as ConfirmationThreshold },
]

// カウントダウン秒数オプション
const countdownOptions = Array.from({ length: 11 }, (_, i) => ({
  label: i === 0 ? '無効' : `${i}秒`,
  value: i,
}))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UBadge :color="environmentColor" variant="soft">
          {{ label }}
        </UBadge>
        <span class="text-sm text-muted">{{ description }}</span>
      </div>
    </template>

    <div class="space-y-4">
      <!-- 本番環境の警告 -->
      <UAlert
        v-if="isProduction"
        color="amber"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
      >
        本番環境の安全設定を緩めると、誤操作による重大なデータ損失のリスクがあります
      </UAlert>

      <!-- 確認ダイアログ有効/無効 -->
      <UFormField label="確認ダイアログ">
        <div class="flex items-center gap-2">
          <USwitch v-model="localConfig.confirmationEnabled" />
          <span class="text-sm text-muted">
            {{ localConfig.confirmationEnabled ? '有効' : '無効' }}
          </span>
        </div>
      </UFormField>

      <!-- 確認ダイアログの表示レベル -->
      <UFormField
        label="確認ダイアログの表示レベル"
        hint="どの危険度レベルから確認ダイアログを表示するか"
      >
        <USelect
          v-model="localConfig.confirmationThreshold"
          :items="thresholdOptions"
          :disabled="!localConfig.confirmationEnabled"
        />
      </UFormField>

      <!-- カウントダウン秒数 -->
      <UFormField
        label="カウントダウン秒数"
        hint="Dangerレベルのクエリ実行時の待機時間"
      >
        <USelect
          v-model="localConfig.countdownSeconds"
          :items="countdownOptions"
          :disabled="!localConfig.confirmationEnabled"
        />
      </UFormField>

      <UDivider />

      <!-- DROP禁止 -->
      <UFormField label="DROPクエリを禁止">
        <div class="flex items-center gap-2">
          <USwitch v-model="localConfig.disableDrop" />
          <span class="text-sm text-muted">
            {{ localConfig.disableDrop ? 'DROP文の実行を禁止' : '許可' }}
          </span>
        </div>
      </UFormField>

      <!-- TRUNCATE禁止 -->
      <UFormField label="TRUNCATEクエリを禁止">
        <div class="flex items-center gap-2">
          <USwitch v-model="localConfig.disableTruncate" />
          <span class="text-sm text-muted">
            {{ localConfig.disableTruncate ? 'TRUNCATE文の実行を禁止' : '許可' }}
          </span>
        </div>
      </UFormField>
    </div>
  </UCard>
</template>
```

---

## 5. クエリ実行時の統合

### 5.1 DangerousQueryDialog.vue の変更

確認ダイアログにカウントダウン秒数を動的に渡す:

```vue
<script setup lang="ts">
// 追加のprops
const props = defineProps<{
  analysisResult: QueryAnalysisResult
  sql: string
  countdownSeconds: number  // 追加: 環境設定から渡される
}>()

// カウントダウンの初期値を動的に設定
const startCountdown = () => {
  if (props.analysisResult.riskLevel !== 'danger') return

  countdown.value = props.countdownSeconds  // 変更: 固定3秒 → props
  if (props.countdownSeconds === 0) {
    isCountingDown.value = false
    return
  }
  isCountingDown.value = true
  // ...
}
</script>
```

### 5.2 QueryBuilderToolbar.vue の変更

環境設定を参照して確認ダイアログを制御:

```vue
<script setup lang="ts">
import { useSafetyStore } from '~/stores/safety'
import { useWindowContext } from '~/composables/useWindowContext'

const safetyStore = useSafetyStore()
const { environment } = useWindowContext()  // 現在の接続環境

// 現在の環境の安全設定
const safetyConfig = computed(() => {
  return safetyStore.getConfigForEnvironment(environment.value || 'development')
})

// クエリ実行前のチェック
const handleExecuteClick = () => {
  const config = safetyConfig.value
  const analysis = analysisResult.value

  if (!analysis) {
    store.executeQuery()
    return
  }

  // DROP/TRUNCATE禁止チェック
  if (config.disableDrop && analysis.queryType === 'drop') {
    // エラー表示（実行しない）
    showBlockedError('DROP文は本環境では実行が禁止されています')
    return
  }
  if (config.disableTruncate && analysis.queryType === 'truncate') {
    showBlockedError('TRUNCATE文は本環境では実行が禁止されています')
    return
  }

  // 確認ダイアログが無効の場合は直接実行
  if (!config.confirmationEnabled) {
    store.executeQuery()
    return
  }

  // 危険度が閾値未満の場合は直接実行
  const shouldShowDialog = shouldShowConfirmationDialog(
    analysis.riskLevel,
    config.confirmationThreshold
  )
  if (!shouldShowDialog) {
    store.executeQuery()
    return
  }

  // 確認ダイアログを表示
  showConfirmDialog.value = true
}

// 閾値判定
const shouldShowConfirmationDialog = (
  riskLevel: RiskLevel,
  threshold: ConfirmationThreshold
): boolean => {
  if (riskLevel === 'safe') return false
  if (threshold === 'warning') return riskLevel === 'warning' || riskLevel === 'danger'
  if (threshold === 'danger') return riskLevel === 'danger'
  return false
}
</script>

<template>
  <DangerousQueryDialog
    v-if="analysisResult"
    v-model:open="showConfirmDialog"
    :analysis-result="analysisResult"
    :sql="generatedSql"
    :countdown-seconds="safetyConfig.countdownSeconds"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
</template>
```

---

## 6. テストコード設計

### 6.1 Rust側テスト

**ファイル**: `src-tauri/src/services/safety_config_test.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_default_settings() {
        let settings = SafetySettings::default();

        // 本番環境のデフォルト確認
        let prod = settings.environments.get("production").unwrap();
        assert!(prod.disable_drop);
        assert!(prod.disable_truncate);
        assert_eq!(prod.countdown_seconds, 5);

        // 開発環境のデフォルト確認
        let dev = settings.environments.get("development").unwrap();
        assert!(!dev.disable_drop);
        assert!(!dev.disable_truncate);
        assert_eq!(prod.countdown_seconds, 0);
    }

    #[test]
    fn test_save_and_load() {
        // 一時ディレクトリでテスト
        // ...
    }
}
```

### 6.2 フロントエンド側テスト

**ファイル**: `app/stores/__tests__/safety.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSafetyStore } from '../safety'
import { DEFAULT_SAFETY_SETTINGS } from '~/types/safety-settings'

vi.mock('~/api/safetyApi', () => ({
  safetyApi: {
    getSettings: vi.fn(),
    updateEnvironmentSafety: vi.fn(),
    resetSettings: vi.fn(),
  },
}))

describe('useSafetyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初期状態はデフォルト設定', () => {
    const store = useSafetyStore()
    expect(store.settings).toEqual(DEFAULT_SAFETY_SETTINGS)
  })

  it('環境別設定を取得できる', () => {
    const store = useSafetyStore()
    const prodConfig = store.getConfigForEnvironment('production')
    expect(prodConfig.disableDrop).toBe(true)
    expect(prodConfig.countdownSeconds).toBe(5)
  })
})
```

---

## 7. 変更点まとめ

### 7.1 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `app/types/safety-settings.ts` | 型定義 |
| `app/api/safetyApi.ts` | API呼び出し |
| `app/stores/safety.ts` | Piniaストア |
| `app/components/settings/SafetySettingsPanel.vue` | 設定パネル |
| `app/components/settings/EnvironmentSafetyCard.vue` | 環境別設定カード |
| `src-tauri/src/models/safety_settings.rs` | Rust型定義 |
| `src-tauri/src/services/safety_config.rs` | 設定ストレージ |
| `src-tauri/src/commands/safety.rs` | Tauriコマンド |

### 7.2 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/src/models/mod.rs` | safety_settingsモジュール追加 |
| `src-tauri/src/services/mod.rs` | safety_configモジュール追加 |
| `src-tauri/src/commands/mod.rs` | safetyコマンド追加 |
| `src-tauri/src/lib.rs` | コマンド登録追加 |
| `app/pages/settings.vue` | SafetySettingsPanel追加 |
| `app/components/query-builder/dialog/DangerousQueryDialog.vue` | countdownSeconds props追加 |
| `app/components/query-builder/QueryBuilderToolbar.vue` | 環境設定参照ロジック追加 |
