# 要件定義書：SQLエディタ起動処理改善

## 背景・課題

SQLエディタを起動すると、テーブル情報（カラム情報）のバックグラウンド取得処理が実行される。
現在の実装はテーブルごとに個別のRustコマンドを呼び出す逐次処理になっており、
AWS RDS ポートフォワード経由など高レイテンシ接続では顕著に遅い。

### 問題の根本原因

`startBackgroundFetch()` がテーブルを1件ずつ逐次処理し、各テーブルごとに `get_columns` Tauriコマンドを呼び出す。

```
テーブル1 → Tauri IPC → Rust → DB接続 → SQLクエリ → DB → 戻り
テーブル2 → Tauri IPC → Rust → DB接続 → SQLクエリ → DB → 戻り
...（N件繰り返し）
```

| 接続環境 | RTT目安 | 100テーブル時の遅延 |
|---------|--------|-----------------|
| ローカル / 同一VPC | < 1ms | < 1秒 |
| AWS RDS ポートフォワード | 50〜200ms | **5〜20秒** |

### 現状の2フェーズ処理フロー

```
Phase 1: get_database_structure_summary（2クエリ、高速）
  → スキーマ一覧 + テーブル名一覧のみ取得

Phase 2: startBackgroundFetch（テーブルN件分のRustコマンド呼び出し）
  → 各テーブルに対して get_columns を逐次呼び出し ← ここが問題
```

Rustバックエンドにはすでにスキーマごとのカラムをバッチ取得する `get_all_columns_in_schema()` 実装が存在するが、
これは `get_tables()` 経由でしか呼ばれておらず、フロントエンドから直接活用できていない。

## 改善目標

- **Phase 2 のネットワーク往復回数をテーブル件数N回 → スキーマ件数M回に削減する**
- 高レイテンシ環境（AWS RDS ポートフォワードなど）でも許容できる速度でカラム情報をロードする
- 既存の `columnCache` 構造や進捗表示UIとの互換性を維持する

## 要件

### 機能要件

1. **新規Rustコマンド `get_columns_by_schema` を追加する**
   - 引数: `connectionId`, `schema`
   - 戻り値: `{ tableName: string → Column[] }` のマップ（テーブル名をキーとしたハッシュマップ）
   - 内部的に既存の `get_all_columns_in_schema()` を呼び出すことで1クエリで完結させる
   - PostgreSQL・MySQL・SQLite それぞれの実装が必要

2. **フロントエンドの `startBackgroundFetch()` を改修する**
   - テーブルごとのループを廃止し、スキーマ単位の一括取得に変更する
   - 取得結果を既存の `columnCache` に格納する
   - 進捗表示は「スキーマ単位」または「テーブル数ベース（一括反映）」に変更する

3. **API層の拡張**
   - `app/api/database-structure.ts` に `getColumnsBySchema()` を追加する

### 非機能要件

- 既存の `get_columns`（テーブル単体のオンデマンド取得）はそのまま残す
- 互換性フォールバック（サマリー失敗時の `fetchDatabaseStructure`）は変更しない
- キャンセル制御（`backgroundFetchTokens`）は引き続き機能させる

## スコープ外

- `get_columns` 単体コマンドの廃止
- SQLite の `get_all_columns_in_schema` 最適化（別途対応でも可）
- インデックス・外部キー情報のバックグラウンド取得（カラムのみ対象）
