# 設計書 - Phase 2: 各種データ型対応（bigdecimal 依存追加）

- **作成日**: 2026-03-15
- **ステータス**: 実装完了

---

## アーキテクチャ

### 影響範囲

- **フロントエンド**: なし（`QueryValue::String` として受け取るため変更不要）
- **バックエンド**: `mysql_executor.rs`、`postgresql_executor.rs` の `convert_row()` に match アームを追加

```
Frontend (Vue/Nuxt)
    ↓ invoke("execute_query", ...)
Tauri API
    ↓
Rust Backend
    ↓ QueryValue::String("1234.5678")  ← BigDecimal.to_string()
mysql_executor / postgresql_executor
    ↓
MySQL / PostgreSQL
```

---

## 実装方針

### T-09: Cargo.toml への bigdecimal feature 追加

**ファイル**: `src-tauri/Cargo.toml`

```toml
sqlx = { version = "0.8", features = [
    "runtime-tokio-rustls",
    "postgres", "mysql", "sqlite",
    "chrono", "uuid",
    "bigdecimal"   # 追加
] }
bigdecimal = { version = "0.4", features = ["serde"] }   # 追加
```

**確認事項**: `bigdecimal = "0.4"` は `sqlx 0.8` と互換性あり（確認済み）。

---

### T-10: MySQL DECIMAL/NUMERIC 型の対応

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

`convert_row()` 内の match 文に以下のアームを追加（`FLOAT` / `DOUBLE` アームの後）：

```rust
"DECIMAL" | "NUMERIC" | "NEWDECIMAL" => row
    .try_get::<bigdecimal::BigDecimal, _>(i)
    .ok()
    .map(|v| QueryValue::String(v.to_string()))
    .unwrap_or(QueryValue::Null),
```

**設計上の決定事項**:
- `BigDecimal::to_string()` は精度を完全に保持した文字列を返す（例: `"1234.5678"`）
- `QueryValue::Float(f64)` は精度損失が発生するため使用しない
- MySQL の `type_info.name()` は `"NEWDECIMAL"` を返す場合があるため合わせて対応

---

### T-11: PostgreSQL NUMERIC/MONEY 型の対応

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

`convert_row()` 内の match 文に以下のアームを追加（`FLOAT4` / `FLOAT8` アームの後）：

```rust
"NUMERIC" => row
    .try_get::<bigdecimal::BigDecimal, _>(i)
    .ok()
    .map(|v| QueryValue::String(v.to_string()))
    .unwrap_or(QueryValue::Null),

"MONEY" => row
    .try_get::<String, _>(i)
    .ok()
    .map(QueryValue::String)
    .unwrap_or(QueryValue::Null),
```

**設計上の決定事項**:
- PostgreSQL の `MONEY` 型は `sqlx` が String として返す（`"$1,234.56"` 形式）
- `NUMERIC` は `bigdecimal::BigDecimal` で精度保持

---

## データ構造

### 関連する型定義（Rust）

```rust
// src-tauri/src/models/query_result.rs
pub enum QueryValue {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    String(String),
    Bytes(Vec<u8>),
}
```

DECIMAL/NUMERIC は `QueryValue::String` として返す（精度損失防止のため `Float` は使用しない）。

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| `BigDecimal` → `QueryValue::String` | `f64` への変換は精度損失が発生するため | `QueryValue::Float(f64)` → 採用しない |
| `bigdecimal = "0.4"` を使用 | `sqlx 0.8` が依存している version と一致 | `0.3.x` → 非互換 |
| `MONEY` は `String` 取得 | PostgreSQL の MONEY は通貨記号を含む文字列 | 数値パースは不要 |
| `"NEWDECIMAL"` を DECIMAL に含める | MySQL の `type_info.name()` が `"NEWDECIMAL"` を返す場合があるため | 別アーム → 重複コードになる |
