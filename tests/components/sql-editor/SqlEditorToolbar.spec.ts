import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
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

  it('ボタンが無効状態で表示される', () => {
    const wrapper = mount(SqlEditorToolbar, {
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    buttons.forEach((button) => {
      expect(button.attributes('disabled')).toBeDefined()
    })
  })
})
