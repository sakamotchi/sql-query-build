import { describe, it, expect } from 'vitest'
import {
  buildFolderPath,
  parseFolderPath,
  validateFolderName,
  validateFolderPath,
} from '@/utils/folder-validation'

describe('folder-validation', () => {
  describe('validateFolderPath', () => {
    it('null を許容する', () => {
      const result = validateFolderPath(null)
      expect(result.valid).toBe(true)
    })

    it('空文字列はエラー', () => {
      const result = validateFolderPath('')
      expect(result.valid).toBe(false)
    })

    it('正しいパス形式を許容する', () => {
      const result = validateFolderPath('/親/子/孫')
      expect(result.valid).toBe(true)
    })

    it('先頭スラッシュがない場合はエラー', () => {
      const result = validateFolderPath('親/子')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('/')
    })

    it('末尾スラッシュがある場合はエラー', () => {
      const result = validateFolderPath('/親/子/')
      expect(result.valid).toBe(false)
    })

    it('禁止文字を含む場合はエラー', () => {
      const invalidChars = ['\\', ':', '*', '?', '"', '<', '>', '|']
      for (const char of invalidChars) {
        const result = validateFolderPath(`/親${char}子`)
        expect(result.valid).toBe(false)
      }
    })

    it('10階層を超える場合はエラー', () => {
      const path = '/a/b/c/d/e/f/g/h/i/j/k'
      const result = validateFolderPath(path)
      expect(result.valid).toBe(false)
    })

    it('パストラバーサルを含む場合はエラー', () => {
      const result = validateFolderPath('/親/../子')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateFolderName', () => {
    it('正しいフォルダ名を許容する', () => {
      const result = validateFolderName('開発環境')
      expect(result.valid).toBe(true)
    })

    it('空文字列はエラー', () => {
      const result = validateFolderName('')
      expect(result.valid).toBe(false)
    })

    it('100文字を超える場合はエラー', () => {
      const longName = 'a'.repeat(101)
      const result = validateFolderName(longName)
      expect(result.valid).toBe(false)
    })

    it('スラッシュを含む場合はエラー', () => {
      const result = validateFolderName('親/子')
      expect(result.valid).toBe(false)
    })
  })

  describe('parseFolderPath', () => {
    it('パスを分割する', () => {
      const folders = parseFolderPath('/親/子/孫')
      expect(folders).toEqual(['親', '子', '孫'])
    })

    it('null の場合は空配列', () => {
      const folders = parseFolderPath(null)
      expect(folders).toEqual([])
    })

    it('空文字列の場合は空配列', () => {
      const folders = parseFolderPath('')
      expect(folders).toEqual([])
    })
  })

  describe('buildFolderPath', () => {
    it('配列からパスを構築する', () => {
      const path = buildFolderPath(['親', '子', '孫'])
      expect(path).toBe('/親/子/孫')
    })

    it('空配列の場合は null', () => {
      const path = buildFolderPath([])
      expect(path).toBe(null)
    })
  })
})
