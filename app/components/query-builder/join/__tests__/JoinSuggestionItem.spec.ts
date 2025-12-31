import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JoinSuggestionItem from '../JoinSuggestionItem.vue'

const stubs = {
  UButton: {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['size', 'color', 'icon']
  }
}

describe('JoinSuggestionItem', () => {
  const baseSuggestion = {
    fromTable: 'users',
    toTable: 'orders',
    joinType: 'LEFT JOIN',
    conditions: [
      { leftColumn: 'users.id', operator: '=', rightColumn: 'orders.user_id' }
    ],
    confidence: 1.0,
    reason: '外部キー制約に基づく'
  }

  it('高信頼度の提案を星と色付きで表示する', () => {
    const wrapper = mount(JoinSuggestionItem, {
      props: {
        suggestion: baseSuggestion
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('★★★★★')
    expect(wrapper.find('span.text-green-600').exists()).toBe(true)
  })

  it('適用ボタンをクリックするとapplyイベントが発火する', async () => {
    const wrapper = mount(JoinSuggestionItem, {
      props: {
        suggestion: baseSuggestion
      },
      global: { stubs }
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('apply')).toBeTruthy()
    expect(wrapper.emitted('apply')?.[0]).toEqual([baseSuggestion])
  })
})
