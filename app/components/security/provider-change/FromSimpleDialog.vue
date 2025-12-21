<template>
  <UModal
    v-model:open="isOpen"
    title="セキュリティプロバイダーの変更"
    description="プロバイダーを変更します。既存の接続情報は新しいプロバイダーで再暗号化されます。"
    :prevent-close="currentPhase === 'switching'"
  >
    <template #body>
      <div class="space-y-5">
        <!-- 確認フェーズ -->
        <div v-if="currentPhase === 'confirm'" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <ProviderCard provider="simple" variant="current" />
            <ProviderCard :provider="targetProvider" variant="target" />
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

        <!-- 初期化フェーズ (新しいマスターパスワード設定) -->
        <div v-if="currentPhase === 'initialize'" class="space-y-4">
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
              v-if="!passwordsMatch"
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

        <!-- 切り替え中フェーズ -->
        <div v-if="currentPhase === 'switching'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin" />
            <p class="text-lg font-medium mt-4">プロバイダーを切り替え中...</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              接続情報を再暗号化しています。しばらくお待ちください。
            </p>
          </div>
        </div>

        <!-- 完了フェーズ -->
        <div v-if="currentPhase === 'complete'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-emerald-500" />
            <p class="text-lg font-medium mt-4">切り替え完了</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              プロバイダーが正常に変更されました。
            </p>
          </div>
        </div>

        <!-- エラーフェーズ -->
        <div v-if="currentPhase === 'error'" class="space-y-4">
          <UAlert color="red" variant="soft" icon="i-heroicons-x-circle">
            <template #title>エラーが発生しました</template>
            <p class="text-sm mt-2">{{ errorMessage }}</p>
          </UAlert>
        </div>

        <!-- インラインエラー表示 -->
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
          v-if="['confirm', 'initialize'].includes(currentPhase)"
          color="primary"
          :loading="loading"
          :disabled="!canProceed || loading"
          @click="nextPhase"
        >
          {{ actionButtonLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import ProviderCard from './ProviderCard.vue'
import { useProviderSwitch } from '~/composables/useProviderSwitch'

interface Props {
  // 初期実装では 'master-password' のみサポート
  targetProvider: 'master-password'
}

const props = defineProps<Props>()

// ダイアログの開閉状態
const isOpen = defineModel<boolean>('open')

// フェーズ管理
type Phase = 'confirm' | 'initialize' | 'switching' | 'complete' | 'error'
const currentPhase = ref<Phase>('confirm')

// パスワード入力 (Master Passwordへの移行時のみ使用)
const newPassword = ref('')
const newPasswordConfirm = ref('')
const showPassword = ref(false)

// エラー管理
const errorMessage = ref<string | null>(null)

// ローディング状態
const loading = ref(false)

// 次へ進めるかどうかの判定
const canProceed = computed(() => {
  if (currentPhase.value === 'confirm') return true

  if (currentPhase.value === 'initialize') {
    // 新しいマスターパスワードのバリデーション
    return (
      newPassword.value.length >= 8 &&
      newPassword.value === newPasswordConfirm.value
    )
  }

  return false
})

// パスワードが一致しているか
const passwordsMatch = computed(() => {
  if (!newPassword.value || !newPasswordConfirm.value) return true
  return newPassword.value === newPasswordConfirm.value
})

// ボタンラベル
const actionButtonLabel = computed(() => {
  switch (currentPhase.value) {
    case 'confirm': return '続行'
    case 'initialize': return '変更'
    default: return '次へ'
  }
})

/**
 * 次のフェーズへ進む
 * フローはシンプルで線形:
 * confirm → initialize → switching → complete
 */
async function nextPhase() {
  errorMessage.value = null

  try {
    switch (currentPhase.value) {
      case 'confirm':
        // 初期実装: Master Passwordへの移行のみなので、常にinitializeへ
        currentPhase.value = 'initialize'
        break

      case 'initialize':
        // パスワード設定後、切り替え処理へ
        currentPhase.value = 'switching'
        await nextTick()
        await switchProvider()
        break
    }
  } catch (error) {
    console.error('[FromSimpleDialog] Error in nextPhase:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '不明なエラーが発生しました'
  }
}

/**
 * プロバイダー切り替えを実行
 */
async function switchProvider() {
  loading.value = true

  try {
    const { switchFromSimple } = useProviderSwitch()

    // 初期実装: Master Passwordへの切り替えのみ
    await switchFromSimple({
      targetProvider: 'master-password',
      newPassword: newPassword.value,
      newPasswordConfirm: newPasswordConfirm.value
    })

    currentPhase.value = 'complete'

    // 2秒後にダイアログを閉じる
    setTimeout(() => {
      isOpen.value = false
      reset()
    }, 2000)
  } catch (error) {
    console.error('[FromSimpleDialog] Error switching provider:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'プロバイダーの切り替えに失敗しました'
  } finally {
    loading.value = false
  }
}

/**
 * 状態をリセット
 */
function reset() {
  currentPhase.value = 'confirm'
  newPassword.value = ''
  newPasswordConfirm.value = ''
  showPassword.value = false
  errorMessage.value = null
  loading.value = false
}

/**
 * キャンセル
 */
function cancel() {
  isOpen.value = false
  reset()
}
</script>
