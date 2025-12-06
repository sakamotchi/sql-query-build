import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityApi } from '@/api/security';

vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: vi.fn(),
  };
});

const mockedInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;

describe('securityApi.getConfig', () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it('flattened provider_config_type を正しく正規化する', async () => {
    mockedInvoke.mockResolvedValueOnce({
      version: 1,
      provider_type: 'master_password',
      provider_config_type: 'MasterPassword',
      is_configured: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    });

    const result = await securityApi.getConfig();

    expect(result.providerType).toBe('master_password');
    expect(result.providerConfig).toEqual({
      providerConfigType: 'MasterPassword',
      isConfigured: true,
    });
  });

  it('provider_config オブジェクトを正しく正規化する', async () => {
    mockedInvoke.mockResolvedValueOnce({
      version: 1,
      provider_type: 'keychain',
      provider_config: {
        provider_config_type: 'Keychain',
        is_initialized: true,
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    });

    const result = await securityApi.getConfig();

    expect(result.providerType).toBe('keychain');
    expect(result.providerConfig).toEqual({
      providerConfigType: 'Keychain',
      isInitialized: true,
    });
  });
});
