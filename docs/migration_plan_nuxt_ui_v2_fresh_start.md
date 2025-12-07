# Nuxt + Nuxt UI v4 完全移行計画 (フレッシュスタート方式)

**プロジェクト**: SQL Query Build
**作成日**: 2025-12-07
**バージョン**: 2.0
**ステータス**: 計画中
**アプローチ**: フレッシュスタート - 既存フロントエンドを削除して一から構築

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [なぜフレッシュスタートなのか](#2-なぜフレッシュスタートなのか)
3. [移行戦略](#3-移行戦略)
4. [技術スタック](#4-技術スタック)
5. [フェーズ詳細](#5-フェーズ詳細)
6. [リスク管理](#6-リスク管理)
7. [成功基準](#7-成功基準)

---

## 1. エグゼクティブサマリー

### 1.1 概要

既存のVue 3 + Vite + Vuetifyフロントエンドを**完全に削除**し、Nuxt 3 + Nuxt UI v4で一から構築し直します。

**既存の移行計画の問題点**:
- 段階的移行による複雑性の増大
- Vuetify → Nuxt UIのコンポーネントマッピングの困難さ
- Vue Router → Nuxtルーティングの移行時の不整合
- 既存コードとの依存関係による制約

**新しいアプローチ**:
- ✅ クリーンスレート: 既存フロントエンドを削除して一から構築
- ✅ Nuxtベストプラクティスに準拠した設計
- ✅ Nuxt UI v4のコンポーネントを最初から使用
- ✅ Tauri統合は既存のまま維持

### 1.2 期間とリソース

| 項目 | 内容 |
|------|------|
| **総期間** | 2-3週間 |
| **Phase 1** | 環境セットアップ (2-3日) |
| **Phase 2** | コア機能実装 (1週間) |
| **Phase 3** | 詳細機能実装 (1週間) |
| **Phase 4** | テスト・調整 (2-3日) |

---

## 2. なぜフレッシュスタートなのか

### 2.1 既存移行計画の課題

| 課題 | 影響 | フレッシュスタートでの解決 |
|------|------|------------------------|
| Vuetify/Nuxt UI混在期間 | UI不整合、保守負担 | 最初からNuxt UIのみ |
| Vue Router設定の残存 | ルーティング衝突 | Nuxtファイルベースルーティング |
| Vite設定とNuxt設定の重複 | 設定の複雑化 | Nuxt設定のみ |
| 既存コンポーネントの移行負担 | 42ファイルの段階的移行 | 必要な機能のみ再実装 |

### 2.2 フレッシュスタートのメリット

✅ **シンプルな構造**: Nuxtの規約に完全準拠
✅ **クリーンなコード**: 技術的負債なし
✅ **高速な開発**: ベストプラクティスから開始
✅ **学習機会**: Nuxt/Nuxt UIを最初から正しく学習
✅ **テスタビリティ**: 新規コードはテストが容易

### 2.3 保持するもの・削除するもの

#### 保持するもの (✅)

- ✅ **Rustバックエンド**: `src-tauri/` - 変更なし
- ✅ **Tauri設定**: `src-tauri/tauri.conf.json` - 微調整のみ
- ✅ **Pinia Store**: ビジネスロジック・状態管理
- ✅ **型定義**: TypeScriptインターフェース
- ✅ **テスト**: Vitest設定とテストケース

#### 削除するもの (❌)

- ❌ **src/ ディレクトリ全体**: 既存フロントエンド
- ❌ **Vuetify関連**: すべての依存関係
- ❌ **Vue Router**: Nuxtルーティングに置き換え
- ❌ **Vite設定**: Nuxt設定に統合
- ❌ **既存コンポーネント**: 一から再実装

---

## 3. 移行戦略

### 3.1 4つのフェーズ

```
Phase 1: クリーンスレート準備
  ↓
Phase 2: コア機能実装
  ↓
Phase 3: 詳細機能実装
  ↓
Phase 4: テスト・最適化
```

### 3.2 実装優先順位

#### 高優先度 (Phase 2)

1. **環境識別システム** - アプリの基盤
2. **接続管理** - ランチャー画面
3. **基本レイアウト** - ヘッダー、ナビゲーション

#### 中優先度 (Phase 3)

4. **クエリビルダー** - 主要機能
5. **設定画面** - ユーザー設定
6. **セキュリティ** - パスワード管理

#### 低優先度 (Phase 4)

7. **ウィンドウ管理** - 復元機能
8. **その他** - 細かい機能

---

## 4. 技術スタック

### 4.1 フロントエンド技術

| レイヤー | 技術 | バージョン | 用途 |
|---------|------|----------|------|
| **フレームワーク** | Nuxt | ^3.14.0 | アプリケーション基盤 |
| **UIライブラリ** | Nuxt UI | ^4.0.0 | UIコンポーネント |
| **CSSフレームワーク** | Tailwind CSS | ^4.0.0 | スタイリング |
| **アイコン** | Iconify | - | 200,000+アイコン |
| **状態管理** | Pinia | ^3.0.3 | グローバル状態 |
| **型システム** | TypeScript | ~5.6.2 | 型安全性 |

### 4.2 依存関係

#### 追加する依存関係

```json
{
  "dependencies": {
    "nuxt": "^3.14.0",
    "@nuxt/ui": "^4.0.0",
    "@nuxt/icon": "^1.0.0",
    "@nuxtjs/tailwindcss": "^7.0.0",
    "@nuxtjs/color-mode": "^3.5.0",
    "@pinia/nuxt": "^0.7.0",
    "@tauri-apps/api": "^2.0.0",
    "pinia": "^3.0.3",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "typescript": "~5.6.2",
    "vitest": "^3.2.4",
    "@vue/test-utils": "^2.4.6"
  }
}
```

#### 削除する依存関係

```json
{
  "vuetify": "^3.10.3",
  "@mdi/font": "^7.4.47",
  "sass-embedded": "^1.93.3"
}
```

### 4.3 ディレクトリ構造

```
/
├── app/                        # Nuxtアプリケーション
│   ├── assets/
│   │   └── css/
│   │       └── tailwind.css   # グローバルCSS
│   ├── components/
│   │   ├── common/            # 共通コンポーネント
│   │   │   ├── EnvironmentHeader.vue
│   │   │   ├── EnvironmentBadge.vue
│   │   │   └── EnvironmentIndicator.vue
│   │   ├── connection/        # 接続管理
│   │   │   ├── ConnectionCard.vue
│   │   │   ├── ConnectionList.vue
│   │   │   └── ConnectionForm.vue
│   │   ├── query-builder/     # クエリビルダー
│   │   │   ├── QueryBuilderLayout.vue
│   │   │   ├── TablePanel.vue
│   │   │   └── SqlPreview.vue
│   │   ├── settings/          # 設定
│   │   └── security/          # セキュリティ
│   ├── composables/
│   │   ├── useEnvironment.ts  # 環境管理
│   │   ├── useTauri.ts        # Tauri IPC
│   │   └── useTheme.ts        # テーマ管理
│   ├── layouts/
│   │   ├── default.vue        # デフォルトレイアウト
│   │   ├── launcher.vue       # ランチャー専用
│   │   └── query-builder.vue  # クエリビルダー専用
│   ├── pages/
│   │   ├── index.vue          # ランチャー
│   │   ├── connection-form.vue
│   │   ├── query-builder.vue
│   │   └── settings.vue
│   ├── stores/
│   │   ├── connection.ts      # 既存ストアを移行
│   │   ├── theme.ts
│   │   ├── window.ts
│   │   ├── settings.ts
│   │   └── security.ts
│   ├── types/
│   │   └── index.ts           # 型定義
│   ├── utils/
│   ├── app.vue                # ルートコンポーネント
│   └── app.config.ts          # Nuxt UI設定
├── public/
├── src-tauri/                  # 変更なし
├── tests/                      # テスト
├── nuxt.config.ts             # Nuxt設定
├── tailwind.config.ts         # Tailwind設定
└── package.json
```

---

## 5. フェーズ詳細

### Phase 1: クリーンスレート準備 (2-3日)

#### 5.1.1 既存フロントエンドのバックアップ

```bash
# 念のため既存コードをバックアップ
git checkout -b backup/vue-vuetify-implementation
git push -u origin backup/vue-vuetify-implementation

# 新しい移行ブランチ作成
git checkout main
git checkout -b feature/nuxt-fresh-start
```

**成果物**: バックアップブランチ作成

---

#### 5.1.2 既存src/の削除と依存関係クリーンアップ

```bash
# 既存フロントエンドを削除
rm -rf src/

# Vuetify関連を削除
npm uninstall vuetify @mdi/font sass-embedded

# 古いVite設定削除
rm vite.config.ts
```

**成果物**: クリーンな状態

---

#### 5.1.3 Nuxt + Nuxt UIのインストール

```bash
# Nuxtインストール
npm install nuxt@^3.14.0

# Nuxt UI + 必須モジュール
npm install @nuxt/ui@^4.0.0 @nuxt/icon@^1.0.0
npm install @nuxtjs/tailwindcss@^7.0.0 @nuxtjs/color-mode@^3.5.0
npm install @pinia/nuxt@^0.7.0

# Tailwind CSS v4
npm install -D tailwindcss@^4.0.0
```

**成果物**: 依存関係インストール完了

---

#### 5.1.4 Nuxt設定ファイル作成

**`nuxt.config.ts`**:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // SSR無効（Tauri制約）
  ssr: false,

  // Appディレクトリ
  srcDir: 'app/',

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
      }
    }
  },

  // モジュール
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@pinia/nuxt'
  ],

  // TypeScript
  typescript: {
    strict: true,
    typeCheck: true
  },

  // Tailwind
  tailwindcss: {
    configPath: '~/tailwind.config.ts'
  },

  // カラーモード
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  }
})
```

**成果物**: Nuxt設定完了

---

#### 5.1.5 Tailwind CSS設定

**`tailwind.config.ts`**:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}'
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
          500: '#4CAF50',  // Primary
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
          500: '#2196F3',  // Primary
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
          500: '#FF9800',  // Primary
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
          500: '#F44336',  // Primary
          600: '#E53935',
          700: '#D32F2F',
          800: '#C62828',
          900: '#B71C1C'
        }
      }
    }
  }
} satisfies Config
```

