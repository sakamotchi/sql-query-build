
import { describe, it, expect } from 'vitest'
import { getErrorMessage, getErrorHint, getErrorIcon } from './error-messages'
import type { QueryExecuteError, QueryErrorCode } from '@/types/query-result'

describe('error-messages', () => {
  describe('getErrorMessage', () => {
    it('returns unknown error message for null/undefined', () => {
      // @ts-ignore
      expect(getErrorMessage(null)).toEqual({
        title: '予期しないエラー',
        description: '予期しないエラーが発生しました。',
      })
    })

    it('returns known error message', () => {
      const error: QueryExecuteError = {
        code: 'syntax_error',
        message: 'syntax error',
      }
      expect(getErrorMessage(error)).toEqual({
        title: 'SQL構文エラー',
        description: 'SQLの構文に誤りがあります。',
      })
    })

    it('returns unknown error message for unknown code', () => {
      const error: QueryExecuteError = {
        // @ts-ignore
        code: 'invalid_code',
        message: 'error',
      }
      expect(getErrorMessage(error)).toEqual({
        title: '予期しないエラー',
        description: '予期しないエラーが発生しました。',
      })
    })
  })

  describe('getErrorHint', () => {
    it('returns hint for known code', () => {
      const error: QueryExecuteError = {
        code: 'syntax_error',
        message: 'error',
      }
      const hint = getErrorHint(error)
      expect(hint).toBeDefined()
      expect(hint?.title).toBe('構文を確認してください')
    })

    it('returns undefined for code without hint', () => {
      const error: QueryExecuteError = {
        code: 'unknown',
        message: 'error',
      }
      expect(getErrorHint(error)).toBeUndefined()
    })
  })

  describe('getErrorIcon', () => {
    it('returns icon for known code', () => {
      expect(getErrorIcon('connection_failed')).toBe('i-heroicons-globe-alt')
    })
    
    it('returns default icon for unknown code', () => {
      // @ts-ignore
      expect(getErrorIcon('invalid_code')).toBe('i-heroicons-exclamation-triangle')
    })
  })
})
