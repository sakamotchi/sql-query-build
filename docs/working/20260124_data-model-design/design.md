# 設計書：保存クエリフォルダ管理 - Phase1 データモデル設計

**作成日**: 2026-01-24
**バージョン**: 1.0
**ステータス**: 📝 計画中

---

## 1. 設計概要

### 1.1 目的

Phase1では、保存クエリにフォルダ階層構造を導入するための基盤となるデータモデルを設計・実装します。具体的には：

1. **TypeScript型定義の更新**: フロントエンドの型定義に `folderPath` と `connectionId` の nullable 化を追加
2. **Rust構造体の更新**: バックエンドの構造体に `folder_path` と `connection_id` の Option型を追加
3. **バリデーション関数の実装**: フォルダパスの妥当性を検証する関数を実装

### 1.2 スコープ

**含まれるもの**:
- TypeScript型定義の更新（`app/types/saved-query.ts`）
- Rust構造体の更新（`src-tauri/src/models/saved_query.rs`）
- バリデーション関数の実装（TypeScript + Rust）
- 後方互換性の確保

**含まれないもの**:
- フォルダ操作API（Phase2で実装）
- UI実装（Phase4で実装）
- ツリー表示ロジック（Phase3で実装）

---

## 2. データモデル設計

### 2.1 TypeScript型定義

**ファイル**: [app/types/saved-query.ts](../../app/types/saved-query.ts)

#### 2.1.1 SavedQuery（完全な保存クエリ）

```typescript
import type { SerializableQueryState } from '@/stores/query-builder'
import type { SerializableMutationState } from '@/stores/mutation-builder'

export type SerializableBuilderState = SerializableQueryState | SerializableMutationState

export interface SavedQuery {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null  // ✨ 新規追加: フォルダパス
  connectionId: string | null  // ✨ nullable 化
  query: SerializableBuilderState
  createdAt: string
  updatedAt: string
}
```

#### 2.1.2 SavedQueryMetadata（メタデータのみ）

```typescript
export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null  // ✨ 新規追加: フォルダパス
  connectionId: string | null  // ✨ nullable 化
  createdAt: string
  updatedAt: string
}
```

#### 2.1.3 SaveQueryRequest（保存リクエスト）

```typescript
export interface SaveQueryRequest {
  id?: string
  name: string
  description: string
  tags: string[]
  folderPath?: string | null  // ✨ 新規追加: オプショナル
  connectionId: string | null  // ✨ nullable 化
  query: SerializableBuilderState
}
```

#### 2.1.4 SearchQueryRequest（検索リクエスト）

```typescript
export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
  folderPath?: string  // ✨ 新規追加: フォルダパスでフィルタリング
}
```

### 2.2 Rust構造体

**ファイル**: [src-tauri/src/models/saved_query.rs](../../src-tauri/src/models/saved_query.rs)

#### 2.2.1 SavedQuery

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,  // ✨ 新規追加
    pub connection_id: Option<String>,  // ✨ Option型に変更
    pub query: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}
```

#### 2.2.2 SavedQueryMetadata

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedQueryMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,  // ✨ 新規追加
    pub connection_id: Option<String>,  // ✨ Option型に変更
    pub created_at: String,
    pub updated_at: String,
}
```

#### 2.2.3 SaveQueryRequest

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveQueryRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,  // ✨ 新規追加
    pub connection_id: Option<String>,  // ✨ Option型に変更
    pub query: serde_json::Value,
}
```

#### 2.2.4 SearchQueryRequest

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQueryRequest {
    pub keyword: Option<String>,
    pub tags: Option<Vec<String>>,
    pub connection_id: Option<String>,
    pub folder_path: Option<String>,  // ✨ 新規追加
}
```

---

## 3. バリデーション設計

### 3.1 フォルダパスの仕様

#### 3.1.1 パス形式

- **形式**: `/親フォルダ/子フォルダ/孫フォルダ`
- **ルール**:
  - 先頭は `/` で始まる
  - 末尾は `/` で終わらない
  - フォルダ名は `/` で区切る
  - 空のフォルダ名は禁止（例: `/親//子` は不可）
  - `null` はルート直下を表す

#### 3.1.2 フォルダ名の制約

