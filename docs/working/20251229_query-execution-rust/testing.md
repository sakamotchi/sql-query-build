# テスト手順書: クエリ実行基盤（Rust）

## 概要

クエリ実行基盤の動作確認方法を記載する。
操作で確認できる項目は手動テストで、確認が困難な項目はユニットテストで対応する。

## テスト環境準備

### 1. テスト用データベースの準備

各データベースにテスト用のテーブルを作成しておく。

#### PostgreSQL

```sql
CREATE TABLE test_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    age INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_users (name, email, age) VALUES
('Alice', 'alice@example.com', 25),
('Bob', 'bob@example.com', 30),
('Charlie', NULL, 35);
```

#### MySQL

```sql
CREATE TABLE test_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    age INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_users (name, email, age) VALUES
('Alice', 'alice@example.com', 25),
('Bob', 'bob@example.com', 30),
('Charlie', NULL, 35);
```

#### SQLite

```sql
CREATE TABLE test_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    age INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_users (name, email, age) VALUES
('Alice', 'alice@example.com', 25),
('Bob', 'bob@example.com', 30),
('Charlie', NULL, 35);
```

---

## 手動テスト

### MT-1: 基本的なSELECT実行

**目的**: 生成されたSQLが正常に実行され、結果が表示されること

**事前条件**:
- アプリケーションが起動している
- テスト用の接続が設定されている
- テスト用テーブル（test_users）が存在する

**手順**:
1. 接続一覧から対象の接続を選択
2. クエリビルダーでtest_usersテーブルを選択
3. カラムを選択（id, name, email）
4. 「実行」ボタンをクリック

**期待結果**:
- [ ] 結果パネルに3行のデータが表示される
- [ ] カラム名（id, name, email）がヘッダーに表示される
- [ ] 実行時間が表示される

**PostgreSQL / MySQL / SQLite それぞれで確認**:
- [ ] PostgreSQL: 正常に実行
- [ ] MySQL: 正常に実行
- [ ] SQLite: 正常に実行

---

### MT-2: NULL値の表示

**目的**: NULL値が適切に表示されること

**手順**:
1. test_usersテーブルを選択
2. emailカラムを選択
3. 実行

**期待結果**:
- [ ] Charlieの行でemailがNULLとして表示される（空文字列ではない）

---

### MT-3: WHERE条件付きクエリ

**目的**: 条件付きクエリが正常に実行されること

**手順**:
1. test_usersテーブルを選択
2. 全カラムを選択
3. WHERE条件を追加: age > 28
4. 実行

**期待結果**:
- [ ] 2行のデータが表示される（Bob, Charlie）
- [ ] Aliceのデータは表示されない

---

### MT-4: エラーハンドリング

**目的**: 構文エラー時に適切なエラーメッセージが表示されること

**手順**:
1. SQLプレビューを手動で編集可能な場合、不正なSQLを入力
   （または、存在しないテーブル名を指定）
2. 実行

**期待結果**:
- [ ] エラーメッセージが表示される
- [ ] アプリケーションがクラッシュしない

---

### MT-5: タイムアウト動作

**目的**: 長時間クエリがタイムアウトすること

**事前条件**: PostgreSQLまたはMySQLを使用

**手順**:
1. タイムアウト設定を短く設定（例: 5秒）
2. 長時間かかるクエリを実行
   - PostgreSQL: `SELECT pg_sleep(30)`
   - MySQL: `SELECT SLEEP(30)`
3. 待機

**期待結果**:
- [ ] 設定した時間後にタイムアウトエラーが表示される
- [ ] 「Query timed out」のようなメッセージが表示される

---

### MT-6: キャンセル動作

**目的**: 実行中のクエリをキャンセルできること

**手順**:
1. 長時間かかるクエリを実行
2. 実行中に「キャンセル」ボタンをクリック

**期待結果**:
- [ ] クエリがキャンセルされる
- [ ] 「Query was cancelled」のようなメッセージが表示される
- [ ] UIが応答可能な状態に戻る

---

### MT-7: 大量データの取得

**目的**: 多くの行があるテーブルからデータを取得できること

**事前条件**: 1000行以上のデータがあるテーブルを用意

**手順**:
1. 大量データのあるテーブルを選択
2. LIMIT 100を設定
3. 実行

**期待結果**:
- [ ] 100行のデータが表示される
- [ ] メモリ使用量が異常に増加しない
- [ ] UIがフリーズしない

