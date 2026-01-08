import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SubqueryBuilder from '~/components/query-builder/SubqueryBuilder.vue'

const mockTables = [
  {
    name: 'orders',
    schema: 'public',
    columns: [
      { name: 'id', dataType: 'int', displayType: 'int' },
      { name: 'user_id', dataType: 'int', displayType: 'int' },
    ],
  },
]

const mockSelectedTables = [
  {
    id: 'public.users',
    name: 'users',
    schema: 'public',
    alias: 'u',
    columns: [{ name: 'id', dataType: 'int', displayType: 'int' }],
  },
]

vi.mock('~/stores/query-builder', () => ({
  useQueryBuilderStore: () => ({
    availableTables: mockTables,
    selectedTables: mockSelectedTables,
  }),
}))

const stubs = {
  UCard: {
    template: '<div><slot name="header" /><slot /><slot name="footer" /></div>',
  },
  UFormField: {
    template: '<div><slot /></div>',
    props: ['label', 'name', 'error', 'help', 'required'],
  },
  USelectMenu: {
    name: 'USelectMenu',
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
    props: ['modelValue', 'items', 'searchable', 'placeholder'],
    emits: ['update:modelValue'],
  },
  USelect: {
    name: 'USelect',
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
  },
  UInput: {
    template: '<input @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder'],
    emits: ['update:modelValue'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'disabled', 'size', 'variant', 'color', 'icon'],
    emits: ['click'],
  },
  UAlert: {
    template: '<div><slot /></div>',
  },
  CorrelatedConditionEditor: {
    name: 'CorrelatedConditionEditor',
    template: '<div class="correlated-condition-editor"></div>',
    props: ['modelValue', 'tableColumns', 'parentColumns'],
    emits: ['update:modelValue'],
  },
}

describe('SubqueryBuilder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('テーブルを選択してサブクエリを構築できる', async () => {
    const wrapper = mount(SubqueryBuilder, {
      global: {
        stubs,
      },
    })

    wrapper.vm.selectedTableValue = wrapper.vm.tableOptions[0].value
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()

    const subquery = emitted?.[0]?.[0]
    expect(subquery).toMatchObject({
      type: 'subquery',
      query: {
        from: 'orders',
      },
    })
  })
})
