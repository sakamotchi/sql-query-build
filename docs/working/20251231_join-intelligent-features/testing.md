# テスト手順書: 6C - JOIN設定インテリジェント機能

**作成日**: 2025-12-31
**最終更新**: 2025-12-31

---

## 1. テスト環境

### 1.1 準備

- [ ] PostgreSQLテストDB（外部キー制約あり）
- [ ] MySQLテストDB（外部キー制約あり）
- [ ] SQLiteテストDB（外部キー制約あり/なし両方）

### 1.2 サンプルデータ

#### PostgreSQL/MySQL

```sql
-- usersテーブル
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

-- ordersテーブル（外部キー制約あり）
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10, 2),
    CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users(id)
);

-- order_itemsテーブル（外部キー制約あり）
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2),
    CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- productsテーブル（外部キーなし、カラム名のみ一致）
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2)
);

-- サンプルデータ挿入
INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com');

INSERT INTO orders (user_id, order_date, total_amount) VALUES
    (1, '2025-01-01', 1500.00),
    (2, '2025-01-02', 3000.00);

INSERT INTO order_items (order_id, product_name, quantity, price) VALUES
    (1, 'Product A', 2, 500.00),
    (1, 'Product B', 1, 500.00),
    (2, 'Product C', 3, 1000.00);

INSERT INTO products (name, price) VALUES
    ('Product A', 500.00),
    ('Product B', 500.00),
    ('Product C', 1000.00);
```

#### SQLite

```sql
-- 外部キー有効化
PRAGMA foreign_keys = ON;

-- 同じテーブル構造（型はSQLite用に調整）
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    total_amount REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ... 以下同様
```

---

## 2. 単体テスト

### 2.1 バックエンド単体テスト

#### 2.1.1 外部キー取得テスト

**対象**: `DatabaseInspector::get_foreign_keys()`

```bash
cd src-tauri
cargo test test_get_foreign_keys -- --nocapture
```

**期待結果**:
- PostgreSQL: `fk_orders_user_id`, `fk_order_items_order_id`が取得される
- MySQL: 同上
- SQLite: 外部キー情報が取得される（または空配列）

#### 2.1.2 JOIN提案エンジンテスト

**対象**: `JoinSuggestionEngine`

```bash
cd src-tauri
cargo test test_suggest_by_foreign_keys -- --nocapture
cargo test test_suggest_by_column_names -- --nocapture
cargo test test_suggest_joins_sorting -- --nocapture
```

**期待結果**:
- 外部キーベースの提案が信頼度1.0で生成される
- カラム名ベースの提案が信頼度0.7-0.8で生成される
- 提案が信頼度順にソートされる

### 2.2 フロントエンド単体テスト

#### 2.2.1 JoinSuggestionItemテスト

```bash
npm run test -- JoinSuggestionItem
```

**期待結果**:
- 信頼度1.0の提案は★★★★★と表示される
- 信頼度0.7の提案は★★★★☆と表示される
- 適用ボタンをクリックするとapplyイベントが発行される

#### 2.2.2 JoinSuggestionListテスト

```bash
npm run test -- JoinSuggestionList
```

**期待結果**:
- 提案が0件の場合、適切なメッセージが表示される
- ローディング中はスピナーが表示される
- 提案が複数ある場合、リスト表示される

---

## 3. 統合テスト（手動操作）

### 3.1 PostgreSQL接続テスト

#### TC-6C-001: 外部キーベースの提案表示

**前提条件**:
- PostgreSQLテストDBに接続済み
- usersテーブルとordersテーブルが存在
- 外部キー制約`fk_orders_user_id`が設定済み

**手順**:
1. クエリビルダーを開く
2. usersテーブルをドラッグ&ドロップで選択
3. JOINタブを開く
4. 「+ JOIN追加」ボタンをクリック
5. JoinConfigDialogが開く
6. テーブル選択ドロップダウンから「orders」を選択

**期待結果**:
- 「おすすめのJOIN条件」セクションが表示される
- 以下の提案が表示される:
  - ★★★★★ 外部キー制約 'fk_orders_user_id' に基づく
  - LEFT JOIN orders ON users.id = orders.user_id
