import { describe, it, expect, beforeAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const getEnvironmentColors = vi.fn((env: string) => ({
  primary: env === 'production' ? '#f00' : '#0f0',
  bg: '#fff',
}))

vi.mock('#imports', () => ({
  useEnvironment: () => ({
    getEnvironmentColors,
  }),
}))

vi.mock('~/composables/useEnvironment', () => ({
  useEnvironment: () => ({
    getEnvironmentColors,
  }),
}))

vi.mock('@/composables/useEnvironment', () => ({
  useEnvironment: () => ({
    getEnvironmentColors,
  }),
}))

describe('EnvironmentSelector', () => {
  let EnvironmentSelector: typeof import('~/components/connection/EnvironmentSelector.vue').default

  beforeAll(async () => {
    EnvironmentSelector = (await import('~/components/connection/EnvironmentSelector.vue')).default
  })

  it('環境オプションを表示する', () => {
    const wrapper = mount(EnvironmentSelector, {
      props: {
        modelValue: 'development',
      },
      global: {
        stubs: nuxtUiStubs,
      },
    })

    expect(wrapper.text()).toContain('開発')
    expect(wrapper.text()).toContain('開発・テスト用の環境')
    expect(wrapper.text()).toContain('テスト')
    expect(wrapper.text()).toContain('品質保証・テスト用の環境')
    expect(wrapper.text()).toContain('ステージング')
    expect(wrapper.text()).toContain('本番前の検証用環境')
    expect(wrapper.text()).toContain('本番')
    expect(wrapper.text()).toContain('実運用環境（要注意）')
  })

  it('クリックで環境を変更できる', async () => {
    const wrapper = mount(EnvironmentSelector, {
      props: {
        modelValue: 'development',
      },
      global: {
        stubs: nuxtUiStubs,
      },
    })

    const productionButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('本番') && btn.text().includes('実運用環境'))

    await productionButton?.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('production')
  })
})
