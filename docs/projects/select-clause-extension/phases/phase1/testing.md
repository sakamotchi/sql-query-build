# Phase 1 テスト手順書: 式ツリー基盤構築

**テスト対象**: ExpressionNode型定義、SQL生成ロジック、シンプルな式入力UI

**前提条件**:
- Phase 1の実装が完了している
- テストデータベース（PostgreSQL, MySQL, SQLite）が準備されている
- 開発環境で`npm run tauri:dev`が起動できる

---

## 1. 型定義のテスト

### 1.1 TypeScript型定義の検証

**目的**: ExpressionNode型が正しく定義されているか確認

**手順**:
```bash
# TypeScriptコンパイルエラーがないか確認
npm run typecheck
```

**期待結果**: エラーなくコンパイルが成功する

---

### 1.2 Rust型定義の検証

**目的**: Rust側の型定義が正しく、シリアライズ/デシリアライズできるか確認

**手順**:
```bash
# Rustのビルドエラーがないか確認
cd src-tauri
cargo check
cargo test
```

**期待結果**:
- ビルドエラーなし
- シリアライズ/デシリアライズのテストが合格

---

## 2. SQL生成ロジックのテスト

### 2.1 ColumnReferenceのSQL生成

**テストケース**:

| 入力 | 期待されるSQL |
|------|--------------|
| `{type: 'column', tableAlias: 'u', columnName: 'name'}` | `u.name` |
| `{type: 'column', tableAlias: 't', columnName: 'id'}` | `t.id` |

**手順**:
```bash
# 単体テスト実行
cd src-tauri
cargo test test_column_reference_sql
```

---

### 2.2 LiteralValueのSQL生成

**テストケース**:

| 入力 | データベース | 期待されるSQL |
|------|------------|--------------|
| `{type: 'literal', value: 'hello'}` | PostgreSQL | `'hello'` |
| `{type: 'literal', value: 123}` | すべて | `123` |
| `{type: 'literal', value: null}` | すべて | `NULL` |
| `{type: 'literal', value: true}` | PostgreSQL | `TRUE` |
| `{type: 'literal', value: "O'Brien"}` | すべて | `'O''Brien'` (エスケープ) |

**手順**:
```bash
cargo test test_literal_value_sql
```

---

### 2.3 FunctionCallのSQL生成

**テストケース**:

| 入力 | データベース | 期待されるSQL |
|------|------------|--------------|
| `UPPER(u.name)` | すべて | `UPPER(u.name)` |
| `CONCAT(u.first_name, ' ', u.last_name)` | PostgreSQL | `CONCAT(u.first_name, ' ', u.last_name)` |
| `CONCAT(u.first_name, ' ', u.last_name)` | SQLite | `u.first_name \|\| ' ' \|\| u.last_name` |
| `SUBSTRING(u.name, 1, 3)` | PostgreSQL | `SUBSTRING(u.name, 1, 3)` |

**手順**:
```bash
cargo test test_function_call_sql
```

---

### 2.4 ネストした関数のSQL生成

**テストケース**:

| 入力 | 期待されるSQL |
|------|--------------|
| `UPPER(SUBSTRING(u.name, 1, 3))` | `UPPER(SUBSTRING(u.name, 1, 3))` |
| `COALESCE(UPPER(u.name), 'UNKNOWN')` | `COALESCE(UPPER(u.name), 'UNKNOWN')` |

**手順**:
```bash
cargo test test_nested_function_sql
```

---

### 2.5 BinaryOperationのSQL生成

**テストケース**:

| 入力 | 期待されるSQL |
|------|--------------|
| `price * quantity` | `price * quantity` |
| `first_name \|\| ' ' \|\| last_name` | `first_name \|\| ' ' \|\| last_name` |

**手順**:
```bash
cargo test test_binary_operation_sql
```

---

## 3. フロントエンドUIのテスト

### 3.1 式追加ボタンの表示

**手順**:
1. `npm run tauri:dev`でアプリを起動
2. 接続を選択してクエリビルダーを開く
3. テーブルを選択
4. SELECTタブを開く

**期待結果**:
- 「式を追加」ボタンが表示される
- ボタンがクリック可能

---

### 3.2 式の入力と追加

**手順**:
1. 「式を追加」ボタンをクリック
2. 式入力フィールドに `UPPER(u.name)` と入力
3. エイリアス入力フィールドに `upper_name` と入力
4. 「追加」ボタンをクリック

**期待結果**:
- 選択済みカラムリストに `UPPER(u.name) AS upper_name` が追加される
- SQLプレビューに `UPPER(u.name) AS upper_name` が表示される

---

### 3.3 式の編集