---

## ユニットテスト

### UT-1: QueryResult型のシリアライズ

```rust
#[test]
fn test_query_result_serialization() {
    let result = QueryResult {
        columns: vec![
            QueryResultColumn {
                name: "id".to_string(),
                data_type: "INT4".to_string(),
                nullable: false,
            },
        ],
        rows: vec![
            QueryResultRow {
                values: vec![QueryValue::Int(1)],
            },
        ],
        row_count: 1,
        execution_time_ms: 10,
        warnings: vec![],
    };

    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("\"name\":\"id\""));
    assert!(json.contains("\"rowCount\":1"));
}
```

### UT-2: QueryError型のシリアライズ

```rust
#[test]
fn test_query_error_serialization() {
    let error = QueryError {
        code: QueryErrorCode::SyntaxError,
        message: "Syntax error".to_string(),
        details: None,
    };

    let json = serde_json::to_string(&error).unwrap();
    assert!(json.contains("\"code\":\"syntax_error\""));
}
```

### UT-3: QueryValue型のバリエーション

```rust
#[test]
fn test_query_value_variants() {
    // Null
    let null_json = serde_json::to_string(&QueryValue::Null).unwrap();
    assert_eq!(null_json, "null");

    // Int
    let int_json = serde_json::to_string(&QueryValue::Int(42)).unwrap();
    assert_eq!(int_json, "42");

    // String
    let str_json = serde_json::to_string(&QueryValue::String("hello".to_string())).unwrap();
    assert_eq!(str_json, "\"hello\"");

    // Bool
    let bool_json = serde_json::to_string(&QueryValue::Bool(true)).unwrap();
    assert_eq!(bool_json, "true");

    // Float
    let float_json = serde_json::to_string(&QueryValue::Float(3.14)).unwrap();
    assert!(float_json.contains("3.14"));
}
```

### UT-4: ConnectionPoolManagerの基本動作

```rust
#[tokio::test]
async fn test_connection_pool_manager_caching() {
    let manager = ConnectionPoolManager::new();

    // モック用のテスト（実際のDB接続なし）
    // 同じconnection_idで複数回呼び出しても同じExecutorを返すことを確認
    // 詳細は実装時に記述
}
```

### UT-5: QueryCancellationManagerの動作

```rust
#[tokio::test]
async fn test_cancellation_token_management() {
    let manager = QueryCancellationManager::new();

    // トークン作成
    let (query_id, token) = manager.create_token().await;
    assert!(!token.is_cancelled());

    // キャンセル
    let cancelled = manager.cancel(&query_id).await;
    assert!(cancelled);
    assert!(token.is_cancelled());

    // 存在しないIDのキャンセル
    let not_found = manager.cancel("nonexistent").await;
    assert!(!not_found);
}
```

---

## 統合テスト（CI環境外）

### IT-1: PostgreSQL接続テスト

```rust
#[tokio::test]
#[ignore = "requires PostgreSQL connection"]
async fn test_postgres_executor_integration() {
    let connection = /* テスト用接続情報 */;
    let executor = PostgresExecutor::new(&connection, Some("password")).await.unwrap();

    let result = executor.execute("SELECT 1 as num").await.unwrap();

    assert_eq!(result.row_count, 1);
    assert_eq!(result.columns[0].name, "num");
}
```

### IT-2: MySQL接続テスト

```rust
#[tokio::test]
#[ignore = "requires MySQL connection"]
async fn test_mysql_executor_integration() {
    // 同様のテスト
}
```

### IT-3: SQLite接続テスト

```rust
#[tokio::test]
#[ignore = "requires SQLite file"]
async fn test_sqlite_executor_integration() {
    // 同様のテスト
}
```

---

## テスト実行コマンド

```bash
# ユニットテストのみ実行
cd src-tauri && cargo test

# 特定のテストを実行
cd src-tauri && cargo test test_query_result

# 統合テストを含めて実行（DB接続が必要）
cd src-tauri && cargo test -- --ignored
```

---

## チェックリスト

### 実装完了時の確認

- [ ] 全ユニットテストがパス
- [ ] PostgreSQLで手動テストMT-1〜MT-7完了
- [ ] MySQLで手動テストMT-1〜MT-7完了
- [ ] SQLiteで手動テストMT-1〜MT-7完了
- [ ] cargo clippyで警告なし
- [ ] cargo fmtで整形済み
