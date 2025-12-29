# テストコード整備 - 設計書

## 方針

### 1. 削除対象

#### 完全削除
- `tests/api/connection.spec.ts` - 対応するソース（`app/api/connection.ts`）が存在しない
- `tests/utils/vuetifyStubs.ts` - Vuetifyは使用していない

#### 削除して再作成
- `tests/stores/theme.spec.ts` - 実装が大幅に変更
- `tests/composables/useTheme.spec.ts` - 実装が大幅に変更
- `tests/stores/settings.spec.ts` - 実装が大幅に変更
- `tests/components/EnvironmentHeader.spec.ts` - UIライブラリ変更
- `tests/components/EnvironmentSelector.spec.ts` - UIライブラリ変更
- `tests/components/ThemePreview.spec.ts` - UIライブラリ変更

### 2. 保持対象

以下のテストは現状で動作しており、保持する：
- `tests/api/window.spec.ts`
- `tests/api/security.spec.ts`
- `tests/composables/useWindow.spec.ts`
- `tests/stores/window.spec.ts`

### 3. 新規作成対象

優先度順：

#### 高優先度（コアロジック）
1. `tests/stores/theme.spec.ts` - テーマストアの新実装に合わせる
2. `tests/stores/settings.spec.ts` - 設定ストアの新実装に合わせる
3. `tests/stores/connection.spec.ts` - 接続管理ストア（新規）
4. `tests/stores/security.spec.ts` - セキュリティストア（新規）

#### 中優先度（Composables）
5. `tests/composables/useTheme.spec.ts` - テーマComposableの新実装
6. `tests/composables/useEnvironment.spec.ts` - 環境Composable（新規）
7. `tests/composables/useTauri.spec.ts` - TauriラッパーComposable（新規）

#### 低優先度（コンポーネント）
- コンポーネントテストはNuxt UI対応のセットアップが複雑なため、今回は対象外

## テスト設計

### tests/stores/theme.spec.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from '~/stores/theme'

// useTauriをモック
vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('ThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('デフォルト値を持つ', () => {
      const store = useThemeStore()
      expect(store.colorMode).toBe('auto')
      expect(store.primaryColor).toBe('#4CAF50')
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('getters', () => {
    it('currentColorModeがcolorModeを返す', () => {
      const store = useThemeStore()
      expect(store.currentColorMode).toBe('auto')
    })

    it('currentPrimaryColorがprimaryColorを返す', () => {
      const store = useThemeStore()
      expect(store.currentPrimaryColor).toBe('#4CAF50')
    })
  })

  describe('actions', () => {
    it('setColorModeがcolorModeを更新する', async () => {
      const store = useThemeStore()
      // ブラウザモードではTauriが利用不可なのでエラーになる可能性
      // モックを使用してテスト
    })
  })
})
```

### tests/stores/settings.spec.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '~/stores/settings'

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('SettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('デフォルト設定を持つ', () => {
      const store = useSettingsStore()
      expect(store.settings.theme).toBe('auto')
      expect(store.settings.language).toBe('ja')
      expect(store.settings.autoSave).toBe(true)
      expect(store.settings.windowRestore).toBe(true)
    })
  })

  describe('getters', () => {
    it('currentSettingsが設定オブジェクトを返す', () => {
      const store = useSettingsStore()
      expect(store.currentSettings).toEqual({
        theme: 'auto',
        language: 'ja',
        autoSave: true,
        windowRestore: true
      })
    })

    it('isAutoSaveEnabledがautoSaveを返す', () => {
      const store = useSettingsStore()
      expect(store.isAutoSaveEnabled).toBe(true)
    })
  })

  describe('actions', () => {
    it('loadSettingsがブラウザモードで早期リターンする', async () => {
      const store = useSettingsStore()
      await store.loadSettings()
      // エラーなく完了することを確認
      expect(store.error).toBeNull()
    })

    it('updateSettingsがブラウザモードでローカル状態を更新する', async () => {
      const store = useSettingsStore()
      const result = await store.updateSettings({ autoSave: false })
      expect(store.settings.autoSave).toBe(false)
      expect(result?.autoSave).toBe(false)
    })

    it('resetSettingsがブラウザモードでデフォルトに戻す', async () => {
      const store = useSettingsStore()
      store.settings.autoSave = false
      await store.resetSettings()
      expect(store.settings.autoSave).toBe(true)
    })
  })
})
```

### tests/stores/connection.spec.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConnectionStore } from '~/stores/connection'

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('ConnectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('空の接続リストを持つ', () => {
      const store = useConnectionStore()
      expect(store.connections).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  // 以下、接続管理のテストを追加
})
```

### tests/stores/security.spec.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSecurityStore } from '~/stores/security'

vi.mock('~/composables/useTauri', () => ({
  useTauri: () => ({
    invokeCommand: vi.fn(),
    isAvailable: { value: false }
  })
}))

describe('SecurityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // セキュリティストアのテスト
})
```

## テストユーティリティ

### tests/utils/nuxtStubs.ts（新規作成）

Nuxt UIコンポーネントをスタブ化するユーティリティ。
コンポーネントテストを追加する場合に使用。

```typescript
import { defineComponent, h } from 'vue'

const nuxtUiTags = [
  'UButton',
  'UBadge',
  'UIcon',
  'UInput',
  'USelect',
  // ... 必要に応じて追加
] as const

const createStubComponent = (name: string) =>
  defineComponent({
    name: `${name}Stub`,
    setup(_, { slots }) {
      return () => h('div', { class: 'nuxt-ui-stub', 'data-stub': name }, slots.default?.())
    }
  })

export const createNuxtUIStubs = () =>
  nuxtUiTags.reduce<Record<string, ReturnType<typeof defineComponent>>>((stubs, tag) => {
    stubs[tag] = createStubComponent(tag)
    return stubs
  }, {})
```

## ディレクトリ構造（整備後）

```
tests/
├── api/
│   ├── window.spec.ts        # 保持
│   └── security.spec.ts      # 保持
├── composables/
│   ├── useWindow.spec.ts     # 保持
│   ├── useTheme.spec.ts      # 新規作成
│   ├── useEnvironment.spec.ts # 新規作成（オプション）
│   └── useTauri.spec.ts      # 新規作成（オプション）
├── stores/
│   ├── window.spec.ts        # 保持
│   ├── theme.spec.ts         # 新規作成
│   ├── settings.spec.ts      # 新規作成
│   ├── connection.spec.ts    # 新規作成
│   └── security.spec.ts      # 新規作成
└── utils/
    └── nuxtStubs.ts          # 新規作成（将来のコンポーネントテスト用）
```

## 削除するファイル

```
tests/
├── api/
│   └── connection.spec.ts    # 削除
├── components/
│   ├── EnvironmentHeader.spec.ts   # 削除
│   ├── EnvironmentSelector.spec.ts # 削除
│   └── ThemePreview.spec.ts        # 削除
└── utils/
    └── vuetifyStubs.ts       # 削除
```