- 「適用」ボタンが表示される

#### TC-6C-002: 提案の適用

**前提条件**: TC-6C-001の続き

**手順**:
1. 提案の「適用」ボタンをクリック

**期待結果**:
- ON条件欄に「users.id = orders.user_id」が設定される
- JOINタイプが「LEFT JOIN」に設定される
- ユーザーが手動で条件を編集できる

#### TC-6C-003: 複数テーブルのJOIN提案

**前提条件**:
- users、orders、order_itemsテーブルが選択済み
- users→ordersのJOINが既に設定されている

**手順**:
1. 「+ JOIN追加」ボタンをクリック
2. テーブル選択から「order_items」を選択

**期待結果**:
- 「おすすめのJOIN条件」に以下が表示される:
  - ★★★★★ 外部キー制約 'fk_order_items_order_id' に基づく
  - LEFT JOIN order_items ON orders.id = order_items.order_id

### 3.2 MySQL接続テスト

#### TC-6C-004: MySQL外部キー提案

**手順**: TC-6C-001〜003と同じ

**期待結果**: PostgreSQLと同じ提案が表示される

### 3.3 SQLite接続テスト

#### TC-6C-005: SQLite外部キー提案

**前提条件**: `PRAGMA foreign_keys = ON`が設定されたSQLiteDB

**手順**: TC-6C-001と同じ

**期待結果**:
- 外部キー制約がある場合、PostgreSQL/MySQLと同様の提案が表示される
- 制約名は`fk_orders_users_0`のような自動生成名

#### TC-6C-006: SQLiteカラム名ベース提案

**前提条件**:
- 外部キー制約がないSQLiteDB
- usersテーブル（id列あり）とordersテーブル（user_id列あり）が存在

**手順**: TC-6C-001と同じ

**期待結果**:
- 「おすすめのJOIN条件」に以下が表示される:
  - ★★★★☆ カラム名パターン: 'orders.user_id' → 'users.id'
  - LEFT JOIN users ON orders.user_id = users.id

### 3.4 提案なしのケース

#### TC-6C-007: 関連のないテーブル間のJOIN

**前提条件**:
- usersテーブルとproductsテーブルが選択済み
- 外部キー制約なし、カラム名も一致なし

**手順**:
1. 「+ JOIN追加」ボタンをクリック
2. テーブル選択から「products」を選択

**期待結果**:
- 「おすすめのJOIN条件」セクションが表示される
- 「JOIN条件の提案が見つかりませんでした。手動で条件を設定してください。」と表示される
- 手動でON条件を設定できる

---

## 4. パフォーマンステスト

### 4.1 外部キー取得時間

**対象**: `get_foreign_keys`コマンド

**手順**:
1. 100テーブル以上のDBに接続
2. 外部キー情報を取得
3. 取得時間を計測

**期待結果**: 5秒以内に完了

### 4.2 JOIN提案生成時間

**対象**: `get_join_suggestions`コマンド

**手順**:
1. 10テーブルが選択されている状態
2. JOIN提案を取得
3. 生成時間を計測

**期待結果**: 1秒以内に完了

---

## 5. E2Eテスト（操作手順確認）

### 5.1 基本フロー

#### E2E-6C-001: PostgreSQLで外部キーベースJOINを構築

**シナリオ**: ユーザーとその注文を結合するクエリを作成

**手順**:
1. アプリ起動
2. PostgreSQLテストDBに接続
3. クエリビルダーを開く
4. usersテーブルをドラッグ&ドロップで選択
5. SELECTタブで`users.name`, `users.email`を選択
6. JOINタブを開く
7. 「+ JOIN追加」ボタンをクリック
8. テーブル選択から「orders」を選択
9. 提案「★★★★★ 外部キー制約 'fk_orders_user_id' に基づく」の「適用」ボタンをクリック
10. 「保存」ボタンをクリック
11. SELECTタブで`orders.order_date`, `orders.total_amount`を選択
12. 「実行」ボタンをクリック

