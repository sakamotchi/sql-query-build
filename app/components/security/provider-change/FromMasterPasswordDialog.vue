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
            <ProviderCard provider="master-password" variant="current" />
            <ProviderCard :provider="targetProvider" variant="target" />
          </div>

          <UAlert color="warning" variant="soft" icon="i-heroicons-exclamation-triangle">
            <template #title>重要な注意事項</template>
            <ul class="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>変更中は接続情報にアクセスできません</li>
              <li>処理中にアプリを終了しないでください</li>
              <li>失敗時は元のプロバイダーに自動的に戻ります</li>
            </ul>
          </UAlert>
        </div>

        <!-- 認証フェーズ -->
        <div v-if="currentPhase === 'authenticate'" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            現在のマスターパスワードで認証してください。
          </p>

          <UFormField label="マスターパスワード" required>
            <UInput
              v-model="currentPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="パスワードを入力"
              autocomplete="current-password"
              @keyup.enter.stop.prevent="canProceed && nextPhase()"
            />
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
          <UAlert color="error" variant="soft" icon="i-heroicons-x-circle">
            <template #title>エラーが発生しました</template>
            <p class="text-sm mt-2">{{ errorMessage }}</p>
          </UAlert>
        </div>

        <!-- インラインエラー表示 -->
        <UAlert
          v-if="errorMessage && currentPhase !== 'error'"
          color="error"
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
          color="neutral"
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
          v-if="['confirm', 'authenticate'].includes(currentPhase)"
          color="primary"
          :loading="loading"
          :disabled="!canProceed || loading"
          @click.stop.prevent="nextPhase"
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
import { useSecurityStore } from '~/stores/security'
import { useTauri } from '~/composables/useTauri'

interface Props {
  // 初期実装では 'simple' のみサポート
  targetProvider: 'simple'
}

defineProps<Props>()

// ダイアログの開閉状態
const isOpen = defineModel<boolean>('open')

// フェーズ管理
type Phase = 'confirm' | 'authenticate' | 'switching' | 'complete' | 'error'
const currentPhase = ref<Phase>('confirm')

// パスワード入力 (認証用)
const currentPassword = ref('')
const showPassword = ref(false)

// エラー管理
const errorMessage = ref<string | null>(null)

// ローディング状態
const loading = ref(false)

// 次へ進めるかどうかの判定
const canProceed = computed(() => {
  if (currentPhase.value === 'confirm') return true

  if (currentPhase.value === 'authenticate') {
    return !!currentPassword.value
  }

  return false
})

// ボタンラベル
const actionButtonLabel = computed(() => {
  switch (currentPhase.value) {
    case 'confirm': return '続行'
    case 'authenticate': return '認証'
    default: return '次へ'
  }
})

/**
 * 次のフェーズへ進む
 * フローはシンプルで線形:
 * confirm → authenticate → switching → complete
 */
async function nextPhase() {
  errorMessage.value = null

  try {
    switch (currentPhase.value) {
      case 'confirm':
        currentPhase.value = 'authenticate'
        break

      case 'authenticate':
        // パスワード検証
        await verifyAndSwitch()
        break
    }
  } catch (error) {
    console.error('[FromMasterPasswordDialog] Error in nextPhase:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '不明なエラーが発生しました'
  }
}

/**
 * パスワード検証と切り替えを実行
 */
async function verifyAndSwitch() {
  loading.value = true

  try {
    // パスワード検証
    // ストアのアクションを使うとグローバルなloading状態が変わって親画面に影響するため、
    // 直接コマンドを呼び出して検証する
    const { invokeCommand } = useTauri()
    const success = await invokeCommand<boolean>('verify_master_password', {
      password: currentPassword.value
    })

    if (!success) {
      errorMessage.value = 'パスワードが正しくありません'
      loading.value = false
      return
    }

    // 検証成功 → 切り替え開始
    currentPhase.value = 'switching'
    await nextTick()
    await switchProvider()
  } catch (error) {
    console.error('[FromMasterPasswordDialog] Error in verifyAndSwitch:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '認証に失敗しました'
  } finally {
    loading.value = false
  }
}

/**
 * プロバイダー切り替えを実行
 */
async function switchProvider() {
  loading.value = true

  try {
    const { switchFromMasterPassword } = useProviderSwitch()
    const securityStore = useSecurityStore()

    // 初期実装: Simpleへの切り替えのみ
    await switchFromMasterPassword({
      targetProvider: 'simple',
      currentPassword: currentPassword.value,
      skipReload: true
    })

    currentPhase.value = 'complete'

    // 2秒後に設定を再読み込みしてダイアログを閉じる
    setTimeout(async () => {
      // ダイアログを閉じる直前に設定を更新
      // これにより、更新完了までダイアログが表示されたままになる
      await securityStore.loadSettings()
      isOpen.value = false
      reset()
    }, 2000)
  } catch (error) {
    console.error('[FromMasterPasswordDialog] Error switching provider:', error)
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
  currentPassword.value = ''
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
