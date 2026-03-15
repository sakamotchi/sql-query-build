# テスト手順書 - Phase 2: 各種データ型対応（bigdecimal 依存追加）

- **作成日**: 2026-03-15

---

## 概要

bigdecimal 依存追加による DECIMAL/NUMERIC 型の正しい変換を確認します。

## 前提条件

- `npm run tauri:dev` でアプリが起動していること
- MySQL / PostgreSQL に接続できること
- 各 DB に DECIMAL/NUMERIC カラムを持つテーブルが存在すること

---

## 手動テスト

### ケース 1: MySQL - DECIMAL カラムの値表示

**手順:**

1. アプリを起動し、MySQL 接続を選択する
2. SQLエディタを開く
3. 以下の SQL を実行する：
   ```sql
   SELECT 1234.5678 AS dec_val, CAST(0.001 AS DECIMAL(10,3)) AS small_val;
   ```

**期待結果:**

- `dec_val` に `"1234.5678"` が表示されること（NULL でないこと）
- `small_val` に `"0.001"` が表示されること（精度損失なし）

**確認結果:**

- [x] OK / NG

---

### ケース 2: MySQL - DECIMAL カラムを持つテーブルからの SELECT

**手順:**

1. MySQL で DECIMAL カラムを持つテーブルを作成する（テストデータがない場合）：
   ```sql
   CREATE TABLE IF NOT EXISTS decimal_test (
     id INT PRIMARY KEY AUTO_INCREMENT,
     price DECIMAL(10, 4),
     amount NUMERIC(15, 2)
   );
   INSERT INTO decimal_test (price, amount) VALUES (9999.9999, 123456789.99);
   ```
2. SQLエディタで `SELECT * FROM decimal_test;` を実行する

**期待結果:**

- `price` に `"9999.9999"` が表示されること
- `amount` に `"123456789.99"` が表示されること
- NULL 表示にならないこと

**確認結果:**

- [x] OK / NG

---

### ケース 3: MySQL - NULL 値の DECIMAL カラム

**手順:**

1. `INSERT INTO decimal_test (price, amount) VALUES (NULL, NULL);` を実行する
2. `SELECT * FROM decimal_test WHERE price IS NULL;` を実行する

**期待結果:**

- `price`、`amount` が NULL として表示されること（NULL 値は引き続き NULL 表示）

**確認結果:**

- [x] OK / NG

---

### ケース 4: PostgreSQL - NUMERIC カラムの値表示

**手順:**

1. PostgreSQL 接続を選択する
2. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT 1234.5678::NUMERIC(10,4) AS num_val, 0.000001::NUMERIC AS tiny_val;
   ```

**期待結果:**

- `num_val` に `"1234.5678"` が表示されること（NULL でないこと）
- `tiny_val` に `"0.000001"` が表示されること（精度損失なし）

**確認結果:**

- [x] OK / NG

---

### ケース 5: PostgreSQL - MONEY カラムの値表示

**手順:**

1. PostgreSQL 接続を選択する
2. SQLエディタで以下の SQL を実行する：
   ```sql
   SELECT '$1,234.56'::MONEY AS money_val;
   ```

**期待結果:**

- `money_val` に通貨文字列（例: `"$1,234.56"`）が表示されること（NULL でないこと）

**確認結果:**

- [x] OK / NG

---

### ケース 6: 回帰テスト - 既存型の動作確認

**手順:**

1. MySQL で以下の SQL を実行する：
   ```sql
   SELECT 1 AS int_val, 3.14 AS float_val, 'hello' AS str_val, NOW() AS ts_val;
   ```

**期待結果:**

- `int_val`: 整数値が表示される
- `float_val`: 浮動小数点値が表示される
- `str_val`: 文字列が表示される
- `ts_val`: 日時文字列が表示される（Phase 1 で対応済み）

**確認結果:**

- [x] OK / NG

---

## 自動テスト

### ビルド確認

```bash
cd src-tauri && cargo build
```

bigdecimal feature が正しく解決されてコンパイルが通ることを確認する。

### 型チェック

```bash
npm run typecheck
```

### Rust テスト

```bash
cd src-tauri && cargo test
```

---

## エッジケース

| ケース | 期待動作 | 確認結果 |
|--------|---------|---------|
| DECIMAL(65,30) の最大精度 | 精度を保持した文字列で表示 | |
| DECIMAL 値が 0 | `"0"` として表示 | |
| NUMERIC の NaN / Infinity（PG） | NULL またはエラーで表示 | |
