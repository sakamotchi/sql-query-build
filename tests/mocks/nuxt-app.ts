
import { vi } from 'vitest'
import { ref } from 'vue'

export const useNuxtApp = () => ({
  $toast: { add: vi.fn() },
  payload: {},
  callHook: vi.fn(),
  provide: vi.fn(),
  options: {},
  runWithContext: (fn: any) => fn(),
  vueApp: {
    use: vi.fn(),
  }
})

const stateStore = new Map<string, any>()
export const useState = <T>(key: string, init?: () => T) => {
  if (!stateStore.has(key)) {
    const value = init ? init() : undefined
    stateStore.set(key, ref(value))
  }
  return stateStore.get(key)
}

export const useToast = () => ({
  add: vi.fn()
})

export const useRuntimeConfig = () => ({
  public: {},
  app: { baseURL: '/' }
})

export const useHead = vi.fn()
export const useI18n = () => ({
  t: (key: string) => key,
  locale: ref('ja'),
  setLocale: vi.fn()
})

// Add other commonly used Nuxt composables here as needed
