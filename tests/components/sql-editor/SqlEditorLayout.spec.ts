import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SqlEditorLayout from '~/components/sql-editor/SqlEditorLayout.vue'

const stubs = {
  SqlEditorToolbar: {
    template: '<div data-testid="toolbar"></div>',
  },
  SqlEditorSavedPanel: {
    template: '<div data-testid="saved-panel"></div>',
  },
  SqlTextEditor: {
    template: '<div data-testid="editor"></div>',
  },
  SqlEditorResultPanel: {
    template: '<div data-testid="result"></div>',
  },
  SqlEditorSaveDialog: {
    template: '<div data-testid="save-dialog"></div>',
  },
}

describe('SqlEditorLayout', () => {
  beforeEach(() => {
    // Piniaストアの初期化
    setActivePinia(createPinia())
  })

  it('レイアウト構成要素が表示される', () => {
    const wrapper = mount(SqlEditorLayout, {
      global: { stubs },
    })

    expect(wrapper.find('[data-testid="toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="saved-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="result"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="save-dialog"]').exists()).toBe(true)
  })
})
