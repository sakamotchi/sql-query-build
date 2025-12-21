import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { Connection } from '~/types'

// Tauriコマンドのヘルパー関数
async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  // クライアントサイドでのみ実行
  if (typeof window === 'undefined') {
    throw new Error('Tauri is not available. Running in browser mode.')
  }

  // Tauri v2では __TAURI_INTERNALS__ を使用して判定
  // または import.meta.env.TAURI_PLATFORM で判定
  const isTauri = '__TAURI_INTERNALS__' in window || import.meta.env.TAURI_PLATFORM !== undefined

  if (!isTauri) {
    throw new Error('Tauri is not available. Running in browser mode.')
  }

  return invoke<T>(command, args)
}

// フロントエンド型からRustのFrontendConnection型に変換
function toRustConnection(connection: Connection | Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>) {
  const baseConnection = 'id' in connection ? connection : {
    ...connection,
    id: '', // 新規接続用の空ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return {
    id: baseConnection.id,
    name: baseConnection.name,
    environment: baseConnection.environment,
    themeColor: baseConnection.customColor?.primary || '#4CAF50',
    host: baseConnection.host,
    port: baseConnection.port,
    database: baseConnection.database,
    username: baseConnection.username,
    password: baseConnection.password || '',
    savePassword: Boolean(baseConnection.password),
    type: baseConnection.type,
    ssl: false,
    sshTunnel: false,
    timeout: 30,
    createdAt: baseConnection.createdAt,
    updatedAt: baseConnection.updatedAt
  }
}

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    connections: [] as Connection[],
    activeConnection: null as Connection | null,
    loading: false,
    error: null as string | null
  }),

  getters: {
    connectionsByEnvironment: (state) => (env: Connection['environment']) =>
      state.connections.filter((connection) => connection.environment === env),
    getConnectionById: (state) => (id: string) =>
      state.connections.find((connection) => connection.id === id)
  },

  actions: {
    async loadConnections() {
      this.loading = true
      this.error = null

      try {
        this.connections = await invokeTauri<Connection[]>('get_connections')
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error'
        console.error('Failed to load connections:', error)
        // 開発時はダミーデータを返す
        this.connections = []
      } finally {
        this.loading = false
      }
    },

    async getConnectionWithPassword(id: string): Promise<Connection | null> {
      try {
        // キャメルケースで送信（Tauriが自動的にスネークケースに変換）
        const params = {
          id,
          includePasswordDecrypted: true
        }
        console.log('[getConnectionWithPassword] Calling with params:', params)
        const result = await invokeTauri<Connection | null>('get_connection', params)
        console.log('[getConnectionWithPassword] Result:', result)
        return result
      } catch (error) {
        console.error('Failed to get connection with password:', error)

        // ブラウザモード用のフォールバック
        if (error instanceof Error && error.message.includes('Tauri is not available')) {
          return this.getConnectionById(id) || null
        }

        throw error
      }
    },

    async createConnection(connection: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>) {
      this.loading = true
      this.error = null

      try {
        const rustConnection = toRustConnection(connection)
        const newConnection = await invokeTauri<Connection>('create_connection', { connection: rustConnection })
        this.connections.push(newConnection)
        return newConnection
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create connection'
        console.error('Failed to create connection:', error)

        // ブラウザモード用のフォールバック: モックデータを作成
        if (error instanceof Error && error.message.includes('Tauri is not available')) {
          const mockConnection: Connection = {
            ...connection,
            id: `mock-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          this.connections.push(mockConnection)
          console.warn('Created mock connection in browser mode:', mockConnection)
          return mockConnection
        }

        throw error
      } finally {
        this.loading = false
      }
    },

    async updateConnection(id: string, updates: Partial<Connection>) {
      this.loading = true
      this.error = null

      try {
        // 既存の接続情報を取得してマージ
        const existing = this.connections.find((connection: Connection) => connection.id === id)
        if (!existing) {
          throw new Error('Connection not found')
        }

        const merged = { ...existing, ...updates }
        const rustConnection = toRustConnection(merged)
        const updated = await invokeTauri<Connection>('update_connection', { connection: rustConnection })

        const index = this.connections.findIndex((connection) => connection.id === id)
        if (index !== -1) {
          this.connections[index] = updated
        }

        return updated
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update connection'
        console.error('Failed to update connection:', error)

        // ブラウザモード用のフォールバック
        if (error instanceof Error && error.message.includes('Tauri is not available')) {
          const index = this.connections.findIndex((connection) => connection.id === id)
          if (index !== -1) {
            const updated = {
              ...this.connections[index],
              ...updates,
              updatedAt: new Date().toISOString()
            }
            this.connections[index] = updated
            console.warn('Updated mock connection in browser mode:', updated)
            return updated
          }
        }

        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteConnection(id: string) {
      this.loading = true
      this.error = null

      try {
        await invokeTauri('delete_connection', { id })
        this.connections = this.connections.filter((connection) => connection.id !== id)

        if (this.activeConnection?.id === id) {
          this.activeConnection = null
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete connection'
        console.error('Failed to delete connection:', error)

        // ブラウザモード用のフォールバック
        if (error instanceof Error && error.message.includes('Tauri is not available')) {
          this.connections = this.connections.filter((connection) => connection.id !== id)
          if (this.activeConnection?.id === id) {
            this.activeConnection = null
          }
          console.warn('Deleted mock connection in browser mode:', id)
          return
        }

        throw error
      } finally {
        this.loading = false
      }
    },

    async testConnection(connection: Connection | Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>) {
      try {
        const rustConnection = toRustConnection(connection)
        return await invokeTauri('test_connection', { connection: rustConnection })
      } catch (error) {
        console.error('Connection test failed:', error)

        // ブラウザモード用のフォールバック: モック成功レスポンス
        if (error instanceof Error && error.message.includes('Tauri is not available')) {
          console.warn('Returning mock success for connection test in browser mode')
          return {
            success: true,
            message: 'モック接続テスト成功（ブラウザモード）'
          }
        }

        throw error
      }
    },

    setActiveConnection(connection: Connection | null) {
      this.activeConnection = connection
    }
  }
})