**期待結果**:
- JOIN一覧に「LEFT JOIN orders ON users.id = orders.user_id」が表示される
- 生成されたSQLは:
  ```sql
  SELECT users.name, users.email, orders.order_date, orders.total_amount
  FROM users
  LEFT JOIN orders ON users.id = orders.user_id
  ```
- 結果テーブルにユーザーと注文データが表示される

#### E2E-6C-002: 複数JOINのクエリ構築

**シナリオ**: ユーザー→注文→注文明細を結合

**手順**:
1. E2E-6C-001の続き
2. 「+ JOIN追加」ボタンをクリック
3. テーブル選択から「order_items」を選択
4. 提案「★★★★★ 外部キー制約 'fk_order_items_order_id' に基づく」の「適用」ボタンをクリック
5. 「保存」ボタンをクリック
6. SELECTタブで`order_items.product_name`, `order_items.quantity`を選択
7. 「実行」ボタンをクリック

**期待結果**:
- JOIN一覧に2つのJOINが表示される
- 生成されたSQLは:
  ```sql
  SELECT
    users.name,
    users.email,
    orders.order_date,
    orders.total_amount,
    order_items.product_name,
    order_items.quantity
  FROM users
  LEFT JOIN orders ON users.id = orders.user_id
  LEFT JOIN order_items ON orders.id = order_items.order_id
  ```
- 結果テーブルに注文明細まで含まれたデータが表示される

#### E2E-6C-003: カラム名ベース提案の活用（SQLite）

**シナリオ**: 外部キーのないSQLiteDBでカラム名から提案を利用

**手順**:
1. 外部キー制約なしのSQLiteDBに接続
2. ordersテーブルを選択
3. JOINタブで「+ JOIN追加」をクリック
4. テーブル選択から「users」を選択
5. 提案「★★★★☆ カラム名パターン: 'orders.user_id' → 'users.id'」の「適用」ボタンをクリック
6. 「保存」ボタンをクリック
7. 「実行」ボタンをクリック

**期待結果**:
- カラム名ベースの提案が表示される
- JOINが正しく設定される
- クエリが正常に実行される

---

## 6. エッジケーステスト

### 6.1 同一テーブル間の自己JOIN提案

#### TC-6C-008: 自己JOIN提案

**前提条件**:
- employeesテーブルに`manager_id`カラムが存在
- `manager_id`から`id`への外部キー制約が設定されている

**手順**:
1. クエリビルダーでemployeesテーブルを選択
2. 同じemployeesテーブルを異なるエイリアス（e1, e2）で2回追加
3. 「+ JOIN追加」ボタンをクリック
4. テーブル選択から「employees (e2)」を選択

**期待結果**:
- 「おすすめのJOIN条件」に以下が表示される:
  - ★★★★★ 外部キー制約 'fk_employees_manager_id' に基づく
  - LEFT JOIN employees e2 ON e1.manager_id = e2.id

### 6.2 複合外部キーの提案

#### TC-6C-009: 複合外部キー提案

**前提条件**:
- order_itemsテーブルに`(tenant_id, order_id)`の複合外部キーが設定されている
- ordersテーブルに`(tenant_id, id)`への参照がある

**手順**:
1. クエリビルダーでordersテーブルを選択
2. 「+ JOIN追加」ボタンをクリック
3. テーブル選択から「order_items」を選択

**期待結果**:
- 「おすすめのJOIN条件」に複数条件のJOINが表示される:
  - ★★★★★ 外部キー制約 'fk_order_items_order' に基づく
  - LEFT JOIN order_items ON orders.tenant_id = order_items.tenant_id AND orders.id = order_items.order_id

### 6.3 循環参照の処理

#### TC-6C-010: 循環参照テーブルの提案

**前提条件**:
- A→B、B→C、C→Aの循環参照がある

**手順**:
1. クエリビルダーでテーブルAを選択
2. 「+ JOIN追加」でテーブルBを追加
3. さらに「+ JOIN追加」でテーブルCを追加
4. さらに「+ JOIN追加」でテーブルAを追加（循環）

