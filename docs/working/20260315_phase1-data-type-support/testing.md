# テスト手順書 - Phase 1: 各種データ型対応（依存追加なし）

- **作成日**: 2026-03-15

---

## 概要

各種データ型対応 Phase 1 の動作確認手順を記載します。
MySQL の TIMESTAMP NULL 問題修正を中心に、各型の表示が正しく行われることを確認します。

---

## 前提条件

- `npm run tauri:dev` でアプリが起動していること
- MySQL に接続できる環境があること
- PostgreSQL に接続できる環境があること（T-06〜T-08 の確認時）

---

## テスト用データ準備

### MySQL テスト用テーブル作成

```sql
CREATE TABLE IF NOT EXISTS type_test_phase1 (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ts TIMESTAMP,
  dt DATETIME,
  d DATE,
  t TIME,
  yr YEAR,
  json_val JSON,
  bit_val BIT(8),
  enum_val ENUM('a', 'b', 'c'),
  set_val SET('x', 'y', 'z'),
  tinytext_val TINYTEXT,
  mediumtext_val MEDIUMTEXT,
  tinyblob_val TINYBLOB,
  mediumblob_val MEDIUMBLOB
);

INSERT INTO type_test_phase1 (ts, dt, d, t, yr, json_val, bit_val, enum_val, set_val, tinytext_val, mediumtext_val, tinyblob_val, mediumblob_val)
VALUES (
  '2026-03-15 10:00:00',
  '2026-03-15 10:00:00',
  '2026-03-15',
  '10:00:00',
  2026,
  '{"key": "value", "num": 42}',
  b'10101010',
  'a',
  'x,y',
  'tiny text value',
  'medium text value',
  'binary data',
  'medium binary data'
);

-- NULL 値のテスト用
INSERT INTO type_test_phase1 (ts) VALUES (NULL);
```

### PostgreSQL テスト用テーブル作成

```sql
CREATE TABLE IF NOT EXISTS type_test_phase1 (
  id SERIAL PRIMARY KEY,
  json_val JSON,
  jsonb_val JSONB,
  inet_val INET,
  cidr_val CIDR,
  interval_val INTERVAL,
  oid_val OID,
  point_val POINT
);

INSERT INTO type_test_phase1 (json_val, jsonb_val, inet_val, cidr_val, interval_val, oid_val, point_val)
VALUES (
  '{"key": "value"}',
  '{"key": "value", "arr": [1,2,3]}',
  '192.168.1.1',
  '192.168.1.0/24',
  '1 year 2 months 3 days',
  1234,
  '(1.5, 2.5)'
);
```

---

## 手動テスト

### ケース 1: MySQL TIMESTAMP / DATETIME の表示確認（T-01・最重要）

**手順:**

1. アプリを起動し、MySQL 接続を開く
2. SQL エディタまたはクエリビルダーを開く
3. 以下の SQL を実行する：
   ```sql
   SELECT id, ts, dt FROM type_test_phase1;
   ```

**期待結果:**

- `ts` カラムの値が `"2026-03-15 10:00:00"` 形式で表示される（NULL ではない）
- `dt` カラムの値が `"2026-03-15 10:00:00"` 形式で表示される
- 2行目（NULL INSERT）の `ts` は NULL と表示される

**確認結果:**

- [x] OK / NG

---

### ケース 2: MySQL DATE / TIME / YEAR の表示確認（T-01）

**手順:**

1. SQL エディタで以下を実行：
   ```sql
   SELECT id, d, t, yr FROM type_test_phase1;
   ```

**期待結果:**

- `d` カラムの値が `"2026-03-15"` 形式で表示される
- `t` カラムの値が `"10:00:00"` 形式で表示される
- `yr` カラムの値が `2026` として表示される

**確認結果:**

- [x] OK / NG

---

### ケース 3: MySQL ENUM / SET / TINYTEXT / MEDIUMTEXT の表示確認（T-02）

**手順:**

1. SQL エディタで以下を実行：
   ```sql
   SELECT id, enum_val, set_val, tinytext_val, mediumtext_val FROM type_test_phase1;
   ```

**期待結果:**

- `enum_val` の値が `"a"` として表示される
- `set_val` の値が `"x,y"` として表示される
- `tinytext_val` の値が `"tiny text value"` として表示される
- `mediumtext_val` の値が `"medium text value"` として表示される

**確認結果:**

- [x] OK / NG

---

### ケース 4: MySQL JSON の表示確認（T-04）

**手順:**

