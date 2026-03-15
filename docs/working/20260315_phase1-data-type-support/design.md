# 設計書 - Phase 1: 各種データ型対応（依存追加なし）

- **作成日**: 2026-03-15

---

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
    ↓ invoke("execute_query")
Tauri API
    ↓
Rust Backend (commands/query.rs)
    ↓
services/query_executor.rs
    ↓
database/mysql_executor.rs       ← 主な変更箇所
database/postgresql_executor.rs  ← 主な変更箇所
    ↓
外部 DB（MySQL / PostgreSQL）
```

### 影響範囲

- **フロントエンド**: なし（`QueryValue` の型体系は変わらない）
- **バックエンド**: `mysql_executor.rs` と `postgresql_executor.rs` の `convert_row()` 内 match 文のアーム追加のみ

---

## 実装方針

### 概要

各 executor の `convert_row()` 関数内にある match 文に、未登録の型のアームを追加する。
既存の `_` フォールバックアームは残す。新しいアームは既存アームとスタイルを統一する。

### 詳細

1. **MySQL 日付・時刻型**: `chrono` feature が既に有効なので、`try_get::<chrono::NaiveDateTime, _>()` 等を使って変換し、フォーマット文字列で String に変換する
2. **MySQL 文字列型追加**: 既存の `"VARCHAR" | "CHAR" | ...` アームのパターンに型名を追加するだけ
3. **MySQL バイナリ型追加**: 既存の `"BLOB" | "LONGBLOB" | ...` アームのパターンに型名を追加するだけ
4. **MySQL JSON 型**: `serde_json::Value` で取得し `v.to_string()` で文字列化。失敗した場合は String フォールバック
5. **MySQL BIT 型**: `u64` で取得し `format!("{:#b}", v)` でビット表現に変換
6. **PostgreSQL ネットワーク型等**: String として取得できる型を明示的に追加。String デコード非対応の型は実際に確認し、非対応ならプレースホルダー文字列を返す
7. **PostgreSQL JSON/JSONB**: `serde_json::Value` で取得し文字列化
8. **PostgreSQL 幾何型**: String 取得を試み、失敗したら `"[geometry]"` プレースホルダーを返す

---

## データ構造

### 型定義（Rust）- 既存（変更なし）

```rust
// src-tauri/src/models/query_result.rs (既存)
pub enum QueryValue {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    String(String),
    Bytes(Vec<u8>),
}
```

---

## 実装詳細

### mysql_executor.rs

#### T-01: 日付・時刻型

```rust
"DATE" => row
    .try_get::<chrono::NaiveDate, _>(i)
    .ok()
    .map(|d| QueryValue::String(d.format("%Y-%m-%d").to_string()))
    .unwrap_or(QueryValue::Null),

"TIME" => row
    .try_get::<chrono::NaiveTime, _>(i)
    .ok()
    .map(|t| QueryValue::String(t.format("%H:%M:%S").to_string()))
    .unwrap_or(QueryValue::Null),

"DATETIME" | "TIMESTAMP" => row
    .try_get::<chrono::NaiveDateTime, _>(i)
    .ok()
    .map(|dt| QueryValue::String(dt.format("%Y-%m-%d %H:%M:%S").to_string()))
    .unwrap_or(QueryValue::Null),

"YEAR" => row
    .try_get::<i16, _>(i)
    .ok()
    .map(|y| QueryValue::Int(y as i64))
    .unwrap_or(QueryValue::Null),
```

#### T-02: 文字列型追加

既存アームに型名を追加：

```rust
// 変更前
"VARCHAR" | "CHAR" | "TEXT" | "LONGTEXT" => ...

// 変更後
"VARCHAR" | "CHAR" | "TEXT" | "LONGTEXT" | "TINYTEXT" | "MEDIUMTEXT" | "ENUM" | "SET" => ...
```

#### T-03: バイナリ型追加

既存アームに型名を追加：

```rust
// 変更前
"BLOB" | "LONGBLOB" | "BINARY" | "VARBINARY" => ...

