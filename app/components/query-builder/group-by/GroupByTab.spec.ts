import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import GroupByTab from './GroupByTab.vue'
import { nuxtUiStubs } from '../../../../tests/utils/nuxt-ui-stubs'

const regenerateSql = vi.fn()

const storeState = reactive({
  selectedTables: [] as Array<any>,
  groupByColumns: [] as Array<any>,
  regenerateSql,
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
  GroupByRow: {
    name: 'GroupByRow',
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
  mount(GroupByTab, {
    global: {
      stubs,
    },
  })

describe('GroupByTab', () => {
  beforeEach(() => {
    storeState.selectedTables = []
    storeState.groupByColumns = []
    regenerateSql.mockReset()
  })

  it('テーブルがない場合は空状態を表示する', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('テーブルを選択してください')
  })

  it('GROUP BYカラムを追加できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', alias: 'u', name: 'users', columns: [] },
    ]
    const wrapper = mountComponent()

    await wrapper.get('button[data-label="カラム追加"]').trigger('click')

    expect(storeState.groupByColumns).toHaveLength(1)
    expect(regenerateSql).toHaveBeenCalledTimes(1)
  })

  it('GROUP BYカラムを削除できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', alias: 'u', name: 'users', columns: [] },
    ]
    storeState.groupByColumns = [{ id: 'group-1', column: null }]
    const wrapper = mountComponent()

    await wrapper.get('[data-test="remove-row"]').trigger('click')

    expect(storeState.groupByColumns).toHaveLength(0)
    expect(regenerateSql).toHaveBeenCalledTimes(1)
  })

  it('カラムの順序を変更できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', alias: 'u', name: 'users', columns: [] },
    ]
    storeState.groupByColumns = [
      { id: 'group-1', column: null },
      { id: 'group-2', column: null },
    ]
    const wrapper = mountComponent()
    const draggable = wrapper.findComponent({ name: 'draggable' })
    const reordered = [storeState.groupByColumns[1], storeState.groupByColumns[0]]

    await draggable.vm.$emit('update:modelValue', reordered)

    expect(storeState.groupByColumns).toEqual(reordered)
  })
})