**`app/assets/css/tailwind.css`**:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans;
  }
}

@layer utilities {
  /* 環境別ユーティリティ */
  .env-development {
    @apply bg-development-50 border-development-500 border-2;
  }
  .env-test {
    @apply bg-test-50 border-test-500 border-2;
  }
  .env-staging {
    @apply bg-staging-50 border-staging-500 border-2;
  }
  .env-production {
    @apply bg-production-50 border-production-500 border-4;
  }
}
```

**成果物**: Tailwind設定完了

---

#### 5.1.6 app.config.ts (Nuxt UI設定)

**`app/app.config.ts`**:

```typescript
export default defineAppConfig({
  ui: {
    primary: 'green',  // デフォルト: 開発環境

    // カラーパレット
    colors: {
      development: {
        50: '#F1F8E9',
        500: '#4CAF50',
        900: '#1B5E20'
      },
      test: {
        50: '#E3F2FD',
        500: '#2196F3',
        900: '#0D47A1'
      },
      staging: {
        50: '#FFF3E0',
        500: '#FF9800',
        900: '#E65100'
      },
      production: {
        50: '#FFEBEE',
        500: '#F44336',
        900: '#B71C1C'
      }
    }
  }
})
```

**成果物**: Nuxt UI設定完了

---

#### 5.1.7 app.vue (ルートコンポーネント)

**`app/app.vue`**:

```vue
<script setup lang="ts">
import '~/assets/css/tailwind.css'
</script>

