import type { Environment } from '~/types'

/**
 * Environment management composable.
 * Provides current environment state, colors, labels, and class helpers.
 */
export const useEnvironment = () => {
  const currentEnvironment = useState<Environment>('currentEnvironment', () => 'development')

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

  const labels: Record<Environment, string> = {
    development: '開発',
    test: 'テスト',
    staging: 'ステージング',
    production: '本番'
  }

  const getEnvironmentColors = (env: Environment) => colors[env]

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
    setEnvironment
  }
}
