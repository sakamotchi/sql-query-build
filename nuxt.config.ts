import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Tauri向けにSSRを無効化
  ssr: false,

  // Nuxt 4標準ディレクトリ構成
  srcDir: 'app/',


  // コンポーネント自動インポート設定
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  // Nuxtモジュール
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/i18n'
  ],

  // i18n設定
  i18n: {
    strategy: 'no_prefix', // URLにロケールを含めない（Tauriアプリ向け）
    defaultLocale: 'ja',
    detectBrowserLanguage: false, // ストア設定を優先するためブラウザ判定はオフ
    langDir: '../i18n/locales', // ロケールファイルのディレクトリ (srcDirがapp/なので親のi18n/localesを参照)
    locales: [
      {
        code: 'ja',
        file: 'ja.json',
        name: '日本語'
      },
      {
        code: 'en',
        file: 'en.json',
        name: 'English'
      }
    ]
  },

  // CSS設定
  css: ['~/assets/css/main.css'],

  // 開発サーバー設定（Tauri用）
  devServer: {
    host: '0.0.0.0',
    port: 1420
  },

  // Vite設定（Tauri統合）
  vite: {
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 1421
      },
      watch: {
        ignored: ['**/src-tauri/**']
      },
      preTransformRequests: false
    }
  },

  // TypeScript設定
  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: {
      compilerOptions: {
        moduleResolution: 'bundler',
        types: ['@tauri-apps/api']
      }
    }
  },

  // 開発ツール
  devtools: { enabled: true },

  // Nitro設定
  nitro: {
    preset: 'static',
    experimental: {
      tasks: false
    }
  },

  // Tauri使用時は不要な機能を無効化
  experimental: {
    payloadExtraction: false,
    renderJsonPayloads: false
  },

  // Nitro互換日付
  compatibilityDate: '2025-12-13'
})
