import { defineStore } from 'pinia'
import { useTauri } from '~/composables/useTauri'
import type { ColorMode } from '~/types'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    colorMode: 'auto' as ColorMode,
    primaryColor: '#4CAF50',
    loading: false,
    error: null as string | null
  }),

  getters: {
    currentColorMode: (state) => state.colorMode,
    currentPrimaryColor: (state) => state.primaryColor
  },

  actions: {
    async loadTheme() {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        const theme = await invokeCommand<{ colorMode: ColorMode; primaryColor: string }>('get_theme')
        if (theme) {
          this.colorMode = theme.colorMode
          this.primaryColor = theme.primaryColor
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load theme'
        console.error('Failed to load theme:', error)
      } finally {
        this.loading = false
      }
    },

    async setColorMode(mode: ColorMode) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('set_color_mode', { mode })
        this.colorMode = mode
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set color mode'
        console.error('Failed to set color mode:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async setPrimaryColor(color: string) {
      this.loading = true
      this.error = null

      try {
        const { invokeCommand } = useTauri()
        await invokeCommand('set_primary_color', { color })
        this.primaryColor = color
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to set primary color'
        console.error('Failed to set primary color:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
