export interface ErrorResponse {
  code: string;
  message: string;
  details?: string;
}

export class APIError extends Error {
  code: string;
  details?: string;

  constructor(response: ErrorResponse) {
    super(response.message);
    this.name = 'APIError';
    this.code = response.code;
    this.details = response.details;
  }
}

/**
 * Tauriエラーをパース
 */
export function parseAPIError(error: unknown): APIError {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error) as ErrorResponse;
      return new APIError(parsed);
    } catch {
      return new APIError({
        code: 'UNKNOWN_ERROR',
        message: error,
      });
    }
  }

  return new APIError({
    code: 'UNKNOWN_ERROR',
    message: '予期しないエラーが発生しました',
  });
}

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'CONNECTION_NOT_FOUND':
        return '指定された接続が見つかりませんでした';
      case 'VALIDATION_ERROR':
        return error.message;
      case 'CONNECTION_ALREADY_EXISTS':
        return 'この接続は既に存在します';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '予期しないエラーが発生しました';
}
