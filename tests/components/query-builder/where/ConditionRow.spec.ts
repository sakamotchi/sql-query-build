import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConditionRow from '~/components/query-builder/where/ConditionRow.vue'
import { nuxtUiStubs } from '../../../utils/nuxt-ui-stubs'
import type { WhereCondition } from '@/types/query'

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
  {
    id: 'u.name',
    label: 'u.name',
    tableId: 'public.users',
    tableAlias: 'u',
    tableName: 'users',
    columnName: 'name',
    displayName: 'u.name',
    dataType: 'text',
  },
]

const baseCondition: WhereCondition = {
  id: 'cond-1',
  type: 'condition',
  column: null,
  operator: '=',
  value: '',
  isValid: false,
}

const stubs = {
  ...nuxtUiStubs,
  UButton: {
    template: '<button data-test="remove-button" @click="$emit(\'click\')"></button>',
    emits: ['click'],
    props: ['color', 'variant', 'icon', 'size'],
  },
  ColumnSelect: {
    name: 'ColumnSelect',
    template: '<div data-test="column-select"></div>',
    props: ['modelValue', 'columns'],
  },
  OperatorSelect: {
    name: 'OperatorSelect',
    template: '<div data-test="operator-select"></div>',
    props: ['modelValue', 'dataType'],
  },
  ValueInput: {
    name: 'ValueInput',
    template: '<div data-test="value-input"></div>',
    props: ['modelValue', 'dataType'],
  },
  MultiValueInput: {
    name: 'MultiValueInput',
    template: '<div data-test="multi-value-input"></div>',
    props: ['modelValue', 'dataType'],
  },
  RangeInput: {
    name: 'RangeInput',
    template: '<div data-test="range-input"></div>',
    props: ['modelValue', 'dataType'],
  },
}

const mountComponent = (condition: WhereCondition) =>
  mount(ConditionRow, {
    props: {
      condition,
      availableColumns,
    },
    global: {
      stubs,
    },
  })

describe('ConditionRow', () => {
  it('カラムを選択できる', async () => {
    const wrapper = mountComponent(baseCondition)
    const columnSelect = wrapper.findComponent({ name: 'ColumnSelect' })

    await columnSelect.vm.$emit('update:model-value', {
      tableAlias: 'u',
      columnName: 'id',
    })

    expect(wrapper.emitted('update')?.[0]?.[0]).toEqual({
      column: { tableAlias: 'u', columnName: 'id' },
      value: '',
      isValid: false,
    })
  })

  it('IS NULLの場合は値入力を非表示にする', () => {
    const wrapper = mountComponent({
      ...baseCondition,
      column: { tableAlias: 'u', columnName: 'id' },
      operator: 'IS NULL',
      value: '',
      isValid: true,
    })

    expect(wrapper.find('[data-test="value-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="multi-value-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="range-input"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('（値不要）')
  })

  it('IN演算子の場合は複数値入力にする', () => {
    const wrapper = mountComponent({
      ...baseCondition,
      column: { tableAlias: 'u', columnName: 'id' },
      operator: 'IN',
      value: ['1'],
      isValid: true,
    })

    expect(wrapper.find('[data-test="multi-value-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="value-input"]').exists()).toBe(false)
  })

  it('BETWEEN演算子の場合は範囲入力にする', () => {
    const wrapper = mountComponent({
      ...baseCondition,
      column: { tableAlias: 'u', columnName: 'id' },
      operator: 'BETWEEN',
      value: { from: '1', to: '10' },
      isValid: true,
    })

    expect(wrapper.find('[data-test="range-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="value-input"]').exists()).toBe(false)
  })

  it('演算子を選択できる', async () => {
    const wrapper = mountComponent({
      ...baseCondition,
      column: { tableAlias: 'u', columnName: 'id' },
      value: '1',
    })
    const operatorSelect = wrapper.findComponent({ name: 'OperatorSelect' })

    await operatorSelect.vm.$emit('update:model-value', 'IN')

    expect(wrapper.emitted('update')?.[0]?.[0]).toEqual({
      operator: 'IN',
      value: ['1'],
      isValid: true,
    })
  })

  it('値を入力できる', async () => {
    const wrapper = mountComponent({
      ...baseCondition,
      column: { tableAlias: 'u', columnName: 'id' },
      operator: 'IN',
      value: [],
    })
    const multiValueInput = wrapper.findComponent({ name: 'MultiValueInput' })

    await multiValueInput.vm.$emit('update:model-value', ['1', '2'])

    expect(wrapper.emitted('update')?.[0]?.[0]).toEqual({
      value: ['1', '2'],
      isValid: true,
    })
  })

  it('削除ボタンで削除イベントを発行する', async () => {
    const wrapper = mountComponent(baseCondition)

    await wrapper.get('[data-test="remove-button"]').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
  })
})