- **禁止文字**: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
- **最大長**: 100文字
- **最小長**: 1文字以上
- **パストラバーサル禁止**: `..` を含むフォルダ名は不可

#### 3.1.3 階層の制約

- **最大階層深さ**: 10階層まで

### 3.2 TypeScriptバリデーション関数

**ファイル**: [app/utils/folder-validation.ts](../../app/utils/folder-validation.ts)（新規作成）

```typescript
/**
 * フォルダパスのバリデーション結果
 */
export interface FolderPathValidationResult {
  valid: boolean
  error?: string
}

/**
 * フォルダパスのバリデーション
 *
 * @param path - 検証するフォルダパス
 * @returns バリデーション結果
 */
export function validateFolderPath(path: string | null): FolderPathValidationResult {
  // null は許容（ルート直下を表す）
  if (path === null) {
    return { valid: true }
  }

  // 空文字列禁止
  if (path.trim() === '') {
    return { valid: false, error: 'フォルダパスは空文字列にできません' }
  }

  // 先頭スラッシュチェック
  if (!path.startsWith('/')) {
    return { valid: false, error: 'フォルダパスは "/" で始まる必要があります' }
  }

  // 末尾スラッシュ禁止
  if (path.endsWith('/')) {
    return { valid: false, error: 'フォルダパスは "/" で終わることができません' }
  }

  // パス分割
  const parts = path.split('/').filter(p => p !== '')

  // 最大階層チェック
  if (parts.length > 10) {
    return { valid: false, error: 'フォルダの階層は10階層までです' }
  }

  // 禁止文字パターン
  const invalidChars = /[\\:*?"<>|]/

  // 各フォルダ名のバリデーション
  for (const part of parts) {
    // 空のフォルダ名禁止
    if (part.length === 0) {
      return { valid: false, error: '空のフォルダ名は使用できません' }
    }

    // 最大長チェック
    if (part.length > 100) {
      return { valid: false, error: 'フォルダ名は100文字以内にしてください' }
    }

    // 禁止文字チェック
    if (invalidChars.test(part)) {
      return { valid: false, error: 'フォルダ名に使用できない文字が含まれています: \\ : * ? " < > |' }
    }

    // パストラバーサル防止
    if (part.includes('..')) {
      return { valid: false, error: 'フォルダ名に ".." は使用できません' }
    }
  }

  return { valid: true }
}

/**
 * フォルダパスを分割してフォルダ名の配列を取得
 *
 * @param path - フォルダパス
 * @returns フォルダ名の配列
 */
export function parseFolderPath(path: string | null): string[] {
  if (path === null || path.trim() === '') {
    return []
  }

  return path.split('/').filter(p => p !== '')
}

/**
 * フォルダ名の配列からフォルダパスを構築
 *
 * @param folders - フォルダ名の配列
 * @returns フォルダパス
 */
export function buildFolderPath(folders: string[]): string | null {
  if (folders.length === 0) {
    return null
  }

  return '/' + folders.join('/')
}

/**
 * フォルダ名のバリデーション（単一のフォルダ名のみ）
 *
 * @param name - フォルダ名
 * @returns バリデーション結果
 */
export function validateFolderName(name: string): FolderPathValidationResult {
  // 空文字列禁止
  if (name.trim() === '') {
    return { valid: false, error: 'フォルダ名は空文字列にできません' }
  }

  // 最大長チェック
  if (name.length > 100) {
    return { valid: false, error: 'フォルダ名は100文字以内にしてください' }
  }

  // 禁止文字チェック
  const invalidChars = /[/\\:*?"<>|]/
  if (invalidChars.test(name)) {
    return { valid: false, error: 'フォルダ名に使用できない文字が含まれています: / \\ : * ? " < > |' }
  }

  // パストラバーサル防止
  if (name.includes('..')) {
    return { valid: false, error: 'フォルダ名に ".." は使用できません' }
  }

  return { valid: true }
}
```

### 3.3 Rustバリデーション関数

**ファイル**: [src-tauri/src/utils/folder_validation.rs](../../src-tauri/src/utils/folder_validation.rs)（新規作成）

