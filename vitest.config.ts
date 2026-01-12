import { defineVitestConfig } from '@nuxt/test-utils/config'
import path from 'path'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        inline: ['nuxt', '@nuxt/ui'],
      },
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      '@': path.resolve(__dirname, './app'),
      'nuxt/app': path.resolve(__dirname, './tests/mocks/nuxt-app.ts'),
      '#imports': path.resolve(__dirname, './tests/mocks/nuxt-app.ts'),
    },
  },
})
