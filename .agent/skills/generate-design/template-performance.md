# design.md テンプレート（パフォーマンス改善）

このファイルには、パフォーマンス改善作業の設計書テンプレートを記載します。
`{要件名}` の部分は実際の要件名に置き換えてください。

---

```markdown
# 設計書 - {要件名}（パフォーマンス改善）

## ベンチマーク結果

### 測定環境

- **OS**: macOS 14.0 / Windows 11 / Ubuntu 22.04
- **CPU**: Apple M1 / Intel Core i7-12700K / AMD Ryzen 9 5900X
- **メモリ**: 16GB
- **測定ツール**: Chrome DevTools Performance / Rust Criterion / etc.

### Before（改善前）

| 測定項目 | 測定値 | 測定日 | 備考 |
|---------|--------|--------|------|
| ページ読み込み時間 | 3.5秒 | 2025-01-01 | 初回読み込み |
| メモリ使用量 | 512MB | 2025-01-01 | 10分操作後 |

### 測定方法

```typescript
// パフォーマンス測定のコード例
console.time('operation');
// 測定対象の処理
console.timeEnd('operation');
```

```rust
// Rustでのベンチマークコード例
use std::time::Instant;

let start = Instant::now();
// 測定対象の処理
let duration = start.elapsed();
println!("Time elapsed: {:?}", duration);
```

## ボトルネック分析

### 特定されたボトルネック

1. **{ボトルネック1}**
   - **箇所**: `app/components/Example.vue:42-58`
   - **原因**: 不要な再レンダリング
   - **影響**: ページ読み込みに2秒の遅延
   - **証拠**: Chrome DevTools Performance プロファイル参照

2. **{ボトルネック2}**
   - **箇所**: `src-tauri/src/services/database.rs:123-145`
   - **原因**: N+1クエリ問題
   - **影響**: データ取得に1.5秒の遅延
   - **証拠**: ログ出力、クエリ実行回数

### プロファイリング結果

```
// プロファイリング結果の例
Function Name               | Total Time | Call Count | Avg Time
----------------------------|------------|------------|----------
loadData()                  | 2.5s       | 1          | 2.5s
renderTable()               | 1.8s       | 50         | 36ms
fetchRecords() (N+1 query)  | 1.5s       | 100        | 15ms
```

## 最適化方針

### 概要

ボトルネック分析に基づいた最適化アプローチを記載します。

### 最適化戦略

#### 戦略1: {最適化手法1}

- **対象**: {ボトルネック1}
- **手法**: メモ化、仮想スクロール、キャッシング等
- **期待効果**: ページ読み込み時間を3.5秒→1.0秒に短縮
- **リスク**: 初回キャッシュ生成のコスト増

#### 戦略2: {最適化手法2}

- **対象**: {ボトルネック2}
- **手法**: クエリの一括実行、インデックス追加等
- **期待効果**: データ取得時間を1.5秒→0.2秒に短縮
- **リスク**: メモリ使用量が一時的に増加

### 実装計画

1. **Phase 1: 計測基盤整備**
   - ベンチマークテストの追加
   - パフォーマンスログの追加

2. **Phase 2: {最適化1}実装**
   - 実装
   - 効果測定

3. **Phase 3: {最適化2}実装**
   - 実装
   - 効果測定

## データ構造の変更（もしあれば）

### Before

```typescript
interface Example {
  id: string;
  // 非効率な構造
}
```

### After

```typescript
interface Example {
  id: string;
  // 最適化された構造
}
```

## API変更（もしあれば）

既存APIに変更がある場合のみ記載します。

| API名 | 変更内容 | 互換性 | 移行方法 |
|-------|---------|--------|---------|
| `example_command` | 戻り値にキャッシュフラグを追加 | 後方互換 | - |

## 最適化コード例

### フロントエンド最適化例

```typescript
import { computed, ref } from 'vue';

// Before: 毎回計算
const expensiveValue = () => {
  return heavyComputation();
};

// After: メモ化
const expensiveValue = computed(() => {
  return heavyComputation();
});
```

### バックエンド最適化例

```rust
// Before: N+1 query
for id in ids {
    let record = fetch_record(id).await?;
    records.push(record);
}

// After: Bulk query
let records = fetch_records_bulk(&ids).await?;
```

## パフォーマンステスト

### ベンチマークテスト例

```typescript
import { describe, it, expect } from 'vitest';

describe('Performance Benchmark', () => {
  it('should load data within 1 second', async () => {
    const start = performance.now();
    await loadData();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
```

### Rustベンチマーク例

```rust
#[cfg(test)]
mod benchmarks {
    use super::*;
    use std::time::Instant;

    #[test]
    fn bench_data_fetch() {
        let start = Instant::now();
        // 測定対象の処理
        let duration = start.elapsed();

        assert!(duration.as_millis() < 200, "Expected < 200ms, got {:?}", duration);
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 | 選択理由 |
|---------|------|--------|---------|
| 仮想スクロールを採用 | 大量データの表示高速化 | ページネーション | UX重視 |

## 未解決事項

- [ ] Safari での測定結果が未取得
- [ ] メモリリーク調査が未完了

## After（改善後の目標）

| 測定項目 | 目標値 | 測定日 | 達成状況 |
|---------|--------|--------|---------|
| ページ読み込み時間 | 1.0秒以下 | - | 未測定 |
| メモリ使用量 | 256MB以下 | - | 未測定 |

**注**: このセクションは実装完了後に実測値で更新してください。
```
