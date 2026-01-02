import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchFilter from '~/components/launcher/SearchFilter.vue'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const stubs = {
  ...nuxtUiStubs,
  UInput: {
    template: '<div><slot name="trailing" /><input /></div>',
    props: ['modelValue', 'type', 'placeholder', 'disabled', 'icon', 'size'],
  },
  USelect: {
    template: '<select></select>',
    props: ['modelValue', 'items', 'size', 'icon'],
  },
}

describe('SearchFilter', () => {
  it('フィルター適用中の表示が出る', () => {
    const wrapper = mount(SearchFilter, {
      props: {
        searchQuery: 'alpha',
        environmentFilter: 'all',
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('フィルター適用中')
  })

  it('リセットで検索と環境フィルターを初期化する', async () => {
    const onSearchUpdate = vi.fn()
    const onEnvironmentUpdate = vi.fn()

    const wrapper = mount(SearchFilter, {
      props: {
        searchQuery: 'alpha',
        environmentFilter: 'development',
        'onUpdate:searchQuery': onSearchUpdate,
        'onUpdate:environmentFilter': onEnvironmentUpdate,
      },
      global: {
        stubs,
      },
    })

    const resetButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'リセット')

    expect(resetButton).toBeTruthy()
    await resetButton?.trigger('click')

    expect(onSearchUpdate).toHaveBeenCalledWith('')
    expect(onEnvironmentUpdate).toHaveBeenCalledWith('all')
  })
})
