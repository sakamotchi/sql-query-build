# タスクリスト - Phase 1: 各種データ型対応（依存追加なし）

- **作成日**: 2026-03-15

---

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 8 |
| 進行中 | 0 |
| 未着手 | 0 |

---

## タスク一覧

### T-01: MySQL 日付・時刻型の対応 🔴 HIGH

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] `convert_row()` の match 文に `DATE` アームを追加（`chrono::NaiveDate` → `"YYYY-MM-DD"`）
- [x] `convert_row()` の match 文に `TIME` アームを追加（`chrono::NaiveTime` → `"HH:MM:SS"`）
- [x] `convert_row()` の match 文に `"DATETIME" | "TIMESTAMP"` アームを追加（`chrono::NaiveDateTime` → `"YYYY-MM-DD HH:MM:SS"`）
- [x] `convert_row()` の match 文に `YEAR` アームを追加（`i16` → `QueryValue::Int`）
- [x] ビルド確認（`cargo build`）
- [ ] 動作確認（MySQL の TIMESTAMP カラムを SELECT して値が表示されること）

---

### T-02: MySQL 文字列型の追加 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] 既存の文字列型アームのパターンに `"TINYTEXT" | "MEDIUMTEXT" | "ENUM" | "SET"` を追加
- [x] ビルド確認
- [ ] 動作確認（ENUM カラムを SELECT して値が表示されること）

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
- [ ] 動作確認（JSON カラムを SELECT して JSON 文字列が表示されること）

---

### T-05: MySQL BIT 型の対応 🟢 LOW

**ファイル**: `src-tauri/src/database/mysql_executor.rs`

- [x] `convert_row()` の match 文に `"BIT"` アームを追加（`u64` → `format!("{:#b}", v)`）
- [x] ビルド確認
- [ ] 動作確認（BIT カラムの値が `0b...` 形式で表示されること）

---

### T-06: PostgreSQL ネットワーク型・その他 String 変換型の追加 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `"INET" | "CIDR" | "MACADDR" | "MACADDR8"` アームを追加（`String` 取得）
- [x] `"INTERVAL" | "XML" | "BIT" | "VARBIT" | "TSVECTOR" | "TSQUERY"` アームを追加（`String` 取得）
- [x] `"OID"` アームを追加（`i64` → `QueryValue::Int`、`u32` は PostgreSQL で Decode 非対応のため `i64` を使用）
- [x] ビルド確認
- [ ] 動作確認（INET カラムを SELECT して値が表示されること）

---

### T-07: PostgreSQL JSON/JSONB 型の対応 🟡 MEDIUM

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `convert_row()` の match 文に `"JSON" | "JSONB"` アームを追加（`serde_json::Value` → 文字列化）
- [x] ビルド確認
- [ ] 動作確認（JSONB カラムを SELECT して JSON 文字列が表示されること）

---

### T-08: PostgreSQL 幾何型の対応 🟢 LOW

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] `"POINT" | "LINE" | "LSEG" | "BOX" | "PATH" | "POLYGON" | "CIRCLE"` アームを追加（String 取得 → 失敗時 `"[geometry]"`）
- [x] ビルド確認

---

## 完了条件

- [ ] T-01 〜 T-08 の全タスクが完了
- [ ] `cargo build` が通ること
- [ ] MySQL TIMESTAMP / DATETIME / DATE / TIME カラムの値が正しく表示されること（最重要）
- [ ] PostgreSQL JSON/JSONB カラムの値が表示されること
- [ ] 既存の型変換ロジック（INT, VARCHAR, FLOAT 等）が引き続き正常に動作すること

---

## 実装順序（推奨）

1. T-01（最優先・ユーザー報告バグ）
2. T-04 / T-07（JSON 対応）
3. T-02 / T-06（文字列型追加）
4. T-03 / T-05 / T-08（低優先度）
