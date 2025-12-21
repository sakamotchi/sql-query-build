// app/composables/useProviderChangeDialog.ts
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import FromSimpleDialog from '~/components/security/provider-change/FromSimpleDialog.vue'
import FromMasterPasswordDialog from '~/components/security/provider-change/FromMasterPasswordDialog.vue'
import type { SecurityProvider } from '~/types'
import type { Component } from 'vue'

export function useProviderChangeDialog() {
  const securityStore = useSecurityStore()
  const { currentProvider } = storeToRefs(securityStore)

  const isOpen = ref(false)
  const targetProvider = ref<SecurityProvider | null>(null)

  /**
   * 現在のプロバイダーに応じた適切なダイアログコンポーネント
   */
  const dialogComponent = computed<Component | null>(() => {
    switch (currentProvider.value) {
      case 'simple':
        return FromSimpleDialog
      case 'master-password':
        return FromMasterPasswordDialog
      case 'keychain':
        // 将来実装予定
        return null
      default:
        return null
    }
  })

  /**
   * 型安全な移行先プロバイダー (初期実装)
   */
  const targetProviderTyped = computed<'master-password' | 'simple' | null>(() => {
    if (!targetProvider.value || !currentProvider.value) return null

    // Simpleからの移行 → Master Passwordのみ
    if (currentProvider.value === 'simple') {
      return targetProvider.value === 'master-password' ? 'master-password' : null
    }

    // Master Passwordからの移行 → Simpleのみ
    if (currentProvider.value === 'master-password') {
      return targetProvider.value === 'simple' ? 'simple' : null
    }

    return null
  })

  /**
   * ダイアログを開く
   */
  function open(to: SecurityProvider) {
    if (!currentProvider.value) {
      console.error('現在のプロバイダーが取得できません')
      return
    }

    if (currentProvider.value === to) {
      console.warn('既に同じプロバイダーです')
      return
    }

    // 初期実装: Simple ⇄ Master Password のみサポート
    const supportedTransitions = [
      { from: 'simple', to: 'master-password' },
      { from: 'master-password', to: 'simple' }
    ]

    const isSupported = supportedTransitions.some(
      transition => transition.from === currentProvider.value && transition.to === to
    )

    if (!isSupported) {
      console.warn(`${currentProvider.value} → ${to} への移行は未実装です`)
      return
    }

    targetProvider.value = to
    isOpen.value = true
  }

  /**
   * ダイアログを閉じる
   */
  function close() {
    isOpen.value = false
    targetProvider.value = null
  }

  return {
    isOpen,
    dialogComponent,
    targetProviderTyped,
    open,
    close
  }
}
