# useWindowコンポーザブル 詳細設計書

**優先度**: 🟡 中
**工数**: 1-2時間
**依存関係**: WindowContext型定義とストア拡張

---

## 目的

ウィンドウ操作のロジックを一元化し、コンポーネント間で再利用可能にする。これにより:

- コードの重複を削減
- テスタビリティの向上
- ブラウザモード（`npm run dev`）でもエラーが出ないように抽象化
- ウィンドウ操作の一貫したインターフェース提供

---

## 設計方針

### シンプルさ重視

元の設計書（1.5.3）には以下の機能がありますが、現時点では不要:

- ❌ イベントリスナーの設定（`tauri://focus`, `tauri://blur`）
- ❌ `openWindows` リストの常時管理
- ❌ `refreshWindowList()` の自動呼び出し
- ❌ `onMounted`/`onUnmounted` でのライフサイクル管理

### 最小限の実装

必要な機能のみ提供:

- ✅ ウィンドウコンテキストへのアクセス
- ✅ クエリビルダーウィンドウを開く（既存があればフォーカス）
- ✅ 設定ウィンドウを開く
- ✅ 接続コンテキストの設定

---

## インターフェース設計

### 返却値の型

```typescript
interface UseWindowReturn {
  // --- 状態（computed） ---
  /** 現在の接続ID */
  connectionId: ComputedRef<string | undefined>

  /** 現在の環境 */
  environment: ComputedRef<Environment | undefined>

  /** クエリビルダーウィンドウかどうか */
  isQueryBuilder: ComputedRef<boolean>

  /** ランチャーウィンドウかどうか */
  isLauncher: ComputedRef<boolean>

  /** 設定ウィンドウかどうか */
  isSettings: ComputedRef<boolean>

  // --- アクション（メソッド） ---
  /**
   * クエリビルダーウィンドウを開く
   * 既存のウィンドウがあればフォーカス、なければ新規作成
   */
  openQueryBuilder: (
    connectionId: string,
    connectionName: string,
    environment: Environment | string
  ) => Promise<WindowInfo | null>

  /**
   * 設定ウィンドウを開く
   */
  openSettings: () => Promise<WindowInfo | null>

  /**
   * 接続コンテキストを設定
   */
  setConnectionContext: (
    connectionId: string,
    environment: Environment
  ) => void
}
```

---

## 実装

### ファイル構成

```
app/composables/useWindow.ts  # 新規作成
```

### 完全なコード

```typescript
import { computed } from 'vue'
import { useWindowStore } from '~/stores/window'
import { windowApi } from '~/api/window'
import type { WindowInfo, Environment } from '~/types'

/**
 * ウィンドウ操作コンポーザブル
 *
 * ウィンドウの開閉、コンテキスト管理などを提供する。
 * ブラウザモードでもエラーが出ないように設計されている。
 *
 * @example
 * ```vue
 * <script setup>
 * const { openQueryBuilder, isQueryBuilder, connectionId } = useWindow()
 *
 * async function handleConnect(connection) {
 *   await openQueryBuilder(connection.id, connection.name, connection.environment)
 * }
 * </script>
 * ```
 */
export function useWindow() {
  const store = useWindowStore()

  // =========================================
  // 状態（Computed）
  // =========================================

  /**
   * 現在の接続ID
   */
  const connectionId = computed(() => store.currentConnectionId)

  /**
   * 現在の環境
   */
  const environment = computed(() => store.currentEnvironment)

  /**
   * クエリビルダーウィンドウかどうか
   */
  const isQueryBuilder = computed(() => store.isQueryBuilder)

  /**
   * ランチャーウィンドウかどうか
   */
  const isLauncher = computed(() => store.isLauncher)

  /**
   * 設定ウィンドウかどうか
   */
  const isSettings = computed(() => store.isSettings)

  // =========================================
  // アクション（メソッド）
  // =========================================

  /**
   * クエリビルダーウィンドウを開く
   *
   * 既存のウィンドウがあればフォーカスし、なければ新規作成する。
   * これにより、同じ接続に対して複数のウィンドウが開かれることを防ぐ。
   *
   * @param connectionId - 接続ID
   * @param connectionName - 接続名（ウィンドウタイトル用）
   * @param environment - 環境タイプ
   * @returns ウィンドウ情報、失敗時はnull
   *
   * @example
   * ```typescript
   * const info = await openQueryBuilder('conn-123', 'MyDB', 'development')
   * if (info) {
   *   console.log('Window opened:', info.label)
   * }
   * ```
   */
  const openQueryBuilder = async (
    connectionId: string,
    connectionName: string,
    environment: Environment | string
  ): Promise<WindowInfo | null> => {
    try {
      // 既存ウィンドウを検索
      const existing = await windowApi.findWindowByConnection(connectionId)

      if (existing) {
        // 既存ウィンドウにフォーカス
        await windowApi.focusWindow(existing.label)
        console.log('[useWindow] Focused existing window:', existing.label)
        return existing
      }

      // 新規ウィンドウを作成
      const info = await windowApi.openQueryBuilder(
        connectionId,
        connectionName,
        environment
      )
      console.log('[useWindow] Opened new window:', info.label)
      return info
    } catch (error) {
      console.error('[useWindow] Failed to open query builder:', error)
      return null
    }
  }

  /**
   * 設定ウィンドウを開く
   *
   * @returns ウィンドウ情報、失敗時はnull
   *
   * @example
   * ```typescript
   * const info = await openSettings()
   * ```
   */
  const openSettings = async (): Promise<WindowInfo | null> => {
    try {
      const info = await windowApi.openSettings()
      console.log('[useWindow] Opened settings window:', info.label)
      return info
    } catch (error) {
      console.error('[useWindow] Failed to open settings:', error)
      return null
    }
  }

  /**
   * 接続コンテキストを設定
   *
   * クエリビルダー画面のonMountedなどで呼び出し、
   * 現在のウィンドウがどの接続に紐づいているかを設定する。
   *
   * @param connectionId - 接続ID
   * @param environment - 環境タイプ
   *
   * @example
   * ```typescript
   * onMounted(() => {
   *   setConnectionContext('conn-123', 'development')
   * })
   * ```
   */
  const setConnectionContext = (
    connectionId: string,
    environment: Environment
  ): void => {
    store.setConnectionContext(connectionId, environment)
    console.log('[useWindow] Connection context set:', { connectionId, environment })
  }

  // =========================================
  // 返却
  // =========================================

  return {
    // 状態
    connectionId,
    environment,
    isQueryBuilder,
    isLauncher,
    isSettings,

    // アクション
    openQueryBuilder,
    openSettings,
    setConnectionContext,
  }
}
```

