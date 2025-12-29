# WindowContext型定義とストア拡張 詳細設計書

**優先度**: 🔴 高
**工数**: 1-2時間
**依存関係**: なし

---

## 目的

各ウィンドウが自身の役割と関連する接続情報を把握できるようにする。これにより:

- クエリビルダー画面で「どの接続に対するクエリか」を把握
- 環境別のテーマカラーを適用
- ウィンドウタイトルの動的生成

---

## 型定義

### WindowContext インターフェース

**ファイル**: `app/types/index.ts`

**追加内容**:

```typescript
/**
 * ウィンドウコンテキスト（各ウィンドウ固有の状態）
 */
export interface WindowContext {
  /** ウィンドウラベル（Tauriのウィンドウ識別子） */
  windowLabel: string

  /** ウィンドウの種類 */
  windowType: WindowType

  /** 関連する接続ID（クエリビルダーの場合のみ） */
  connectionId?: string

  /** 環境タイプ（クエリビルダーの場合のみ） */
  environment?: Environment
}
```

**既存の型との関係**:

```typescript
// 既存の WindowInfo (Tauriから返却される情報)
export interface WindowInfo {
  label: string
  title: string
  windowType: WindowType
  connectionId: string | null
  focused: boolean
  visible: boolean
}

// 既存の WindowState (永続化用の位置・サイズ情報)
export interface WindowState {
  id: string
  connectionId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isMaximized: boolean
  createdAt: string
}

// 新規の WindowContext (現在のウィンドウのコンテキスト)
export interface WindowContext {
  windowLabel: string
  windowType: WindowType
  connectionId?: string
  environment?: Environment
}
```

**設計ポイント**:

- `WindowInfo`: Tauriバックエンドから取得するウィンドウメタデータ
- `WindowState`: ウィンドウの位置・サイズの永続化用
- `WindowContext`: フロントエンドで管理する現在のウィンドウの役割情報

---

## ストア拡張

### 現在の実装（変更なし）

```typescript
// app/stores/window.ts
export const useWindowStore = defineStore('window', {
  state: () => ({
    windows: [] as WindowState[],  // 永続化用（このまま維持）
    loading: false,
    error: null as string | null
  }),

  // getters, actions...
})
```

### 追加する状態

```typescript
state: () => ({
  // 既存（変更なし）
  windows: [] as WindowState[],
  loading: false,
  error: null as string | null,

  // ✨ 新規追加
  currentContext: null as WindowContext | null,
})
```

### 追加するgetters

```typescript
getters: {
  // 既存（変更なし）
  getWindowByConnectionId: (state) => (connectionId: string) =>
    state.windows.find((windowState) => windowState.connectionId === connectionId),
  allWindows: (state) => state.windows,

  // ✨ 新規追加
  /**
   * 現在のウィンドウラベル
   */
  currentWindowLabel(state): string | undefined {
    return state.currentContext?.windowLabel
  },

  /**
   * 現在の接続ID
   */
  currentConnectionId(state): string | undefined {
    return state.currentContext?.connectionId
  },

  /**
   * 現在の環境
   */
  currentEnvironment(state): Environment | undefined {
    return state.currentContext?.environment
  },

  /**
   * ランチャーウィンドウかどうか
   */
  isLauncher(state): boolean {
    return state.currentContext?.windowType === 'launcher'
  },

  /**
   * クエリビルダーウィンドウかどうか
   */
  isQueryBuilder(state): boolean {
    return state.currentContext?.windowType === 'query_builder'
  },

  /**
   * 設定ウィンドウかどうか
   */
  isSettings(state): boolean {
    return state.currentContext?.windowType === 'settings'
  },
}
```

### 追加するactions

