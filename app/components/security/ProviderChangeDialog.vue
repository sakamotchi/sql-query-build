<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import { useTauri } from '~/composables/useTauri'
import type { SecurityProvider } from '~/types'

interface ProviderChangeParams {
  from: SecurityProvider
  to: SecurityProvider
}

const props = defineProps<{
  params: ProviderChangeParams
}>()

const isOpen = defineModel<boolean>('open')

const securityStore = useSecurityStore()
const { loading } = storeToRefs(securityStore)

type Phase = 'confirm' | 'authenticate' | 'initialize' | 'switching' | 'complete' | 'error'
const currentPhase = ref<Phase>('confirm')

const currentPassword = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const showPassword = ref(false)

const errorMessage = ref<string | null>(null)

const providerInfo = computed<
  Record<SecurityProvider, { name: string; description: string; securityLevel: number }>
>(() => ({
  simple: {
    name: 'Simple',
    description: '固定キーで暗号化。パスワード入力不要。',
    securityLevel: 1
  },
  'master-password': {
    name: 'マスターパスワード',
    description: 'ユーザー設定のパスワードで暗号化。起動時に入力が必要。',
    securityLevel: 2
  },
  keychain: {
    name: 'OSキーチェーン',
    description: 'OSのセキュアストレージを使用。OS認証が必要な場合あり。',
    securityLevel: 3
  }
}))

const fromInfo = computed(() => providerInfo.value[props.params.from])
const toInfo = computed(() => providerInfo.value[props.params.to])

const canProceed = computed(() => {
  if (currentPhase.value === 'confirm') return true

  if (currentPhase.value === 'authenticate') {
    return props.params.from === 'master-password' ? !!currentPassword.value : true
  }

  if (currentPhase.value === 'initialize') {
    return props.params.to === 'master-password'
      ? newPassword.value.length >= 8 && newPassword.value === newPasswordConfirm.value
      : true
  }

  return false
})

const toBackendProvider = (provider: SecurityProvider) =>
  provider === 'master-password' ? 'master_password' : provider