---

## 使用例

### ランチャー画面での使用

```vue
<!-- app/pages/index.vue (ランチャー画面) -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWindow } from '~/composables/useWindow'
import { useConnectionStore } from '~/stores/connection'

const { openQueryBuilder, openSettings } = useWindow()
const connectionStore = useConnectionStore()

const connections = ref([])

onMounted(async () => {
  await connectionStore.loadConnections()
  connections.value = connectionStore.connections
})

// 接続ボタンクリック時
async function handleConnect(connection) {
  const result = await openQueryBuilder(
    connection.id,
    connection.name,
    connection.environment
  )

  if (!result) {
    // エラーハンドリング
    alert('ウィンドウを開けませんでした')
  }
}

// 設定ボタンクリック時
async function handleOpenSettings() {
  await openSettings()
}
</script>

<template>
  <div class="launcher">
    <header>
      <h1>SQL Query Builder</h1>
      <button @click="handleOpenSettings">設定</button>
    </header>

    <div class="connections">
      <div
        v-for="conn in connections"
        :key="conn.id"
        class="connection-card"
      >
        <h3>{{ conn.name }}</h3>
        <p>{{ conn.environment }}</p>
        <button @click="handleConnect(conn)">
          接続
        </button>
      </div>
    </div>
  </div>
</template>
```

### クエリビルダー画面での使用

```vue
<!-- app/pages/query-builder.vue -->
<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWindow } from '~/composables/useWindow'
import { useConnectionStore } from '~/stores/connection'
import { useThemeStore } from '~/stores/theme'

const route = useRoute()
const { setConnectionContext, connectionId, environment, isQueryBuilder } = useWindow()
const connectionStore = useConnectionStore()
const themeStore = useThemeStore()

// 接続情報を取得
const connection = computed(() => {
  if (connectionId.value) {
    return connectionStore.getConnectionById(connectionId.value)
  }
  return null
})

onMounted(async () => {
  // URLパラメータから接続IDを取得
  const connId = route.query.connectionId as string

  if (connId) {
    await connectionStore.loadConnections()
    const conn = connectionStore.getConnectionById(connId)

    if (conn) {
      // コンテキストを設定
      setConnectionContext(conn.id, conn.environment)

      // 環境別テーマを適用
      themeStore.applyEnvironmentTheme(conn.environment)
    }
  }
})
</script>

<template>
  <div v-if="isQueryBuilder" class="query-builder">
    <header>
      <h1>{{ connection?.name }}</h1>
      <span class="environment-badge">{{ environment }}</span>
    </header>

    <!-- クエリエディタなど -->
  </div>
</template>
```

### コンポーネントでの使用

```vue
<!-- app/components/WindowInfo.vue -->
<script setup lang="ts">
import { useWindow } from '~/composables/useWindow'

const { isLauncher, isQueryBuilder, isSettings, connectionId, environment } = useWindow()
</script>

<template>
  <div class="window-info">
    <p v-if="isLauncher">ランチャーウィンドウ</p>
    <p v-if="isQueryBuilder">
      クエリビルダー - {{ connectionId }} ({{ environment }})
    </p>
    <p v-if="isSettings">設定ウィンドウ</p>
  </div>
</template>
```

---

## テスト設計