```typescript
actions: {
  // 既存のactions（変更なし）
  async loadWindows() { /* ... */ },
  async saveWindowState() { /* ... */ },
  async restoreWindows() { /* ... */ },
  async deleteWindow() { /* ... */ },

  // ✨ 新規追加
  /**
   * ウィンドウコンテキストを設定
   *
   * @param context - 設定するコンテキスト（一部のみでも可）
   */
  setContext(context: Partial<WindowContext>) {
    if (this.currentContext) {
      this.currentContext = {
        ...this.currentContext,
        ...context,
      }
    } else {
      // currentContextが未初期化の場合は新規作成
      // windowLabelとwindowTypeは必須
      this.currentContext = context as WindowContext
    }
  },

  /**
   * 接続情報を設定
   *
   * @param connectionId - 接続ID
   * @param environment - 環境タイプ
   *
   * @example
   * // クエリビルダー画面のonMountedで呼び出す
   * windowStore.setConnectionContext('conn-123', 'development')
   */
  setConnectionContext(connectionId: string, environment: Environment) {
    this.setContext({
      connectionId,
      environment,
    })
  },

  /**
   * コンテキストをリセット
   */
  resetContext() {
    this.currentContext = null
  },
}
```

---

## 実装ファイル

### app/types/index.ts

**変更内容**: 既存ファイルに `WindowContext` インターフェースを追加

```typescript
// ... 既存の型定義 ...

/**
 * ウィンドウコンテキスト（各ウィンドウ固有の状態）
 */
export interface WindowContext {
  /** ウィンドウラベル（Tauriのウィンドウ識別子） */
  windowLabel: string

  /** ウィンドウの種類 */
  windowType: WindowType

  /** 関連する接続ID（クエリビルダーの場合のみ） */
  connectionId?: string

  /** 環境タイプ（クエリビルダーの場合のみ） */
  environment?: Environment
}
```

**位置**: `WindowState` インターフェースの後に追加（既存の型定義との整合性のため）

### app/stores/window.ts

**変更内容**: 既存ファイルに状態、getters、actionsを追加

<details>
<summary>完全なコード（クリックで展開）</summary>

```typescript
import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { WindowState, WindowContext, Environment } from '~/types'

export const useWindowStore = defineStore('window', {
  state: () => ({
    // 既存
    windows: [] as WindowState[],
    loading: false,
    error: null as string | null,

    // 新規追加
    currentContext: null as WindowContext | null,
  }),

  getters: {
    // 既存
    getWindowByConnectionId: (state) => (connectionId: string) =>
      state.windows.find((windowState) => windowState.connectionId === connectionId),
    allWindows: (state) => state.windows,

    // 新規追加
    currentWindowLabel(state): string | undefined {
      return state.currentContext?.windowLabel
    },

    currentConnectionId(state): string | undefined {
      return state.currentContext?.connectionId
    },

    currentEnvironment(state): Environment | undefined {
      return state.currentContext?.environment
    },

    isLauncher(state): boolean {
      return state.currentContext?.windowType === 'launcher'
    },

    isQueryBuilder(state): boolean {
      return state.currentContext?.windowType === 'query_builder'
    },

    isSettings(state): boolean {
      return state.currentContext?.windowType === 'settings'
    },
  },

  actions: {
    // 既存（変更なし）
    async loadWindows() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        this.windows = await invokeCommand<WindowState[]>('get_windows')
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load windows'
        console.error('Failed to load windows:', error)
      } finally {
        this.loading = false
      }
    },

    async saveWindowState(windowState: Omit<WindowState, 'id' | 'createdAt'>) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        const saved = await invokeCommand<WindowState>('save_window_state', { windowState })

        const index = this.windows.findIndex((window) => window.connectionId === windowState.connectionId)
        if (index !== -1) {
          this.windows[index] = saved
        } else {
          this.windows.push(saved)
        }

        return saved
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save window state'
        console.error('Failed to save window state:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async restoreWindows() {
      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('restore_windows')
      } catch (error) {
        console.error('Failed to restore windows:', error)
        throw error
      }
    },

    async deleteWindow(id: string) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('delete_window', { id })
        this.windows = this.windows.filter((windowState) => windowState.id !== id)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete window'
        console.error('Failed to delete window:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 新規追加
    setContext(context: Partial<WindowContext>) {
      if (this.currentContext) {
        this.currentContext = {
          ...this.currentContext,
          ...context,
        }
      } else {
        this.currentContext = context as WindowContext
      }
    },

    setConnectionContext(connectionId: string, environment: Environment) {
      this.setContext({
        connectionId,
        environment,
      })
    },

    resetContext() {
      this.currentContext = null
    },
  }
})
```

</details>

---

