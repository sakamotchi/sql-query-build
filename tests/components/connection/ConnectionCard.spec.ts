import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionCard from '~/components/connection/ConnectionCard.vue'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const stubs = {
  ...nuxtUiStubs,
  UCard: {
    template: '<div><slot /></div>',
  },
  EnvironmentBadge: {
    template: '<span data-test="env-badge"></span>',
    props: ['environment', 'size'],
  },
  EnvironmentIndicator: {
    template: '<span data-test="env-indicator"></span>',
    props: ['environment', 'position'],
  },
}

const connection = {
  id: 'conn-1',
  name: 'Main DB',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'app',
  username: 'user',
  environment: 'development',
}

describe('ConnectionCard', () => {
  it('接続情報を表示する', () => {
    const wrapper = mount(ConnectionCard, {
      props: { connection },
      global: { stubs },
    })

    expect(wrapper.text()).toContain('Main DB')
    expect(wrapper.text()).toContain('POSTGRESQL')
    expect(wrapper.text()).toContain('localhost:5432')
    expect(wrapper.text()).toContain('app')
    expect(wrapper.text()).toContain('user')
    expect(wrapper.find('[data-test="env-badge"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="env-indicator"]').exists()).toBe(true)
  })

  it('ボタン操作でイベントを発行する', async () => {
    const wrapper = mount(ConnectionCard, {
      props: { connection },
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')

    expect(wrapper.emitted('connect')?.[0]?.[0]).toEqual(connection)
    expect(wrapper.emitted('mutation')?.[0]?.[0]).toEqual(connection)
    expect(wrapper.emitted('edit')?.[0]?.[0]).toEqual(connection)
    expect(wrapper.emitted('delete')?.[0]?.[0]).toEqual(connection)
  })
})
