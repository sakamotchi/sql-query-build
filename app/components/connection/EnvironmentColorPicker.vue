<script setup lang="ts">
const primaryColor = defineModel<string>('primaryColor', { default: '#4CAF50' })
const backgroundColor = defineModel<string>('backgroundColor', { default: '#F1F8E9' })

const { t } = useI18n()

const presetColors = computed(() => [
  { primary: '#4CAF50', bg: '#F1F8E9', name: t('common.colors.green') },
  { primary: '#2196F3', bg: '#E3F2FD', name: t('common.colors.blue') },
  { primary: '#FF9800', bg: '#FFF3E0', name: t('common.colors.orange') },
  { primary: '#F44336', bg: '#FFEBEE', name: t('common.colors.red') },
  { primary: '#9C27B0', bg: '#F3E5F5', name: t('common.colors.purple') },
  { primary: '#795548', bg: '#EFEBE9', name: t('common.colors.brown') }
])

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
        {{ t('connection.colorPicker.presetLabel') }}
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
      <UFormField :label="t('connection.colorPicker.primary')">
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
      </UFormField>

      <UFormField :label="t('connection.colorPicker.background')">
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
      </UFormField>
    </div>

    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
        {{ t('common.preview') }}
      </label>
      <div
        class="p-4 rounded-lg border-4 transition-all"
        :style="{
          backgroundColor: backgroundColor,
          borderColor: primaryColor
        }"
      >
        <p class="font-semibold" :style="{ color: primaryColor }">
          {{ t('common.sampleText') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ t('connection.colorPicker.previewHint') }}
        </p>
      </div>
    </div>

    <div class="flex justify-end">
      <UButton variant="outline" color="neutral" @click="resetToDefault">
        {{ t('common.resetDefault') }}
      </UButton>
    </div>
  </div>
</template>
