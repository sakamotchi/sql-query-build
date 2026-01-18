import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import SqlEditorToolbar from '~/components/sql-editor/SqlEditorToolbar.vue'

const stubs = {
  UButton: {
    template: '<button :disabled="disabled">{{ label }}</button>',
    props: ['label', 'disabled', 'icon', 'color', 'variant'],
  },
}

describe('SqlEditorToolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ツールバーのボタンが表示される', () => {
    const wrapper = mount(SqlEditorToolbar, {
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    expect(wrapper.text()).toContain('実行')
    expect(wrapper.text()).toContain('停止')
    expect(wrapper.text()).toContain('保存')
  })

  it('初期状態では実行・停止ボタンが無効', () => {
    const wrapper = mount(SqlEditorToolbar, {
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0]?.attributes('disabled')).toBeDefined()
    expect(buttons[1]?.attributes('disabled')).toBeDefined()
    expect(buttons[2]?.attributes('disabled')).toBeDefined()
  })

  it('SQL入力済みで実行ボタンが有効になる', () => {
    const store = useSqlEditorStore()
    store.updateSql('SELECT 1')

    const wrapper = mount(SqlEditorToolbar, {
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0]?.attributes('disabled')).toBeUndefined()
    expect(buttons[1]?.attributes('disabled')).toBeDefined()
  })
})
