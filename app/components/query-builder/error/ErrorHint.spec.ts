
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorHintComponent from './ErrorHint.vue'
import type { ErrorHint } from '@/utils/error-messages'

// Stub Nuxt UI components
const stubs = {
  UIcon: {
    template: '<i></i>',
    props: ['name']
  }
}

describe('ErrorHint', () => {
  const mockHint: ErrorHint = {
    title: 'Check syntax',
    suggestion: 'Review your SQL',
    examples: ['Example 1', 'Example 2'],
  }

  it('renders hint title and suggestion', () => {
    const wrapper = mount(ErrorHintComponent, {
      props: {
        hint: mockHint,
      },
      global: {
        stubs
      }
    })
    
    expect(wrapper.text()).toContain('Check syntax')
    expect(wrapper.text()).toContain('Review your SQL')
  })

  it('renders examples', () => {
    const wrapper = mount(ErrorHintComponent, {
      props: {
        hint: mockHint,
      },
      global: {
        stubs
      }
    })
    
    expect(wrapper.text()).toContain('Example 1')
    expect(wrapper.text()).toContain('Example 2')
  })
})
