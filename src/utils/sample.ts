/**
 * 2つの数値を加算する
 */
export function add(a: number, b: number): number {
  return a + b
}

/**
 * 文字列を大文字に変換する
 */
export function toUpperCase(str: string): string {
  return str.toUpperCase()
}

/**
 * 配列が空かどうかを判定する
 */
export function isEmpty<T>(arr: T[]): boolean {
  return arr.length === 0
}