```rust
/// フォルダパスのバリデーション
///
/// # Arguments
/// * `path` - 検証するフォルダパス
///
/// # Returns
/// * `Ok(())` - バリデーション成功
/// * `Err(String)` - バリデーション失敗（エラーメッセージ）
pub fn validate_folder_path(path: &Option<String>) -> Result<(), String> {
    // None は許容（ルート直下を表す）
    if let Some(p) = path {
        // 空文字列禁止
        if p.trim().is_empty() {
            return Err("フォルダパスは空文字列にできません".to_string());
        }

        // 先頭スラッシュチェック
        if !p.starts_with('/') {
            return Err("フォルダパスは '/' で始まる必要があります".to_string());
        }

        // 末尾スラッシュ禁止
        if p.ends_with('/') {
            return Err("フォルダパスは '/' で終わることができません".to_string());
        }

        // パス分割
        let parts: Vec<&str> = p.split('/').filter(|s| !s.is_empty()).collect();

        // 最大階層チェック
        if parts.len() > 10 {
            return Err("フォルダの階層は10階層までです".to_string());
        }

        // 禁止文字
        let invalid_chars = ['\\', ':', '*', '?', '"', '<', '>', '|'];

        // 各フォルダ名のバリデーション
        for part in parts {
            // 空のフォルダ名禁止（既にfilterで除外済みだが念のため）
            if part.is_empty() {
                return Err("空のフォルダ名は使用できません".to_string());
            }

            // 最大長チェック
            if part.len() > 100 {
                return Err("フォルダ名は100文字以内にしてください".to_string());
            }

            // 禁止文字チェック
            if part.chars().any(|c| invalid_chars.contains(&c)) {
                return Err("フォルダ名に使用できない文字が含まれています: \\ : * ? \" < > |".to_string());
            }

            // パストラバーサル防止
            if part.contains("..") {
                return Err("フォルダ名に '..' は使用できません".to_string());
            }
        }
    }

    Ok(())
}

/// フォルダパスを分割してフォルダ名のベクタを取得
///
/// # Arguments
/// * `path` - フォルダパス
///
/// # Returns
/// * フォルダ名のベクタ
pub fn parse_folder_path(path: &Option<String>) -> Vec<String> {
    if let Some(p) = path {
        p.split('/')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect()
    } else {
        Vec::new()
    }
}

/// フォルダ名のベクタからフォルダパスを構築
///
/// # Arguments
/// * `folders` - フォルダ名のベクタ
///
/// # Returns
/// * フォルダパス
pub fn build_folder_path(folders: &[String]) -> Option<String> {
    if folders.is_empty() {
        None
    } else {
        Some(format!("/{}", folders.join("/")))
    }
}

/// フォルダ名のバリデーション（単一のフォルダ名のみ）
///
/// # Arguments
/// * `name` - フォルダ名
///
/// # Returns
/// * `Ok(())` - バリデーション成功
/// * `Err(String)` - バリデーション失敗（エラーメッセージ）
pub fn validate_folder_name(name: &str) -> Result<(), String> {
    // 空文字列禁止
    if name.trim().is_empty() {
        return Err("フォルダ名は空文字列にできません".to_string());
    }

    // 最大長チェック
    if name.len() > 100 {
        return Err("フォルダ名は100文字以内にしてください".to_string());
    }

    // 禁止文字チェック（パス区切り文字 '/' も含む）
    let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    if name.chars().any(|c| invalid_chars.contains(&c)) {
        return Err("フォルダ名に使用できない文字が含まれています: / \\ : * ? \" < > |".to_string());
    }

    // パストラバーサル防止
    if name.contains("..") {
        return Err("フォルダ名に '..' は使用できません".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_folder_path_valid() {
        assert!(validate_folder_path(&Some("/親/子/孫".to_string())).is_ok());
        assert!(validate_folder_path(&Some("/開発環境".to_string())).is_ok());
        assert!(validate_folder_path(&None).is_ok());
    }

    #[test]
    fn test_validate_folder_path_invalid() {
        // 空文字列
        assert!(validate_folder_path(&Some("".to_string())).is_err());

        // 先頭スラッシュなし
        assert!(validate_folder_path(&Some("親/子".to_string())).is_err());

        // 末尾スラッシュあり
        assert!(validate_folder_path(&Some("/親/子/".to_string())).is_err());

        // 禁止文字
        assert!(validate_folder_path(&Some("/親:子".to_string())).is_err());

        // パストラバーサル
        assert!(validate_folder_path(&Some("/親/../子".to_string())).is_err());
    }

    #[test]
    fn test_parse_folder_path() {
        assert_eq!(parse_folder_path(&Some("/親/子/孫".to_string())), vec!["親", "子", "孫"]);
        assert_eq!(parse_folder_path(&Some("/開発環境".to_string())), vec!["開発環境"]);
        assert_eq!(parse_folder_path(&None), Vec::<String>::new());
    }

    #[test]
    fn test_build_folder_path() {
        assert_eq!(
            build_folder_path(&vec!["親".to_string(), "子".to_string(), "孫".to_string()]),
            Some("/親/子/孫".to_string())
        );
        assert_eq!(
            build_folder_path(&vec!["開発環境".to_string()]),
            Some("/開発環境".to_string())
        );
        assert_eq!(build_folder_path(&vec![]), None);
    }

    #[test]
    fn test_validate_folder_name() {
        assert!(validate_folder_name("開発環境").is_ok());
        assert!(validate_folder_name("親").is_ok());

        // 空文字列
        assert!(validate_folder_name("").is_err());

        // 禁止文字
        assert!(validate_folder_name("親/子").is_err());
        assert!(validate_folder_name("親:子").is_err());

        // パストラバーサル
        assert!(validate_folder_name("..").is_err());
    }
}
```

