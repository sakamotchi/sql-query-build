# 要件定義書 - Phase 1: 各種データ型対応（依存追加なし）

- **作成日**: 2026-03-15
- **ステータス**: 進行中
- **関連ドキュメント**: `docs/local/20260315_各種データ型対応/requirements.md`, `docs/local/20260315_各種データ型対応/wbs.md`

---

## 概要

クエリ結果表示時に一部のデータ型の値が NULL として表示されるバグを修正する。
Phase 1 は既存の sqlx features（`chrono`, `serde_json` 等）のみで解決できる修正を対象とし、`Cargo.toml` の依存追加を行わず実施する。

---

## 背景・目的

### 問題

SQLエディタ・クエリビルダー画面でクエリ結果を表示する際、MySQL の TIMESTAMP / DATETIME / DATE / TIME などのカラム値が NULL として表示される。

### 根本原因

`mysql_executor.rs` / `postgresql_executor.rs` の `convert_row()` 内 match 文に、一部のデータ型のアームが未登録のため、フォールバック処理 `try_get::<String, _>()` が実行される。
`chrono::NaiveDateTime` などの型は String として取得できないため `QueryValue::Null` が返る。

### Phase 1 の目的

既存 feature（`chrono`, `serde_json`）で解決できる型を優先的に修正し、ユーザー報告の TIMESTAMP NULL 問題を早期に解消する。

---

## 要件一覧

### 機能要件

#### F-1: MySQL 日付・時刻型の対応（T-01）

- **説明**: MySQL の DATE / TIME / DATETIME / TIMESTAMP / YEAR カラムの値を正しく変換して表示する
- **受け入れ条件**:
  - [ ] TIMESTAMP カラムを SELECT して値が `"YYYY-MM-DD HH:MM:SS"` 形式で表示される
  - [ ] DATETIME カラムを SELECT して値が `"YYYY-MM-DD HH:MM:SS"` 形式で表示される
  - [ ] DATE カラムを SELECT して値が `"YYYY-MM-DD"` 形式で表示される
  - [ ] TIME カラムを SELECT して値が `"HH:MM:SS"` 形式で表示される
  - [ ] YEAR カラムを SELECT して数値として表示される（例: `2026`）
  - [ ] 各型で NULL 値の場合は NULL 表示のまま

#### F-2: MySQL 文字列型の追加（T-02）

- **説明**: TINYTEXT / MEDIUMTEXT / ENUM / SET を既存の文字列型アームに追加する
- **受け入れ条件**:
  - [ ] ENUM カラムの値が文字列として表示される
  - [ ] SET カラムの値が文字列として表示される
  - [ ] TINYTEXT / MEDIUMTEXT が文字列として表示される

#### F-3: MySQL バイナリ型の追加（T-03）

- **説明**: TINYBLOB / MEDIUMBLOB を既存のバイナリ型アームに追加する
- **受け入れ条件**:
  - [ ] TINYBLOB / MEDIUMBLOB カラムが `QueryValue::Bytes` として返される

#### F-4: MySQL JSON 型の対応（T-04）

- **説明**: MySQL の JSON カラムを `serde_json::Value` として取得し、JSON 文字列として表示する
- **受け入れ条件**:
  - [ ] JSON カラムの値が JSON 文字列として表示される
  - [ ] `serde_json::Value` での取得に失敗した場合は String フォールバックを試みる

#### F-5: MySQL BIT 型の対応（T-05）

- **説明**: MySQL の BIT カラムを `u64` として取得し、ビット表現文字列として表示する
- **受け入れ条件**:
  - [ ] BIT カラムの値が `"0b..."` 形式で表示される

#### F-6: PostgreSQL ネットワーク型・その他 String 変換型の追加（T-06）

- **説明**: INET / CIDR / MACADDR / MACADDR8 / INTERVAL / XML / BIT / VARBIT / TSVECTOR / TSQUERY / OID を明示的にハンドルする
- **受け入れ条件**:
  - [ ] INET / CIDR カラムの値が文字列として表示される
  - [ ] INTERVAL カラムの値が文字列として表示される
  - [ ] OID カラムの値が整数として表示される
  - [ ] sqlx が String デコードをサポートしない型は確認のうえ対応方針を決定する

#### F-7: PostgreSQL JSON/JSONB 型の対応（T-07）

- **説明**: PostgreSQL の JSON / JSONB カラムを `serde_json::Value` として取得し、JSON 文字列として表示する
- **受け入れ条件**:
  - [ ] JSON カラムの値が JSON 文字列として表示される
  - [ ] JSONB カラムの値が JSON 文字列として表示される

#### F-8: PostgreSQL 幾何型の対応（T-08）

- **説明**: POINT / LINE / LSEG / BOX / PATH / POLYGON / CIRCLE を明示的にハンドルする（String または `"[geometry]"` プレースホルダー）
- **受け入れ条件**:
  - [ ] 幾何型カラムが NULL でなく何らかの値として表示される

---

### 非機能要件

- **互換性**: 既存の型変換ロジックの動作を壊さないこと（`_` フォールバックアームは残す）
- **安全性**: NULL 値は正しく `QueryValue::Null` として返すこと
- **依存追加なし**: `Cargo.toml` の変更なしで実装できること（`bigdecimal` 追加は Phase 2）

---

## スコープ

### 対象

- `src-tauri/src/database/mysql_executor.rs` の `convert_row()` 内 match 文
- `src-tauri/src/database/postgresql_executor.rs` の `convert_row()` 内 match 文

### 対象外

- DECIMAL / NUMERIC 型の対応（`bigdecimal` feature が必要 → Phase 2）
- PostgreSQL 配列型の対応（Phase 3）
- SQLite 追加型対応
- テストデータ・自動テストの整備（Phase 4）

---

## 実装対象ファイル

- `src-tauri/src/database/mysql_executor.rs`
- `src-tauri/src/database/postgresql_executor.rs`

---

## 依存関係

| 依存 | 状態 | 備考 |
|------|------|------|
| `chrono` feature | ✅ 有効 | `sqlx` の feature として設定済み |
| `serde_json` | ✅ 有効 | `Cargo.toml` に依存済み |
| `bigdecimal` feature | ❌ 未設定 | Phase 2 で追加予定 |

---

## 既知の制約

- sqlx の `type_info.name()` は大文字を返す（例: `"TIMESTAMP"`, `"INT4"`）
- PostgreSQL のネットワーク型・幾何型が sqlx で String デコード可能かは実際にビルド・実行して確認が必要
- BIGINT UNSIGNED の overflow 問題は Phase 2 で合わせて対応する
