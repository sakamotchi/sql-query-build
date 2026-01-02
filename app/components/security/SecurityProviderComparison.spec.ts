import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SecurityProviderComparison from './SecurityProviderComparison.vue'
import { nuxtUiStubs } from '../../../tests/utils/nuxt-ui-stubs'

const stubs = {
  ...nuxtUiStubs,
  UCard: {
    template: '<div><slot name="header" /><slot /></div>',
  },
}

describe('SecurityProviderComparison', () => {
  it('比較テーブルを表示する', () => {
    const wrapper = mount(SecurityProviderComparison, {
      global: { stubs },
    })

    expect(wrapper.text()).toContain('セキュリティプロバイダー比較')
    expect(wrapper.text()).toContain('Simple')
    expect(wrapper.text()).toContain('マスターパスワード')
    expect(wrapper.text()).toContain('暗号化方式')
    expect(wrapper.text()).toContain('利点')
    expect(wrapper.text()).toContain('欠点')
  })
})
