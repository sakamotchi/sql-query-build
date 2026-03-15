# 要件定義書 - Phase 3: 各種データ型対応（PostgreSQL 配列型）

- **作成日**: 2026-03-15
- **ステータス**: 計画中

---

## 概要

PostgreSQL の配列型（`INT2[]`, `TEXT[]` 等）のカラム値が NULL として表示される問題を解消する。

## 背景・目的

PostgreSQL では配列型の型名がアンダースコアプレフィックス（例: `_INT4`, `_TEXT`）として返される。現在の `_`（フォールバック）アームは `try_get::<String, _>()` を試みるが、配列型はバイナリプロトコルで専用フォーマットとして送られるため文字列デコードが失敗し **NULL が返る**。

### 現在の動作

```
// postgresql_executor.rs の _ フォールバック
_ => row.try_get::<String, _>(i)  // 配列型はここに落ちて失敗
         .ok()
         .map(QueryValue::String)
         .unwrap_or(QueryValue::Null)  // → NULL が返る
```

### 型名パターン

| 型名（`type_info.name()`） | 対応する配列 |
|---|---|
| `_INT2` | `SMALLINT[]` |
| `_INT4` | `INTEGER[]` |
| `_INT8` | `BIGINT[]` |
| `_FLOAT4` | `REAL[]` |
| `_FLOAT8` | `DOUBLE PRECISION[]` |
| `_TEXT` | `TEXT[]` |
| `_VARCHAR` | `VARCHAR[]` |
| `_BOOL` | `BOOLEAN[]` |
| `_NUMERIC` | `NUMERIC[]` |
| `_TIMESTAMP` | `TIMESTAMP[]` |
| `_TIMESTAMPTZ` | `TIMESTAMPTZ[]` |
| `_DATE` | `DATE[]` |
| その他 | `_XXX` パターン全般 |

---

## 要件一覧

### 機能要件

#### F-1: PostgreSQL 配列型を読みやすい文字列で表示する

- **説明**: `_` プレフィックスを持つ型名を配列型として識別し、値を `[1, 2, 3]` や `["a", "b"]` のような読みやすい文字列として `QueryValue::String` に変換する
- **受け入れ条件**:
  - [ ] `INTEGER[]` カラムを SELECT して `[1, 2, 3]` 形式で表示されること
  - [ ] `TEXT[]` カラムを SELECT して `["a", "b", "c"]` 形式で表示されること
  - [ ] NULL の配列要素を含む場合は `[1, null, 3]` のように表示されること
  - [ ] 空の配列は `[]` として表示されること
  - [ ] 未対応の配列型でも NULL ではなくプレースホルダー文字列（例: `[array]`）で表示されること

### 非機能要件

- **既存動作**: Phase 1〜2 で対応した型変換ロジックの動作を壊さないこと
- **未知配列型**: 未対応の配列要素型でも NULL にせず、何らかの文字列を返すこと

## スコープ

### 対象

- `src-tauri/src/database/postgresql_executor.rs`（配列型ハンドリング追加）

### 対象外

- MySQL の配列型（MySQL は配列型をネイティブサポートしていない）
- 多次元配列のリッチな表示（フラット表現で十分）
- 配列値のフィルタ・ソート機能
- sqlx `Vec<T>` デコードのフル実装（複雑な型は後回し）

## 依存関係

| 依存 | 内容 |
|------|------|
| Phase 1〜2 完了 | Phase 1〜2 の実装が完了していること |
| sqlx 配列型サポート調査 | `try_get::<Vec<T>, _>()` が使えるかの確認が必要 |

## 既知の制約

- PostgreSQL のバイナリ配列フォーマットは複雑（次元数・要素OID・各要素長を含むヘッダー付き）
- sqlx は `Vec<T>` 型の配列デコードをサポートするが、型ごとにコンパイル時の型指定が必要
- 汎用的なデコードには raw bytes パースが必要になる可能性がある
