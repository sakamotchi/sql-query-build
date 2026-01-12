# Docker Database Environment

ベンチマーク用およびデモ用のPostgreSQL・MySQLデータベース環境です。

## クイックスタート

### 1. 起動

```bash
cd docker
docker-compose up -d
```

### 2. 状態確認

```bash
docker-compose ps
```

### 3. ログ確認

```bash
# 全サービスのログ
docker-compose logs -f

# PostgreSQLのみ
docker-compose logs -f postgres-benchmark

# MySQLのみ
docker-compose logs -f mysql-benchmark
```

### 4. 停止

```bash
docker-compose down
```

### 5. データも削除して完全にクリーン

```bash
docker-compose down -v
```

## 接続情報

### PostgreSQL

| 項目 | 値 |
|-----|-----|
| ホスト | localhost |
| ポート | 5433 |
| ユーザー | benchmark |
| パスワード | benchmark |
| データベース | postgres |

**接続文字列**:
```
postgresql://benchmark:benchmark@localhost:5433/postgres
```

#### データベース一覧
- `demo_ecommerce` - **ECサイトスキーマ（デモ・スクリーンショット用）** - 14テーブル、外部キーリレーションあり
- `benchmark_small` - 10テーブル（小規模）
- `benchmark_medium` - 100テーブル（中規模）
- `benchmark_large` - 500テーブル（大規模）

### MySQL

| 項目 | 値 |
|-----|-----|
| ホスト | localhost |
| ポート | 3307 |
| ユーザー | benchmark |
| パスワード | benchmark |
| データベース | benchmark_small |

**接続文字列**:
```
mysql://benchmark:benchmark@localhost:3307/benchmark_small
```

#### データベース一覧
- `demo_ecommerce` - **ECサイトスキーマ（デモ・スクリーンショット用）** - 14テーブル、外部キーリレーションあり
- `benchmark_small` - 10テーブル（小規模）
- `benchmark_medium` - 100テーブル（中規模）
- `benchmark_large` - 500テーブル（大規模）

## デモ用データベース（スクリーンショット撮影用）

`demo_ecommerce` データベースはECサイトをモデルにしたスキーマで、外部キーによるリレーションが豊富に設定されています。クエリビルダー画面でテーブル間のリレーションを視覚的に確認できます。

### テーブル構成

| テーブル名 | 説明 | リレーション |
|-----------|------|-------------|
| `categories` | 商品カテゴリ | 自己参照（親子関係） |
| `brands` | ブランド | - |
| `products` | 商品 | → categories, brands |
| `product_images` | 商品画像 | → products |
| `users` | ユーザー | - |
| `addresses` | 配送先住所 | → users |
| `order_statuses` | 注文ステータス | - |
| `orders` | 注文 | → users, order_statuses, addresses |
| `order_items` | 注文明細 | → orders, products |
| `reviews` | 商品レビュー | → products, users |
| `carts` | ショッピングカート | → users |
| `cart_items` | カートアイテム | → carts, products |
| `favorites` | お気に入り商品 | → users, products |

### 接続方法

**PostgreSQL**:
```
postgresql://benchmark:benchmark@localhost:5433/demo_ecommerce
```

**MySQL**:
```
mysql://benchmark:benchmark@localhost:3307/demo_ecommerce
```

## SQLスクリプトの配置

### PostgreSQL

`postgresql/init/` ディレクトリに `.sql` ファイルを配置すると、コンテナ起動時に自動実行されます。

ファイル名の昇順で実行されるため、以下の命名規則を推奨：

```
postgresql/init/
├── 01-create-small.sql
├── 02-create-medium.sql
└── 03-create-large.sql
```

### MySQL

`mysql/init/` ディレクトリに `.sql` ファイルを配置すると、コンテナ起動時に自動実行されます。

```
mysql/init/
├── 01-create-small.sql
├── 02-create-medium.sql
└── 03-create-large.sql
```

## SQLスクリプトの例

各 `init` ディレクトリにベンチマーク用のテーブルを生成するSQLを配置してください。

### PostgreSQL（例: 01-create-small.sql）

```sql
-- 小規模ベンチマークDB（10テーブル）
CREATE DATABASE benchmark_small;
\c benchmark_small;

-- 10テーブルを生成
DO $$
BEGIN
  FOR i IN 1..10 LOOP
    EXECUTE format('
      CREATE TABLE table_%s (
        id SERIAL PRIMARY KEY,
        col_1 VARCHAR(100),
        col_2 VARCHAR(100),
        col_3 VARCHAR(100),
        col_4 VARCHAR(100),
        col_5 VARCHAR(100),
        col_6 VARCHAR(100),
        col_7 VARCHAR(100),
        col_8 VARCHAR(100),
        col_9 VARCHAR(100),
        col_10 VARCHAR(100)
      );

      CREATE INDEX idx_%s_1 ON table_%s(col_1);
      CREATE INDEX idx_%s_2 ON table_%s(col_2);
    ', i, i, i, i, i);
  END LOOP;
END $$;
```

## トラブルシューティング

### ポートが既に使用されている

別のPostgreSQL/MySQLが起動している場合、ポート競合が発生します。

**解決策1**: 既存のDBを停止
```bash
# macOSの場合
brew services stop postgresql
brew services stop mysql
```

**解決策2**: `docker-compose.yml` のポートを変更
```yaml
ports:
  - "5434:5432"  # 5433 → 5434 に変更
```

### データベースが作成されない

初回起動時のみ `init/` のスクリプトが実行されます。再実行したい場合：

```bash
# ボリュームを削除して再作成
docker-compose down -v
docker-compose up -d
```

### ヘルスチェックが失敗し続ける

```bash
# コンテナのログを確認
docker-compose logs mysql-benchmark

# 手動で接続確認
docker exec -it sql-editor-mysql-benchmark mysql -ubenchmark -pbenchmark
```

## SQLite

SQLiteはローカルファイルなので、Dockerは不要です。

ベンチマーク用のSQLiteデータベースは `docker/sqlite/` に配置することを推奨：

```
docker/sqlite/
├── benchmark-small.db
├── benchmark-medium.db
└── benchmark-large.db
```

生成スクリプト例：

```bash
cd docker/sqlite
sqlite3 benchmark-small.db < create-small.sql
```

## ベンチマーク実行時の注意

1. **Docker Desktop を起動**しておく
2. **コンテナが起動中**であることを確認（`docker-compose ps`）
3. **ヘルスチェックが成功**していることを確認（`healthy` 状態）
4. アプリからベンチマークDB接続を作成
   - PostgreSQL: `localhost:5433`
   - MySQL: `localhost:3307`

## メンテナンス

### データボリュームの削除

ディスク容量を節約したい場合：

```bash
docker-compose down -v
```

### イメージの更新

```bash
docker-compose pull
docker-compose up -d
```
