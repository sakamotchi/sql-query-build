<script setup lang="ts">
import type { SecurityLevel } from '~/types'

interface LevelDetail {
  name: string
  color: string
  encryption: {
    algorithm: string
    keySize: number
    iterations: number
  }
  features: string[]
  recommendedFor: string[]
}

const levels: Record<SecurityLevel, LevelDetail> = {
  low: {
    name: '低',
    color: 'emerald',
    encryption: {
      algorithm: 'AES-256-GCM',
      keySize: 256,
      iterations: 100000
    },
    features: ['基本的な暗号化', '高速な処理', '低リソース消費'],
    recommendedFor: ['開発環境', 'テスト環境', '機密性の低いデータ']
  },
  medium: {
    name: '中',
    color: 'amber',
    encryption: {
      algorithm: 'AES-256-GCM',
      keySize: 256,
      iterations: 600000
    },
    features: ['推奨レベルの暗号化', 'セキュリティとパフォーマンスのバランス', 'OWASP推奨の反復回数'],
    recommendedFor: ['ステージング環境', '一般的な用途', 'デフォルト設定として推奨']
  },
  high: {
    name: '高',
    color: 'rose',
    encryption: {
      algorithm: 'AES-256-GCM',
      keySize: 256,
      iterations: 1000000
    },
    features: ['最高レベルの暗号化', '最も厳格なセキュリティ', 'ブルートフォース攻撃への最大の耐性'],
    recommendedFor: ['本番環境', '機密性の高いデータ', 'セキュリティポリシー準拠が必要な場合']
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-xl font-semibold">セキュリティレベル詳細</h3>
    </template>

    <div class="space-y-4">
      <div
        v-for="(level, key) in levels"
        :key="key"
        class="border rounded-lg p-4"
        :class="`border-${level.color}-200 dark:border-${level.color}-800`"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="flex gap-1">
              <div
                v-for="i in 3"
                :key="i"
                class="w-3 h-3 rounded-full"
                :class="i <= (key === 'low' ? 1 : key === 'medium' ? 2 : 3) ? `bg-${level.color}-500` : 'bg-gray-200 dark:bg-gray-700'"
              />
            </div>
            <h4 class="text-lg font-semibold">{{ level.name }}</h4>
            <UBadge v-if="key === 'medium'" color="primary" variant="soft" size="xs">
              推奨
            </UBadge>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              暗号化仕様
            </p>
            <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-lock-closed" class="w-3 h-3" />
                アルゴリズム: {{ level.encryption.algorithm }}
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-key" class="w-3 h-3" />
                キーサイズ: {{ level.encryption.keySize }}bit
              </li>
              <li class="flex items-center gap-2">
                <UIcon name="i-heroicons-arrow-path" class="w-3 h-3" />
                反復回数: {{ level.encryption.iterations.toLocaleString() }}回
              </li>
            </ul>
          </div>

          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              特徴
            </p>
            <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li v-for="(feature, idx) in level.features" :key="idx" class="flex items-start gap-2">
                <UIcon name="i-heroicons-check" class="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                <span>{{ feature }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-3 pt-3 border-t" :class="`border-${level.color}-100 dark:border-${level.color}-900`">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            推奨用途
          </p>
          <ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li v-for="(use, idx) in level.recommendedFor" :key="idx" class="flex items-start gap-2">
              <UIcon name="i-heroicons-light-bulb" class="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              <span>{{ use }}</span>
            </li>
          </ul>
        </div>
      </div>

      <UAlert color="blue" variant="soft" icon="i-heroicons-information-circle">
        <template #title>パフォーマンスへの影響</template>
        <p class="text-sm mt-1">
          セキュリティレベルが高いほど、暗号化・復号化に時間がかかります。
          起動時やプロバイダー変更時に若干の遅延が発生する場合があります。
        </p>
      </UAlert>
    </div>
  </UCard>
</template>