**モジュール登録**: [src-tauri/src/utils/mod.rs](../../src-tauri/src/utils/mod.rs)（新規作成または既存ファイルに追加）

```rust
pub mod folder_validation;
```

---

## 4. 後方互換性の設計

### 4.1 既存データの扱い

**既存のJSONファイル形式**:
```json
{
  "id": "query-001",
  "name": "ユーザー検索",
  "description": "全ユーザーを取得",
  "tags": ["admin", "users"],
  "connectionId": "conn-001",
  "query": { ... },
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

**新しい形式**:
```json
{
  "id": "query-001",
  "name": "ユーザー検索",
  "description": "全ユーザーを取得",
  "tags": ["admin", "users"],
  "folderPath": null,
  "connectionId": "conn-001",
  "query": { ... },
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

### 4.2 Serdeによる自動互換

**Rustのデシリアライズ動作**:
- `Option<T>` 型のフィールドは、JSONに存在しない場合 `None` として扱われる
- `#[serde(default)]` を使用しなくても、`Option` 型であれば自動的に `None` になる
- **マイグレーション処理は不要**

**例**:
```rust
// 既存JSONファイル（folder_pathフィールドなし）
// {
//   "id": "query-001",
//   "name": "...",
//   "connectionId": "conn-001",
//   ...
// }

// デシリアライズ後のRust構造体
SavedQuery {
    id: "query-001".to_string(),
    name: "...".to_string(),
    folder_path: None,  // ✅ 自動的にNoneになる
    connection_id: Some("conn-001".to_string()),
    ...
}
```

### 4.3 TypeScriptでの扱い

**API呼び出し時の型変換**:
```typescript
// Rustから返されるJSON
// {
//   "id": "query-001",
//   "folderPath": null,  // Serdeにより明示的にnullとして返される
//   "connectionId": "conn-001",
//   ...
// }

// TypeScriptでの型
const query: SavedQueryMetadata = await loadQuery(id)
// query.folderPath は null
// query.connectionId は "conn-001"
```

---

## 5. 実装手順

### 5.1 Phase 1-1: TypeScript型定義の更新

**ファイル**: [app/types/saved-query.ts](../../app/types/saved-query.ts)

**タスク**:
1. `SavedQuery` に `folderPath: string | null` を追加
2. `SavedQueryMetadata` に `folderPath: string | null` を追加
3. `SaveQueryRequest` に `folderPath?: string | null` を追加
4. `SearchQueryRequest` に `folderPath?: string` を追加
5. `connectionId` を `string | null` に変更（全インターフェース）

### 5.2 Phase 1-2: Rust構造体の更新

**ファイル**: [src-tauri/src/models/saved_query.rs](../../src-tauri/src/models/saved_query.rs)

**タスク**:
1. `SavedQuery` に `pub folder_path: Option<String>` を追加
2. `SavedQueryMetadata` に `pub folder_path: Option<String>` を追加
3. `SaveQueryRequest` に `pub folder_path: Option<String>` を追加
4. `SearchQueryRequest` に `pub folder_path: Option<String>` を追加
5. `connection_id` を `Option<String>` に変更（全構造体）

### 5.3 Phase 1-3: バリデーション関数の実装

**ファイル**:
- [app/utils/folder-validation.ts](../../app/utils/folder-validation.ts)（新規作成）
- [src-tauri/src/utils/folder_validation.rs](../../src-tauri/src/utils/folder_validation.rs)（新規作成）

**タスク**:
1. TypeScript側のバリデーション関数を実装
2. Rust側のバリデーション関数を実装
3. ユニットテストを追加

---

## 6. テストコード

### 6.1 TypeScriptテスト

**ファイル**: [tests/utils/folder-validation.spec.ts](../../tests/utils/folder-validation.spec.ts)（新規作成）

```typescript
import { describe, it, expect } from 'vitest'
import { validateFolderPath, validateFolderName, parseFolderPath, buildFolderPath } from '@/utils/folder-validation'

describe('folder-validation', () => {
  describe('validateFolderPath', () => {
    it('null を許容する', () => {
      const result = validateFolderPath(null)
      expect(result.valid).toBe(true)
    })

    it('正しいパス形式を許容する', () => {
      const result = validateFolderPath('/親/子/孫')
      expect(result.valid).toBe(true)
    })

    it('先頭スラッシュがない場合はエラー', () => {
      const result = validateFolderPath('親/子')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('/')
    })

    it('末尾スラッシュがある場合はエラー', () => {
      const result = validateFolderPath('/親/子/')
      expect(result.valid).toBe(false)
    })

    it('禁止文字を含む場合はエラー', () => {
      const invalidChars = ['\\', ':', '*', '?', '"', '<', '>', '|']
      for (const char of invalidChars) {
        const result = validateFolderPath(`/親${char}子`)
        expect(result.valid).toBe(false)
      }
    })

    it('10階層を超える場合はエラー', () => {
      const path = '/a/b/c/d/e/f/g/h/i/j/k'
      const result = validateFolderPath(path)
      expect(result.valid).toBe(false)
    })

    it('パストラバーサルを含む場合はエラー', () => {
      const result = validateFolderPath('/親/../子')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateFolderName', () => {
    it('正しいフォルダ名を許容する', () => {
      const result = validateFolderName('開発環境')
      expect(result.valid).toBe(true)
    })

    it('空文字列はエラー', () => {
      const result = validateFolderName('')
      expect(result.valid).toBe(false)
    })

    it('100文字を超える場合はエラー', () => {
      const longName = 'a'.repeat(101)
      const result = validateFolderName(longName)
      expect(result.valid).toBe(false)
    })

    it('スラッシュを含む場合はエラー', () => {
      const result = validateFolderName('親/子')
      expect(result.valid).toBe(false)
    })
  })

  describe('parseFolderPath', () => {
    it('パスを分割する', () => {
      const folders = parseFolderPath('/親/子/孫')
      expect(folders).toEqual(['親', '子', '孫'])
    })

    it('null の場合は空配列', () => {
      const folders = parseFolderPath(null)
      expect(folders).toEqual([])
    })
  })

  describe('buildFolderPath', () => {
    it('配列からパスを構築する', () => {
      const path = buildFolderPath(['親', '子', '孫'])
      expect(path).toBe('/親/子/孫')
    })

    it('空配列の場合は null', () => {
      const path = buildFolderPath([])
      expect(path).toBe(null)
    })
  })
})
```

### 6.2 Rustテスト

Rustテストは `src-tauri/src/utils/folder_validation.rs` 内に記載済み（`#[cfg(test)] mod tests`）。

---

## 7. 影響範囲

### 7.1 変更が必要なファイル

| ファイル | 変更内容 | 影響度 |
|---------|---------|--------|
| [app/types/saved-query.ts](../../app/types/saved-query.ts) | 型定義の更新 | 高 |
| [src-tauri/src/models/saved_query.rs](../../src-tauri/src/models/saved_query.rs) | 構造体の更新 | 高 |
| [app/utils/folder-validation.ts](../../app/utils/folder-validation.ts) | 新規作成 | 中 |
| [src-tauri/src/utils/folder_validation.rs](../../src-tauri/src/utils/folder_validation.rs) | 新規作成 | 中 |
| [src-tauri/src/utils/mod.rs](../../src-tauri/src/utils/mod.rs) | モジュール登録 | 低 |
| [tests/utils/folder-validation.spec.ts](../../tests/utils/folder-validation.spec.ts) | 新規作成 | 低 |

### 7.2 影響を受ける可能性のあるコード

**TypeScript側**:
- `app/stores/saved-query.ts`: SavedQuery型を使用している箇所
- `app/components/query-builder/SavedQuerySlideover.vue`: クエリ一覧表示
- `app/components/query-builder/dialog/SaveQueryDialog.vue`: クエリ保存ダイアログ

**Rust側**:
- `src-tauri/src/commands/query_storage_commands.rs`: クエリ保存・読み込みコマンド
- `src-tauri/src/services/query_storage.rs`: ストレージサービス

**注意**: Phase1では型定義のみ変更し、UI実装は Phase4 で行うため、**既存コードの修正は最小限**に抑えられます。

---

## 8. リスク管理

### 8.1 リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存JSONファイルとの非互換 | 高 | Option型による後方互換性確保、テストで検証 |
| TypeScriptとRustの型不一致 | 中 | 統合テストで検証、Serdeの`rename_all`で一貫性確保 |
| バリデーション漏れ | 中 | 包括的なテストケース作成 |
| 既存コードへの影響 | 低 | 型定義のみ変更、既存ロジックは変更しない |

### 8.2 ロールバック計画

万が一、Phase1の実装で問題が発生した場合：
1. Git でコミットを revert
2. 型定義を元に戻す
3. 既存のJSONファイルは `Option<T>` により自動的に互換性が保たれているため、データ損失なし

---

## 9. 完了条件

### 9.1 チェックリスト

- [ ] TypeScript型定義が更新されている
- [ ] Rust構造体が更新されている
- [ ] バリデーション関数が実装されている（TypeScript + Rust）
- [ ] ユニットテストが全て通る
- [ ] 既存のクエリJSONファイルが正常に読み込まれる
- [ ] TypeCheckが通る（`npm run typecheck`）
- [ ] Rustビルドが通る（`npm run tauri:build`）

### 9.2 検証方法

1. **既存データの読み込み確認**:
   - 既存の保存クエリが正常に読み込まれることを確認
   - `folderPath` が `null` として扱われることを確認

2. **バリデーションの確認**:
   - TypeScriptテストを実行: `npm run test`
   - Rustテストを実行: `cargo test --manifest-path=src-tauri/Cargo.toml`

3. **型チェック**:
   - TypeScript型チェック: `npm run typecheck`
   - Rustビルド: `npm run tauri:build`

---

## 10. 次のステップ

Phase1完了後、以下のPhaseに進みます：

- **Phase2**: バックエンドAPI実装（`move_query`, `rename_folder`, `delete_folder` 等）
- **Phase3**: フロントエンドStore実装（ツリー構造ビルド処理）
- **Phase4**: UIコンポーネント実装（ツリービュー、フォルダ操作）

---

## 付録

### A. フォルダパスの例

```typescript
// ルート直下
{ folderPath: null }

// 1階層
{ folderPath: "/開発環境" }

// 2階層
{ folderPath: "/開発環境/ユーザー管理" }

// 3階層
{ folderPath: "/開発環境/ユーザー管理/検索" }

// 10階層（最大）
{ folderPath: "/a/b/c/d/e/f/g/h/i/j" }
```

### B. 参考リンク

- [Serde Documentation - Option](https://serde.rs/attr-default.html)
- [Nuxt 4 Documentation](https://nuxt.com/)
- [Tauri IPC Documentation](https://tauri.app/v2/guides/features/command/)
