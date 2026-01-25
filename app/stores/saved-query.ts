import { defineStore } from 'pinia'
import type { SavedQueryMetadata, SaveQueryRequest, SearchQueryRequest, SerializableBuilderState } from '@/types/saved-query'
import type { SerializableMutationState } from '@/stores/mutation-builder'
import { queryStorageApi } from '@/api/query-storage'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'
import type { TreeNode } from '@/types/query-tree'

/**
 * Toast通知を表示するヘルパー関数
 * テスト環境では useToast が利用できないため、try-catchで安全にラップ
 */
function showToast(notification: { title: string; description?: string; color?: string }) {
  if (typeof window === 'undefined') return

  try {
    // 動的インポートでuseToastを取得
    const { useToast } = require('#imports')
    const toast = useToast()
    toast.add(notification)
  } catch (e) {
    // テスト環境やSSR環境ではToastが利用できないため無視
    console.warn('Toast notification skipped:', notification.title)
  }
}

interface SavedQueryState {
  queries: SavedQueryMetadata[]
  isLoading: boolean
  error: string | null
  searchKeyword: string
  selectedTags: string[]
  folders: string[]
  expandedFolders: Set<string>
}

export const useSavedQueryStore = defineStore('saved-query', {
  state: (): SavedQueryState => ({
    queries: [],
    isLoading: false,
    error: null,
    searchKeyword: '',
    selectedTags: [],
    folders: [],
    expandedFolders: new Set(),
  }),

  getters: {
    filteredQueries(state): SavedQueryMetadata[] {
      // フロントエンド側での簡易フィルタリング（必要に応じて）
      // 基本は searchSavedQueries API を使うので、ここでは表示用の微調整のみ
      return state.queries
    },
    
    uniqueTags(state): string[] {
      const tagSet = new Set<string>()
      state.queries.forEach(q => {
        q.tags.forEach(tag => tagSet.add(tag))
      })
      return Array.from(tagSet).sort()
    },

    /**
     * フラットなクエリ一覧から階層ツリー構造を生成
     */
    queryTree(): TreeNode[] {
      const root: TreeNode[] = []
      const folderMap = new Map<string, TreeNode>()

      for (const folderPath of this.folders) {
        const parts = folderPath.split('/').filter(Boolean)
        let currentPath = ''
        let parent = root

        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`

          if (!folderMap.has(currentPath)) {
            const folderNode: TreeNode = {
              type: 'folder',
              path: currentPath,
              name: part,
              children: [],
              expanded: this.expandedFolders.has(currentPath),
              queryCount: 0,
            }
            folderMap.set(currentPath, folderNode)
            parent.push(folderNode)
            parent = folderNode.children!
          } else {
            parent = folderMap.get(currentPath)!.children!
          }
        }
      }

      for (const query of this.queries) {
        const queryNode: TreeNode = {
          type: 'query',
          path: query.id,
          name: query.name,
          query,
        }

        if (query.folderPath) {
          const folder = folderMap.get(query.folderPath)
          if (folder) {
            folder.children!.push(queryNode)
            folder.queryCount = (folder.queryCount || 0) + 1
          } else {
            root.push(queryNode)
          }
        } else {
          root.push(queryNode)
        }
      }

      const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
        nodes.forEach(node => {
          if (node.children) {
            sortNodes(node.children)
          }
        })
      }
      sortNodes(root)

      return root
    },

    /**
     * 指定パスのフォルダノードを取得
     */
    getFolderByPath(): (path: string) => TreeNode | null {
      return (path: string) => {
        const findFolder = (nodes: TreeNode[]): TreeNode | null => {
          for (const node of nodes) {
            if (node.type === 'folder' && node.path === path) {
              return node
            }
            if (node.children) {
              const found = findFolder(node.children)
              if (found) return found
            }
          }
          return null
        }
        return findFolder(this.queryTree)
      }
    },
  },

  actions: {
    /**
     * フォルダ一覧を取得して状態を更新
     */
    async fetchFolders() {
      try {
        this.folders = await queryStorageApi.listFolders()
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        console.error('Failed to fetch folders:', e)
        showToast({
          title: 'フォルダ一覧の取得に失敗しました',
          description: error,
          color: 'error',
        })
      }
    },

    /**
     * クエリ一覧を取得
     */
    async fetchQueries(request: SearchQueryRequest = {}) {
      this.isLoading = true
      this.error = null
      try {
        this.queries = await queryStorageApi.searchSavedQueries(request)
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error('Failed to fetch queries:', e)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 現在のクエリを保存
     */
    async saveCurrentQuery(
      name: string,
      description: string,
      tags: string[],
      overwriteId?: string,
      queryOverride?: SerializableBuilderState,
      connectionIdOverride?: string
    ): Promise<boolean> {
      const queryBuilderStore = useQueryBuilderStore()
      const connectionStore = useConnectionStore()
      const windowStore = useWindowStore()
      
      // クエリの状態を決定
      let queryState = queryOverride
      if (!queryState) {
        // クエリビルダーの状態を使用
        if (!queryBuilderStore.selectedColumns.length) {
          this.error = 'クエリが構築されていません。カラムを選択してください。'
          return false
        }
        queryState = queryBuilderStore.getSerializableState()
      }

      // 接続IDの取得と検証
      const connectionId = connectionIdOverride || connectionStore.activeConnection?.id || windowStore.currentConnectionId
      if (!connectionId) {
        this.error = '接続情報が見つかりません。データベースに接続してください。'
        return false
      }

      this.isLoading = true
      this.error = null

      try {
        const request: SaveQueryRequest = {
          id: overwriteId,
          name,
          description,
          tags,
          connectionId,
          query: queryState,
        }

        await queryStorageApi.saveQuery(request)
        await this.fetchQueries() // 一覧更新
        return true
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error('Failed to save query:', e)
        return false
      } finally {
        this.isLoading = false
      }
    },

    /**
     * クエリの詳細を取得（バリデーション用）
     */
    async loadQuery(id: string) {
      try {
        return await queryStorageApi.loadQuery(id)
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error('Failed to load query:', e)
        throw e
      }
    },

    /**
     * クエリを読み込んでクエリビルダーにセット
     */
    async loadQueryToBuilder(id: string) {
      this.isLoading = true
      this.error = null
      try {
        const savedQuery = await queryStorageApi.loadQuery(id)
        const queryBuilderStore = useQueryBuilderStore()

        // SerializableQueryStateのみを渡す
        if ('selectedTables' in savedQuery.query) {
          queryBuilderStore.loadState(savedQuery.query)
        } else {
          throw new Error('This query is not a SELECT query')
        }

        return savedQuery
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error('Failed to load query:', e)
        throw e
      } finally {
        this.isLoading = false
      }
    },

    /**
     * クエリを読み込んでMutationビルダーにセット
     */
    async loadQueryToMutationBuilder(id: string) {
      this.isLoading = true
      this.error = null
      try {
        const savedQuery = await queryStorageApi.loadQuery(id)
        const { useMutationBuilderStore } = await import('@/stores/mutation-builder')
        const mutationBuilderStore = useMutationBuilderStore()
        mutationBuilderStore.loadState(savedQuery.query as SerializableMutationState)

        return savedQuery
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error('Failed to load query:', e)
        throw e
      } finally {
        this.isLoading = false
      }
    },

    /**
     * クエリを削除
     */
    async deleteQuery(id: string) {
      this.isLoading = true
      this.error = null
      try {
        await queryStorageApi.deleteQuery(id)
        await this.fetchQueries() // 一覧更新
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error('Failed to delete query:', e)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * クエリを指定フォルダに移動
     */
    async moveQuery(queryId: string, targetFolderPath: string | null) {
      this.isLoading = true
      this.error = null
      try {
        await queryStorageApi.moveQuery(queryId, targetFolderPath)
        await this.fetchQueries({
          keyword: this.searchKeyword,
          tags: this.selectedTags,
        })
        showToast({
          title: 'クエリを移動しました',
          color: 'success',
        })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        this.error = error
        console.error('Failed to move query:', e)
        showToast({
          title: 'クエリの移動に失敗しました',
          description: error,
          color: 'error',
        })
      } finally {
        this.isLoading = false
      }
    },

    /**
     * フォルダ名を変更
     */
    async renameFolder(oldPath: string, newPath: string) {
      if (this.folders.includes(newPath)) {
        showToast({
          title: 'フォルダ名が重複しています',
          description: `「${newPath}」は既に存在します`,
          color: 'warning',
        })
        return
      }

      this.isLoading = true
      this.error = null
      try {
        await queryStorageApi.renameFolder(oldPath, newPath)
        await Promise.all([
          this.fetchFolders(),
          this.fetchQueries({
            keyword: this.searchKeyword,
            tags: this.selectedTags,
          }),
        ])

        if (this.expandedFolders.has(oldPath)) {
          this.expandedFolders.delete(oldPath)
          this.expandedFolders.add(newPath)
          this.saveExpandedFolders()
        }

        showToast({
          title: 'フォルダ名を変更しました',
          color: 'success',
        })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        this.error = error
        console.error('Failed to rename folder:', e)
        showToast({
          title: 'フォルダ名の変更に失敗しました',
          description: error,
          color: 'error',
        })
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 空のフォルダを削除
     */
    async deleteFolder(folderPath: string) {
      const queriesInFolder = this.queries.filter(q =>
        q.folderPath === folderPath || q.folderPath?.startsWith(`${folderPath}/`)
      )
      if (queriesInFolder.length > 0) {
        showToast({
          title: 'フォルダを削除できません',
          description: `フォルダ内に${queriesInFolder.length}件のクエリが含まれています`,
          color: 'warning',
        })
        return
      }

      this.isLoading = true
      this.error = null
      try {
        await queryStorageApi.deleteFolder(folderPath)
        await this.fetchFolders()
        this.expandedFolders.delete(folderPath)
        this.saveExpandedFolders()
        showToast({
          title: 'フォルダを削除しました',
          color: 'success',
        })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        this.error = error
        console.error('Failed to delete folder:', e)
        showToast({
          title: 'フォルダの削除に失敗しました',
          description: error,
          color: 'error',
        })
      } finally {
        this.isLoading = false
      }
    },

    /**
     * フォルダの展開/折りたたみを切り替え
     */
    toggleFolderExpansion(folderPath: string) {
      if (this.expandedFolders.has(folderPath)) {
        this.expandedFolders.delete(folderPath)
      } else {
        this.expandedFolders.add(folderPath)
      }
      this.saveExpandedFolders()
    },

    /**
     * 展開状態をLocalStorageに保存
     */
    saveExpandedFolders() {
      if (typeof localStorage === 'undefined') {
        return
      }
      try {
        const expanded = Array.from(this.expandedFolders)
        localStorage.setItem('savedQueryExpandedFolders', JSON.stringify(expanded))
      } catch (e) {
        console.error('Failed to save expanded folders:', e)
      }
    },

    /**
     * 展開状態をLocalStorageから復元
     */
    loadExpandedFolders() {
      if (typeof localStorage === 'undefined') {
        return
      }
      try {
        const saved = localStorage.getItem('savedQueryExpandedFolders')
        if (saved) {
          const expanded = JSON.parse(saved) as string[]
          this.expandedFolders = new Set(expanded)
        }
      } catch (e) {
        console.error('Failed to load expanded folders:', e)
        this.expandedFolders = new Set()
      }
    },

    /**
     * ドラッグ&ドロップによるクエリ移動
     */
    async handleQueryDrop(queryId: string, targetFolderPath: string | null) {
      const query = this.queries.find(q => q.id === queryId)
      if (!query) {
        console.error('Query not found:', queryId)
        return
      }

      if (query.folderPath === targetFolderPath) {
        return
      }

      if (targetFolderPath && !this.folders.includes(targetFolderPath)) {
        return
      }

      await this.moveQuery(queryId, targetFolderPath)
    },
    
    /**
     * 検索キーワードを設定
     */
    setSearchKeyword(keyword: string) {
      this.searchKeyword = keyword
      this.fetchQueries({ keyword, tags: this.selectedTags })
    },
    
    /**
     * 選択タグを設定
     */
    setSelectedTags(tags: string[]) {
      this.selectedTags = tags
      this.fetchQueries({ keyword: this.searchKeyword, tags })
    }
  }
})
