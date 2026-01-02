import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import WhereTab from '~/components/query-builder/where/WhereTab.vue'
import { nuxtUiStubs } from '../../../utils/nuxt-ui-stubs'

const addWhereCondition = vi.fn()
const addWhereConditionGroup = vi.fn()
const removeWhereCondition = vi.fn()
const updateGroupLogic = vi.fn()
const removeConditionFromGroup = vi.fn()
const updateWhereCondition = vi.fn()
const addConditionToGroup = vi.fn()

const storeState = reactive({
  selectedTables: [] as Array<any>,
  whereConditions: [] as Array<any>,
  addWhereCondition,
  addWhereConditionGroup,
  removeWhereCondition,
  updateGroupLogic,
  removeConditionFromGroup,
  updateWhereCondition,
  addConditionToGroup,
})

vi.mock('@/stores/query-builder', () => ({
  useQueryBuilderStore: () => storeState,
}))

const stubs = {
  ...nuxtUiStubs,
  UButton: {
    template: '<button :data-label="label"><slot /></button>',
    props: ['color', 'variant', 'icon', 'size', 'disabled', 'loading', 'label'],
  },
  ConditionRow: {
    name: 'ConditionRow',
    template: '<button data-test="remove-condition" @click="$emit(\'remove\')"></button>',
    props: ['condition', 'availableColumns'],
  },
}

const mountComponent = () =>
  mount(WhereTab, {
    global: {
      stubs,
    },
  })

describe('WhereTab', () => {
  beforeEach(() => {
    storeState.selectedTables = []
    storeState.whereConditions = []
    addWhereCondition.mockReset()
    addWhereConditionGroup.mockReset()
    removeWhereCondition.mockReset()
    updateGroupLogic.mockReset()
    removeConditionFromGroup.mockReset()
    updateWhereCondition.mockReset()
    addConditionToGroup.mockReset()
  })

  it('テーブルがない場合は空状態を表示する', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('テーブルを選択してください')
    expect(wrapper.findComponent({ name: 'ConditionGroup' }).exists()).toBe(false)
  })

  it('条件を追加できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', schema: 'public', name: 'users', alias: 'u', columns: [] },
    ]
    const wrapper = mountComponent()

    await wrapper.get('button[data-label="条件追加"]').trigger('click')

    expect(addWhereCondition).toHaveBeenCalledTimes(1)
    const conditionArg = addWhereCondition.mock.calls[0]?.[0]
    expect(conditionArg).toMatchObject({
      type: 'condition',
      column: null,
      operator: '=',
      value: '',
      isValid: false,
    })
  })

  it('グループを追加できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', schema: 'public', name: 'users', alias: 'u', columns: [] },
    ]
    storeState.whereConditions = [
      {
        id: 'cond-1',
        type: 'condition',
        column: null,
        operator: '=',
        value: '',
        isValid: false,
      },
    ]
    const wrapper = mountComponent()
    await wrapper.get('button[data-label="グループ追加"]').trigger('click')

    expect(addWhereConditionGroup).toHaveBeenCalledTimes(1)
    const groupArg = addWhereConditionGroup.mock.calls[0]?.[0]
    expect(groupArg).toMatchObject({
      type: 'group',
      logic: 'OR',
      conditions: [],
    })
  })

  it('条件を削除できる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', schema: 'public', name: 'users', alias: 'u', columns: [] },
    ]
    storeState.whereConditions = [
      {
        id: 'cond-1',
        type: 'condition',
        column: null,
        operator: '=',
        value: '',
        isValid: false,
      },
    ]
    const wrapper = mountComponent()

    await wrapper.get('[data-test="remove-condition"]').trigger('click')

    expect(removeWhereCondition).toHaveBeenCalledWith('cond-1')
  })

  it('ANDとORを切り替えできる', async () => {
    storeState.selectedTables = [
      { id: 'public.users', schema: 'public', name: 'users', alias: 'u', columns: [] },
    ]
    storeState.whereConditions = [
      {
        id: 'group-1',
        type: 'group',
        logic: 'AND',
        conditions: [
          {
            id: 'cond-1',
            type: 'condition',
            column: null,
            operator: '=',
            value: '',
            isValid: false,
          },
          {
            id: 'cond-2',
            type: 'condition',
            column: null,
            operator: '=',
            value: '',
            isValid: false,
          },
        ],
      },
    ]
    const wrapper = mountComponent()

    await wrapper.get('button[data-label="AND"]').trigger('click')

    expect(updateGroupLogic).toHaveBeenCalledWith('group-1', 'OR')
  })
})
