
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryErrorDisplay from './QueryErrorDisplay.vue'
import type { QueryExecuteError } from '@/types/query-result'

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
    })

    await wrapper.findComponent({ name: 'UButton' }).trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })
})