const nextPhase = async () => {
  errorMessage.value = null

  try {
    console.log('[ProviderChangeDialog] nextPhase called, current phase:', currentPhase.value)
    console.log('[ProviderChangeDialog] Current params:', props.params)

    if (currentPhase.value === 'confirm') {
      const nextPhase = props.params.from === 'master-password' ? 'authenticate' : 'initialize'
      console.log('[ProviderChangeDialog] Determining next phase:', {
        from: props.params.from,
        isMasterPassword: props.params.from === 'master-password',
        nextPhase
      })
      currentPhase.value = nextPhase
      return
    }

    if (currentPhase.value === 'authenticate') {
      console.log('[ProviderChangeDialog] Verifying master password')
      const success = await securityStore.verifyMasterPassword(currentPassword.value)
      if (!success) {
        errorMessage.value = 'パスワードが正しくありません'
        return
      }
      console.log('[ProviderChangeDialog] Password verified, moving to initialize')
      currentPhase.value = 'initialize'

      // 新しいプロバイダーがマスターパスワード以外の場合は、自動的に切り替えを開始
      if (props.params.to !== 'master-password') {
        console.log('[ProviderChangeDialog] Target is not master-password, auto-switching')
        currentPhase.value = 'switching'
        await switchProvider()
      }
      return
    }

    if (currentPhase.value === 'initialize') {
      console.log('[ProviderChangeDialog] Moving to switching phase')
      currentPhase.value = 'switching'
      await switchProvider()
    }
  } catch (error) {
    console.error('[ProviderChangeDialog] Error in nextPhase:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '不明なエラーが発生しました'
  }
}

const switchProvider = async () => {
  try {
    const { invokeCommand, isAvailable } = useTauri()

    if (!isAvailable.value) {
      throw new Error('Tauri環境が利用できません')
    }

    const params = {
      targetProvider: toBackendProvider(props.params.to),
      currentPassword: props.params.from === 'master-password' ? currentPassword.value : null,
      newPassword: props.params.to === 'master-password' ? newPassword.value : null,
      newPasswordConfirm:
        props.params.to === 'master-password' ? newPasswordConfirm.value : null
    }

    console.log('[ProviderChangeDialog] Calling switch_security_provider with params:', params)

    await invokeCommand('switch_security_provider', params)

    currentPhase.value = 'complete'

    await securityStore.loadSettings()

    setTimeout(() => {
      isOpen.value = false
      reset()
    }, 2000)
  } catch (error) {
    console.error('[ProviderChangeDialog] Error switching provider:', error)
    currentPhase.value = 'error'
    errorMessage.value =
      error instanceof Error ? error.message : 'プロバイダーの切り替えに失敗しました'
  }
}

const reset = () => {
  currentPhase.value = 'confirm'
  currentPassword.value = ''
  newPassword.value = ''
  newPasswordConfirm.value = ''
  showPassword.value = false
  errorMessage.value = null
}

const cancel = () => {
  isOpen.value = false
  reset()
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
    title="セキュリティプロバイダーの変更"
    description="プロバイダーを変更します。既存の接続情報は新しいプロバイダーで再暗号化されます。"
    :prevent-close="currentPhase === 'switching'"
  >
    <template #body>
      <div class="space-y-5">
        <div v-if="currentPhase === 'confirm'" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-500">現在</span>
                </div>
              </template>
              <div class="space-y-2">
                <p class="font-semibold">{{ fromInfo.name }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">{{ fromInfo.description }}</p>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-500">セキュリティレベル:</span>
                  <div class="flex gap-1">
                    <div
                      v-for="i in 3"
                      :key="i"
                      class="w-3 h-3 rounded-full"
                      :class="i <= fromInfo.securityLevel ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'"
                    />
                  </div>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-primary-500" />
                  <span class="text-sm font-medium text-primary-600">新規</span>
                </div>
              </template>
              <div class="space-y-2">
                <p class="font-semibold">{{ toInfo.name }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">{{ toInfo.description }}</p>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-500">セキュリティレベル:</span>
                  <div class="flex gap-1">
                    <div
                      v-for="i in 3"
                      :key="i"
                      class="w-3 h-3 rounded-full"
                      :class="i <= toInfo.securityLevel ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'"
                    />
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <UAlert color="amber" variant="soft" icon="i-heroicons-exclamation-triangle">
            <template #title>重要な注意事項</template>
            <ul class="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>変更中は接続情報にアクセスできません</li>
              <li>処理中にアプリを終了しないでください</li>
              <li>失敗時は元のプロバイダーに自動的に戻ります</li>
            </ul>
          </UAlert>
        </div>

        <div v-if="currentPhase === 'authenticate'" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            現在のプロバイダーで認証してください。
          </p>

          <UFormField label="現在のマスターパスワード" required>
            <UInput
              v-model="currentPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="パスワードを入力"
              autocomplete="current-password"
            />
          </UFormField>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700 dark:text-gray-200">パスワードを表示</span>
            <USwitch v-model="showPassword" />
          </div>
        </div>

        <div v-if="currentPhase === 'initialize' && params.to === 'master-password'" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            新しいマスターパスワードを設定してください。
          </p>

          <UFormField label="新しいマスターパスワード" hint="8文字以上" required>
            <UInput
              v-model="newPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="8文字以上"
              autocomplete="new-password"
            />
          </UFormField>

          <UFormField label="パスワード確認" required>
            <UInput
              v-model="newPasswordConfirm"
              :type="showPassword ? 'text' : 'password'"
              placeholder="もう一度入力"
              autocomplete="new-password"
            />
            <p
              v-if="newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm"
              class="text-sm text-rose-600 mt-1"
            >
              パスワードが一致しません
            </p>
          </UFormField>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700 dark:text-gray-200">パスワードを表示</span>
            <USwitch v-model="showPassword" />
          </div>
        </div>

        <div v-if="currentPhase === 'switching'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin" />
            <p class="text-lg font-medium mt-4">プロバイダーを切り替え中...</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              接続情報を再暗号化しています。しばらくお待ちください。
            </p>
          </div>
        </div>

        <div v-if="currentPhase === 'complete'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-emerald-500" />
            <p class="text-lg font-medium mt-4">切り替え完了</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              プロバイダーが正常に変更されました。
            </p>
          </div>
        </div>

        <div v-if="currentPhase === 'error'" class="space-y-4">
          <UAlert color="red" variant="soft" icon="i-heroicons-x-circle">
            <template #title>エラーが発生しました</template>
            <p class="text-sm mt-2">{{ errorMessage }}</p>
          </UAlert>
        </div>

        <UAlert
          v-if="errorMessage && currentPhase !== 'error'"
          color="red"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
        >
          {{ errorMessage }}
        </UAlert>
      </div>
    </template>

    <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton
            v-if="currentPhase !== 'switching' && currentPhase !== 'complete'"
            variant="outline"
            color="gray"
            :disabled="currentPhase === 'switching'"
            @click="cancel"
          >
            キャンセル
          </UButton>
          <UButton
            v-if="currentPhase === 'error'"
            color="primary"
            @click="reset"
          >
            やり直す
          </UButton>
          <UButton
            v-if="['confirm', 'authenticate', 'initialize'].includes(currentPhase)"
            color="primary"
            :loading="loading"
            :disabled="!canProceed || loading"
            @click="nextPhase"
          >
            {{ currentPhase === 'confirm' ? '続行' : currentPhase === 'authenticate' ? '認証' : '変更' }}
          </UButton>
        </div>
    </template>
  </UModal>
</template>
