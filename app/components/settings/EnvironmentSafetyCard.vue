<script setup lang="ts">
import { useSafetyStore } from '@/stores/safety'
import type { Environment } from '@/types'
import type { EnvironmentSafetyConfig, ConfirmationThreshold } from '@/types/safety-settings'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  environment: Environment
  label: string
  description: string
  config: EnvironmentSafetyConfig
}>()

const safetyStore = useSafetyStore()
const { getEnvironmentColors } = useEnvironment()

// ローカル状態（編集用）
const localConfig = reactive<EnvironmentSafetyConfig>({ ...props.config })
const isModified = ref(false)

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
  if (!isModified.value) return
  await safetyStore.updateEnvironmentConfig(props.environment, { ...localConfig })
  isModified.value = false
}

// 変更をデバウンスして保存
const debouncedSave = useDebounceFn(saveConfig, 500)

// 各フィールドの変更を監視
watch(localConfig, () => {
    isModified.value = true
  debouncedSave()
}, { deep: true })

// 環境のテーマカラー
const themeColors = computed(() => getEnvironmentColors(props.environment))

// ヘッダーのスタイル
const headerStyle = computed(() => ({
  backgroundColor: themeColors.value.bg,
  borderColor: themeColors.value.border,
}))

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
      <div
        class="flex items-center gap-3 -m-4 p-4 rounded-t-lg border-b-2"
        :style="headerStyle"
      >
        <UIcon
          name="i-heroicons-shield-check"
          class="text-xl"
          :style="{ color: themeColors.primary }"
        />
        <div>
          <h4 class="font-semibold text-gray-900">{{ label }}</h4>
          <span class="text-sm text-gray-600">{{ description }}</span>
        </div>
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
          <span class="text-sm text-neutral-500">
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
          :options="thresholdOptions"
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
          :options="countdownOptions"
          :disabled="!localConfig.confirmationEnabled"
        />
      </UFormField>

      <hr class="my-4 border-gray-200 dark:border-gray-700" />

      <!-- DROP禁止 -->
      <UFormField label="DROPクエリを禁止">
        <div class="flex items-center gap-2">
          <USwitch v-model="localConfig.disableDrop" />
          <span class="text-sm text-neutral-500">
            {{ localConfig.disableDrop ? 'DROP文の実行を禁止' : '許可' }}
          </span>
        </div>
      </UFormField>

      <!-- TRUNCATE禁止 -->
      <UFormField label="TRUNCATEクエリを禁止">
        <div class="flex items-center gap-2">
          <USwitch v-model="localConfig.disableTruncate" />
          <span class="text-sm text-neutral-500">
            {{ localConfig.disableTruncate ? 'TRUNCATE文の実行を禁止' : '許可' }}
          </span>
        </div>
      </UFormField>
    </div>
  </UCard>
</template>