<template>
  <div id="app">
    <NuxtPage />
  </div>
</template>
```

**成果物**: ルートコンポーネント作成

---

#### 5.1.8 動作確認ページ

**`app/pages/index.vue`**:

```vue
<script setup lang="ts">
const colorMode = useColorMode()
</script>

<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold mb-4">Nuxt + Nuxt UI 動作確認</h1>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">環境テスト</h2>
      </template>

      <div class="space-y-4">
        <div class="env-development p-4 rounded">
          <p class="text-development-900 font-bold">開発環境</p>
        </div>

        <div class="env-test p-4 rounded">
          <p class="text-test-900 font-bold">テスト環境</p>
        </div>

        <div class="env-staging p-4 rounded">
          <p class="text-staging-900 font-bold">ステージング環境</p>
        </div>

        <div class="env-production p-4 rounded">
          <p class="text-production-900 font-bold">本番環境</p>
        </div>
      </div>

      <template #footer>
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        >
          {{ colorMode.value === 'dark' ? 'ライト' : 'ダーク' }}モード
        </UButton>
      </template>
    </UCard>
  </div>
</template>
```

**成果物**: 動作確認ページ

---

#### 5.1.9 Tauri設定の微調整

**`src-tauri/tauri.conf.json`** (必要に応じて):

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../.output/public"  // Nuxtビルド出力先
  }
}
```

