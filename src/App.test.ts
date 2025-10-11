import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'

// Tauri APIのモック
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string, args: any) => {
    if (cmd === 'greet') {
      return Promise.resolve(`Hello, ${args.name}! You've been greeted from Rust!`)
    }
    return Promise.resolve('')
  })
}))

describe('App.vue', () => {
  beforeEach(() => {
    // 各テストの前にPiniaストアを初期化
    setActivePinia(createPinia())
  })

  it('レンダリングできる', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Welcome to Tauri + Vue')
  })

  it('Piniaストアのカウンターが動作する', async () => {
    const wrapper = mount(App)

    // 初期値の確認
    expect(wrapper.text()).toContain('Count: 0')

    // インクリメントボタンを探してクリック
    const buttons = wrapper.findAll('button')
    const incrementButton = buttons.find(btn => btn.text() === '+1')

    if (incrementButton) {
      await incrementButton.trigger('click')
      expect(wrapper.text()).toContain('Count: 1')
    }
  })

  it('greet関数が呼び出せる', async () => {
    const wrapper = mount(App)
    const { invoke } = await import('@tauri-apps/api/core')

    // 入力フィールドに名前を入力
    const input = wrapper.find('#greet-input')
    await input.setValue('Test User')

    // フォームを送信
    const form = wrapper.find('form')
    await form.trigger('submit')

    // Tauri invokeが呼び出されたことを確認
    expect(invoke).toHaveBeenCalledWith('greet', { name: 'Test User' })
  })
})
