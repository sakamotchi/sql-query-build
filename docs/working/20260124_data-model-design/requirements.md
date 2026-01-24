# 要件定義書：保存クエリフォルダ管理 - Phase1 データモデル設計

**作成日**: 2026-01-24
**バージョン**: 1.0
**ステータス**: 📝 計画中

---

## 1. 背景と目的

### 1.1 背景

現在、保存クエリは以下の構造でフラットに管理されています：

- クエリ名、説明、タグ、接続IDで管理
- リスト表示のみでフォルダ構造なし
- 検索とタグフィルタリングのみ

[docs/local/20260124_保存クエリ管理/requirements.md](../../local/20260124_保存クエリ管理/requirements.md) で定義された保存クエリのフォルダ管理機能を実現するため、**Phase1ではデータモデルの設計と実装**を行います。

### 1.2 目的

保存クエリにフォルダ階層構造を導入するための基盤となるデータモデルを設計・実装し、以下を実現する：

1. **フォルダパスによる階層管理**: クエリに `folderPath` フィールドを追加し、階層構造を表現
2. **接続非依存のクエリ管理**: `connectionId` を nullable にし、異なる接続でも全クエリを参照可能
3. **既存データとの後方互換性**: 既存のJSONファイルが正常に読み込まれること

### 1.3 スコープ

**Phase1に含まれるもの**:
- TypeScript型定義の更新（フロントエンド）
- Rust構造体の更新（バックエンド）
- データモデルの後方互換性確保
- 基本的なバリデーション

**Phase1に含まれないもの**:
- フォルダ操作API（Phase2で実装）
- UI実装（Phase4で実装）
- ツリー表示ロジック（Phase3で実装）

---

## 2. 機能要件

### 2.1 データモデル変更

#### FR-1: SavedQueryMetadata に folderPath を追加

**概要**: クエリに `folderPath` フィールドを追加し、階層構造を表現

**詳細**:
- `folderPath`: 文字列型（nullable）
- 形式: `/親フォルダ/子フォルダ/孫フォルダ` （スラッシュ区切り）
- ルート直下のクエリは `null` または空文字列
- 最大階層深さ: 10階層まで

**TypeScript型定義**:
```typescript
export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null  // 新規追加
  connectionId: string | null  // nullable 化
  createdAt: string
  updatedAt: string
}
```

**Rust構造体**:
```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct SavedQueryMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,  // 新規追加
    pub connection_id: Option<String>,  // Option型に変更
    pub created_at: String,
    pub updated_at: String,
}
```

#### FR-2: connectionId の nullable 化

**現状**: `connectionId` は必須で、特定の接続に紐付いている

**変更**: `connectionId` を nullable にし、参照情報として保持

**影響**:
- クエリ保存時に接続情報を記録するが、必須ではない
- 異なる接続でも全クエリが表示される
- 接続不一致時は既存のバリデーション機能で警告

#### FR-3: フォルダパスのバリデーション

**フォルダ名の制約**:
- 禁止文字: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
- 最大長: 100文字
- 空文字列禁止

**パスの制約**:
- 最大階層深さ: 10階層
- パス形式: `/親/子/孫` （先頭にスラッシュ、末尾にスラッシュなし）
- 空のフォルダ名禁止（例: `/親//子` は不可）

---

## 3. 非機能要件

### 3.1 互換性

**NFR-1: 既存データとの後方互換性**
- 既存のクエリJSONファイルには `folder_path` フィールドが存在しない
- Rustの`Option<String>`型により、フィールドがない場合は自動的に`null`として扱われる
- アプリケーション起動時に特別な処理は**不要**

**NFR-2: 既存APIとの互換性**
- `save_query`, `load_query`, `delete_query` は引き続き動作
- `folder_path` フィールドが追加されても既存の処理は影響を受けない

### 3.2 パフォーマンス

**NFR-3: デシリアライズ性能**
- 既存のJSONファイル（`folder_path`フィールドなし）の読み込みが既存の性能を維持
- 新しいフィールドの追加によるパフォーマンス劣化がないこと

### 3.3 セキュリティ

**NFR-4: パストラバーサル攻撃の防止**
- フォルダパスに `..` や絶対パス（`/usr/local/...`）を含めることを禁止
- バリデーションで不正なパスを検出

---

## 4. データモデル詳細

### 4.1 SavedQuery（完全な保存クエリ）

**TypeScript型定義** ([app/types/saved-query.ts](../../app/types/saved-query.ts)):
```typescript
export interface SavedQuery {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null  // 新規追加
  connectionId: string | null  // nullable 化
  query: QueryModel
  createdAt: string
  updatedAt: string
}
```

**Rust構造体** ([src-tauri/src/models/saved_query.rs](../../src-tauri/src/models/saved_query.rs)):
```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,  // 新規追加
    pub connection_id: Option<String>,  // Option型に変更
    pub query: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}
```

### 4.2 SavedQueryMetadata（メタデータのみ）

**TypeScript型定義**:
```typescript
export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null  // 新規追加
  connectionId: string | null  // nullable 化
  createdAt: string
  updatedAt: string
}
```

**Rust構造体**:
```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct SavedQueryMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub folder_path: Option<String>,  // 新規追加
    pub connection_id: Option<String>,  // Option型に変更
    pub created_at: String,
    pub updated_at: String,
}
```

### 4.3 フォルダパス形式

**例**:
```typescript
// ルート直下のクエリ
{
  id: "query-001",
  name: "全ユーザー取得",
  folderPath: null,
  // ...
}

// 1階層のフォルダ内のクエリ
{
  id: "query-002",
  name: "ユーザー検索",
  folderPath: "/開発環境",
  // ...
}

// 3階層のフォルダ内のクエリ
{
  id: "query-003",
  name: "売上集計",
  folderPath: "/開発環境/ユーザー管理/検索",
  // ...
}
```

