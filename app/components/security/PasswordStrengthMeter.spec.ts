import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordStrengthMeter from './PasswordStrengthMeter.vue'

describe('PasswordStrengthMeter', () => {
  it('強度が高い場合は強い表示になる', () => {
    const wrapper = mount(PasswordStrengthMeter, {
      props: {
        password: 'Abcdef12!',
        strength: 5,
      },
    })

    expect(wrapper.text()).toContain('強度: 強い')
    expect(wrapper.text()).toContain('9 文字')
  })

  it('強度が中程度の場合は中程度表示になる', () => {
    const wrapper = mount(PasswordStrengthMeter, {
      props: {
        password: 'Abcdef12',
        strength: 3,
      },
    })

    expect(wrapper.text()).toContain('強度: 中程度')
  })

  it('強度が低い場合は弱い表示になる', () => {
    const wrapper = mount(PasswordStrengthMeter, {
      props: {
        password: 'abc',
        strength: 1,
      },
    })

    expect(wrapper.text()).toContain('強度: 弱い')
  })
})