// 変更後
"BLOB" | "LONGBLOB" | "TINYBLOB" | "MEDIUMBLOB" | "BINARY" | "VARBINARY" => ...
```

#### T-04: JSON 型

```rust
"JSON" => row
    .try_get::<serde_json::Value, _>(i)
    .ok()
    .map(|v| QueryValue::String(v.to_string()))
    .or_else(|| {
        row.try_get::<String, _>(i).ok().map(QueryValue::String)
    })
    .unwrap_or(QueryValue::Null),
```

#### T-05: BIT 型

```rust
"BIT" => row
    .try_get::<u64, _>(i)
    .ok()
    .map(|v| QueryValue::String(format!("{:#b}", v)))
    .unwrap_or(QueryValue::Null),
```

---

### postgresql_executor.rs

#### T-06: ネットワーク型・その他 String 変換型

```rust
"INET" | "CIDR" | "MACADDR" | "MACADDR8" => row
    .try_get::<String, _>(i)
    .ok()
    .map(QueryValue::String)
    .unwrap_or(QueryValue::Null),

"INTERVAL" | "XML" | "BIT" | "VARBIT" | "TSVECTOR" | "TSQUERY" => row
    .try_get::<String, _>(i)
    .ok()
    .map(QueryValue::String)
    .unwrap_or(QueryValue::Null),

"OID" => row
    .try_get::<u32, _>(i)
    .ok()
    .map(|v| QueryValue::Int(v as i64))
    .unwrap_or(QueryValue::Null),
```

**注意**: ビルド時に String デコード非対応エラーが出た型は個別にプレースホルダー対応に切り替える。

#### T-07: JSON/JSONB 型

```rust
"JSON" | "JSONB" => row
    .try_get::<serde_json::Value, _>(i)
    .ok()
    .map(|v| QueryValue::String(v.to_string()))
    .or_else(|| {
        row.try_get::<String, _>(i).ok().map(QueryValue::String)
    })
    .unwrap_or(QueryValue::Null),
```

#### T-08: 幾何型

```rust
"POINT" | "LINE" | "LSEG" | "BOX" | "PATH" | "POLYGON" | "CIRCLE" => row
    .try_get::<String, _>(i)
    .ok()
    .map(QueryValue::String)
    .unwrap_or_else(|| QueryValue::String("[geometry]".to_string())),
```

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| `_` フォールバックアームを残す | 未知の型で String 変換が成功するケースがある | 全型を明示的に列挙（保守コスト増） |
| TIMESTAMP を `NaiveDateTime` で取得 | sqlx の MySQL ドライバーが TIMESTAMP を chrono::NaiveDateTime で返す | `chrono::DateTime<Utc>` を試みる（タイムゾーン情報がない場合に失敗する可能性） |
| BIT を `u64` で取得し `{:#b}` 形式で表示 | ビット列の意味を人間が読める形で表現できる | hex 表示、10進数表示 |
| 幾何型のフォールバックに `"[geometry]"` を使用 | NULL より有用。実値を返せない場合でも型の存在を示せる | `QueryValue::Null`（現状と変わらない） |
| JSON を `serde_json::Value` → `String` で取得 | serde_json の to_string() で整形なしの JSON 文字列を得られる | `String` として直接取得（sqlx MySQL が JSON を String として返す場合はこちらでも可） |

---

## 未解決事項

- [ ] T-06: `INTERVAL`, `TSVECTOR`, `TSQUERY` 等が sqlx 0.8 の PostgreSQL ドライバーで `String` デコード可能か実際にビルドして確認する
- [ ] T-06: `BIT`, `VARBIT` の PostgreSQL 型が String デコード可能か確認する（非対応の場合はプレースホルダー `"[bit]"` に変更）
- [ ] T-05: MySQL の BIT 型が `u64` として取得できるか確認する（sqlx 0.8 で挙動が変わっている可能性）
