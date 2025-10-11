# ストレージAPI

ファイルストレージモジュールは、アプリケーションのデータを永続化するためのAPI を提供します。

## 概要

- データはJSONファイルとして保存されます
- OS別のアプリケーションデータディレクトリに保存されます
  - Windows: `%APPDATA%\sql-query-builder\`
  - macOS: `~/Library/Application Support/sql-query-builder/`
  - Linux: `~/.local/share/sql-query-builder/`

## TypeScript API

### storageWrite

データをストレージに書き込みます。

```typescript
import { storageWrite } from '@/utils/storage'

await storageWrite('my-key', { name: 'test', value: 42 })
```

### storageRead

ストレージからデータを読み込みます。

```typescript
import { storageRead } from '@/utils/storage'

const data = await storageRead<{ name: string; value: number }>('my-key')
```

### storageDelete

ストレージからデータを削除します。

```typescript
import { storageDelete } from '@/utils/storage'

await storageDelete('my-key')
```

### storageListKeys

ストレージ内の全てのキーを取得します。

```typescript
import { storageListKeys } from '@/utils/storage'

const keys = await storageListKeys()
console.log(keys) // ['key1', 'key2', ...]
```

### storageExists

データが存在するかチェックします。

```typescript
import { storageExists } from '@/utils/storage'

const exists = await storageExists('my-key')
console.log(exists) // true or false
```

## Rust API

### FileStorage

ファイルストレージの実装です。

```rust
use sql_query_build::storage::{FileStorage, PathManager};

// PathManagerを初期化
let path_manager = PathManager::new().unwrap();

// FileStorageを初期化
let storage = FileStorage::new(path_manager.data_dir()).unwrap();

// データを書き込む
#[derive(Serialize, Deserialize)]
struct MyData {
    name: String,
    value: i32,
}

let data = MyData {
    name: "test".to_string(),
    value: 42,
};

storage.write("my-key", &data).unwrap();

// データを読み込む
let read_data: MyData = storage.read("my-key").unwrap();

// データを削除する
storage.delete("my-key").unwrap();

// 全てのキーを取得する
let keys = storage.list_keys().unwrap();

// データが存在するかチェック
let exists = storage.exists("my-key");
```

### PathManager

アプリケーションデータディレクトリを管理します。

```rust
use sql_query_build::storage::PathManager;

let path_manager = PathManager::new().unwrap();

// 各種ディレクトリパスを取得
let data_dir = path_manager.data_dir();
let connections_dir = path_manager.connections_dir();
let queries_dir = path_manager.queries_dir();
let saved_queries_dir = path_manager.saved_queries_dir();
let history_dir = path_manager.history_dir();
let settings_dir = path_manager.settings_dir();
let logs_dir = path_manager.logs_dir();
let audit_logs_dir = path_manager.audit_logs_dir();

// 全ての必要なディレクトリを初期化
path_manager.initialize_directories().unwrap();
```

## エラーハンドリング

ストレージ操作は失敗する可能性があります。エラーは適切に処理してください。

### TypeScript

```typescript
import { storageRead } from '@/utils/storage'

try {
  const data = await storageRead('my-key')
  console.log(data)
} catch (error) {
  console.error('Failed to read data:', error)
}
```

### Rust

```rust
use sql_query_build::storage::{FileStorage, StorageError};

match storage.read::<MyData>("my-key") {
    Ok(data) => println!("Data: {:?}", data),
    Err(StorageError::NotFound(key)) => {
        println!("Data not found: {}", key)
    }
    Err(e) => {
        eprintln!("Error: {}", e)
    }
}
```

## セキュリティ考慮事項

1. **ファイルパーミッション**: ファイルは所有者のみ読み書き可能に設定されます
2. **パストラバーサル対策**: キーのバリデーションにより危険な文字列を拒否
3. **排他制御**: RwLockによる読み書きの排他制御

## テスト

### Rustテスト

```bash
cd src-tauri
cargo test
```

### TypeScriptテスト

```bash
npm run test
```
