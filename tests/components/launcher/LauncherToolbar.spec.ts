import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LauncherToolbar from '~/components/launcher/LauncherToolbar.vue'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const stubs = {
  ...nuxtUiStubs,
}

describe('LauncherToolbar', () => {
  it('見出しと統計スロットを表示する', () => {
    const wrapper = mount(LauncherToolbar, {
      slots: {
        stats: '3件の接続',
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('接続一覧')
    expect(wrapper.text()).toContain('3件の接続')
  })

  it('ボタンクリックでイベントを発行する', async () => {
    const wrapper = mount(LauncherToolbar, {
      global: {
        stubs,
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')

    expect(wrapper.emitted('openSettings')).toBeTruthy()
    expect(wrapper.emitted('toggleView')).toBeTruthy()
    expect(wrapper.emitted('refresh')).toBeTruthy()
    expect(wrapper.emitted('newConnection')).toBeTruthy()
  })
})
