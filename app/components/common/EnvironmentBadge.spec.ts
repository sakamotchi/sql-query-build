import { describe, it, expect, beforeAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { nuxtUiStubs } from '../../../tests/utils/nuxt-ui-stubs'

const getEnvironmentLabel = vi.fn((env: string) => {
  const map: Record<string, string> = {
    development: '開発',
    test: 'テスト',
    staging: 'ステージング',
    production: '本番',
  }
  return map[env] ?? env
})

vi.mock('#imports', () => ({
  useEnvironment: () => ({
    getEnvironmentLabel,
  }),
  computed,
}))

vi.mock('~/composables/useEnvironment', () => ({
  useEnvironment: () => ({
    getEnvironmentLabel,
  }),
}))

vi.mock('@/composables/useEnvironment', () => ({
  useEnvironment: () => ({
    getEnvironmentLabel,
  }),
}))

describe('EnvironmentBadge', () => {
  let EnvironmentBadge: typeof import('./EnvironmentBadge.vue').default

  beforeAll(async () => {
    EnvironmentBadge = (await import('./EnvironmentBadge.vue')).default
  })

  it('環境ラベルを表示する', () => {
    const wrapper = mount(EnvironmentBadge, {
      props: {
        environment: 'production',
      },
      global: {
        stubs: nuxtUiStubs,
      },
    })

    expect(wrapper.text()).toContain('本番')
  })

  it('アイコンを表示できる', () => {
    const wrapper = mount(EnvironmentBadge, {
      props: {
        environment: 'development',
        showIcon: true,
      },
      global: {
        stubs: nuxtUiStubs,
      },
    })

    expect(wrapper.find('i').exists()).toBe(true)
  })
})
