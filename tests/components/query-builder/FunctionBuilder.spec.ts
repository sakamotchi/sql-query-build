import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FunctionBuilder from '~/components/query-builder/FunctionBuilder.vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('~/stores/connection', () => ({
  useConnectionStore: () => ({
    activeConnection: { id: 'conn-1', type: 'postgresql' },
    connections: [],
  }),
}))

vi.mock('~/stores/window', () => ({
  useWindowStore: () => ({
    currentConnectionId: 'conn-1',
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
  USelect: {
    name: 'USelect',
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
  },
  USelectMenu: {
    name: 'USelectMenu',
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
    props: ['modelValue', 'items', 'searchable', 'placeholder'],
    emits: ['update:modelValue'],
  },
  UInput: {
    template: '<input @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'size'],
    emits: ['update:modelValue'],
  },
  UButton: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'disabled', 'size', 'variant', 'color', 'icon'],
    emits: ['click'],
  },
  ArgumentEditor: {
    name: 'ArgumentEditor',
    template: '<div class="argument-editor"></div>',
    props: ['modelValue', 'index', 'allowFunction'],
    emits: ['update:modelValue'],
  },
}

describe('FunctionBuilder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('関数を選択して追加できる', async () => {
    const wrapper = mount(FunctionBuilder, {
      global: {
        stubs,
      },
    })

    const categorySelect = wrapper.findComponent({ name: 'USelect' })
    categorySelect.vm.$emit('update:modelValue', 'string')

    const functionSelect = wrapper.findComponent({ name: 'USelectMenu' })
    functionSelect.vm.$emit('update:modelValue', 'UPPER')
    await wrapper.vm.$nextTick()

    const argEditor = wrapper.findComponent({ name: 'ArgumentEditor' })
    await argEditor.vm.$emit('update:modelValue', {
      type: 'column',
      table: 'u',
      column: 'name',
    })

    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')

    const emitted = wrapper.emitted('apply')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toMatchObject({
      type: 'function',
      name: 'UPPER',
      category: 'string',
    })
  })
})
