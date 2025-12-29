# 設計書 - テストコード追加

## アーキテクチャ

### 対象コンポーネント

```
テスト対象領域:

Frontend (Vue/Nuxt)
├── Stores (query-builder, database-structure)
├── Utils (query-converter)
├── API (database-structure, query)
└── Composables (useProviderChangeDialog, useProviderSwitch, useTableSelection)

Backend (Rust/Tauri)
├── SQL Generator (builder, clause/*, dialects/*)
└── Commands (query, database_structure, security)
```

### 影響範囲

- **フロントエンド**: `tests/` ディレクトリに新規テストファイル追加
- **バックエンド**: 各モジュール内に `#[cfg(test)]` ブロックまたは `*_test.rs` ファイル追加

## 実装方針

### 概要

1. 既存のテストパターンを踏襲し、一貫性のあるテストコードを作成
2. 優先度の高いものから順に実装（SQL Generator → Commands → Stores → Utils → API → Composables）
3. 各テスト追加後に `cargo test` / `npm run test:run` で動作確認

### 詳細

#### バックエンド テスト方針

1. **SQL Generator**: 各句の生成ロジックをユニットテスト
   - 入力パラメータに対して正しいSQL文字列が生成されることを確認
   - Dialect毎の差異をテスト（例: LIMIT構文の違い）

2. **Commands**: Tauri stateのモックを使用してコマンドロジックをテスト

#### フロントエンド テスト方針

1. **Stores**: Piniaの `setActivePinia(createPinia())` を使用してストアをテスト
2. **Utils**: 純粋関数として入出力をテスト
3. **API**: `vi.mock('@tauri-apps/api/core')` でTauri invokeをモック
4. **Composables**: Vue Test Utilsのマウント、またはComposable単体テスト

## テストコード

### バックエンド - SQL Generator テスト例

```rust
// src-tauri/src/sql_generator/builder_test.rs
#[cfg(test)]
mod tests {
    use super::*;
    use crate::sql_generator::dialects::postgres::PostgresDialect;

    #[test]
    fn test_simple_select() {
        let builder = SqlBuilder::new(Box::new(PostgresDialect));
        let sql = builder
            .select(&["id", "name"])
            .from("users")
            .build();

        assert_eq!(sql, "SELECT id, name FROM users");
    }

    #[test]
    fn test_select_with_where() {
        let builder = SqlBuilder::new(Box::new(PostgresDialect));
        let sql = builder
            .select(&["*"])
            .from("users")
            .where_clause("id = 1")
            .build();

        assert_eq!(sql, "SELECT * FROM users WHERE id = 1");
    }

    #[test]
    fn test_select_with_join() {
        let builder = SqlBuilder::new(Box::new(PostgresDialect));
        let sql = builder
            .select(&["u.id", "o.total"])
            .from("users u")
            .join("orders o", "u.id = o.user_id")
            .build();

        assert_eq!(sql, "SELECT u.id, o.total FROM users u JOIN orders o ON u.id = o.user_id");
    }
}
```

### バックエンド - Dialect テスト例

```rust
// src-tauri/src/sql_generator/dialects/mysql_test.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mysql_limit_syntax() {
        let dialect = MySqlDialect;
        let limit = dialect.format_limit(10, Some(20));

        assert_eq!(limit, "LIMIT 20, 10"); // MySQL uses LIMIT offset, count
    }

    #[test]
    fn test_mysql_identifier_quoting() {
        let dialect = MySqlDialect;
        let quoted = dialect.quote_identifier("table name");

        assert_eq!(quoted, "`table name`");
    }
}
```

### フロントエンド - Store テスト例

```typescript
// tests/stores/query-builder.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useQueryBuilderStore } from '../../app/stores/query-builder';

describe('useQueryBuilderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should have initial state', () => {
    const store = useQueryBuilderStore();

    expect(store.selectedTables).toEqual([]);
    expect(store.selectedColumns).toEqual([]);
  });

  it('should add table to selection', () => {
    const store = useQueryBuilderStore();

    store.addTable({ name: 'users', schema: 'public' });

    expect(store.selectedTables).toHaveLength(1);
    expect(store.selectedTables[0].name).toBe('users');
  });

  it('should remove table from selection', () => {
    const store = useQueryBuilderStore();
    store.addTable({ name: 'users', schema: 'public' });

    store.removeTable('users');

    expect(store.selectedTables).toHaveLength(0);
  });
});
```

### フロントエンド - Utils テスト例

```typescript
// tests/utils/query-converter.spec.ts
import { describe, it, expect } from 'vitest';
import { convertToSelectQuery, formatSql } from '../../app/utils/query-converter';

describe('query-converter', () => {
  describe('convertToSelectQuery', () => {
    it('should convert simple selection to SELECT query', () => {
      const input = {
        tables: ['users'],
        columns: ['id', 'name'],
      };

      const result = convertToSelectQuery(input);

      expect(result).toContain('SELECT');
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('FROM users');
    });
  });

  describe('formatSql', () => {
    it('should format SQL with proper indentation', () => {
      const sql = 'SELECT id, name FROM users WHERE id = 1';

      const formatted = formatSql(sql);

      expect(formatted).toContain('\n');
    });
  });
});
```

### フロントエンド - API テスト例

```typescript
// tests/api/query.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { executeQuery, generateSql } from '../../app/api/query';

describe('query API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call invoke with correct command for generateSql', async () => {
    vi.mocked(invoke).mockResolvedValue('SELECT * FROM users');

    const result = await generateSql({ tables: ['users'], columns: ['*'] });

    expect(invoke).toHaveBeenCalledWith('generate_sql', expect.any(Object));
    expect(result).toBe('SELECT * FROM users');
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Connection failed'));

    await expect(executeQuery('SELECT 1')).rejects.toThrow('Connection failed');
  });
});
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| バックエンドテストは `*_test.rs` ファイルを分離 | 既存パターンに準拠、コードの見通しが良い | 同一ファイル内にテストモジュール |
| フロントエンドは `tests/` ディレクトリに配置 | 既存パターンに準拠 | `__tests__` ディレクトリ、`.spec.ts` 同階層配置 |
| Composablesテストは可能な範囲で実装 | Nuxt環境問題があるため無理しない | @nuxt/test-utils導入 |

## 未解決事項

- [ ] Nuxt composablesのテスト環境問題の根本解決
- [ ] Database Inspectorsのインテグレーションテスト環境構築
