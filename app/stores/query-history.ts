import { defineStore } from 'pinia'
import { queryHistoryApi } from '@/api/query-history'
import { ref, computed } from 'vue'
import type {
  QueryHistory,
  QueryHistoryMetadata,
  AddHistoryRequest,
  SearchHistoryRequest
} from '@/types/query-history'

export const useQueryHistoryStore = defineStore('query-history', () => {
  const histories = ref<QueryHistoryMetadata[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Filters
  const searchKeyword = ref('')
  const selectedConnectionId = ref<string | null>(null)
  const successOnly = ref(false)

  // Getters
  const filteredHistories = computed(() => {
    return histories.value.filter(h => {
      // キーワード検索
      if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase()
        if (!h.sql.toLowerCase().includes(keyword)) {
          return false
        }
      }

      // 接続フィルタ
      if (selectedConnectionId.value && h.connectionId !== selectedConnectionId.value) {
        return false
      }

      // 成功のみフィルタ
      if (successOnly.value && !h.success) {
        return false
      }

      return true
    })
  })

  // Actions
  /**
   * 履歴一覧を読み込み
   */
  async function fetchHistories() {
    isLoading.value = true
    error.value = null
    try {
      histories.value = await queryHistoryApi.listHistories()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 履歴を追加
   */
  async function addHistory(request: AddHistoryRequest): Promise<QueryHistory | null> {
    try {
      const history = await queryHistoryApi.addHistory(request)
      await fetchHistories() // 一覧を更新
      return history
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    }
  }

  /**
   * 履歴を読み込み
   */
  async function loadHistory(id: string): Promise<QueryHistory | null> {
    isLoading.value = true
    error.value = null
    try {
      return await queryHistoryApi.loadHistory(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 履歴を削除
   */
  async function deleteHistory(id: string): Promise<boolean> {
    try {
      await queryHistoryApi.deleteHistory(id)
      await fetchHistories() // 一覧を更新
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    }
  }

  /**
   * クエリビルダーに読み込み
   */
  async function loadToBuilder(id: string): Promise<QueryHistory | null> {
    const history = await loadHistory(id)
    if (history) {
      // query-builderストアに状態を復元
      // 動的インポートを使用して循環参照を回避
      const { useQueryBuilderStore } = await import('./query-builder')
      const queryBuilderStore = useQueryBuilderStore()
      
      // QueryBuilderStoreにクエリ状態を適用
      // Note: QueryBuilderStoreに SerializableQueryState を受け取るアクションが必要
      // なければパッチを当てるか、個別に設定する
      queryBuilderStore.$patch(history.query)
      
      // 生成されたSQLもセットする
      // queryBuilderStore.generatedSql = history.sql
    }
    return history
  }

  /**
   * 検索キーワードを設定
   */
  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
  }

  /**
   * 接続IDフィルタを設定
   */
  function setSelectedConnectionId(connectionId: string | null) {
    selectedConnectionId.value = connectionId
  }

  /**
   * 成功のみフィルタを設定
   */
  function setSuccessOnly(value: boolean) {
    successOnly.value = value
  }
  
  /**
   * 古い履歴をクリア
   */
  async function clearOldHistories(days: number): Promise<number> {
    try {
        const count = await queryHistoryApi.clearOldHistories(days)
        await fetchHistories()
        return count
    } catch(err) {
        error.value = err instanceof Error ? err.message : 'Unknown error'
        return 0
    }
  }

    /**
   * 全履歴を削除
   */
  async function clearAllHistories(): Promise<boolean> {
     try {
        await queryHistoryApi.clearAllHistories()
        await fetchHistories()
        return true
    } catch(err) {
        error.value = err instanceof Error ? err.message : 'Unknown error'
        return false
    }
  }

  return {
    histories,
    isLoading,
    error,
    searchKeyword,
    selectedConnectionId,
    successOnly,
    filteredHistories,
    fetchHistories,
    addHistory,
    loadHistory,
    deleteHistory,
    loadToBuilder,
    setSearchKeyword,
    setSelectedConnectionId,
    setSuccessOnly,
    clearOldHistories,
    clearAllHistories
  }
})