1. SQL エディタで以下を実行：
   ```sql
   SELECT id, json_val FROM type_test_phase1;
   ```

**期待結果:**

- `json_val` の値が JSON 文字列として表示される（例: `{"key":"value","num":42}`）
- NULL ではなく文字列として表示される

**確認結果:**

- [x] OK / NG

---

### ケース 5: MySQL BIT の表示確認（T-05）

**手順:**

1. SQL エディタで以下を実行：
   ```sql
   SELECT id, bit_val FROM type_test_phase1;
   ```

**期待結果:**

- `bit_val` の値がビット表現文字列（例: `0b10101010` または `0b0`）として表示される

**確認結果:**

- [x] OK / NG

---

### ケース 6: PostgreSQL JSON / JSONB の表示確認（T-07）

**手順:**

1. PostgreSQL 接続に切り替える
2. SQL エディタで以下を実行：
   ```sql
   SELECT id, json_val, jsonb_val FROM type_test_phase1;
   ```

**期待結果:**

- `json_val` の値が JSON 文字列として表示される
- `jsonb_val` の値が JSON 文字列として表示される（例: `{"arr":[1,2,3],"key":"value"}`）

**確認結果:**

- [x] OK / NG

---

### ケース 7: PostgreSQL INET / CIDR / INTERVAL の表示確認（T-06）

**手順:**

1. SQL エディタで以下を実行：
   ```sql
   SELECT id, inet_val, cidr_val, interval_val, oid_val FROM type_test_phase1;
   ```

**期待結果:**

- `inet_val` の値が `"192.168.1.1"` として表示される
- `cidr_val` の値が `"192.168.1.0/24"` として表示される
- `interval_val` の値が文字列として表示される（例: `"1 years 2 months 3 days"`）
- `oid_val` の値が整数（`1234`）として表示される

**確認結果:**

- [x] OK / NG

---

### ケース 8: PostgreSQL 幾何型の表示確認（T-08）

**手順:**

1. SQL エディタで以下を実行：
   ```sql
   SELECT id, point_val FROM type_test_phase1;
   ```

**期待結果:**

- `point_val` の値が NULL ではなく、文字列か `"[geometry]"` として表示される

**確認結果:**

- [x] OK / NG

---

### ケース 9: 既存型への回帰確認

**手順:**

1. MySQL 接続で以下を実行（既存の動作確認）：
   ```sql
   SELECT 1 AS int_val, 'text' AS str_val, 3.14 AS float_val, true AS bool_val, NULL AS null_val;
   ```

**期待結果:**

- `int_val`: `1`（整数、型: bigint）
- `str_val`: `"text"`（文字列、型: varchar）
- `float_val`: `"3.14"`（文字列表示、型: decimal）※MySQL リテラルは DECIMAL 型になるため bigdecimal 経由で文字列として返す
- `bool_val`: `1`（整数、型: bigint）※MySQL の `true` は tinyint/bigint で返る
- `null_val`: NULL

**確認結果:**

- [x] OK / NG

---

### ケース 10: MySQL DECIMAL の表示確認（T-10）

**手順:**

1. MySQL 接続で以下を実行：
   ```sql
   SELECT 3.14 AS float_val, 1234.5678 AS dec_val;
   ```

**期待結果:**

- `float_val` の値が `"3.14"` として表示される（型: decimal、NULL ではない）
- `dec_val` の値が `"1234.5678"` として表示される

**確認結果:**

- [x] OK / NG

---

## 自動テスト

### Rustビルド確認

```bash
cd src-tauri && cargo build
```

### 型チェック

```bash
npm run typecheck
```

---

## エッジケース

| ケース | 期待動作 | 確認結果 |
|--------|---------|---------|
| TIMESTAMP カラムが NULL | NULL と表示される | |
| DATETIME カラムが NULL | NULL と表示される | |
| JSON カラムが NULL | NULL と表示される | |
| BIT(1) の値が `0` | `0b0` として表示される | |
| ENUM カラムに `NULL` を INSERT | NULL と表示される | |

---

## 回帰テスト

既存機能への影響がないことを確認します。

- [x] 既存の MySQL 接続・クエリ実行が正常に動作する
- [x] 既存の PostgreSQL 接続・クエリ実行が正常に動作する
- [x] INT / VARCHAR / FLOAT / BOOL 型の値が引き続き正しく表示される
- [x] クエリビルダー画面でのクエリ実行が正常に動作する
- [x] SQLエディタ画面でのクエリ実行が正常に動作する
