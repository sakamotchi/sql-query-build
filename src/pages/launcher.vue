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
        />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Connection } from '@/types/connection'
import LauncherAppBar from '@/components/connection/LauncherAppBar.vue'
import LauncherToolbar from '@/components/connection/LauncherToolbar.vue'
import ConnectionList from '@/components/connection/ConnectionList.vue'

// 状態管理
const searchQuery = ref('')
const environmentFilter = ref('all')
const sortOption = ref('name')
const loading = ref(false)
const connections = ref<Connection[]>([])

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
        const envOrder = { development: 0, test: 1, staging: 2, production: 3 }
        return envOrder[a.environment] - envOrder[b.environment]
      default:
        return 0
    }
  })

  return result
})

// イベントハンドラー
const handleNewConnection = () => {
  console.log('新規接続ボタンがクリックされました')
  // TODO: 接続設定画面への遷移を実装
}

const handleOpenSettings = () => {
  console.log('設定ボタンがクリックされました')
  // TODO: 設定画面への遷移を実装
}

const handleSelectConnection = (connection: Connection) => {
  console.log('接続が選択されました:', connection)
  // TODO: クエリビルダー画面を新規ウィンドウで起動
}

const handleEditConnection = (connection: Connection) => {
  console.log('接続の編集:', connection)
  // TODO: 接続設定画面への遷移を実装（編集モード）
}

const handleDeleteConnection = async (connection: Connection) => {
  console.log('接続の削除:', connection)
  // TODO: 削除確認ダイアログの表示と削除処理を実装
  // 仮の確認ダイアログ
  if (confirm(`「${connection.name}」を削除してもよろしいですか?`)) {
    // TODO: Tauri経由でバックエンドの削除処理を呼び出し
    connections.value = connections.value.filter(c => c.id !== connection.id)
  }
}

// サンプルデータの読み込み
const loadConnections = async () => {
  loading.value = true
  try {
    // TODO: Tauri経由でバックエンドから接続情報を取得
    // const result = await invoke('get_connections')

    // 開発用のサンプルデータ
    connections.value = [
      {
        id: '1',
        name: '開発環境DB',
        environment: 'development',
        themeColor: '#1976D2',
        host: 'localhost',
        port: 5432,
        database: 'dev_db',
        username: 'dev_user',
        password: '',
        dbType: 'postgresql',
        ssl: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'テスト環境DB',
        environment: 'test',
        themeColor: '#FB8C00',
        host: 'test.example.com',
        port: 3306,
        database: 'test_db',
        username: 'test_user',
        password: '',
        dbType: 'mysql',
        ssl: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'ステージング環境DB',
        environment: 'staging',
        themeColor: '#9C27B0',
        host: 'staging.example.com',
        port: 5432,
        database: 'staging_db',
        username: 'staging_user',
        password: '',
        dbType: 'postgresql',
        ssl: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: new Date(Date.now() - 86400000).toISOString() // 1日前
      },
      {
        id: '4',
        name: '本番環境DB',
        environment: 'production',
        themeColor: '#F44336',
        host: 'prod.example.com',
        port: 5432,
        database: 'prod_db',
        username: 'prod_user',
        password: '',
        dbType: 'postgresql',
        ssl: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: new Date(Date.now() - 172800000).toISOString() // 2日前
      }
    ]
  } catch (error) {
    console.error('接続情報の取得に失敗しました:', error)
  } finally {
    loading.value = false
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
