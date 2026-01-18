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
      '@nuxtjs/color-mode/dist/runtime/composables': path.resolve(__dirname, './tests/mocks/color-mode.ts'),
      '@nuxtjs/color-mode/dist/runtime/composables.js': path.resolve(__dirname, './tests/mocks/color-mode.ts'),
      'monaco-editor': path.resolve(__dirname, './tests/mocks/monaco-editor.ts'),
    },
  },
})
