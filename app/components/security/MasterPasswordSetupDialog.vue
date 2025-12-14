<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'

const isOpen = defineModel<boolean>('open')

const securityStore = useSecurityStore()
const { loading } = storeToRefs(securityStore)

const password = ref('')
const confirmPassword = ref('')
const strength = ref(0)
const showPassword = ref(false)
const message = ref<string | null>(null)

const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true
  return password.value === confirmPassword.value
})

const validation = computed(() => ({
  minLength: password.value.length >= 8,
  hasLowercase: /[a-z]/.test(password.value),
  hasUppercase: /[A-Z]/.test(password.value),
  hasNumber: /[0-9]/.test(password.value),
  hasSpecial: /[^a-zA-Z0-9]/.test(password.value),
  passwordsMatch: passwordsMatch.value
}))

const canSubmit = computed(() => {
  const v = validation.value
  const meetsRequirements =
    v.minLength && v.hasLowercase && v.hasUppercase && v.hasNumber && v.passwordsMatch
  return meetsRequirements && strength.value >= 3 && !loading.value
})

watch(password, (newPassword) => {
  let strengthValue = 0
  if (newPassword.length >= 8) strengthValue++
  if (/[a-z]/.test(newPassword)) strengthValue++
  if (/[A-Z]/.test(newPassword)) strengthValue++
  if (/[0-9]/.test(newPassword)) strengthValue++
  if (/[^a-zA-Z0-9]/.test(newPassword)) strengthValue++
  strength.value = strengthValue

  if (message.value) {
    message.value = null
  }
})

const reset = () => {
  password.value = ''
  confirmPassword.value = ''
  strength.value = 0
  showPassword.value = false
  message.value = null
}

const setupPassword = async () => {
  message.value = null
  try {
    await securityStore.setMasterPassword(password.value)
    isOpen.value = false
    reset()
  } catch (error) {
    message.value = '設定に失敗しました。時間をおいて再度お試しください。'
  }
}

watch(isOpen, (open) => {
  if (!open) {
    reset()
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="マスターパスワード設定"
    description="接続情報を保護するパスワードを設定します。忘れると復元できません。"
    :prevent-close="true"
  >
    <template #body>
      <div class="space-y-5">
        <UFormField label="パスワード" hint="8文字以上で入力してください" required>
          <UInput
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="8文字以上"
            autocomplete="new-password"
          />
        </UFormField>

        <PasswordStrengthMeter :password="password" :strength="strength" />

        <UFormField label="パスワード確認" hint="同じパスワードを再入力してください" required>
          <UInput
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="もう一度入力"
            autocomplete="new-password"
          />
          <p v-if="!passwordsMatch" class="text-sm text-rose-600 mt-1">
            パスワードが一致しません
          </p>
        </UFormField>

        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-700 dark:text-gray-200">パスワードを表示</span>
          <USwitch v-model="showPassword" />
        </div>

        <PasswordRequirements :validation="validation" />

        <UAlert
          v-if="message"
          color="red"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
        >
          {{ message }}
        </UAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="outline" color="gray" @click="isOpen = false">
          キャンセル
        </UButton>
        <UButton color="primary" :loading="loading" :disabled="!canSubmit" @click="setupPassword">
          設定
        </UButton>
      </div>
    </template>
  </UModal>
</template>
