import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionTestResultDialog from '~/components/ConnectionTestResultDialog.vue'
import { nuxtUiStubs } from '../utils/nuxt-ui-stubs'

const stubs = {
  ...nuxtUiStubs,
  UModal: {
    template: '<div><slot name="body" /><slot name="footer" /></div>',
    props: ['open', 'title'],
  },
}

const successResult = {
  success: true,
  message: '接続成功',
  serverInfo: {
    databaseName: 'app',
    currentUser: 'user',
    version: '1.0',
    encoding: 'utf8',
  },
  duration: 12,
}

const failResult = {
  success: false,
  message: '接続失敗',
  errorDetails: '詳細なエラー',
}

describe('ConnectionTestResultDialog', () => {
  beforeEach(() => {
    // no-op
  })

  it('成功時の情報を表示する', () => {
    const wrapper = mount(ConnectionTestResultDialog, {
      props: {
        result: successResult,
        open: true,
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.text()).toContain('接続成功')
    expect(wrapper.text()).toContain('データベース:')
    expect(wrapper.text()).toContain('app')
    expect(wrapper.text()).toContain('ユーザー:')
    expect(wrapper.text()).toContain('user')
    expect(wrapper.text()).toContain('バージョン:')
    expect(wrapper.text()).toContain('1.0')
    expect(wrapper.text()).toContain('エンコーディング:')
    expect(wrapper.text()).toContain('utf8')
    expect(wrapper.text()).toContain('応答時間:')
  })

  it('失敗時に詳細を開閉できる', async () => {
    const wrapper = mount(ConnectionTestResultDialog, {
      props: {
        result: failResult,
        open: true,
      },
      global: {
        stubs,
      },
    })

    expect(wrapper.find('pre').exists()).toBe(false)

    const toggleButton = wrapper.find('button')
    await toggleButton.trigger('click')

    expect(wrapper.find('pre').text()).toContain('詳細なエラー')
  })

  it('閉じるボタンでopenをfalseにする', async () => {
    const wrapper = mount(ConnectionTestResultDialog, {
      props: {
        result: successResult,
        open: true,
      },
      global: {
        stubs,
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')

    expect(wrapper.emitted('update:open')?.[0]?.[0]).toBe(false)
  })
})
