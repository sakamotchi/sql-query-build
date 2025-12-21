<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          v-if="headerInfo.icon"
          :name="headerInfo.icon"
          class="w-4 h-4 text-primary-500"
        />
        <span class="text-sm font-medium" :class="headerInfo.color">
          {{ headerInfo.label }}
        </span>
      </div>
    </template>

    <div class="space-y-3">
      <!-- プロバイダー名とアイコン -->
      <div class="flex items-center gap-2">
        <UIcon :name="info.icon" class="w-5 h-5 text-gray-700 dark:text-gray-300" />
        <p class="font-semibold text-base">{{ info.name }}</p>
      </div>

      <!-- 説明 -->
      <p class="text-xs text-gray-600 dark:text-gray-400">
        {{ info.description }}
      </p>

      <!-- セキュリティレベル -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">セキュリティレベル:</span>
        <div class="flex gap-1">
          <div
            v-for="i in 3"
            :key="i"
            class="w-3 h-3 rounded-full transition-colors"
            :class="
              i <= info.securityLevel
                ? 'bg-primary-500'
                : 'bg-gray-200 dark:bg-gray-700'
            "
          />
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SecurityProvider } from '~/types'

interface Props {
  provider: SecurityProvider
  variant: 'current' | 'target'
}

const props = defineProps<Props>()

// プロバイダー情報の定義
const providerInfo = computed<Record<SecurityProvider, {
  name: string
  description: string
  securityLevel: number
  icon: string
}>>(() => ({
  simple: {
    name: 'Simple',
    description: '固定キーで暗号化。パスワード入力不要。',
    securityLevel: 1,
    icon: 'i-heroicons-key'
  },
  'master-password': {
    name: 'マスターパスワード',
    description: 'ユーザー設定のパスワードで暗号化。起動時に入力が必要。',
    securityLevel: 2,
    icon: 'i-heroicons-lock-closed'
  },
  keychain: {
    name: 'OSキーチェーン',
    description: 'OSのセキュアストレージを使用。OS認証が必要な場合あり。',
    securityLevel: 3,
    icon: 'i-heroicons-shield-check'
  }
}))

// 現在のプロバイダー情報
const info = computed(() => providerInfo.value[props.provider])

// ヘッダー情報
const headerInfo = computed(() => {
  if (props.variant === 'current') {
    return {
      label: '現在',
      icon: null,
      color: 'text-gray-500'
    }
  }
  return {
    label: '新規',
    icon: 'i-heroicons-arrow-right',
    color: 'text-primary-600'
  }
})
</script>