**`package.json`のスクリプト更新**:

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

**成果物**: Tauri統合設定

---

#### 5.1.10 Phase 1完了確認

```bash
# 開発サーバー起動
npm run dev

# Tauri起動
npm run tauri:dev
```

**完了条件**:
- ✅ Nuxt開発サーバーが起動する
- ✅ 動作確認ページが表示される
- ✅ 環境別カラーが正しく表示される
- ✅ ダークモードが切り替わる
- ✅ Tauriアプリが起動する

---

### Phase 2: コア機能実装 (1週間)

#### 5.2.1 Composables作成

**`app/composables/useEnvironment.ts`**:

```typescript
import type { Environment } from '~/types'

export const useEnvironment = () => {
  const currentEnvironment = ref<Environment>('development')

  const environmentColors = computed(() => {
    const colors = {
      development: { primary: '#4CAF50', bg: '#F1F8E9' },
      test: { primary: '#2196F3', bg: '#E3F2FD' },
      staging: { primary: '#FF9800', bg: '#FFF3E0' },
      production: { primary: '#F44336', bg: '#FFEBEE' }
    }
    return colors[currentEnvironment.value]
  })

  const environmentClass = computed(() => {
    return `env-${currentEnvironment.value}`
  })

  return {
    currentEnvironment,
    environmentColors,
    environmentClass
  }
}
```

**`app/composables/useTauri.ts`**:

```typescript
import { invoke } from '@tauri-apps/api/core'

export const useTauri = () => {
  const isAvailable = ref(false)

  onMounted(() => {
    // Tauriが利用可能かチェック
    isAvailable.value = typeof window !== 'undefined' && '__TAURI__' in window
  })

  const invokeCommand = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
    if (!isAvailable.value) {
      throw new Error('Tauri is not available')
    }
    return invoke<T>(command, args)
  }

  return {
    isAvailable,
    invokeCommand
  }
}
```

**成果物**: Composables実装

---

#### 5.2.2 型定義

**`app/types/index.ts`**:

