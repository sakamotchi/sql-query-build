<script setup lang="ts">
const colorMode = useColorMode()

const environments = [
  { name: '開発環境', key: 'development', class: 'env-development' },
  { name: 'テスト環境', key: 'test', class: 'env-test' },
  { name: 'ステージング環境', key: 'staging', class: 'env-staging' },
  { name: '本番環境', key: 'production', class: 'env-production' }
]

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          SQL Query Build
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300">
          Nuxt + Nuxt UI 動作確認ページ
        </p>
      </div>

      <UCard class="mb-8">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">カラーモード</h2>
            <UButton
              :icon="colorMode.value === 'dark' ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
              @click="toggleColorMode"
            >
              {{ colorMode.value === 'dark' ? 'ライト' : 'ダーク' }}モードに切り替え
            </UButton>
          </div>
        </template>
        <p class="text-gray-600 dark:text-gray-300">
          現在のモード: <strong class="text-gray-900 dark:text-white">{{ colorMode.value }}</strong>
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
          ユーザー設定: {{ colorMode.preference }}
        </p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">環境別カラーテスト</h2>
        </template>

        <div class="space-y-4">
          <div
            v-for="env in environments"
            :key="env.key"
            :class="[env.class, 'p-4 rounded-lg transition-colors']"
          >
            <p class="font-bold text-lg text-gray-900 dark:text-white">
              {{ env.name }}
            </p>
            <p class="text-sm mt-2 text-gray-700 dark:text-gray-300">
              クラス:
              <code class="bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">{{ env.class }}</code>
            </p>
            <p class="text-xs mt-1 text-gray-600 dark:text-gray-400">
              カラーキー: {{ env.key }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>✅ Nuxt開発サーバーが正常に動作しています</p>
            <p>✅ Nuxt UIコンポーネントが利用可能です</p>
            <p>✅ Tailwind CSSが適用されています</p>
            <p>✅ 環境別カラーパレットが定義されています</p>
          </div>
        </template>
      </UCard>

      <UCard class="mt-8">
        <template #header>
          <h2 class="text-xl font-semibold">システム情報</h2>
        </template>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="font-semibold text-gray-700 dark:text-gray-300">フレームワーク</p>
            <p class="text-gray-600 dark:text-gray-400">Nuxt 4.2.2</p>
          </div>
          <div>
            <p class="font-semibold text-gray-700 dark:text-gray-300">UIライブラリ</p>
            <p class="text-gray-600 dark:text-gray-400">Nuxt UI v4.2.1</p>
          </div>
          <div>
            <p class="font-semibold text-gray-700 dark:text-gray-300">CSSフレームワーク</p>
            <p class="text-gray-600 dark:text-gray-400">Tailwind CSS v3.4</p>
          </div>
          <div>
            <p class="font-semibold text-gray-700 dark:text-gray-300">ランタイム</p>
            <p class="text-gray-600 dark:text-gray-400">Tauri v2</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
