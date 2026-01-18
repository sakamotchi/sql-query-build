import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useSqlEditorStore } from '~/stores/sql-editor'
import ResultPanel from '~/components/sql-editor/ResultPanel.vue'

const stubs = {
  UIcon: { template: '<span />' },
  UAlert: { template: '<div><slot /></div>', props: ['title', 'color', 'variant', 'icon'] },
  ResultTable: { template: '<div data-testid="result-table"></div>' },
}

describe('ResultPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初期状態で案内文が表示される', () => {
    const wrapper = mount(ResultPanel, {
      global: { stubs },
    })

    expect(wrapper.text()).toContain('クエリを実行してください')
  })

  it('結果がある場合にテーブルと統計が表示される', () => {
    const store = useSqlEditorStore()
    store.result = {
      columns: [{ name: 'id', dataType: 'int', nullable: false }],
      rows: [{ values: [1] }],
      rowCount: 1,
      executionTimeMs: 25,
      warnings: [],
    }

    const wrapper = mount(ResultPanel, {
      global: { stubs },
    })

    expect(wrapper.find('[data-testid="result-table"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('実行時間')
    expect(wrapper.text()).toContain('取得件数')
  })
})
