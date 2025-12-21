<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'

const props = defineProps<{
  mode?: 'setup' | 'change'
}>()

const isOpen = defineModel<boolean>('open')

const securityStore = useSecurityStore()
const { loading } = storeToRefs(securityStore)

const mode = computed(() => props.mode ?? 'setup')

const currentPassword = ref('')
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

  if (mode.value === 'change') {
    return meetsRequirements && strength.value >= 3 && !loading.value && !!currentPassword.value
  }

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
  currentPassword.value = ''
  password.value = ''
  confirmPassword.value = ''
  strength.value = 0
  showPassword.value = false
  message.value = null
}

const setupPassword = async () => {
  message.value = null
  try {
    if (mode.value === 'change') {
      await securityStore.changeMasterPassword(currentPassword.value, password.value)
    } else {
      await securityStore.setMasterPassword(password.value)
    }
    isOpen.value = false
    reset()
  } catch (error) {
    if (mode.value === 'change') {
      message.value = '現在のパスワードが正しくないか、変更に失敗しました。'
    } else {
      message.value = '設定に失敗しました。時間をおいて再度お試しください。'
    }
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
    :title="mode === 'change' ? 'マスターパスワード変更' : 'マスターパスワード設定'"
    :description="mode === 'change'
      ? 'マスターパスワードを変更します。接続情報は自動的に再暗号化されます。'
      : '接続情報を保護するパスワードを設定します。忘れると復元できません。'"
    :prevent-close="true"
  >
    <template #body>
      <div class="space-y-5">
        <UFormField
          v-if="mode === 'change'"
          label="現在のパスワード"
          hint="現在設定されているマスターパスワード"
          required
        >
          <UInput
            v-model="currentPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="現在のパスワード"
            autocomplete="current-password"
          />
        </UFormField>

        <UFormField
          :label="mode === 'change' ? '新しいパスワード' : 'パスワード'"
          hint="8文字以上で入力してください"
          required
        >
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
          {{ mode === 'change' ? '変更' : '設定' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
