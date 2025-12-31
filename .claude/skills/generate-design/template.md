# design.md テンプレート

このファイルには、設計書のテンプレートを記載します。
`{要件名}` の部分は実際の要件名に置き換えてください。

---

```markdown
# 設計書 - {要件名}

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
    ↓ invoke()
Tauri API
    ↓
Rust Backend
    ↓
外部リソース（DB/ファイル等）
```

### 影響範囲

- **フロントエンド**:
- **バックエンド**:

## 実装方針

### 概要

実装の全体的なアプローチを記載します。

### 詳細

1.
2.
3.

## データ構造

### 型定義（TypeScript）

```typescript
interface Example {
  id: string;
  name: string;
}
```

### 型定義（Rust）

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Example {
    pub id: String,
    pub name: String,
}
```

## API設計

### Tauriコマンド

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `example_command` | `ExampleInput` | `Result<ExampleOutput, String>` | 説明 |

## UI設計

### 画面構成

-

### コンポーネント構成

-

## テストコード

### ユニットテスト例

```typescript
import { describe, it, expect } from 'vitest';

describe('Example', () => {
  it('should do something', () => {
    // test implementation
    expect(true).toBe(true);
  });
});
```

### Rustテスト例

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_example() {
        // test implementation
        assert!(true);
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| | | |

## 未解決事項

- [ ]
```
