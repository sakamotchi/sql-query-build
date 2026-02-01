export interface FolderPathValidationResult {
  valid: boolean
  error?: string
}

/**
 * フォルダパスのバリデーション
 */
export function validateFolderPath(path: string | null): FolderPathValidationResult {
  if (path === null) {
    return { valid: true }
  }

  if (path.trim() === '') {
    return { valid: false, error: 'フォルダパスは空文字列にできません' }
  }

  if (!path.startsWith('/')) {
    return { valid: false, error: 'フォルダパスは "/" で始まる必要があります' }
  }

  if (path.endsWith('/')) {
    return { valid: false, error: 'フォルダパスは "/" で終わることができません' }
  }

  const parts = path.split('/').filter(p => p !== '')

  if (parts.length > 10) {
    return { valid: false, error: 'フォルダの階層は10階層までです' }
  }

  const invalidChars = /[\\:*?"<>|]/

  for (const part of parts) {
    if (part.length === 0) {
      return { valid: false, error: '空のフォルダ名は使用できません' }
    }

    if (part.length > 100) {
      return { valid: false, error: 'フォルダ名は100文字以内にしてください' }
    }

    if (invalidChars.test(part)) {
      return {
        valid: false,
        error: 'フォルダ名に使用できない文字が含まれています: \\ : * ? " < > |',
      }
    }

    if (part.includes('..')) {
      return { valid: false, error: 'フォルダ名に ".." は使用できません' }
    }
  }

  return { valid: true }
}

/**
 * フォルダパスを分割してフォルダ名の配列を取得
 */
export function parseFolderPath(path: string | null): string[] {
  if (path === null || path.trim() === '') {
    return []
  }

  return path.split('/').filter(p => p !== '')
}

/**
 * フォルダ名の配列からフォルダパスを構築
 */
export function buildFolderPath(folders: string[]): string | null {
  if (folders.length === 0) {
    return null
  }

  return `/${folders.join('/')}`
}

/**
 * フォルダ名のバリデーション（単一のフォルダ名のみ）
 */
export function validateFolderName(name: string): FolderPathValidationResult {
  if (name.trim() === '') {
    return { valid: false, error: 'フォルダ名は空文字列にできません' }
  }

  if (name.length > 100) {
    return { valid: false, error: 'フォルダ名は100文字以内にしてください' }
  }

  const invalidChars = /[/\\:*?"<>|]/
  if (invalidChars.test(name)) {
    return {
      valid: false,
      error: 'フォルダ名に使用できない文字が含まれています: / \\ : * ? " < > |',
    }
  }

  if (name.includes('..')) {
    return { valid: false, error: 'フォルダ名に ".." は使用できません' }
  }

  return { valid: true }
}
