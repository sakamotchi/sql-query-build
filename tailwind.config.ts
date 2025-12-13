import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue'
  ],
  darkMode: 'class',
  safelist: [
    // 環境カラークラスを常に生成
    'env-development',
    'env-test',
    'env-staging',
    'env-production',
    // 環境カラーのバリエーション
    'bg-development-100',
    'bg-development-900',
    'border-development-500',
    'bg-test-100',
    'bg-test-900',
    'border-test-500',
    'bg-staging-100',
    'bg-staging-900',
    'border-staging-500',
    'bg-production-100',
    'bg-production-900',
    'border-production-500'
  ],
  theme: {
    extend: {
      // 環境別カラーパレット
      colors: {
        development: {
          50: '#F1F8E9',
          100: '#DCEDC8',
          200: '#C5E1A5',
          300: '#AED581',
          400: '#9CCC65',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20'
        },
        test: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1'
        },
        staging: {
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF9800',
          600: '#FB8C00',
          700: '#F57C00',
          800: '#EF6C00',
          900: '#E65100'
        },
        production: {
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#F44336',
          600: '#E53935',
          700: '#D32F2F',
          800: '#C62828',
          900: '#B71C1C'
        }
      }
    }
  }
} satisfies Config
