import { invoke } from '@tauri-apps/api/core'

/**
 * ストレージモジュール
 * Rustバックエンドのファイルストレージとやり取りするためのAPI
 */

/**
 * データをストレージに書き込む
 * @param key ストレージのキー
 * @param data 保存するデータ
 */
export async function storageWrite<T>(key: string, data: T): Promise<void> {
  await invoke('storage_write', { key, data })
}

/**
 * ストレージからデータを読み込む
 * @param key ストレージのキー
 * @returns 読み込んだデータ
 */
export async function storageRead<T>(key: string): Promise<T> {
  return await invoke<T>('storage_read', { key })
}

/**
 * ストレージからデータを削除する
 * @param key ストレージのキー
 */
export async function storageDelete(key: string): Promise<void> {
  await invoke('storage_delete', { key })
}

/**
 * ストレージ内の全てのキーを取得する
 * @returns キーの配列
 */
export async function storageListKeys(): Promise<string[]> {
  return await invoke<string[]>('storage_list_keys')
}

/**
 * データが存在するかチェック
 * @param key ストレージのキー
 * @returns データが存在する場合はtrue
 */
export async function storageExists(key: string): Promise<boolean> {
  return await invoke<boolean>('storage_exists', { key })
}
