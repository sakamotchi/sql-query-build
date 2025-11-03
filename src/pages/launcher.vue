<template>
  <v-app>
    <LauncherAppBar
      @new-connection="handleNewConnection"
      @open-settings="handleOpenSettings"
    />

    <v-main>
      <v-container fluid>
        <LauncherToolbar
          v-model:search="searchQuery"
          v-model:filter="environmentFilter"
          v-model:sort="sortOption"
        />

        <ConnectionList
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
import type { Connection, Environment } from '@/types/connection'
import { useConnectionStore } from '@/stores/connection'
import { storeToRefs } from 'pinia'
import { ask } from '@tauri-apps/plugin-dialog'
import LauncherAppBar from '@/components/connection/LauncherAppBar.vue'
import LauncherToolbar from '@/components/connection/LauncherToolbar.vue'
import ConnectionList from '@/components/connection/ConnectionList.vue'
import ConnectionForm from '@/pages/connection-form.vue'

// Piniaストアを使用
const connectionStore = useConnectionStore()
const { connections, loading: storeLoading } = storeToRefs(connectionStore)

// 状態管理
const searchQuery = ref('')
const environmentFilter = ref('all')
const sortOption = ref('name')
const loading = computed(() => storeLoading.value)

// フォーム状態
const showConnectionForm = ref(false)
const editingConnection = ref<Connection | undefined>(undefined)
const formMode = ref<'create' | 'edit' | 'duplicate'>('create')
const connectionFormRef = ref<any>(null)
const loadingEdit = ref(false)

// 接続テスト結果
const showTestResult = ref(false)
const testResult = ref({ success: false, message: '' })

// フィルタリングとソートされた接続リスト
const filteredConnections = computed(() => {
  let result = [...connections.value]

  // 検索フィルター
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(conn =>
      conn.name.toLowerCase().includes(query) ||
      conn.host.toLowerCase().includes(query) ||
      conn.database.toLowerCase().includes(query)
    )
  }

  // 環境フィルター
  if (environmentFilter.value !== 'all') {
    result = result.filter(conn => conn.environment === environmentFilter.value)
  }

  // ソート
  result.sort((a, b) => {
    switch (sortOption.value) {
      case 'name':
        return a.name.localeCompare(b.name, 'ja')
      case 'lastUsed':
        // lastUsedAtが存在しない場合は後ろに配置
        if (!a.lastUsedAt && !b.lastUsedAt) return 0
        if (!a.lastUsedAt) return 1
        if (!b.lastUsedAt) return -1
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
      case 'environment':
        const envOrder: Record<Environment, number> = { development: 0, test: 1, staging: 2, production: 3 }
        return envOrder[a.environment] - envOrder[b.environment]
      default:
        return 0
    }
  })

  return result
})

// イベントハンドラー
const handleNewConnection = () => {
  editingConnection.value = undefined
  formMode.value = 'create'
  showConnectionForm.value = true
}

const handleOpenSettings = () => {
  console.log('設定ボタンがクリックされました')
  // TODO: 設定画面への遷移を実装
}

const handleSelectConnection = async (connection: Connection) => {
  console.log('接続が選択されました:', connection)

  // 最終使用日時を更新
  await connectionStore.markConnectionAsUsed(connection.id)

  // TODO: クエリビルダー画面を新規ウィンドウで起動
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
    const existingIndex = connections.value.findIndex(c => c.id === connection.id)
    if (existingIndex >= 0) {
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

const handleTestConnection = async (connection: Partial<Connection>) => {
  console.log('接続テスト:', connection)

  // TODO: Tauri経由でバックエンドの接続テスト処理を呼び出し
  // 仮の処理
  await new Promise(resolve => setTimeout(resolve, 1000))

  // ランダムで成功/失敗をシミュレート
  const success = Math.random() > 0.3

  testResult.value = {
    success,
    message: success
      ? '接続に成功しました'
      : '接続に失敗しました。設定を確認してください'
  }
  showTestResult.value = true
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
  loadConnections()
})

// TODO: キーボードショートカットの実装
// - Ctrl/Cmd + N: 新規接続
// - Ctrl/Cmd + F: 検索フォーカス
</script>
