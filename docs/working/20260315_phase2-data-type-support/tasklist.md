# タスクリスト - Phase 2: 各種データ型対応（bigdecimal 依存追加）

- **作成日**: 2026-03-15
- **備考**: Phase 1 作業中に DECIMAL NULL 問題を発見し、前倒しで実装済み

---

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 3 |
| 進行中 | 0 |
| 未着手 | 0 |

---

## タスク一覧

### T-09: Cargo.toml への bigdecimal feature 追加 🟡 MEDIUM

**ファイル**: `src-tauri/Cargo.toml`

- [x] `sqlx` の features に `"bigdecimal"` を追加
- [x] `bigdecimal = { version = "0.4", features = ["serde"] }` を追加
- [x] ビルド確認（依存解決・コンパイル通過）

---

### T-10: MySQL DECIMAL/NUMERIC 型の対応 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] `convert_row()` の match 文に `"DECIMAL" | "NUMERIC" | "NEWDECIMAL"` アームを追加
  - `bigdecimal::BigDecimal` → `v.to_string()` → `QueryValue::String`
- [x] ビルド確認
- [x] 動作確認（`SELECT 3.14 AS float_val` で `"3.14"` として表示されること）

---

### T-11: PostgreSQL NUMERIC/MONEY 型の対応 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `convert_row()` の match 文に `"NUMERIC"` アームを追加
  - `bigdecimal::BigDecimal` → `v.to_string()` → `QueryValue::String`
- [x] `convert_row()` の match 文に `"MONEY"` アームを追加
  - `String` 取得 → `QueryValue::String`
- [x] ビルド確認

---

## 完了条件

- [x] T-09: `cargo build` が通ること（bigdecimal 依存が解決されること）
- [x] T-10: MySQL の DECIMAL カラムを SELECT して精度付きの文字列値が表示されること
- [x] T-11: PostgreSQL の NUMERIC カラムを SELECT して精度付きの文字列値が表示されること
- [x] 既存の型変換ロジック（INT, FLOAT, VARCHAR 等）が引き続き正常に動作すること