```typescript
export type Environment = 'development' | 'test' | 'staging' | 'production'

export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'sqlserver' | 'oracle'

export interface Connection {
  id: string
  name: string
  type: DatabaseType
  environment: Environment
  host: string
  port: number
  username: string
  database: string
  customColor?: {
    primary: string
    background: string
  }
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto'
  language: 'ja' | 'en'
  autoSave: boolean
  windowRestore: boolean
}

export interface SecuritySettings {
  provider: 'system' | 'master-password'
  level: 'low' | 'medium' | 'high'
}
```

**成果物**: 型定義完了

---

#### 5.2.3 Piniaストアの移行

既存の`src/stores/`から必要なロジックを移行します。

**`app/stores/connection.ts`** (既存ロジックを移行):

```typescript
import { defineStore } from 'pinia'
import type { Connection } from '~/types'

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    connections: [] as Connection[],
    activeConnection: null as Connection | null
  }),

  actions: {
    async loadConnections() {
      // Tauri IPCでデータ取得
      const { invokeCommand } = useTauri()
      this.connections = await invokeCommand<Connection[]>('get_connections')
    },

    async createConnection(connection: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>) {
      const { invokeCommand } = useTauri()
      const newConnection = await invokeCommand<Connection>('create_connection', { connection })
      this.connections.push(newConnection)
      return newConnection
    },

    async deleteConnection(id: string) {
      const { invokeCommand } = useTauri()
      await invokeCommand('delete_connection', { id })
      this.connections = this.connections.filter(c => c.id !== id)
    }
  }
})
```

**成果物**: Piniaストア移行完了

---

#### 5.2.4 共通コンポーネント

**`app/components/common/EnvironmentHeader.vue`**:

```vue
<script setup lang="ts">
import type { Environment } from '~/types'

const props = defineProps<{
  environment: Environment
}>()

const environmentLabels = {
  development: '開発',
  test: 'テスト',
  staging: 'ステージング',
  production: '本番'
}

const environmentColors = {
  development: 'green',
  test: 'blue',
  staging: 'amber',
  production: 'red'
}
</script>

<template>
  <header :class="`env-${environment} p-4 border-b-4`">
    <div class="container mx-auto flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold">SQL Query Build</h1>
        <UBadge
          :color="environmentColors[environment]"
          size="lg"
          variant="solid"
        >
          {{ environmentLabels[environment] }}環境
        </UBadge>
      </div>
    </div>
  </header>
</template>
```

**成果物**: 共通コンポーネント実装

---

#### 5.2.5 ランチャーページ (接続管理)

**`app/pages/index.vue`**:

```vue
<script setup lang="ts">
const connectionStore = useConnectionStore()

onMounted(() => {
  connectionStore.loadConnections()
})

const navigateToConnectionForm = () => {
  navigateTo('/connection-form')
}
</script>

<template>
  <div>
    <EnvironmentHeader :environment="connectionStore.activeConnection?.environment || 'development'" />

    <div class="container mx-auto p-8">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">接続一覧</h2>
        <UButton
          icon="i-heroicons-plus"
          @click="navigateToConnectionForm"
        >
          新規接続
        </UButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ConnectionCard
          v-for="connection in connectionStore.connections"
          :key="connection.id"
          :connection="connection"
        />
      </div>
    </div>
  </div>
</template>
```

**`app/components/connection/ConnectionCard.vue`**:

```vue
<script setup lang="ts">
import type { Connection } from '~/types'

const props = defineProps<{
  connection: Connection
}>()

const environmentColors = {
  development: 'green',
  test: 'blue',
  staging: 'amber',
  production: 'red'
}

const databaseIcons = {
  mysql: 'i-heroicons-circle-stack',
  postgresql: 'i-heroicons-circle-stack',
  sqlite: 'i-heroicons-circle-stack',
  sqlserver: 'i-heroicons-circle-stack',
  oracle: 'i-heroicons-circle-stack'
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon :name="databaseIcons[connection.type]" class="text-xl" />
          <h3 class="font-semibold">{{ connection.name }}</h3>
        </div>
        <UBadge
          :color="environmentColors[connection.environment]"
          size="sm"
        >
          {{ connection.environment }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-2 text-sm">
      <p><span class="font-semibold">ホスト:</span> {{ connection.host }}:{{ connection.port }}</p>
      <p><span class="font-semibold">DB:</span> {{ connection.database }}</p>
      <p><span class="font-semibold">ユーザー:</span> {{ connection.username }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <UButton variant="solid" size="sm">接続</UButton>
        <UButton variant="outline" size="sm" icon="i-heroicons-pencil">編集</UButton>
        <UButton variant="outline" size="sm" icon="i-heroicons-trash" color="red">削除</UButton>
      </div>
    </template>
  </UCard>
</template>
```

