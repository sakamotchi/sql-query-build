
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SqlPreview from '~/components/query-builder/SqlPreview.vue'

// Stub Nuxt UI components
const stubs = {
  UIcon: {
    template: '<i></i>',
    props: ['name']
  }
}

describe('SqlPreview', () => {
  const sql = 'SELECT * FROM users\nWHERE id = 1'

  it('renders sql', () => {
    const wrapper = mount(SqlPreview, {
      props: { sql },
      global: {
        stubs
      }
    })
    expect(wrapper.text()).toContain('SELECT * FROM users')
  })

  it('highlights error line when line is provided', () => {
    const wrapper = mount(SqlPreview, {
      props: {
        sql,
        errorDetails: {
          line: 2,
        },
      },
      global: {
        stubs
      }
    })

    // Check if the component correctly computes errorLine
    const vm = wrapper.vm as any
    expect(vm.errorLine).toBe(2)

    // Check that error indicator shows the correct line
    expect(wrapper.text()).toContain('エラー位置: 2行目')
  })

  it('highlights error line by calculating from position', () => {
    // 'SELECT * FROM users\n' is 20 chars (including newline)
    // Position 21 is start of 2nd line
    const wrapper = mount(SqlPreview, {
      props: {
        sql,
        errorDetails: {
          position: 21,
        },
      },
      global: {
        stubs
      }
    })

    // Check if the component correctly computes errorLine from position
    const vm = wrapper.vm as any
    expect(vm.errorLine).toBe(2)
  })

  it('shows error indicator when error exists', () => {
    const wrapper = mount(SqlPreview, {
      props: {
        sql,
        errorDetails: {
          line: 2,
        },
      },
      global: {
        stubs
      }
    })
    
    expect(wrapper.text()).toContain('エラー位置: 2行目')
  })
})
