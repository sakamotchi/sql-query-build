import { vi } from 'vitest'
import { ref } from 'vue'

export const toastMaxInjectionKey = Symbol('nuxt-ui.toast-max')

export function useToast() {
  const toasts = ref<any[]>([])

  return {
    toasts,
    add: vi.fn((toast: any) => {
      const body = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        open: true,
        ...toast,
      }
      toasts.value = [...toasts.value, body]
      return body
    }),
    update: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  }
}
