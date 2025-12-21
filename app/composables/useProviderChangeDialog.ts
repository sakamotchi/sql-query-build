// app/composables/useProviderChangeDialog.ts
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import type { SecurityProvider } from '~/types'

export function useProviderChangeDialog() {
  const securityStore = useSecurityStore()
  const { currentProvider } = storeToRefs(securityStore)

  // 各ダイアログの表示状態
  const isFromSimpleDialogOpen = ref(false)
  const isFromMasterPasswordDialogOpen = ref(false)

  /**
   * ダイアログを開く
   */
  function openChangeDialog(to: SecurityProvider) {
    if (!currentProvider.value) {
      console.error('現在のプロバイダーが取得できません')
      return
    }

    if (currentProvider.value === to) {
      console.warn('既に同じプロバイダーです')
      return
    }

    // Simple -> Master Password
    if (currentProvider.value === 'simple' && to === 'master-password') {
      isFromSimpleDialogOpen.value = true
      return
    }

    // Master Password -> Simple
    if (currentProvider.value === 'master-password' && to === 'simple') {
      isFromMasterPasswordDialogOpen.value = true
      return
    }

    // 将来の拡張: Keychainなど
    console.warn(`未実装の移行パターンです: ${currentProvider.value} -> ${to}`)
  }

  /**
   * 全てのダイアログを閉じる
   */
  function closeAllDialogs() {
    isFromSimpleDialogOpen.value = false
    isFromMasterPasswordDialogOpen.value = false
  }

  return {
    isFromSimpleDialogOpen,
    isFromMasterPasswordDialogOpen,
    openChangeDialog,
    closeAllDialogs
  }
}
