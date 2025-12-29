import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTauri } from '~/composables/useTauri'

// Mock tauri api
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: any[]) => mockInvoke(...args)
}))

describe('useTauri', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.unstubAllGlobals()
    })

    describe('isAvailable', () => {
        it('returns false when no Tauri globals present', () => {
            // Ensure no tauri globals
            const { isAvailable } = useTauri()
            expect(isAvailable.value).toBe(false)
        })

        it('returns true when __TAURI_INTERNALS__ is present', () => {
            vi.stubGlobal('__TAURI_INTERNALS__', {})
            const { isAvailable } = useTauri()
            expect(isAvailable.value).toBe(true)
        })
    })

    describe('invokeCommand', () => {
        it('throws error in browser mode', async () => {
            const { invokeCommand } = useTauri()
            await expect(invokeCommand('test')).rejects.toThrow('Tauri is not available')
        })

        it('invokes Tauri command in Tauri mode', async () => {
             vi.stubGlobal('__TAURI_INTERNALS__', {})
             mockInvoke.mockResolvedValue('success')
             
             const { invokeCommand } = useTauri()
             const result = await invokeCommand('test_cmd', { foo: 'bar' })
             
             expect(result).toBe('success')
             expect(mockInvoke).toHaveBeenCalledWith('test_cmd', { foo: 'bar' })
        })
    })
    
    describe('safeInvokeCommand', () => {
        it('returns fallback on error', async () => {
             vi.stubGlobal('__TAURI_INTERNALS__', {})
             mockInvoke.mockRejectedValue(new Error('fail'))
             
             const { safeInvokeCommand } = useTauri()
             const result = await safeInvokeCommand('test_cmd', {}, 'fallback')
             
             expect(result).toBe('fallback')
        })
    })
})
