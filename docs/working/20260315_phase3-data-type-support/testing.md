# テスト手順書 - Phase 3: 各種データ型対応（PostgreSQL 配列型）

- **作成日**: 2026-03-15

---

## 概要

PostgreSQL 配列型の値が NULL でなく `[...]` 形式の文字列として表示されることを確認します。

## 前提条件

- `npm run tauri:dev` でアプリが起動していること
- PostgreSQL（benchmark_small 等）に接続できること

---

## 手動テスト

### ケース 1: 整数配列（INTEGER[]）

**手順:**

1. PostgreSQL 接続を選択する
2. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT ARRAY[1, 2, 3]::INTEGER[] AS int_arr;
   ```

**期待結果:**

- `int_arr` に `[1, 2, 3]` が表示されること（NULL でないこと）

**確認結果:**

- [x] OK / NG

---

### ケース 2: テキスト配列（TEXT[]）

**手順:**

1. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT ARRAY['hello', 'world', 'foo']::TEXT[] AS text_arr;
   ```

**期待結果:**

- `text_arr` に `["hello", "world", "foo"]` が表示されること（文字列要素はダブルクォートで囲まれること）

**確認結果:**

- [x] OK / NG

---

### ケース 3: NULL 要素を含む配列

**手順:**

1. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT ARRAY[1, NULL, 3]::INTEGER[] AS arr_with_null;
   ```

**期待結果:**

- `arr_with_null` に `[1, null, 3]` が表示されること（NULL 要素は `null` として表示）

**確認結果:**

- [x] OK / NG

---

### ケース 4: 空の配列

**手順:**

1. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT '{}'::INTEGER[] AS empty_arr;
   ```

**期待結果:**

- `empty_arr` に `[]` が表示されること

**確認結果:**

- [x] OK / NG

---

### ケース 5: 真偽値配列（BOOLEAN[]）

**手順:**

1. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT ARRAY[true, false, true]::BOOLEAN[] AS bool_arr;
   ```

**期待結果:**

- `bool_arr` に `[true, false, true]` が表示されること

**確認結果:**

- [x] OK / NG

---

### ケース 6: 浮動小数点配列（FLOAT8[]）

**手順:**

1. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT ARRAY[1.1, 2.2, 3.3]::FLOAT8[] AS float_arr;
   ```

**期待結果:**

- `float_arr` に `[1.1, 2.2, 3.3]` が表示されること（NULL でないこと）

**確認結果:**

- [x] OK / NG

---

### ケース 7: テーブルの配列カラム

**手順:**

1. SQLエディタで以下の SQL を実行する：
   ```sql
   CREATE TEMP TABLE arr_test (
     id SERIAL PRIMARY KEY,
     tags TEXT[],
     scores INTEGER[]
   );
   INSERT INTO arr_test (tags, scores) VALUES
     (ARRAY['a', 'b'], ARRAY[10, 20, 30]),
     (NULL, ARRAY[1]);
   SELECT * FROM arr_test;
   ```

**期待結果:**

- `tags` に `["a", "b"]` と `null`（カラム全体が NULL のケース）が表示されること
- `scores` に `[10, 20, 30]` と `[1]` が表示されること

**確認結果:**

- [x] OK / NG

---

### ケース 8: 未対応の配列型（プレースホルダー表示）

**手順:**

1. SQLエディタで以下の SQL を実行する（`NUMERIC[]` は初期実装では未対応を想定）：
   ```sql
   SELECT ARRAY[1.1, 2.2]::NUMERIC[] AS num_arr;
   ```

**期待結果:**

- `num_arr` が NULL ではなく `[array<numeric>]` などのプレースホルダー文字列が表示されること

**確認結果:**

- [x] OK / NG

---

### ケース 9: 回帰テスト - 非配列型の動作確認

**手順:**

1. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT 1 AS int_val, 'text' AS str_val, NOW() AS ts_val, 1234.56::NUMERIC AS num_val;
   ```

**期待結果:**

- Phase 1〜2 で対応した非配列型が引き続き正しく表示されること
- `num_val` に `"1234.56"` が表示されること（Phase 2 の回帰確認）

**確認結果:**

- [x] OK / NG

---

## 自動テスト

### ビルド確認

```bash
cd src-tauri && cargo build
```

`Vec<Option<T>>` の PostgreSQL 配列デコードがコンパイル通ることを確認する。

### Rust テスト

```bash
cd src-tauri && cargo test
```

---

## エッジケース

| ケース | 期待動作 | 確認結果 |
|--------|---------|---------|
| 1次元配列 | `[1, 2, 3]` 形式 | |
| 空配列 `'{}'` | `[]` | |
| 全要素 NULL `'{NULL, NULL}'` | `[null, null]` | |
| 大量要素（1000件） | 全要素が表示されること | |
| 配列カラムが NULL（行全体のカラムが NULL） | `NULL` 表示のまま | |
