import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultPagination from '../ResultPagination.vue'

describe('ResultPagination', () => {
  it('calculates total pages correctly', () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 1,
        pageSize: 10,
        totalRows: 95,
      },
      global: {
        stubs: {
            USelectMenu: {
                template: '<select :value="modelValue" @change="$emit(\'update:model-value\', $event.target.value)"><option v-for="opt in items" :value="opt.value">{{opt.label}}</option></select>',
                props: ['modelValue', 'items']
            },
            UButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' }
        }
      }
    })

    expect(wrapper.text()).toContain('1 / 10')
  })

  it('emits page-change event when navigating', async () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 1,
        pageSize: 10,
        totalRows: 50,
      },
      global: {
        stubs: {
            USelectMenu: true,
            UButton: { template: '<button @click="$emit(\'click\')"></button>' }
        }
      }
    })

    // 次ページボタンをクリック (4番目のボタン: << < 1/5 > >> )
    // 実装: << < span > >>
    // buttons: 0:<<, 1:<, 2:>, 3:>>
    const buttons = wrapper.findAll('button')
    const nextButton = buttons[2] // chevron-right
    if (nextButton) await nextButton.trigger('click')

    expect(wrapper.emitted('page-change')).toBeTruthy()
    expect(wrapper.emitted('page-change')![0]).toEqual([2])
  })

  it('disables previous button on first page', () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 1,
        pageSize: 10,
        totalRows: 50,
      },
      global: {
        stubs: {
            USelectMenu: true,
            UButton: { template: '<button :disabled="disabled"></button>', props: ['disabled'] }
        }
      }
    })

    const firstButton = wrapper.findAll('button')[0]
    expect(firstButton?.attributes('disabled')).toBeDefined()
  })

  it('disables next button on last page', () => {
    const wrapper = mount(ResultPagination, {
      props: {
        currentPage: 5,
        pageSize: 10,
        totalRows: 50,
      },
      global: {
        stubs: {
            USelectMenu: true,
            UButton: { template: '<button :disabled="disabled"></button>', props: ['disabled'] }
        }
      }
    })

    const lastButton = wrapper.findAll('button')[3]
    // ...
    // So 4 buttons.
    expect(lastButton?.attributes('disabled')).toBeDefined()
  })
})
