
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryErrorDisplay from '~/components/query-builder/error/QueryErrorDisplay.vue'
import type { QueryExecuteError } from '@/types/query-result'

// Stub Nuxt UI components
const stubs = {
  UIcon: {
    template: '<i></i>',
    props: ['name']
  },
  UButton: {
    template: '<button><slot /></button>',
    props: ['color', 'variant', 'icon', 'size']
  }
}

describe('QueryErrorDisplay', () => {
  const mockError: QueryExecuteError = {
    code: 'syntax_error',
    message: 'Original DB error message',
    details: {
      line: 1,
      column: 10,
      objectName: 'users',
    },
    nativeCode: 'PG-123',
  }

  it('renders correctly', () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: {
        error: mockError,
      },
      global: {
        stubs
      }
    })
    
    // Check main title (mapped from code)
    expect(wrapper.text()).toContain('SQL構文エラー')
    
    // Check object name
    expect(wrapper.text()).toContain('users')
    
    // Check line info
    expect(wrapper.text()).toContain('行: 1')
    expect(wrapper.text()).toContain('列: 10')
  })

  it('toggles details', async () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: {
        error: mockError,
      },
      global: {
        stubs
      }
    })

    // Initially hidden
    expect(wrapper.text()).not.toContain('Original DB error message')
    
    // Click toggle button
    await wrapper.find('button').trigger('click')
    
    // Now visible
    expect(wrapper.text()).toContain('Original DB error message')
    expect(wrapper.text()).toContain('PG-123')
  })

  it('emits retry event', async () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: {
        error: mockError,
      },
      global: {
        stubs
      }
    })

    // Find the retry button (the second button, which is the UButton stub)
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })
})
