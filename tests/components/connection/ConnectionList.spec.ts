import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionList from '~/components/connection/ConnectionList.vue'
import { nuxtUiStubs } from '../../utils/nuxt-ui-stubs'

const stubs = {
  ...nuxtUiStubs,
  UCard: {
    template: '<div><slot /></div>',
  },
  EnvironmentBadge: {
    template: '<span data-test="env-badge">{{ environment }}</span>',
    props: ['environment', 'size'],
  },
}

const createConnections = () => [
  {
    id: 'conn-1',
    name: 'Main DB',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'app',
    username: 'user',
    environment: 'development',
  },
]

describe('ConnectionList', () => {
  it('読み込み中を表示する', () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: [],
        loading: true,
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('読み込み中...')
  })

  it('接続がない場合は空状態を表示する', () => {
    const wrapper = mount(ConnectionList, {
      props: {
        connections: [],
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('接続が見つかりませんでした')
  })

  it('接続一覧を表示してイベントを発行する', async () => {
    const connections = createConnections()
    const wrapper = mount(ConnectionList, {
      props: {
        connections,
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('Main DB')
    expect(wrapper.find('[data-test="env-badge"]').exists()).toBe(true)

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')
    await buttons[4].trigger('click')

    expect(wrapper.emitted('connect')?.[0]?.[0]).toEqual(connections[0])
    expect(wrapper.emitted('mutation')?.[0]?.[0]).toEqual(connections[0])
    expect(wrapper.emitted('open-sql-editor')?.[0]?.[0]).toEqual(connections[0])
    expect(wrapper.emitted('edit')?.[0]?.[0]).toEqual(connections[0])
    expect(wrapper.emitted('delete')?.[0]?.[0]).toEqual(connections[0])
  })
})
