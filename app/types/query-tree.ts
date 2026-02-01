import type { SavedQueryMetadata } from '@/types/saved-query'

/**
 * 保存クエリのツリービュー用ノード
 */
export interface TreeNode {
  /**
   * ノードのタイプ
   */
  type: 'folder' | 'query'

  /**
   * ノードのパス
   * - フォルダ: folderPath
   * - クエリ: id
   */
  path: string

  /**
   * 表示名
   */
  name: string

  /**
   * 子ノード（フォルダのみ）
   */
  children?: TreeNode[]

  /**
   * クエリメタデータ（クエリのみ）
   */
  query?: SavedQueryMetadata

  /**
   * 展開状態（フォルダのみ）
   */
  expanded?: boolean

  /**
   * フォルダ直下のクエリ数
   */
  queryCount?: number
}
