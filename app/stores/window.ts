import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { WindowState } from '~/types'

export const useWindowStore = defineStore('window', {
  state: () => ({
    windows: [] as WindowState[],
    loading: false,
    error: null as string | null
  }),

  getters: {
    getWindowByConnectionId: (state) => (connectionId: string) =>
      state.windows.find((windowState) => windowState.connectionId === connectionId),
    allWindows: (state) => state.windows
  },

  actions: {
    async loadWindows() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        this.windows = await invokeCommand<WindowState[]>('get_windows')
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load windows'
        console.error('Failed to load windows:', error)
      } finally {
        this.loading = false
      }
    },

    async saveWindowState(windowState: Omit<WindowState, 'id' | 'createdAt'>) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        const saved = await invokeCommand<WindowState>('save_window_state', { windowState })

        const index = this.windows.findIndex((window) => window.connectionId === windowState.connectionId)
        if (index !== -1) {
          this.windows[index] = saved
        } else {
          this.windows.push(saved)
        }

        return saved
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save window state'
        console.error('Failed to save window state:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async restoreWindows() {
      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('restore_windows')
      } catch (error) {
        console.error('Failed to restore windows:', error)
        throw error
      }
    },

    async deleteWindow(id: string) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('delete_window', { id })
        this.windows = this.windows.filter((windowState) => windowState.id !== id)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to delete window'
        console.error('Failed to delete window:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
