import { ref, type Ref } from 'vue'

/**
 * カラムリサイズ機能を提供するComposable
 */
export function useColumnResize() {
  // カラム名ごとの幅を管理 (デフォルト: 150px)
  const columnWidths = ref<Record<string, number>>({})
  const defaultWidth = 150
  const minWidth = 80

  // リサイズ中の状態
  const isResizing = ref(false)
  const resizingColumn = ref<string | null>(null)
  const startX = ref(0)
  const startWidth = ref(0)

  /**
   * カラムの幅を取得
   */
  const getColumnWidth = (columnName: string): number => {
    return columnWidths.value[columnName] ?? defaultWidth
  }

  /**
   * リサイズ開始
   */
  const startResize = (event: MouseEvent, columnName: string) => {
    event.preventDefault()
    isResizing.value = true
    resizingColumn.value = columnName
    startX.value = event.clientX
    startWidth.value = getColumnWidth(columnName)

    // マウスイベントリスナーを追加
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResize)
  }

  /**
   * マウス移動時の処理
   */
  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizing.value || !resizingColumn.value) return

    const deltaX = event.clientX - startX.value
    const newWidth = Math.max(minWidth, startWidth.value + deltaX)
    columnWidths.value[resizingColumn.value] = newWidth
  }

  /**
   * リサイズ終了
   */
  const stopResize = () => {
    isResizing.value = false
    resizingColumn.value = null

    // マウスイベントリスナーを削除
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResize)
  }

  /**
   * 全カラムの幅をリセット
   */
  const resetColumnWidths = () => {
    columnWidths.value = {}
  }

  return {
    columnWidths,
    isResizing,
    getColumnWidth,
    startResize,
    resetColumnWidths,
  }
}
