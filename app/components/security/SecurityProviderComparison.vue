<script setup lang="ts">
import type { SecurityProvider } from '~/types'

interface ProviderDetail {
  name: string
  icon: string
  color: string
  securityLevel: number
  features: {
    encryption: string
    keyManagement: string
    unlockRequired: boolean
    osIntegration: boolean
  }
  pros: string[]
  cons: string[]
  recommendedFor: string[]
}

const providers: Record<SecurityProvider, ProviderDetail> = {
  simple: {
    name: 'Simple',
    icon: 'i-heroicons-key',
    color: 'emerald',
    securityLevel: 1,
    features: {
      encryption: 'AES-256-GCM',
      keyManagement: 'アプリ固定キー + ランダムソルト',
      unlockRequired: false,
      osIntegration: false
    },
    pros: ['パスワード入力不要で即座に起動', 'シンプルで使いやすい', 'セットアップ不要'],
    cons: ['ソースコードにアクセスできれば理論上は復号可能', '共有PCでは推奨されない', 'セキュリティレベルは低い'],
    recommendedFor: ['個人開発環境', 'ローカル環境', '機密性の低いデータ', 'UXを最優先する場合']
  },
  'master-password': {
    name: 'マスターパスワード',
    icon: 'i-heroicons-lock-closed',
    color: 'amber',
    securityLevel: 2,
    features: {
      encryption: 'AES-256-GCM + PBKDF2',
      keyManagement: 'ユーザー設定のマスターパスワードから導出',
      unlockRequired: true,
      osIntegration: false
    },
    pros: ['ユーザーのみが復号可能', '高いセキュリティレベル', '他のPCでも同じパスワードで復元可能'],
    cons: ['起動時に毎回パスワード入力が必要', 'パスワードを忘れると復元不可', 'パスワード管理の責任がユーザーにある'],
    recommendedFor: ['チーム共有PC', '機密性の高いデータ', '本番環境への接続情報', 'セキュリティを重視する場合']
  },
  keychain: {
    name: 'OSキーチェーン',
    icon: 'i-heroicons-shield-check',
    color: 'blue',
    securityLevel: 3,
    features: {
      encryption: 'OSのセキュアストレージ',
      keyManagement: 'OS管理（Keychain/Credential Manager/Secret Service）',
      unlockRequired: false,
      osIntegration: true
    },
    pros: ['OSレベルのセキュリティ', '生体認証に対応（Touch ID/Face ID/Windows Hello）', 'パスワード入力不要（OSが管理）'],
    cons: ['OS認証プロンプトが表示される場合がある', '他のPCへの移行が困難', 'OS固有の制限を受ける'],
    recommendedFor: ['企業環境', '最高レベルのセキュリティが必要な場合', '生体認証を活用したい場合', 'セキュリティポリシー準拠が必要な場合']
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-xl font-semibold">セキュリティプロバイダー比較</h3>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-4 font-semibold">項目</th>
            <th
              v-for="(provider, key) in providers"
              :key="key"
              class="text-left py-3 px-4"
            >
              <div class="flex items-center gap-2">
                <UIcon :name="provider.icon" :class="`text-${provider.color}-500`" />
                <span class="font-semibold">{{ provider.name }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 px-4 font-medium">セキュリティレベル</td>
            <td
              v-for="(provider, key) in providers"
              :key="key"
              class="py-3 px-4"
            >
              <div class="flex gap-1">
                <div
                  v-for="i in 3"
                  :key="i"
                  class="w-3 h-3 rounded-full"
                  :class="i <= provider.securityLevel ? `bg-${provider.color}-500` : 'bg-gray-200 dark:bg-gray-700'"
                />
              </div>
            </td>
          </tr>

          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 px-4 font-medium">暗号化方式</td>
            <td
              v-for="(provider, key) in providers"
              :key="key"
              class="py-3 px-4 text-xs"
            >
              {{ provider.features.encryption }}
            </td>
          </tr>

          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 px-4 font-medium">キー管理</td>
            <td
              v-for="(provider, key) in providers"
              :key="key"
              class="py-3 px-4 text-xs"
            >
              {{ provider.features.keyManagement }}
            </td>
          </tr>

          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 px-4 font-medium">起動時アンロック</td>
            <td
              v-for="(provider, key) in providers"
              :key="key"
              class="py-3 px-4"
            >
              <UBadge
                :color="provider.features.unlockRequired ? 'amber' : 'emerald'"
                variant="soft"
                size="xs"
              >
                {{ provider.features.unlockRequired ? '必要' : '不要' }}
              </UBadge>
            </td>
          </tr>

          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 px-4 font-medium align-top">利点</td>
            <td
              v-for="(provider, key) in providers"
              :key="key"
              class="py-3 px-4"
            >
              <ul class="space-y-1 text-xs">
                <li v-for="(pro, idx) in provider.pros" :key="idx" class="flex items-start gap-1">
                  <UIcon name="i-heroicons-check" class="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{{ pro }}</span>
                </li>
              </ul>
            </td>
          </tr>

          <tr class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 px-4 font-medium align-top">欠点</td>
            <td
              v-for="(provider, key) in providers"
              :key="key"
              class="py-3 px-4"
            >
              <ul class="space-y-1 text-xs">
                <li v-for="(con, idx) in provider.cons" :key="idx" class="flex items-start gap-1">
                  <UIcon name="i-heroicons-x-mark" class="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                  <span>{{ con }}</span>
                </li>
              </ul>
            </td>
          </tr>

          <tr>
            <td class="py-3 px-4 font-medium align-top">推奨用途</td>
            <td
              v-for="(provider, key) in providers"
              :key="key"
              class="py-3 px-4"
            >
              <ul class="space-y-1 text-xs">
                <li v-for="(use, idx) in provider.recommendedFor" :key="idx" class="flex items-start gap-1">
                  <UIcon name="i-heroicons-light-bulb" class="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  <span>{{ use }}</span>
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
