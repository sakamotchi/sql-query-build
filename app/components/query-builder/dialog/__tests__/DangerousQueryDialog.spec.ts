import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DangerousQueryDialog from '../DangerousQueryDialog.vue'
import type { QueryAnalysisResult } from '@/types/query-analysis'

// Stub Nuxt UI components
const stubs = {
  UModal: {
    template: '<div><slot name="body" /><slot name="footer" /></div>',
    props: ['open', 'title', 'ui']
  },
  UBadge: {
    template: '<div><slot /></div>',
    props: ['color', 'size', 'variant']
  },
  UIcon: {
    template: '<i></i>',
    props: ['name']
  },
  UAlert: {
    template: '<div><slot name="title" /><slot /></div>',
    props: ['color', 'variant', 'icon']
  },
  UButton: {
    template: '<button><slot /></button>',
    props: ['color', 'variant', 'disabled', 'loading']
  }
}

describe('DangerousQueryDialog', () => {
  const dangerResult: QueryAnalysisResult = {
    queryType: 'delete',
    riskLevel: 'danger',
    riskFactors: [
      { code: 'no_where_clause', message: 'WHERE句がありません。テーブル内の全データが削除されます' }
    ],
    affectedTables: ['users'],
    hasWhereClause: false,
  }

  const warningResult: QueryAnalysisResult = {
    queryType: 'update',
    riskLevel: 'warning',
    riskFactors: [
      { code: 'update_with_where', message: '条件に一致するデータが更新されます' }
    ],
    affectedTables: ['users'],
    hasWhereClause: true,
  }

  it('Dangerレベルで3秒カウントダウンが表示される', async () => {
    vi.useFakeTimers()

    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
        countdownSeconds: 3,
      },
      global: { stubs }
    })

    // 初期状態: ボタン無効、カウントダウン表示
    expect(wrapper.text()).toContain('3秒待機')

    // 1秒後
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('2秒待機')

    // 3秒後: ボタン有効
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('実行する')
    expect(wrapper.text()).not.toContain('秒待機')

    vi.useRealTimers()
  })

  it('Warningレベルでは即座に実行可能', async () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: warningResult,
        sql: 'UPDATE users SET name = "test" WHERE id = 1',
        countdownSeconds: 3,
      },
      global: { stubs }
    })

    // カウントダウンなし
    expect(wrapper.text()).not.toContain('秒待機')
    expect(wrapper.text()).toContain('実行する')
  })

  it('危険度バッジが正しく表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
        countdownSeconds: 3,
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('危険')
    expect(wrapper.text()).toContain('DELETE')
  })

  it('影響テーブルが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
        countdownSeconds: 3,
      },
      global: { stubs }
    })

    expect(wrapper.text()).toContain('users')
  })

  it('確認ボタンでconfirmイベントが発火する', async () => {
    vi.useFakeTimers()

    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
        countdownSeconds: 3,
      },
      global: { stubs }
    })

    // 3秒待機
    vi.advanceTimersByTime(3000)
    await wrapper.vm.$nextTick()

    // 実行ボタンを探してクリック (実行するボタンは2つ目のボタン)
    const buttons = wrapper.findAll('button')
    const executeButton = buttons[buttons.length - 1]

    if (executeButton) {
      await executeButton.trigger('click')
      expect(wrapper.emitted('confirm')).toBeTruthy()
    } else {
      throw new Error('Execute button not found')
    }

    vi.useRealTimers()
  })

  it('キャンセルボタンでcancelイベントが発火する', async () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: warningResult,
        sql: 'UPDATE users SET name = "test"',
        countdownSeconds: 3,
      },
      global: { stubs }
    })

    // キャンセルボタンは最初のボタン
    const buttons = wrapper.findAll('button')
    const cancelButton = buttons[0]

    if (cancelButton) {
      await cancelButton.trigger('click')
      expect(wrapper.emitted('cancel')).toBeTruthy()
    } else {
      throw new Error('Cancel button not found')
    }
  })

  it('カウントダウン0秒の場合は即座に実行可能', async () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: dangerResult,
        sql: 'DELETE FROM users',
        countdownSeconds: 0,
      },
      global: { stubs }
    })

    // カウントダウンなし、即座に実行可能
    expect(wrapper.text()).not.toContain('秒待機')
    expect(wrapper.text()).toContain('実行する')
  })
})
