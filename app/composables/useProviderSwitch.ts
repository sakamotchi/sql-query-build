import { useTauri } from '~/composables/useTauri'
import { useSecurityStore } from '~/stores/security'

interface SwitchFromSimpleParams {
  targetProvider: 'master-password'
  newPassword: string
  newPasswordConfirm: string
  skipReload?: boolean
}

interface SwitchFromMasterPasswordParams {
  targetProvider: 'simple'
  currentPassword: string
  skipReload?: boolean
}

export function useProviderSwitch() {
  const { invokeCommand, isAvailable } = useTauri()
  const securityStore = useSecurityStore()

  /**
   * SimpleからMaster Passwordへの切り替え (初期実装)
   * 将来的にKeychainもサポート予定
   */
  async function switchFromSimple(params: SwitchFromSimpleParams): Promise<void> {
    if (!isAvailable.value) {
      throw new Error('Tauri環境が利用できません')
    }

    // パラメータバリデーション
    if (!params.newPassword || params.newPassword.length < 8) {
      throw new Error('パスワードは8文字以上で設定してください')
    }
    if (params.newPassword !== params.newPasswordConfirm) {
      throw new Error('パスワードが一致しません')
    }

    const backendParams = {
      targetProvider: 'master_password',  // 初期実装では固定
      currentPassword: null,  // Simpleは認証不要
      newPassword: params.newPassword,
      newPasswordConfirm: params.newPasswordConfirm
    }

    console.log('[useProviderSwitch] switchFromSimple: Simple → Master Password')

    await invokeCommand('switch_security_provider', backendParams)

    // 設定を再読み込み (skipReloadが指定されていない場合のみ)
    if (!params.skipReload) {
      await securityStore.loadSettings()
    }
  }

  /**
   * Master PasswordからSimpleへの切り替え (初期実装)
   * 将来的にKeychainもサポート予定
   */
  async function switchFromMasterPassword(
    params: SwitchFromMasterPasswordParams
  ): Promise<void> {
    if (!isAvailable.value) {
      throw new Error('Tauri環境が利用できません')
    }

    // パラメータバリデーション
    if (!params.currentPassword) {
      throw new Error('現在のパスワードを入力してください')
    }

    const backendParams = {
      targetProvider: 'simple',  // 初期実装では固定
      currentPassword: params.currentPassword,
      newPassword: null,  // Simpleはパスワード設定不要
      newPasswordConfirm: null
    }

    console.log('[useProviderSwitch] switchFromMasterPassword: Master Password → Simple')

    await invokeCommand('switch_security_provider', backendParams)

    // 設定を再読み込み (skipReloadが指定されていない場合のみ)
    if (!params.skipReload) {
      await securityStore.loadSettings()
    }
  }

  return {
    switchFromSimple,
    switchFromMasterPassword
  }
}
