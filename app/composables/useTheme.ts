import type { ColorMode } from '~/types'

/**
 * テーマ管理Composable
 */
export const useTheme = () => {
  const colorMode = useColorMode()
  const { currentEnvironment, environmentColors } = useEnvironment()

  /**
   * 現在のテーマカラーを取得
   */
  const currentThemeColor = computed(() => environmentColors.value)

  /**
   * ダークモード判定
   */
  const isDark = computed(() => colorMode.value === 'dark')

  /**
   * カラーモードを切り替え
   */
  const toggleColorMode = () => {
    colorMode.preference = isDark.value ? 'light' : 'dark'
  }

  /**
   * カラーモードを設定
   */
  const setColorMode = (mode: ColorMode) => {
    colorMode.preference = mode
  }

  return {
    colorMode,
    currentEnvironment,
    currentThemeColor,
    isDark,
    toggleColorMode,
    setColorMode
  }
}