### 4.4 バリデーション関数

**TypeScript**:
```typescript
/**
 * フォルダパスのバリデーション
 */
export function validateFolderPath(path: string | null): boolean {
  if (path === null) return true

  // 空文字列禁止
  if (path.trim() === '') return false

  // 先頭スラッシュチェック
  if (!path.startsWith('/')) return false

  // 末尾スラッシュ禁止
  if (path.endsWith('/')) return false

  // パス分割
  const parts = path.split('/').filter(p => p !== '')

  // 最大階層チェック
  if (parts.length > 10) return false

  // 各フォルダ名のバリデーション
  const invalidChars = /[\\:*?"<>|]/
  for (const part of parts) {
    if (part.length === 0) return false  // 空のフォルダ名禁止
    if (part.length > 100) return false  // 最大長チェック
    if (invalidChars.test(part)) return false  // 禁止文字チェック
    if (part.includes('..')) return false  // パストラバーサル防止
  }

  return true
}
```

**Rust**:
```rust
/// フォルダパスのバリデーション
pub fn validate_folder_path(path: &Option<String>) -> Result<(), String> {
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

        // 各フォルダ名のバリデーション
        let invalid_chars = ['\\', ':', '*', '?', '"', '<', '>', '|'];
        for part in parts {
            if part.is_empty() {
                return Err("空のフォルダ名は使用できません".to_string());
            }
            if part.len() > 100 {
                return Err("フォルダ名は100文字以内にしてください".to_string());
            }
            if part.chars().any(|c| invalid_chars.contains(&c)) {
                return Err("フォルダ名に使用できない文字が含まれています".to_string());
            }
            if part.contains("..") {
                return Err("フォルダ名に '..' は使用できません".to_string());
            }
        }
    }

    Ok(())
}
```

---

## 5. 既存データとの互換性

### 5.1 後方互換性の保証

**JSONファイルベースの自動互換**:
- 既存のクエリJSONファイルには `folder_path` フィールドが存在しない
- Rustの`Option<String>`型により、フィールドがない場合は自動的に`None`として扱われる
- TypeScriptでは `null` として扱われる
- アプリケーション起動時に特別な処理は**不要**

**既存クエリの扱い**:
- `folder_path: null` → ルート直下に表示（Phase4のUI実装時）
- `connection_id` は既存の値がそのまま保持される
- ユーザーが手動でフォルダに移動可能（Phase2以降）

### 5.2 マイグレーション不要

**理由**:
- 新しいフィールドは optional（`Option<T>`）のため、既存JSONファイルでも正常にデシリアライズ可能
- Serdeの仕様により、フィールドが存在しない場合は `None` として扱われる
- **データベースマイグレーション不要**

---

## 6. 制約事項

### 6.1 技術的制約

- フォルダのネスト深さは10階層まで
- フォルダ名は100文字まで
- フォルダパスの形式は `/親/子/孫` に固定

### 6.2 スコープ外

Phase1では以下は実装しません：
- フォルダ操作API（`move_query`, `rename_folder`, `delete_folder`）
- ツリー構造のビルド処理
- UI実装
- ドラッグ&ドロップ

---

## 7. 受け入れ基準

### 7.1 必須機能

- [ ] TypeScript型定義に `folderPath` と `connectionId` の nullable 化が反映されている
- [ ] Rust構造体に `folder_path` と `connection_id` の Option型が反映されている
- [ ] バリデーション関数が正しく動作する
- [ ] 既存のクエリJSONファイル（`folder_path`フィールドなし）が正常に読み込まれる

### 7.2 互換性

- [ ] 既存の `save_query` コマンドが正常に動作する
- [ ] 既存の `load_query` コマンドが正常に動作する
- [ ] 既存の `search_saved_queries` コマンドが正常に動作する
- [ ] `folder_path`フィールドがないクエリが `null` として扱われる

### 7.3 バリデーション

- [ ] 不正な文字を含むフォルダパスが拒否される
- [ ] 最大階層（10階層）を超えるパスが拒否される
- [ ] フォルダ名の最大長（100文字）を超える名前が拒否される
- [ ] パストラバーサル（`..`）を含むパスが拒否される

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存JSONファイルとの非互換 | 高 | Option型による後方互換性確保、テストで検証 |
| バリデーション漏れ | 中 | 包括的なテストケース作成 |
| TypeScriptとRustの型不一致 | 中 | 統合テストで検証 |

---

## 9. 関連ドキュメント

- [保存クエリ管理の全体要件定義](../../local/20260124_保存クエリ管理/requirements.md)
- [保存クエリ管理のWBS](../../local/20260124_保存クエリ管理/tasklist.md)
- [ユビキタス言語定義書](../../steering/06_ubiquitous_language.md)

---

## 付録

### A. 用語集

| 用語 | 定義 |
|------|------|
| フォルダパス | `/親/子/孫` 形式の階層構造を表す文字列 |
| ルート | フォルダ階層の最上位（`folderPath: null`） |
| nullable | 値が `null` を許容すること |
| 後方互換性 | 既存のデータが新しいバージョンでも正常に動作すること |
| パストラバーサル | `..` を使ってディレクトリを遡る攻撃手法 |

### B. 参考実装

**既存のSavedQuery型定義**: [app/types/saved-query.ts](../../app/types/saved-query.ts)
**既存のRust構造体**: [src-tauri/src/models/saved_query.rs](../../src-tauri/src/models/saved_query.rs)
