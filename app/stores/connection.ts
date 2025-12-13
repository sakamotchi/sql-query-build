import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { Connection } from '~/types'

// Tauriコマンドのヘルパー関数
async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    throw new Error('Tauri is not available. Running in browser mode.')
  }
  return invoke<T>(command, args)
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

    async createConnection(connection: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>) {
      this.loading = true
      this.error = null

      try {
        const newConnection = await invokeTauri<Connection>('create_connection', { connection })
        this.connections.push(newConnection)
        return newConnection
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create connection'
        console.error('Failed to create connection:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateConnection(id: string, updates: Partial<Connection>) {
      this.loading = true
      this.error = null

      try {
        const updated = await invokeTauri<Connection>('update_connection', { id, updates })

        const index = this.connections.findIndex((connection) => connection.id === id)
        if (index !== -1) {
          this.connections[index] = updated
        }

        return updated
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update connection'
        console.error('Failed to update connection:', error)
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
        throw error
      } finally {
        this.loading = false
      }
    },

    async testConnection(connection: Connection | Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>) {
      try {
        return await invokeTauri('test_connection', { connection })
      } catch (error) {
        console.error('Connection test failed:', error)
        throw error
      }
    },

    setActiveConnection(connection: Connection | null) {
      this.activeConnection = connection
    }
  }
})
