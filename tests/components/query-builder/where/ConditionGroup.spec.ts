import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ConditionGroup from '~/components/query-builder/where/ConditionGroup.vue'
import { nuxtUiStubs } from '../../../utils/nuxt-ui-stubs'

const updateGroupLogic = vi.fn()
const removeConditionFromGroup = vi.fn()
const removeWhereCondition = vi.fn()
const updateWhereCondition = vi.fn()
const addConditionToGroup = vi.fn()

const stubs = {
  ...nuxtUiStubs,
  UButton: {
    template: '<button :data-label="label" @click="$emit(\'click\')"></button>',
    emits: ['click'],
    props: ['color', 'variant', 'icon', 'size', 'label'],
  },
  ConditionRow: {
    name: 'ConditionRow',
    template: '<button data-test="row-remove" @click="$emit(\'remove\')"></button>',
    props: ['condition', 'availableColumns'],
    emits: ['update', 'remove'],
  },
}

vi.mock('@/stores/query-builder', () => ({
  useQueryBuilderStore: () => ({
    updateGroupLogic,
    removeConditionFromGroup,
    removeWhereCondition,
    updateWhereCondition,
    addConditionToGroup,
  }),
}))

const availableColumns = [
  {
    id: 'u.id',
    label: 'u.id',
    tableId: 'public.users',
    tableAlias: 'u',
    tableName: 'users',
    columnName: 'id',
    displayName: 'u.id',
    dataType: 'int',
  },
]

describe('ConditionGroup', () => {
  beforeEach(() => {
    updateGroupLogic.mockReset()
    removeConditionFromGroup.mockReset()
    removeWhereCondition.mockReset()
    updateWhereCondition.mockReset()
    addConditionToGroup.mockReset()
  })

  it('ネストした条件を表示する', () => {
    const wrapper = mount(ConditionGroup, {
      props: {
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
            id: 'group-1',
            type: 'group',
            logic: 'AND',
            conditions: [
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
        ],
        availableColumns,
        isRoot: true,
        logic: 'AND',
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.findAll('[data-test="row-remove"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('AND グループ')
  })

  it('グループ内に条件を追加できる', async () => {
    const wrapper = mount(ConditionGroup, {
      props: {
        conditions: [],
        availableColumns,
        isRoot: false,
        logic: 'OR',
        groupId: 'group-1',
      },
      global: {
        stubs,
      },
    })

    await wrapper.get('button[data-label="条件追加"]').trigger('click')

    expect(addConditionToGroup).toHaveBeenCalledTimes(1)
    expect(addConditionToGroup.mock.calls[0]?.[0]).toBe('group-1')
  })

  it('グループごと削除できる', async () => {
    const wrapper = mount(ConditionGroup, {
      props: {
        conditions: [],
        availableColumns,
        isRoot: false,
        logic: 'OR',
        groupId: 'group-1',
      },
      global: {
        stubs,
      },
    })

    await wrapper.get('button').trigger('click')

    expect(removeWhereCondition).toHaveBeenCalledWith('group-1')
  })
})
