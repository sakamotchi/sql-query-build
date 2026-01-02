import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultTable from '~/components/query-builder/result/ResultTable.vue'

describe('ResultTable', () => {
  const mockColumns = [
    { name: 'id', dataType: 'INT4', nullable: false },
    { name: 'name', dataType: 'TEXT', nullable: true },
  ]

  const mockRows = [
    { values: [1, 'Alice'] },
    { values: [2, null] },
  ]

  it('renders column headers', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: mockRows },
    })

    expect(wrapper.text()).toContain('id')
    expect(wrapper.text()).toContain('name')
  })

  it('renders rows correctly', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: mockRows },
    })

    expect(wrapper.text()).toContain('Alice')
  })

  it('displays NULL indicator for null values', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: mockRows },
    })

    expect(wrapper.text()).toContain('NULL')
  })

  it('shows empty message when no rows', () => {
    const wrapper = mount(ResultTable, {
      props: { columns: mockColumns, rows: [] },
    })

    expect(wrapper.text()).toContain('結果が0件です')
  })
})
