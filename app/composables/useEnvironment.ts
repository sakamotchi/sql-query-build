import type { Environment } from '~/types'

/**
 * Environment management composable.
 * Provides current environment state, colors, labels, and class helpers.
 */
export const useEnvironment = () => {
  const currentEnvironment = useState<Environment>('currentEnvironment', () => 'development')

  const colorMode = useColorMode()

  const colors: Record<Environment, { primary: string; bg: string; border: string }> = {
    development: {
      primary: '#4CAF50',
      bg: '#F1F8E9',
      border: '#4CAF50'
    },
    test: {
      primary: '#2196F3',
      bg: '#E3F2FD',
      border: '#2196F3'
    },
    staging: {
      primary: '#FF9800',
      bg: '#FFF3E0',
      border: '#FF9800'
    },
    production: {
      primary: '#F44336',
      bg: '#FFEBEE',
      border: '#F44336'
    }
  }

  /**
   * HEXカラーの明るさを調整する
   * @param color HEXカラー (#RRGGBB)
   * @param percent 調整するパーセンテージ (-1.0 ~ 1.0)。負の値で暗くなる
   */
  const adjustColorBrightness = (color: string, percent: number): string => {
    const f = parseInt(color.slice(1), 16)
    const t = percent < 0 ? 0 : 255
    const p = percent < 0 ? percent * -1 : percent
    const R = f >> 16
    const G = (f >> 8) & 0x00FF
    const B = f & 0x0000FF
    
    return '#' + (
      0x1000000 +
      (Math.round((t - R) * p) + R) * 0x10000 +
      (Math.round((t - G) * p) + G) * 0x100 +
      (Math.round((t - B) * p) + B)
    ).toString(16).slice(1)
  }

  const labels: Record<Environment, string> = {
    development: '開発',
    test: 'テスト',
    staging: 'ステージング',
    production: '本番'
  }

  const getEnvironmentColors = (env: Environment, customColor?: { primary: string; background: string }) => {
    // カスタムカラーがある場合はそちらを優先
    const baseColors = customColor ? {
      primary: customColor.primary,
      bg: customColor.background,
      border: customColor.primary
    } : colors[env]
    
    if (colorMode.value === 'dark') {
      // ダークモード時は背景色を暗くする (60%暗く)
      // プライマリカラーはそのまま維持して視認性と統一感を保つ
      return {
        ...baseColors,
        bg: adjustColorBrightness(baseColors.primary, -0.6), // プライマリカラーをベースに暗くする方が統一感が出る
        border: baseColors.primary // ボーダーはプライマリカラーのまま
      }
    }
    
    return baseColors
  }

  const environmentColors = computed(() => getEnvironmentColors(currentEnvironment.value))

  const environmentClass = computed(() => `env-${currentEnvironment.value}`)

  const getEnvironmentLabel = (env: Environment) => labels[env]

  const environmentLabel = computed(() => getEnvironmentLabel(currentEnvironment.value))

  const setEnvironment = (env: Environment) => {
    currentEnvironment.value = env
  }

  return {
    currentEnvironment,
    environmentColors,
    environmentClass,
    environmentLabel,
    getEnvironmentColors,
    getEnvironmentLabel,
    setEnvironment,
    adjustColorBrightness
  }
}
