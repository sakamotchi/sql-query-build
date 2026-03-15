# 要件定義書 - Phase 2: 各種データ型対応（bigdecimal 依存追加）

- **作成日**: 2026-03-15
- **ステータス**: 実装完了（Phase 1 作業中に前倒し実装）

---

## 概要

DECIMAL / NUMERIC 型の値が NULL として表示される問題を解消するため、`bigdecimal` クレートを依存関係に追加し、MySQL・PostgreSQL の精度付き数値型を正しく `QueryValue` に変換する。

## 背景・目的

Phase 1 の実装中に MySQL の DECIMAL 型および PostgreSQL の NUMERIC 型も NULL 表示となることが確認された。これらは `chrono` feature（Phase 1 で対応済み）と異なり、`bigdecimal` feature の追加が必要であることが判明したため、Phase 2 として分離して対応する。

### 根本原因

```
row.try_get::<String, _>(i) // String として取得しようとすると失敗
→ QueryValue::Null           // フォールバックで NULL が返る
```

- MySQL の `DECIMAL` / `NUMERIC` / `NEWDECIMAL` は sqlx が `BigDecimal` として返す
- PostgreSQL の `NUMERIC` も同様
- `bigdecimal` feature が未設定だと `BigDecimal` 型でのデコードができない

## 要件一覧

### 機能要件

#### F-1: bigdecimal 依存追加

- **説明**: `src-tauri/Cargo.toml` に `sqlx` の `bigdecimal` feature フラグおよび `bigdecimal` クレートを追加する
- **受け入れ条件**:
  - [x] `sqlx` の features に `"bigdecimal"` が追加されていること
  - [x] `bigdecimal = { version = "0.4", features = ["serde"] }` が追加されていること
  - [x] `cargo build` が通ること

#### F-2: MySQL DECIMAL/NUMERIC 型の正しい変換

- **説明**: MySQL の `DECIMAL` / `NUMERIC` / `NEWDECIMAL` 型を `bigdecimal::BigDecimal` で取得し、精度を保持した文字列として `QueryValue::String` に変換する
- **受け入れ条件**:
  - [x] DECIMAL カラムを SELECT して値が NULL でなく文字列として表示されること
  - [x] 精度が保持されること（例: `1234.5678` → `"1234.5678"`）

#### F-3: PostgreSQL NUMERIC/MONEY 型の正しい変換

- **説明**: PostgreSQL の `NUMERIC` 型を `bigdecimal::BigDecimal` で取得し文字列変換する。`MONEY` 型は String 取得とする
- **受け入れ条件**:
  - [x] NUMERIC カラムを SELECT して値が NULL でなく文字列として表示されること
  - [x] MONEY カラムを SELECT して値が文字列として表示されること（例: `"$1,234.56"`）

### 非機能要件

- **互換性**: `bigdecimal = "0.4"` と `sqlx = "0.8"` の互換性を確認すること
- **既存動作**: Phase 1 で対応した型変換ロジックの動作を壊さないこと
- **ビルド**: `cargo build` が通ること

## スコープ

### 対象

- `src-tauri/Cargo.toml`（依存追加）
- `src-tauri/src/database/mysql_executor.rs`（DECIMAL/NUMERIC/NEWDECIMAL）
- `src-tauri/src/database/postgresql_executor.rs`（NUMERIC/MONEY）

### 対象外

- SQLite の DECIMAL 対応
- BIGINT UNSIGNED の完全な u64 精度対応（別途検討）
- フロントエンド側の表示フォーマット変更

## 依存関係

| 依存 | 内容 |
|------|------|
| `bigdecimal = "0.4"` | sqlx 0.8 との互換性確認済み |
| Phase 1 実装 | Phase 1 の match アーム追加が完了していること |
