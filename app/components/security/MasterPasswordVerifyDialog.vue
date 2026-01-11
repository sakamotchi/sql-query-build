<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'

const props = defineProps<{
  maxRetries?: number
}>()

const isOpen = defineModel<boolean>('open')

const securityStore = useSecurityStore()
const { loading } = storeToRefs(securityStore)

const password = ref('')
const showPassword = ref(false)
const errorMessage = ref<string | null>(null)
const retryCount = ref(0)
const showForgotPasswordHelp = ref(false)

const maxRetries = computed(() => props.maxRetries ?? 3)
const remainingAttempts = computed(() => maxRetries.value - retryCount.value)
const canRetry = computed(() => retryCount.value < maxRetries.value)

const resetState = () => {
  password.value = ''
  showPassword.value = false
  errorMessage.value = null
  retryCount.value = 0
  showForgotPasswordHelp.value = false
}

const verify = async () => {
  errorMessage.value = null

  if (retryCount.value > 0) {
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  try {
    const success = await securityStore.verifyMasterPassword(password.value)

    if (success) {
      isOpen.value = false
      resetState()
      return
    }

    retryCount.value++
    password.value = ''

    if (canRetry.value) {
      errorMessage.value = `パスワードが正しくありません。残り ${remainingAttempts.value} 回試行できます。`
    } else {
      errorMessage.value = '試行回数の上限に達しました。アプリを終了します。'
      setTimeout(() => {
        window.close()
      }, 3000)
    }
  } catch (error) {
    errorMessage.value = 'パスワードの検証に失敗しました。再度お試しください。'
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && password.value && canRetry.value && !loading.value) {
    verify()
  }
}

watch(isOpen, (open) => {
  if (!open) {
    resetState()
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="マスターパスワード入力"
    description="接続情報にアクセスするため、マスターパスワードを入力してください。"
    :prevent-close="true"
  >
    <template #body>
      <div class="space-y-5">
        <UFormField
          label="マスターパスワード"
          :hint="canRetry ? `残り ${remainingAttempts} 回試行できます` : ''"
          required
        >
          <UInput
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="パスワードを入力"
            autocomplete="current-password"
            :disabled="!canRetry || loading"
            @keydown="handleKeydown"
          />
        </UFormField>

        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-700 dark:text-gray-200">パスワードを表示</span>
          <USwitch v-model="showPassword" :disabled="!canRetry" />
        </div>

        <UAlert
          v-if="errorMessage"
          :color="canRetry ? 'error' : 'warning'"
          variant="soft"
          :icon="canRetry ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-x-circle'"
        >
          {{ errorMessage }}
        </UAlert>

        <div v-if="canRetry" class="border-t pt-4">
          <button
            type="button"
            class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            @click="showForgotPasswordHelp = !showForgotPasswordHelp"
          >
            パスワードを忘れた場合
          </button>

          <UAlert
            v-if="showForgotPasswordHelp"
            color="warning"
            variant="soft"
            icon="i-heroicons-information-circle"
            class="mt-3"
          >
            <template #title>パスワードを忘れた場合</template>
            <div class="text-sm space-y-2 mt-2">
              <p>マスターパスワードは復元できません。以下の方法で対処してください:</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li>設定ファイルを削除して初期化（接続情報は失われます）</li>
                <li>バックアップから復元</li>
                <li>サポートに問い合わせ</li>
              </ul>
            </div>
          </UAlert>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton
          color="primary"
          :loading="loading"
          :disabled="!password || !canRetry || loading"
          @click="verify"
        >
          ロック解除
        </UButton>
      </div>
    </template>
  </UModal>
</template>
