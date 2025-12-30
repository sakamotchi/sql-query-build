import { defineStore } from 'pinia'
import type { SavedQueryMetadata, SaveQueryRequest, SearchQueryRequest } from '@/types/saved-query'
import { queryStorageApi } from '@/api/query-storage'
import { useQueryBuilderStore } from '@/stores/query-builder'
import { useConnectionStore } from '@/stores/connection'
import { useWindowStore } from '@/stores/window'

interface SavedQueryState {
  queries: SavedQueryMetadata[]
  isLoading: boolean
  error: string | null
  searchKeyword: string
  selectedTags: string[]
}

export const useSavedQueryStore = defineStore('saved-query', {
  state: (): SavedQueryState => ({
    queries: [],
    isLoading: false,
    error: null,
    searchKeyword: '',
    selectedTags: [],
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
    }
  },

  actions: {
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
      queryOverride?: SerializableQueryState,
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
     * クエリを読み込んでクエリビルダーにセット
     */
    async loadQueryToBuilder(id: string) {
      this.isLoading = true
      this.error = null
      try {
        const savedQuery = await queryStorageApi.loadQuery(id)
        
        // 接続IDのチェック（必要であれば警告や接続切り替えのロジックを入れる）
        // 一旦はそのまま読み込むが、クエリビルダー側で接続IDを使って復元するロジックが必要かも
        // query-builderストアに loadQuery アクションを追加するのが良さそうだが、
        // ここでは queryBuilderStore.query にセットする。
        // ただし queryBuilderStore は state を直接いじるよりアクション経由が望ましい。
        // query-converter の逆変換 (QueryModel -> QueryBuilderState) が必要。
        // 現在の実装には QueryModel -> QueryBuilderState の変換ロジックが恐らくない。
        // 前回の実装内容を確認すると、convertToQueryModel はあるが逆はない。
        
        // ★重要: QueryModelからStateへの復元は難易度が高い。
        // QueryModelは構造化されているので、それをUIのStateに戻す必要がある。
        // ここでは一旦、queryBuilderStoreに `loadFromQueryModel` のようなアクションが必要になると想定し、
        // 実装計画通りに `loadFromSavedQuery` をquery-builderストアに追加することを検討する。
        // しかし、Task 4.1.5 では saved-query ストア実装となっている。
        
        // queryBuilderStoreにロードを委譲する形にする
        const queryBuilderStore = useQueryBuilderStore()
        
        queryBuilderStore.loadState(savedQuery.query)
        
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