**期待結果**:
- アプリがクラッシュしない
- 適切なJOIN提案が表示される
- 無限ループにならない

### 6.4 大量テーブルのパフォーマンステスト

#### TC-6C-011: 100テーブル以上のDB

**前提条件**:
- 100テーブル以上のデータベースに接続

**手順**:
1. 外部キー情報を取得（バックグラウンドで実行）
2. 2つのテーブル間のJOIN提案を取得
3. 取得時間を計測

**期待結果**:
- 外部キー情報の取得が5秒以内に完了する
- JOIN提案の生成が1秒以内に完了する

---

## 7. エラーケーステスト

### 6.1 データベース接続エラー

**手順**:
1. DB接続を切断
2. JOINタブで「+ JOIN追加」をクリック
3. テーブルを選択

**期待結果**:
- エラーメッセージが表示される
- 「提案の取得に失敗しました」などのメッセージ
- 手動でON条件を設定できる

### 6.2 外部キー取得失敗

**手順**:
1. 権限のないユーザーでDB接続
2. 外部キー情報を取得しようとする

**期待結果**:
- 提案セクションに「提案が見つかりませんでした」と表示される
- 手動でON条件を設定できる
- アプリがクラッシュしない

### 7.3 パーミッションエラー

**手順**:
1. `information_schema`への読み取り権限のないユーザーでDB接続
2. JOINタブで「+ JOIN追加」をクリック
3. テーブルを選択

**期待結果**:
- エラーメッセージが表示される（「提案の取得に失敗しました」など）
- 提案セクションに「提案が見つかりませんでした」と表示される
- 手動でON条件を設定できる
- アプリがクラッシュしない

---

## 8. テストコードによる自動テスト

### 7.1 テストコード実行

```bash
# バックエンド
cd src-tauri
cargo test

# フロントエンド
npm run test:run
```

### 7.2 カバレッジ目標

- バックエンド: 80%以上
- フロントエンド: 70%以上

---

## 9. 受け入れテストチェックリスト

### 機能要件
- [ ] 外部キー制約からJOIN条件が自動提案される（PostgreSQL）
- [ ] 外部キー制約からJOIN条件が自動提案される（MySQL）
- [ ] 外部キー制約からJOIN条件が自動提案される（SQLite）
- [ ] カラム名からJOIN条件が提案される（外部キーなしの場合）
- [ ] 提案をワンクリックで適用できる
- [ ] 適用後、手動で条件を編集できる
- [ ] 提案が信頼度順に表示される
- [ ] 提案理由が明示される

### 非機能要件
- [ ] 外部キー取得が5秒以内に完了する
- [ ] JOIN提案生成が1秒以内に完了する（10テーブル以下）
- [ ] 提案がない場合でもエラーなく動作する
- [ ] DB接続エラー時にクラッシュしない

### ユーザビリティ
- [ ] 提案UIが直感的で理解しやすい
- [ ] 星マークで信頼度が視覚的にわかる
- [ ] 提案理由が初心者でも理解できる
- [ ] ローディング状態が適切に表示される

### エッジケース
- [ ] 同一テーブル間の自己JOINが提案される（TC-6C-008）
- [ ] 複合外部キーの提案が正しく生成される（TC-6C-009）
- [ ] 循環参照があってもクラッシュしない（TC-6C-010）
- [ ] 大量テーブルでもパフォーマンス基準を満たす（TC-6C-011）

---

## 10. バグ管理

### 発見されたバグ

| バグID | 内容 | 重要度 | 状態 | 発見日 | 修正日 |
|-------|------|--------|------|--------|--------|
| - | - | - | - | - | - |

---

## 11. テスト完了条件

- [ ] 全ての単体テストがパスする
- [ ] 全ての統合テストがパスする
- [ ] E2Eテストが全て成功する
- [ ] パフォーマンステストが基準を満たす
- [ ] 受け入れテストチェックリストが全てチェック済み
- [ ] 重大なバグがゼロ
- [ ] ドキュメントが更新されている
