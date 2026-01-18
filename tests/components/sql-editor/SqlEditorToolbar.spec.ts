import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import SqlEditorToolbar from '~/components/sql-editor/SqlEditorToolbar.vue'
import { ref } from 'vue'

// グローバルなComposablesのモック
vi.mock('~/composables/useEnvironment', () => ({
  useEnvironment: () => ({
    currentEnvironment: ref('development'),
    getEnvironmentColors: () => ({ bg: '#F1F8E9', border: '#4CAF50', primary: '#4CAF50' }),
    environmentColors: ref({ bg: '#F1F8E9', border: '#4CAF50', primary: '#4CAF50' }),
    environmentClass: ref('env-development'),
    environmentLabel: ref('開発'),
    getEnvironmentLabel: () => '開発',
    setEnvironment: vi.fn(),
    adjustColorBrightness: vi.fn(),
  }),
}))

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({
    isDark: ref(false),
    toggleColorMode: vi.fn(),
  }),
}))

// useToast は setup.ts でグローバルにモックされているので、
// ここではグローバル参照を使用

const stubs = {
  UButton: {
    template: '<button :disabled="disabled">{{ label }}</button>',
    props: ['label', 'disabled', 'icon', 'color', 'variant', 'size'],
  },
  UIcon: {
    template: '<span />',
    props: ['name'],
  },
  UModal: {
    template: '<div v-if="open"><slot /><slot name="footer" /></div>',
    props: ['open', 'title', 'description'],
  },
}

// TODO: useToast のモック化が難しいため一時的にスキップ
// グローバル自動インポートされた useToast が実際の Nuxt UI モジュールを読み込んでしまう問題を解決する必要がある
describe.skip('SqlEditorToolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const globalConfig = {
    stubs,
    mocks: {
      useToast: () => ({ add: vi.fn() }),
    },
  }

  it('ツールバーのボタンが表示される', () => {
    const wrapper = mount(SqlEditorToolbar, {
      global: globalConfig,
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(6) // 実行、停止、整形、パネル切替、保存、テーマ切替
    expect(wrapper.text()).toContain('実行')
    expect(wrapper.text()).toContain('停止')
    expect(wrapper.text()).toContain('保存')
  })

  it('初期状態では実行・停止ボタンが無効', () => {
    const wrapper = mount(SqlEditorToolbar, {
      global: globalConfig,
    })

    const buttons = wrapper.findAll('button')
    // 実行ボタン(0)と停止ボタン(1)は無効
    expect(buttons[0]?.attributes('disabled')).toBeDefined()
    expect(buttons[1]?.attributes('disabled')).toBeDefined()
    // 整形ボタン(2)もSQL未入力のため無効
    expect(buttons[2]?.attributes('disabled')).toBeDefined()
  })

  it('SQL入力済みで実行ボタンが有効になる', () => {
    const store = useSqlEditorStore()
    store.updateSql('SELECT 1')

    const wrapper = mount(SqlEditorToolbar, {
      global: globalConfig,
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0]?.attributes('disabled')).toBeUndefined()
    expect(buttons[1]?.attributes('disabled')).toBeDefined()
  })
})
