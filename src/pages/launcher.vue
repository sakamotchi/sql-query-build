<template>
  <v-app>
    <div
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{ currentThemeInfo.label }}に切り替えました
    </div>

    <LauncherAppBar
      @new-connection="handleNewConnection"
      @open-settings="handleOpenSettings"
    />

    <v-main :style="{ backgroundColor: currentThemeInfo.background }">
      <v-container fluid>
        <LauncherToolbar
          :search="filter.searchQuery || ''"
          :filter="filter.environment || 'all'"
          :db-type-filter="filter.dbType || 'all'"
          :sort="sort"
          :result-count="filteredConnections.length"
          @update:search="handleSearchUpdate"
          @update:filter="handleEnvironmentFilterUpdate"
          @update:db-type-filter="handleDbTypeFilterUpdate"
          @update:sort="handleSortUpdate"
          @clear-filters="handleClearFilters"
        />

        <!-- アクティブフィルターインジケーター -->
        <ActiveFilters />

        <!-- 空状態メッセージ -->
        <div
          v-if="filteredConnections.length === 0 && hasActiveFilters"
          class="empty-state text-center py-12"
        >
          <v-icon size="64" color="grey-lighten-1">mdi-filter-off-outline</v-icon>
          <div class="text-h6 mt-4 text-grey">検索条件に一致する接続がありません</div>
          <div class="text-body-2 text-grey-darken-1 mt-2">
            別の検索条件を試すか、フィルターをクリアしてください
          </div>
          <v-btn
            color="primary"
            variant="outlined"
            class="mt-4"
            @click="handleClearFilters"
          >
            フィルターをクリア
          </v-btn>
        </div>

        <!-- 接続リスト -->
        <ConnectionList
          v-else
          :connections="filteredConnections"
          :loading="loading"
          @select-connection="handleSelectConnection"
          @edit-connection="handleEditConnection"
          @delete-connection="handleDeleteConnection"
          @duplicate-connection="handleDuplicateConnection"
        />
      </v-container>
    </v-main>

    <!-- 接続設定フォームダイアログ -->
    <v-dialog v-model="showConnectionForm" max-width="800px" persistent>
      <ConnectionForm
        ref="connectionFormRef"
        :connection="editingConnection"
        :mode="formMode"
        @save="handleSaveConnection"
        @cancel="handleCancelForm"
        @test-connection="handleTestConnection"
      />
    </v-dialog>

    <!-- 接続テスト結果スナックバー -->
    <v-snackbar
      v-model="showTestResult"
      :color="testResult.success ? 'success' : 'error'"
      :timeout="3000"
    >
      {{ testResult.message }}
    </v-snackbar>

    <!-- 接続テスト結果ダイアログ -->
    <v-dialog v-model="showTestResultDialog" max-width="640px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            :color="testResult.success ? 'success' : 'error'"
          >
            {{ testResult.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
          </v-icon>
          <span>接続テスト結果</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showTestResultDialog = false"></v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text>
          <div class="text-subtitle-1 mb-1">
            {{ testResult.message }}
          </div>
          <div v-if="testResult.duration" class="text-body-2 text-grey-darken-1">
            所要時間: {{ testResult.duration }} ms
          </div>

          <div v-if="testResult.success && testResult.serverInfo" class="mt-4">
            <div class="text-subtitle-2 mb-2">サーバー情報</div>
            <v-list density="compact" lines="two">
              <v-list-item title="バージョン" :subtitle="testResult.serverInfo.version" />
              <v-list-item title="データベース" :subtitle="testResult.serverInfo.databaseName" />
              <v-list-item title="ユーザー" :subtitle="testResult.serverInfo.currentUser" />
              <v-list-item
                v-if="testResult.serverInfo.encoding"
                title="エンコーディング"
                :subtitle="testResult.serverInfo.encoding"
              />
            </v-list>
          </div>

          <div v-else-if="!testResult.success" class="mt-4">
            <div class="text-subtitle-2 mb-2">詳細</div>
            <v-btn
              v-if="testResult.errorDetails"
              size="small"
              variant="text"
              color="primary"
              @click="showErrorDetails = !showErrorDetails"
            >
              {{ showErrorDetails ? '詳細を隠す' : '詳細を表示' }}
            </v-btn>
            <v-expand-transition>
              <v-card
                v-if="showErrorDetails && testResult.errorDetails"
                variant="tonal"
                color="error"
                class="mt-2 pa-3"
              >
                <div class="text-body-2" style="white-space: pre-wrap;">
                  {{ testResult.errorDetails }}
                </div>
              </v-card>
            </v-expand-transition>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="showTestResultDialog = false">
            閉じる
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 編集中のローディングオーバーレイ -->
    <v-overlay
      v-model="loadingEdit"
      persistent
      class="align-center justify-center"
    >
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      ></v-progress-circular>
      <div class="text-h6 mt-4">接続情報を読み込み中...</div>
    </v-overlay>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Connection } from '@/types/connection'
import { storeToRefs } from 'pinia'
import { ask } from '@tauri-apps/plugin-dialog'
import { useTheme } from '@/composables/useTheme'
import { windowApi } from '@/api/window'
import { ConnectionAPI, type TestConnectionResult } from '@/api/connection'
import { useConnectionStore } from '@/stores/connection'
import { getUserFriendlyErrorMessage } from '@/utils/errorHandler'
import LauncherAppBar from '@/components/connection/LauncherAppBar.vue'
import LauncherToolbar from '@/components/connection/LauncherToolbar.vue'
import ActiveFilters from '@/components/connection/ActiveFilters.vue'
import ConnectionList from '@/components/connection/ConnectionList.vue'
import ConnectionForm from '@/pages/connection-form.vue'

// Piniaストアを使用
const connectionStore = useConnectionStore()
const { loading: storeLoading, filter, sort, filteredConnections } = storeToRefs(connectionStore)
const { currentThemeInfo, safeSetTheme } = useTheme()
const isTauriEnvironment =
  typeof window !== 'undefined' &&
  ('__TAURI_IPC__' in window || '__TAURI__' in window || '__TAURI_INTERNALS__' in window)

// 状態管理
const loading = computed(() => storeLoading.value)

// フォーム状態
const showConnectionForm = ref(false)
const editingConnection = ref<Connection | undefined>(undefined)
const formMode = ref<'create' | 'edit' | 'duplicate'>('create')
const connectionFormRef = ref<any>(null)
const loadingEdit = ref(false)

// 接続テスト結果
const showTestResult = ref(false)
const showTestResultDialog = ref(false)
const showErrorDetails = ref(false)
const testResult = ref<TestConnectionResult>({
  success: false,
  message: '',
})

// アクティブフィルターがあるかチェック
const hasActiveFilters = computed(() => {
  return (
    filter.value.searchQuery ||
    filter.value.environment !== 'all' ||
    filter.value.dbType !== 'all'
  )
})

// フィルター更新ハンドラー
const handleSearchUpdate = (value: string) => {
  connectionStore.setFilter({ searchQuery: value })
}

const handleEnvironmentFilterUpdate = (value: string) => {
  connectionStore.setFilter({ environment: value as any })
}

const handleDbTypeFilterUpdate = (value: string) => {
  connectionStore.setFilter({ dbType: value as any })
}

const handleSortUpdate = (value: string) => {
  connectionStore.setSort(value as any)
}

const handleClearFilters = () => {
  connectionStore.resetFilter()
}

// イベントハンドラー
const handleNewConnection = () => {
  editingConnection.value = undefined
  formMode.value = 'create'
  showConnectionForm.value = true
}

const handleOpenSettings = () => {
  if (!isTauriEnvironment) {
    console.log('設定画面はTauri環境でのみ起動できます')
    return
  }

  windowApi.openSettings().catch(error => {
    console.error('設定ウィンドウの起動に失敗しました', error)
  })
}

const handleSelectConnection = async (connection: Connection) => {
  console.log('接続が選択されました:', connection)

  try {
    await connectionStore.markConnectionAsUsed(connection.id)
  } catch (error) {
    console.warn('最終使用日時の更新に失敗しましたが処理を続行します', error)
  }

  const queryBuilderUrl = `query-builder?connectionId=${encodeURIComponent(connection.id)}&environment=${connection.environment}&connectionName=${encodeURIComponent(connection.name)}`

  if (!isTauriEnvironment) {
    console.warn('Tauri環境が検出できないため、同一ウィンドウで遷移します')
    window.location.href = queryBuilderUrl
    return
  }

  try {
    const existing = await windowApi.findWindowByConnection(connection.id)

    if (existing) {
      await windowApi.focusWindow(existing.label)
      return
    }

    await windowApi.openQueryBuilder(connection.id, connection.name, connection.environment)
  } catch (error) {
    console.error('クエリビルダーの起動に失敗しました。フォールバックとして同一ウィンドウで開きます:', error)
    window.location.href = queryBuilderUrl
  }
}

const handleEditConnection = async (connection: Connection) => {
  loadingEdit.value = true
  try {
    // パスワードを復号化して取得
    const connectionWithPassword = await connectionStore.fetchConnectionById(connection.id, true)

    if (connectionWithPassword) {
      editingConnection.value = connectionWithPassword
      formMode.value = 'edit'
      showConnectionForm.value = true
    } else {
      console.error('接続情報が見つかりませんでした')
      alert('接続情報の取得に失敗しました')
    }
  } catch (error) {
    console.error('接続情報の取得に失敗しました:', error)
    alert('接続情報の取得に失敗しました')
  } finally {
    loadingEdit.value = false
  }
}

const handleDeleteConnection = async (connection: Connection) => {
  console.log('接続の削除:', connection)

  const confirmed = await ask(`「${connection.name}」を削除してもよろしいですか?`, {
    title: '接続の削除',
    kind: 'warning'
  })

  if (confirmed) {
    try {
      await connectionStore.deleteConnection(connection.id)
      console.log('接続を削除しました:', connection.name)
    } catch (error) {
      console.error('接続の削除に失敗しました:', error)
      alert('接続の削除に失敗しました')
    }
  }
}

const handleDuplicateConnection = async (connection: Connection) => {
  try {
    const duplicated = await connectionStore.duplicateConnection(connection.id)
    console.log('接続を複製しました:', duplicated.name)
  } catch (error) {
    console.error('接続の複製に失敗しました:', error)
    alert('接続の複製に失敗しました')
  }
}

const handleSaveConnection = async (connection: Connection) => {
  console.log('接続を保存:', connection)

  try {
    // 既存の接続を更新または新規追加
    const existingConnection = connectionStore.getConnectionById(connection.id)
    if (existingConnection) {
      await connectionStore.updateConnection(connection)
      console.log('接続を更新しました:', connection.name)
    } else {
      await connectionStore.createConnection(connection)
      console.log('接続を作成しました:', connection.name)
    }

    showConnectionForm.value = false
    editingConnection.value = undefined
  } catch (error) {
    console.error('接続の保存に失敗しました:', error)
    alert('接続の保存に失敗しました')
  } finally {
    // 保存完了をフォームに通知
    connectionFormRef.value?.finishSaving()
  }
}

const handleCancelForm = () => {
  showConnectionForm.value = false
  editingConnection.value = undefined
}

const handleTestConnection = async (connection: Connection) => {
  console.log('接続テスト:', connection)

  try {
    if (!isTauriEnvironment) {
      testResult.value = {
        success: false,
        message: '接続テストはTauri環境でのみ実行できます',
      }
      showErrorDetails.value = false
      showTestResultDialog.value = true
      showTestResult.value = true
      return
    }

    const result = await ConnectionAPI.testConnection(connection)
    testResult.value = {
      success: result.success,
      message: result.message,
      duration: result.duration,
      serverInfo: result.serverInfo,
      errorDetails: result.errorDetails,
    }
  } catch (error) {
    console.error('接続テストでエラーが発生しました:', error)
    testResult.value = {
      success: false,
      message: getUserFriendlyErrorMessage(error),
      errorDetails: error instanceof Error ? error.message : String(error),
    }
  } finally {
    showErrorDetails.value = false
    showTestResult.value = true
    showTestResultDialog.value = true
    connectionFormRef.value?.finishTestConnection()
  }
}

// 接続情報の読み込み
const loadConnections = async () => {
  try {
    await connectionStore.fetchConnections()
  } catch (error) {
    console.error('接続情報の取得に失敗しました:', error)
    alert('接続情報の取得に失敗しました')
  }
}

// マウント時に接続情報を読み込み
onMounted(() => {
  safeSetTheme('development')
  loadConnections()
})

// TODO: キーボードショートカットの実装
// - Ctrl/Cmd + N: 新規接続
// - Ctrl/Cmd + F: 検索フォーカス
</script>
