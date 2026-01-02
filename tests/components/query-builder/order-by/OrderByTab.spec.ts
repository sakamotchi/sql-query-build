import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import OrderByTab from '~/components/query-builder/order-by/OrderByTab.vue'
import { nuxtUiStubs } from '../../../utils/nuxt-ui-stubs'

const regenerateSql = vi.fn()
const updateOrderByColumns = vi.fn()
const addOrderByColumn = vi.fn()
const removeOrderByColumn = vi.fn()

const storeState = reactive({
  selectedTables: [] as Array<any>,
  orderByColumns: [] as Array<any>,
  regenerateSql,
  updateOrderByColumns,
  addOrderByColumn,
  removeOrderByColumn,
})

vi.mock('@/stores/query-builder', () => ({
  useQueryBuilderStore: () => storeState,
}))

const stubs = {
  ...nuxtUiStubs,
  UButton: {
    template: '<button :data-label="label" @click="$emit(\'click\')"></button>',
    emits: ['click'],
    props: ['color', 'variant', 'icon', 'size', 'label'],
  },
  OrderByRow: {
    name: 'OrderByRow',
    template: '<div><button data-test="remove-row" @click="$emit(\'remove\')"></button></div>',
    props: ['item', 'availableColumns'],
    emits: ['remove', 'change'],
  },
  draggable: {
    name: 'draggable',
    props: ['modelValue'],
    emits: ['update:modelValue', 'end'],
    template: `
      <div>
        <slot name="item" v-for="element in modelValue" :element="element" :key="element.id" />
      </div>
    `,
  },
}

const mountComponent = () =>
  mount(OrderByTab, {
    global: {
      stubs,
    },
  })

describe('OrderByTab', () => {
  beforeEach(() => {
    storeState.selectedTables = []
    storeState.orderByColumns = []
    regenerateSql.mockReset()
    updateOrderByColumns.mockReset()
    addOrderByColumn.mockReset()
    removeOrderByColumn.mockReset()
  })

  it('テーブルがない場合は空状態を表示する', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('テーブルを選択してください')
  })

  it('ORDER BYカラムを追加できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', alias: 'u', name: 'users', columns: [] },
    ]
    const wrapper = mountComponent()

    await wrapper.get('button[data-label="カラム追加"]').trigger('click')

    expect(addOrderByColumn).toHaveBeenCalledTimes(1)
  })

  it('ORDER BYカラムを削除できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', alias: 'u', name: 'users', columns: [] },
    ]
    storeState.orderByColumns = [{ id: 'order-1', column: null, direction: 'ASC' }]
    const wrapper = mountComponent()

    await wrapper.get('[data-test="remove-row"]').trigger('click')

    expect(removeOrderByColumn).toHaveBeenCalledWith('order-1')
  })

  it('カラムの順序を変更できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', alias: 'u', name: 'users', columns: [] },
    ]
    storeState.orderByColumns = [
      { id: 'order-1', column: null, direction: 'ASC' },
      { id: 'order-2', column: null, direction: 'DESC' },
    ]
    const wrapper = mountComponent()
    const draggable = wrapper.findComponent({ name: 'draggable' })
    const reordered = [storeState.orderByColumns[1], storeState.orderByColumns[0]]

    await draggable.vm.$emit('update:modelValue', reordered)

    expect(updateOrderByColumns).toHaveBeenCalledWith(reordered)
  })

  it('順序変更時にSQLを再生成する', async () => {
    storeState.selectedTables = [
      { id: 'public.users', alias: 'u', name: 'users', columns: [] },
    ]
    storeState.orderByColumns = [{ id: 'order-1', column: null, direction: 'ASC' }]
    const wrapper = mountComponent()
    const draggable = wrapper.findComponent({ name: 'draggable' })

    await draggable.vm.$emit('end')

    expect(regenerateSql).toHaveBeenCalledTimes(1)
  })
})