## 使用例

### クエリビルダー画面での使用

```vue
<!-- app/pages/query-builder.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWindowStore } from '~/stores/window'
import { useConnectionStore } from '~/stores/connection'

const route = useRoute()
const windowStore = useWindowStore()
const connectionStore = useConnectionStore()

onMounted(async () => {
  // URLパラメータから接続IDを取得
  const connId = route.query.connectionId as string

  if (connId) {
    // 接続情報を取得
    await connectionStore.loadConnections()
    const connection = connectionStore.getConnectionById(connId)

    if (connection) {
      // ウィンドウコンテキストに接続情報を設定
      windowStore.setConnectionContext(connection.id, connection.environment)

      console.log('Window context set:', {
        connectionId: connection.id,
        environment: connection.environment,
      })
    }
  }
})
</script>

<template>
  <div class="query-builder">
    <div v-if="windowStore.currentConnectionId">
      <!-- 接続IDと環境をヘッダーに表示 -->
      <header>
        接続ID: {{ windowStore.currentConnectionId }}
        環境: {{ windowStore.currentEnvironment }}
      </header>
    </div>

    <!-- クエリビルダーの内容 -->
  </div>
</template>
```

### テーマ適用での使用

```vue
<!-- app/components/EnvironmentTheme.vue -->
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWindowStore } from '~/stores/window'
import { useThemeStore } from '~/stores/theme'

const windowStore = useWindowStore()
const themeStore = useThemeStore()

// 現在の環境を監視してテーマを適用
watch(
  () => windowStore.currentEnvironment,
  (environment) => {
    if (environment) {
      themeStore.applyEnvironmentTheme(environment)
    }
  },
  { immediate: true }
)
</script>
```

---

## テスト設計

### ユニットテスト

**ファイル**: `tests/stores/window.spec.ts`

既存のテストに以下を追加:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWindowStore } from '~/stores/window'

describe('WindowStore - Context Management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setConnectionContextで接続情報を設定できる', () => {
    const store = useWindowStore()

    // 初期状態
    expect(store.currentContext).toBeNull()

    // コンテキストを設定
    store.currentContext = {
      windowLabel: 'query-builder-123',
      windowType: 'query_builder',
    }

    store.setConnectionContext('conn-123', 'development')

    // 設定されたことを確認
    expect(store.currentConnectionId).toBe('conn-123')
    expect(store.currentEnvironment).toBe('development')
  })

  it('isQueryBuilderがウィンドウタイプを正しく判定する', () => {
    const store = useWindowStore()

    store.currentContext = {
      windowLabel: 'query-builder-123',
      windowType: 'query_builder',
    }

    expect(store.isQueryBuilder).toBe(true)
    expect(store.isLauncher).toBe(false)
    expect(store.isSettings).toBe(false)
  })

  it('isLauncherがウィンドウタイプを正しく判定する', () => {
    const store = useWindowStore()

    store.currentContext = {
      windowLabel: 'launcher',
      windowType: 'launcher',
    }

    expect(store.isLauncher).toBe(true)
    expect(store.isQueryBuilder).toBe(false)
    expect(store.isSettings).toBe(false)
  })

  it('resetContextでコンテキストをクリアできる', () => {
    const store = useWindowStore()

    store.currentContext = {
      windowLabel: 'test',
      windowType: 'launcher',
    }

    store.resetContext()

    expect(store.currentContext).toBeNull()
    expect(store.currentConnectionId).toBeUndefined()
  })
})
```

---

## チェックリスト

実装完了の確認項目:

- [ ] `app/types/index.ts` に `WindowContext` インターフェースを追加
- [ ] `app/stores/window.ts` に `currentContext` 状態を追加
- [ ] `app/stores/window.ts` に新しいgettersを追加（6個）
- [ ] `app/stores/window.ts` に新しいactionsを追加（3個）
- [ ] `tests/stores/window.spec.ts` にテストを追加
- [ ] テストが全て通過することを確認
- [ ] TypeScriptの型チェックが通ることを確認

---

## 次のステップ

1. この設計書に従って実装
2. テストを実行して動作確認
3. [02_useWindowコンポーザブル.md](./02_useWindowコンポーザブル.md) に進む
