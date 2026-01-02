import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JoinSuggestionList from '~/components/query-builder/join/JoinSuggestionList.vue'

const stubs = {
  UIcon: { template: '<i></i>', props: ['name'] },
  UButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['size', 'color', 'icon', 'variant'] },
}

describe('JoinSuggestionList', () => {
  const suggestion = {
    fromTable: 'users',
    toTable: 'orders',
    joinType: 'LEFT JOIN',
    conditions: [
      { leftColumn: 'users.id', operator: '=', rightColumn: 'orders.user_id' }
    ],
    confidence: 0.9,
    reason: 'テスト理由'
  }

  it('ローディング中はスピナー文言を表示する', () => {
    const wrapper = mount(JoinSuggestionList, {
      props: {
        suggestions: [],
        loading: true
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('提案を生成中')
  })

  it('提案がない場合にメッセージを表示する', () => {
    const wrapper = mount(JoinSuggestionList, {
      props: {
        suggestions: [],
        loading: false
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('JOIN条件の提案が見つかりませんでした')
  })

  it('提案を表示し、適用イベントを伝搬する', async () => {
    const wrapper = mount(JoinSuggestionList, {
      props: {
        suggestions: [suggestion],
        loading: false
      },
      global: { stubs }
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('apply')).toBeTruthy()
    expect(wrapper.emitted('apply')?.[0]).toEqual([suggestion])
  })
})