**成果物**: ランチャーページ実装

---

#### 5.2.6 接続フォームページ

**`app/pages/connection-form.vue`**:

```vue
<script setup lang="ts">
import type { Connection, Environment, DatabaseType } from '~/types'

const connectionStore = useConnectionStore()

const form = reactive({
  name: '',
  type: 'mysql' as DatabaseType,
  environment: 'development' as Environment,
  host: 'localhost',
  port: 3306,
  username: '',
  database: ''
})

const submit = async () => {
  await connectionStore.createConnection(form)
  navigateTo('/')
}
</script>

<template>
  <div>
    <EnvironmentHeader :environment="form.environment" />

    <div class="container mx-auto p-8 max-w-2xl">
      <h2 class="text-2xl font-bold mb-6">新規接続</h2>

      <UForm :state="form" @submit="submit">
        <UCard>
          <div class="space-y-4">
            <UFormGroup label="接続名" required>
              <UInput v-model="form.name" placeholder="例: 本番MySQL" />
            </UFormGroup>

            <UFormGroup label="データベースタイプ" required>
              <USelect
                v-model="form.type"
                :options="[
                  { label: 'MySQL', value: 'mysql' },
                  { label: 'PostgreSQL', value: 'postgresql' },
                  { label: 'SQLite', value: 'sqlite' }
                ]"
              />
            </UFormGroup>

            <UFormGroup label="環境" required>
              <USelect
                v-model="form.environment"
                :options="[
                  { label: '開発', value: 'development' },
                  { label: 'テスト', value: 'test' },
                  { label: 'ステージング', value: 'staging' },
                  { label: '本番', value: 'production' }
                ]"
              />
            </UFormGroup>

            <div class="grid grid-cols-2 gap-4">
              <UFormGroup label="ホスト" required>
                <UInput v-model="form.host" />
              </UFormGroup>

              <UFormGroup label="ポート" required>
                <UInput v-model.number="form.port" type="number" />
              </UFormGroup>
            </div>

            <UFormGroup label="データベース名" required>
              <UInput v-model="form.database" />
            </UFormGroup>

            <UFormGroup label="ユーザー名" required>
              <UInput v-model="form.username" />
            </UFormGroup>
          </div>

          <template #footer>
            <div class="flex gap-2 justify-end">
              <UButton variant="outline" @click="navigateTo('/')">
                キャンセル
              </UButton>
              <UButton type="submit" variant="solid">
                保存
              </UButton>
            </div>
          </template>
        </UCard>
      </UForm>
    </div>
  </div>
</template>
```

**成果物**: 接続フォーム実装

---

### Phase 3: 詳細機能実装 (1週間)

#### 5.3.1 クエリビルダー

**`app/pages/query-builder.vue`**:

```vue
<script setup lang="ts">
// クエリビルダー実装
</script>

<template>
  <div>
    <EnvironmentHeader environment="development" />

    <div class="h-screen flex flex-col">
      <QueryBuilderToolbar />

      <div class="flex-1 grid grid-cols-12 gap-4 p-4">
        <!-- 左パネル: テーブルリスト -->
        <aside class="col-span-2 border rounded">
          <TablePanel />
        </aside>

        <!-- 中央パネル: テーブルリレーション -->
        <main class="col-span-7 border rounded">
          <TableRelationArea />
        </main>

        <!-- 右パネル: 条件・プレビュー -->
        <aside class="col-span-3 border rounded">
          <ConditionPanel />
          <SqlPreview />
        </aside>
      </div>
    </div>
  </div>
</template>
```

