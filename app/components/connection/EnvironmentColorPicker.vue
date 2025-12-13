<script setup lang="ts">
const primaryColor = defineModel<string>('primaryColor', { default: '#4CAF50' })
const backgroundColor = defineModel<string>('backgroundColor', { default: '#F1F8E9' })

const presetColors = [
  { primary: '#4CAF50', bg: '#F1F8E9', name: '緑' },
  { primary: '#2196F3', bg: '#E3F2FD', name: '青' },
  { primary: '#FF9800', bg: '#FFF3E0', name: 'オレンジ' },
  { primary: '#F44336', bg: '#FFEBEE', name: '赤' },
  { primary: '#9C27B0', bg: '#F3E5F5', name: '紫' },
  { primary: '#795548', bg: '#EFEBE9', name: '茶色' }
]

const applyPreset = (preset: { primary: string; bg: string }) => {
  primaryColor.value = preset.primary
  backgroundColor.value = preset.bg
}

const resetToDefault = () => {
  primaryColor.value = '#4CAF50'
  backgroundColor.value = '#F1F8E9'
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
        プリセットカラー
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presetColors"
          :key="preset.name"
          type="button"
          class="group relative w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all overflow-hidden"
          :title="preset.name"
          @click="applyPreset(preset)"
        >
          <div class="absolute inset-0 flex">
            <div class="w-1/2" :style="{ backgroundColor: preset.primary }" />
            <div class="w-1/2" :style="{ backgroundColor: preset.bg }" />
          </div>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormGroup label="プライマリカラー">
        <div class="flex gap-2">
          <input
            v-model="primaryColor"
            type="color"
            class="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          >
          <UInput
            v-model="primaryColor"
            placeholder="#4CAF50"
            class="flex-1"
          />
        </div>
      </UFormGroup>

      <UFormGroup label="背景カラー">
        <div class="flex gap-2">
          <input
            v-model="backgroundColor"
            type="color"
            class="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          >
          <UInput
            v-model="backgroundColor"
            placeholder="#F1F8E9"
            class="flex-1"
          />
        </div>
      </UFormGroup>
    </div>

    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
        プレビュー
      </label>
      <div
        class="p-4 rounded-lg border-4 transition-all"
        :style="{
          backgroundColor: backgroundColor,
          borderColor: primaryColor
        }"
      >
        <p class="font-semibold" :style="{ color: primaryColor }">
          サンプルテキスト
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          この色が環境ヘッダーに適用されます
        </p>
      </div>
    </div>

    <div class="flex justify-end">
      <UButton variant="outline" color="gray" @click="resetToDefault">
        デフォルトに戻す
      </UButton>
    </div>
  </div>
</template>