### ユニットテスト

**ファイル**: `tests/composables/useWindow.spec.ts` (新規作成)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWindow } from '~/composables/useWindow'
import { useWindowStore } from '~/stores/window'
import { windowApi } from '~/api/window'
import type { WindowInfo } from '~/types'

vi.mock('~/api/window', () => ({
  windowApi: {
    findWindowByConnection: vi.fn(),
    openQueryBuilder: vi.fn(),
    openSettings: vi.fn(),
    focusWindow: vi.fn(),
  },
}))

const windowApiMock = vi.mocked(windowApi)

const mockWindowInfo: WindowInfo = {
  label: 'query-builder-123',
  title: 'Test DB',
  windowType: 'query_builder',
  connectionId: '123',
  focused: true,
  visible: true,
}

describe('useWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('状態', () => {
    it('connectionIdがストアの値を返す', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'test',
        windowType: 'query_builder',
        connectionId: 'conn-123',
      }

      const { connectionId } = useWindow()

      expect(connectionId.value).toBe('conn-123')
    })

    it('isQueryBuilderがウィンドウタイプを正しく判定', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'test',
        windowType: 'query_builder',
      }

      const { isQueryBuilder, isLauncher } = useWindow()

      expect(isQueryBuilder.value).toBe(true)
      expect(isLauncher.value).toBe(false)
    })
  })

  describe('openQueryBuilder', () => {
    it('既存ウィンドウがある場合はフォーカスする', async () => {
      windowApiMock.findWindowByConnection.mockResolvedValueOnce(mockWindowInfo)

      const { openQueryBuilder } = useWindow()
      const result = await openQueryBuilder('123', 'Test DB', 'development')

      expect(windowApiMock.findWindowByConnection).toHaveBeenCalledWith('123')
      expect(windowApiMock.focusWindow).toHaveBeenCalledWith('query-builder-123')
      expect(windowApiMock.openQueryBuilder).not.toHaveBeenCalled()
      expect(result).toEqual(mockWindowInfo)
    })

    it('既存ウィンドウがない場合は新規作成する', async () => {
      windowApiMock.findWindowByConnection.mockResolvedValueOnce(null)
      windowApiMock.openQueryBuilder.mockResolvedValueOnce(mockWindowInfo)

      const { openQueryBuilder } = useWindow()
      const result = await openQueryBuilder('123', 'Test DB', 'development')

      expect(windowApiMock.findWindowByConnection).toHaveBeenCalledWith('123')
      expect(windowApiMock.openQueryBuilder).toHaveBeenCalledWith('123', 'Test DB', 'development')
      expect(windowApiMock.focusWindow).not.toHaveBeenCalled()
      expect(result).toEqual(mockWindowInfo)
    })

    it('エラー時はnullを返す', async () => {
      windowApiMock.findWindowByConnection.mockRejectedValueOnce(new Error('Test error'))

      const { openQueryBuilder } = useWindow()
      const result = await openQueryBuilder('123', 'Test DB', 'development')

      expect(result).toBeNull()
    })
  })

  describe('setConnectionContext', () => {
    it('ストアのsetConnectionContextを呼び出す', () => {
      const store = useWindowStore()
      store.currentContext = {
        windowLabel: 'test',
        windowType: 'query_builder',
      }

      const { setConnectionContext } = useWindow()
      setConnectionContext('conn-123', 'development')

      expect(store.currentConnectionId).toBe('conn-123')
      expect(store.currentEnvironment).toBe('development')
    })
  })
})
```

---

## エラーハンドリング

### ブラウザモード対応

Tauri APIは自動的にエラーを投げるため、try-catchで処理:

```typescript
const openQueryBuilder = async (...) => {
  try {
    const existing = await windowApi.findWindowByConnection(connectionId)
    // ...
  } catch (error) {
    console.error('[useWindow] Failed to open query builder:', error)
    return null  // ブラウザモードではここに到達
  }
}
```

### 呼び出し側でのエラーハンドリング

```vue
<script setup>
const { openQueryBuilder } = useWindow()

async function handleConnect(connection) {
  const result = await openQueryBuilder(
    connection.id,
    connection.name,
    connection.environment
  )

  if (!result) {
    // エラー表示
    showErrorToast('ウィンドウを開けませんでした')
  }
}
</script>
```

---

## チェックリスト

実装完了の確認項目:

- [ ] `app/composables/useWindow.ts` を作成
- [ ] 全ての状態（computed）を実装
- [ ] 全てのアクション（メソッド）を実装
- [ ] JSDocコメントを追加
- [ ] `tests/composables/useWindow.spec.ts` を作成
- [ ] テストが全て通過することを確認
- [ ] TypeScriptの型チェックが通ることを確認
- [ ] ブラウザモードでエラーが出ないことを確認

---

## 次のステップ

1. この設計書に従って実装
2. テストを実行して動作確認
3. [03_初期化ロジック.md](./03_初期化ロジック.md) に進む（オプション）
