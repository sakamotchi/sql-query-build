
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SqlPreview from './SqlPreview.vue'

describe('SqlPreview', () => {
  const sql = 'SELECT * FROM users\nWHERE id = 1'

  it('renders sql', () => {
    const wrapper = mount(SqlPreview, {
      props: { sql },
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
    })

    const lines = wrapper.findAll('.flex')
    // 2nd line should have error class
    expect(lines[1].classes()).toContain('bg-red-100')
    // 1st line should not
    expect(lines[0].classes()).not.toContain('bg-red-100')
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
    })

    const lines = wrapper.findAll('.flex')
    expect(lines[1].classes()).toContain('bg-red-100')
  })

  it('shows error indicator when error exists', () => {
    const wrapper = mount(SqlPreview, {
      props: {
        sql,
        errorDetails: {
          line: 2,
        },
      },
    })
    
    expect(wrapper.text()).toContain('エラー位置: 2行目')
  })
})