**成果物**: クエリビルダー実装

---

#### 5.3.2 設定ページ

**`app/pages/settings.vue`**:

```vue
<script setup lang="ts">
const settingsStore = useSettingsStore()
</script>

<template>
  <div>
    <EnvironmentHeader environment="development" />

    <div class="container mx-auto p-8 max-w-4xl">
      <h2 class="text-2xl font-bold mb-6">設定</h2>

      <UTabs
        :items="[
          { key: 'general', label: '一般' },
          { key: 'security', label: 'セキュリティ' },
          { key: 'about', label: 'について' }
        ]"
      >
        <template #item="{ item }">
          <GeneralSettings v-if="item.key === 'general'" />
          <SecuritySettings v-if="item.key === 'security'" />
          <AboutSection v-if="item.key === 'about'" />
        </template>
      </UTabs>
    </div>
  </div>
</template>
```

**成果物**: 設定ページ実装

---

#### 5.3.3 セキュリティ機能

**`app/components/security/MasterPasswordSetupDialog.vue`**:

```vue
<script setup lang="ts">
const isOpen = defineModel<boolean>()
const password = ref('')
const confirmPassword = ref('')

const setup = () => {
  // マスターパスワード設定
}
</script>

<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3 class="text-xl font-semibold">マスターパスワード設定</h3>
      </template>

      <div class="space-y-4">
        <UFormGroup label="パスワード">
          <UInput v-model="password" type="password" />
        </UFormGroup>

        <UFormGroup label="パスワード確認">
          <UInput v-model="confirmPassword" type="password" />
        </UFormGroup>

        <PasswordStrengthMeter :password="password" />
      </div>

      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton variant="outline" @click="isOpen = false">
            キャンセル
          </UButton>
          <UButton @click="setup">
            設定
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
```

**成果物**: セキュリティ機能実装

---

### Phase 4: テスト・最適化 (2-3日)

#### 5.4.1 テスト実装

```bash
# Vitestでコンポーネントテスト
npm run test
```

#### 5.4.2 パフォーマンス最適化

- Lazy loading
- Code splitting
- バンドルサイズ最適化

#### 5.4.3 最終確認

- ✅ 全機能動作確認
- ✅ Tauri統合テスト
- ✅ ビルドテスト

---

## 6. リスク管理

### 6.1 主要リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Tauri IPC互換性問題 | 高 | Phase 1で早期検証 |
| 機能実装漏れ | 中 | チェックリスト作成 |
| パフォーマンス劣化 | 中 | 継続的モニタリング |

---

## 7. 成功基準

### 7.1 機能完全性

- ✅ 既存の全機能が動作する
- ✅ Tauri IPCが正常動作する
- ✅ マルチウィンドウ対応

### 7.2 パフォーマンス

- ✅ 初期ロード < 2秒
- ✅ バンドルサイズ < 300KB

### 7.3 コード品質

- ✅ TypeScript型安全性
- ✅ テストカバレッジ > 70%

---

## 8. タイムライン

```
Week 1: Phase 1 (環境構築)
Week 2: Phase 2 (コア機能)
Week 3: Phase 3 (詳細機能) + Phase 4 (テスト)
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|----------|------|---------|--------|
| 2.0 | 2025-12-07 | フレッシュスタート方式で再作成 | Claude |

---

**承認**

- [ ] プロジェクトマネージャー承認
- [ ] 技術リード承認

---

**次のアクション**

1. 本計画書のレビュー・承認
2. `feature/nuxt-fresh-start`ブランチ作成
3. Phase 1開始
