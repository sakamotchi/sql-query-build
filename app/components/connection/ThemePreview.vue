<script setup lang="ts">
import type { Environment } from '~/types'

const props = defineProps<{
  environment: Environment
  customColor?: {
    primary: string
    background: string
  }
}>()

const { getEnvironmentColors, adjustColorBrightness } = useEnvironment()
const { isDark } = useTheme()

const previewColors = computed(() => {
  if (props.customColor) {
    if (isDark.value) {
      // ダークモード時はカスタムカラーのプライマリをベースに暗い背景を生成
      return {
        primary: props.customColor.primary,
        bg: adjustColorBrightness(props.customColor.primary, -0.6),
        border: props.customColor.primary
      }
    }
    return {
      primary: props.customColor.primary,
      bg: props.customColor.background,
      border: props.customColor.primary
    }
  }
  return getEnvironmentColors(props.environment)
})
</script>

<template>
  <div class="space-y-4">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-300 block">
      テーマプレビュー
    </label>

    <div
      class="border-b-4 rounded-t-lg shadow-md overflow-hidden"
      :style="{
        borderColor: previewColors.primary,
        backgroundColor: previewColors.bg
      }"
    >
      <div class="px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold text-gray-900 dark:text-white">
              SQL Query Build
            </span>
            <UBadge
              :style="{
                backgroundColor: previewColors.primary,
                color: 'white'
              }"
              size="sm"
            >
              {{ environment }} 環境
            </UBadge>
          </div>
          <UIcon name="i-heroicons-sun" class="text-gray-600" />
        </div>
      </div>
    </div>

    <UCard class="relative">
      <div
        class="absolute top-0 left-0 right-0 h-1"
        :style="{ backgroundColor: previewColors.primary }"
      />

      <div class="pt-2 space-y-3">
        <div class="flex items-center gap-2">
          <UBadge
            :style="{
              backgroundColor: previewColors.primary,
              color: 'white'
            }"
            size="xs"
          >
            {{ environment }}
          </UBadge>
          <span class="text-sm font-semibold">接続名サンプル</span>
        </div>

        <div class="text-sm text-gray-600 dark:text-gray-400">
          <div>ホスト: localhost:3306</div>
          <div>データベース: sample_db</div>
        </div>

        <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <UButton
            :style="{
              backgroundColor: previewColors.primary,
              borderColor: previewColors.primary
            }"
            size="sm"
            block
          >
            接続
          </UButton>
        </div>
      </div>
    </UCard>

    <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
      <div class="flex items-center gap-2">
        <div
          class="w-4 h-4 rounded border border-gray-300"
          :style="{ backgroundColor: previewColors.primary }"
        />
        <span>プライマリ: {{ previewColors.primary }}</span>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="w-4 h-4 rounded border border-gray-300"
          :style="{ backgroundColor: previewColors.bg }"
        />
        <span>背景: {{ previewColors.bg }}</span>
      </div>
    </div>
  </div>
</template>
