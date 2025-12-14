<script setup lang="ts">
type PasswordValidation = {
  minLength: boolean
  hasLowercase: boolean
  hasUppercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
  passwordsMatch: boolean
}

const props = defineProps<{
  validation: PasswordValidation
}>()

const requirements = computed(() => [
  { key: 'minLength', label: '8文字以上', valid: props.validation.minLength },
  { key: 'hasLowercase', label: '小文字を含む', valid: props.validation.hasLowercase },
  { key: 'hasUppercase', label: '大文字を含む', valid: props.validation.hasUppercase },
  { key: 'hasNumber', label: '数字を含む', valid: props.validation.hasNumber },
  { key: 'hasSpecial', label: '記号を含む', valid: props.validation.hasSpecial },
  { key: 'passwordsMatch', label: '確認用と一致', valid: props.validation.passwordsMatch }
])
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">パスワード要件</p>
    <ul class="space-y-2">
      <li
        v-for="item in requirements"
        :key="item.key"
        class="flex items-center gap-2 text-sm"
        :class="[
          item.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400',
          !item.valid && item.key === 'passwordsMatch' ? 'text-rose-600 dark:text-rose-400' : ''
        ]"
      >
        <UIcon
          :name="item.valid ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
          class="w-4 h-4"
          :class="item.valid ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'"
        />
        <span>{{ item.label }}</span>
      </li>
    </ul>
  </div>
</template>
