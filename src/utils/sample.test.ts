import { describe, it, expect } from 'vitest'
import { add, toUpperCase, isEmpty } from './sample'

describe('sample utility functions', () => {
  describe('add', () => {
    it('2つの正の数を加算する', () => {
      expect(add(2, 3)).toBe(5)
    })

    it('負の数を加算する', () => {
      expect(add(-5, 3)).toBe(-2)
    })

    it('0を加算する', () => {
      expect(add(5, 0)).toBe(5)
    })
  })

  describe('toUpperCase', () => {
    it('小文字を大文字に変換する', () => {
      expect(toUpperCase('hello')).toBe('HELLO')
    })

    it('既に大文字の文字列はそのまま', () => {
      expect(toUpperCase('WORLD')).toBe('WORLD')
    })

    it('空文字列を処理する', () => {
      expect(toUpperCase('')).toBe('')
    })
  })

  describe('isEmpty', () => {
    it('空の配列の場合trueを返す', () => {
      expect(isEmpty([])).toBe(true)
    })

    it('要素がある配列の場合falseを返す', () => {
      expect(isEmpty([1, 2, 3])).toBe(false)
    })

    it('要素が1つの配列の場合falseを返す', () => {
      expect(isEmpty(['item'])).toBe(false)
    })
  })
})