**手順**:
1. 追加済みの式をクリック
2. 式を `LOWER(u.name)` に変更
3. エイリアスを `lower_name` に変更
4. 保存

**期待結果**:
- 式とエイリアスが更新される
- SQLプレビューが更新される

---

### 3.4 式の削除

**手順**:
1. 追加済みの式の「削除」ボタンをクリック

**期待結果**:
- 式が選択済みリストから削除される
- SQLプレビューから削除される

---

## 4. E2Eテスト（実際のクエリ実行）

### 4.1 文字列関数の実行テスト

**手順**:
1. PostgreSQLデータベースに接続
2. usersテーブルを選択
3. 以下の式を追加:
   - `UPPER(name)` AS `upper_name`
   - `LOWER(email)` AS `lower_email`
   - `LENGTH(name)` AS `name_length`
4. クエリを実行

**期待されるSQL**:
```sql
SELECT
  UPPER(name) AS upper_name,
  LOWER(email) AS lower_email,
  LENGTH(name) AS name_length
FROM users
```

**期待結果**:
- クエリが正常に実行される
- 結果テーブルに3つのカラムが表示される
- upper_nameが大文字、lower_emailが小文字になっている
- name_lengthが数値になっている

---

### 4.2 数値演算の実行テスト

**手順**:
1. ordersテーブルを選択
2. 以下の式を追加:
   - `price * quantity` AS `total`
   - `ROUND(price * 1.1, 2)` AS `price_with_tax`
3. クエリを実行

**期待されるSQL**:
```sql
SELECT
  price * quantity AS total,
  ROUND(price * 1.1, 2) AS price_with_tax
FROM orders
```

**期待結果**:
- 計算結果が正しく表示される

---

### 4.3 データベース方言の違いのテスト

**手順**:
1. PostgreSQL、MySQL、SQLiteそれぞれに接続
2. 同じ式 `CONCAT(first_name, ' ', last_name)` を追加
3. 各データベースでクエリを実行

**期待されるSQL**:
- PostgreSQL: `CONCAT(first_name, ' ', last_name)`
- MySQL: `CONCAT(first_name, ' ', last_name)`
- SQLite: `first_name || ' ' || last_name`

**期待結果**:
- すべてのデータベースで正しく実行される
- 結果が同じフォーマットで表示される

---

## 5. リグレッションテスト

### 5.1 既存のカラム選択機能

**手順**:
1. テーブルを選択
2. 通常のカラムをチェックボックスで選択
3. カラムエイリアスを設定
4. クエリを実行

**期待結果**:
- 既存機能が正常に動作する
- SQLプレビューが正しく表示される
- クエリが正常に実行される

---

### 5.2 WHERE句、ORDER BY句との組み合わせ

**手順**:
1. テーブルを選択
2. 式 `UPPER(name)` を追加
3. WHERE条件を追加（例: `id > 10`）
4. ORDER BY を追加（例: `name ASC`）
5. クエリを実行

**期待されるSQL**:
```sql
SELECT
  UPPER(name) AS upper_name
FROM users
WHERE id > 10
ORDER BY name ASC
```

**期待結果**:
- WHERE句、ORDER BY句と正しく組み合わされる
- クエリが正常に実行される

---

## 6. エラーハンドリングのテスト

### 6.1 無効な式の入力

**手順**:
1. 式入力フィールドに `INVALID_FUNCTION(name)` と入力
2. 追加ボタンをクリック
3. クエリを実行

**期待結果**:
- 式は追加されるが、クエリ実行時にエラーが表示される
- エラーメッセージが日本語でわかりやすく表示される

---

### 6.2 空の式の入力

**手順**:
1. 式入力フィールドを空のまま追加ボタンをクリック

**期待結果**:
- バリデーションエラーが表示される
- 追加されない

---

## 7. パフォーマンステスト

### 7.1 複雑な式の生成時間

**手順**:
1. 10個のネストした関数を含む式を作成
2. SQLプレビューの更新時間を測定

**期待結果**:
- 1秒以内にプレビューが更新される

---

## テスト完了チェックリスト

- [ ] 型定義のテストがすべて合格
- [ ] SQL生成ロジックのテストがすべて合格
- [ ] フロントエンドUIのテストがすべて合格
- [ ] E2Eテストがすべて合格
- [ ] リグレッションテストがすべて合格
- [ ] エラーハンドリングが適切に動作
- [ ] パフォーマンステストが合格
- [ ] 3つのデータベース（PostgreSQL, MySQL, SQLite）で動作確認完了

---

## 既知の問題・制限事項

（テスト中に発見された問題をここに記録）

---

## テスト実施記録

| 日付 | テスター | 結果 | 備考 |
|------|---------|------|------|
| | | | |
