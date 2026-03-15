# タスクリスト - Phase 1 + Phase 2: 各種データ型対応

- **作成日**: 2026-03-15
- **備考**: Phase 2（bigdecimal 依存追加）をテスト中に発見した DECIMAL NULL 問題への対応として前倒し実装

---

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 11 |
| 進行中 | 0 |
| 未着手 | 0 |

---

## タスク一覧

### T-01: MySQL 日付・時刻型の対応 🔴 HIGH

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] `convert_row()` の match 文に `DATE` アームを追加（`chrono::NaiveDate` → `"YYYY-MM-DD"`）
- [x] `convert_row()` の match 文に `TIME` アームを追加（`chrono::NaiveTime` → `"HH:MM:SS"`）
- [x] `convert_row()` の match 文に `"DATETIME"` アームを追加（`chrono::NaiveDateTime` → `"YYYY-MM-DD HH:MM:SS"`）
- [x] `convert_row()` の match 文に `"TIMESTAMP"` アームを追加（`chrono::DateTime<Utc>` → `"YYYY-MM-DD HH:MM:SS"`）※NaiveDateTime では取得不可
- [x] `convert_row()` の match 文に `YEAR` アームを追加（`u16` → `QueryValue::Int`）※`i16` では取得不可
- [x] ビルド確認（`cargo build`）
- [x] 動作確認（MySQL の TIMESTAMP カラムを SELECT して値が表示されること）

---

### T-02: MySQL 文字列型の追加 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] 既存の文字列型アームのパターンに `"TINYTEXT" | "MEDIUMTEXT" | "ENUM" | "SET"` を追加
- [x] ビルド確認
- [x] 動作確認（ENUM カラムを SELECT して値が表示されること）

---

### T-03: MySQL バイナリ型の追加 🟢 LOW

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] 既存のバイナリ型アームのパターンに `"TINYBLOB" | "MEDIUMBLOB"` を追加
- [x] ビルド確認

---

### T-04: MySQL JSON 型の対応 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] `convert_row()` の match 文に `"JSON"` アームを追加（`serde_json::Value` → `v.to_string()` → String フォールバック）
- [x] ビルド確認
- [x] 動作確認（JSON カラムを SELECT して JSON 文字列が表示されること）

---

### T-05: MySQL BIT 型の対応 🟢 LOW

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] `convert_row()` の match 文に `"BIT"` アームを追加（`u64` → `format!("{:#b}", v)`）
- [x] ビルド確認
- [x] 動作確認（BIT カラムの値が `0b...` 形式で表示されること）

---

### T-06: PostgreSQL ネットワーク型・その他 String 変換型の追加 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `"INET" | "CIDR"` アームを追加（raw bytes デコード: `[family, bits, is_cidr, nb, addr...]` 形式を IPv4/IPv6 文字列に変換）
- [x] `"MACADDR" | "MACADDR8"` アームを追加（`String` 取得）
- [x] `"INTERVAL"` アームを追加（`PgInterval` → "X years Y months Z days HH:MM:SS" 形式）
- [x] `"XML" | "BIT" | "VARBIT" | "TSVECTOR" | "TSQUERY"` アームを追加（`String` 取得）
- [x] `"OID"` アームを追加（raw bytes → `u32` big-endian → `QueryValue::Int`）※`i64`/`u32` では Decode 非対応
- [x] ビルド確認
- [x] 動作確認（INET カラムを SELECT して値が表示されること）

---

### T-07: PostgreSQL JSON/JSONB 型の対応 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `convert_row()` の match 文に `"JSON" | "JSONB"` アームを追加（`serde_json::Value` → 文字列化）
- [x] ビルド確認
- [x] 動作確認（JSONB カラムを SELECT して JSON 文字列が表示されること）

---

### T-08: PostgreSQL 幾何型の対応 🟢 LOW

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `"POINT" | "LINE" | "LSEG" | "BOX" | "PATH" | "POLYGON" | "CIRCLE"` アームを追加（String 取得 → 失敗時 `"[geometry]"`）
- [x] ビルド確認

---

## 完了条件

- [x] T-01 〜 T-11 の全タスクが完了
- [x] `cargo build` が通ること
- [x] MySQL TIMESTAMP / DATETIME / DATE / TIME カラムの値が正しく表示されること（最重要）
- [x] PostgreSQL JSON/JSONB カラムの値が表示されること
- [x] 既存の型変換ロジック（INT, VARCHAR, FLOAT 等）が引き続き正常に動作すること

---

---

### T-09: Cargo.toml への bigdecimal feature 追加 🟡 MEDIUM（Phase 2 前倒し）

**ファイル**: `src-tauri/Cargo.toml`

- [x] `sqlx` の features に `"bigdecimal"` を追加
- [x] `bigdecimal = { version = "0.4", features = ["serde"] }` を追加
- [x] ビルド確認（依存解決・コンパイル通過）

---

### T-10: MySQL DECIMAL/NUMERIC 型の対応 🟡 MEDIUM（Phase 2 前倒し）

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] `convert_row()` の match 文に `"DECIMAL" | "NUMERIC" | "NEWDECIMAL"` アームを追加（`bigdecimal::BigDecimal` → `v.to_string()` → `QueryValue::String`）
- [x] ビルド確認
- [x] 動作確認（`SELECT 3.14 AS float_val` で `"3.14"` として表示されること）

---

### T-11: PostgreSQL NUMERIC/MONEY 型の対応 🟡 MEDIUM（Phase 2 前倒し）

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `convert_row()` の match 文に `"NUMERIC"` アームを追加（`bigdecimal::BigDecimal` → `v.to_string()` → `QueryValue::String`）
- [x] `convert_row()` の match 文に `"MONEY"` アームを追加（`String` 取得）
- [x] ビルド確認

---

## 実装順序（推奨）

1. T-01（最優先・ユーザー報告バグ）
2. T-04 / T-07（JSON 対応）
3. T-02 / T-06（文字列型追加）
4. T-03 / T-05 / T-08（低優先度）
