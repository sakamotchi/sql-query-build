# テスト手順書 - テストコード追加

## 概要

このドキュメントでは、テストコード追加作業の検証手順を記載します。
新規追加したテストが正しく動作することを確認します。

## 前提条件

- Node.js がインストールされていること
- Rust / Cargo がインストールされていること
- 依存パッケージがインストール済み（`npm install`）

## 自動テスト

### フロントエンド テスト実行

```bash
# 全テスト実行（一回のみ）
npm run test:run

# watchモードで実行（開発中）
npm run test
```

**期待結果:**
- 全テストがパスすること
- 新規追加したテストファイルが認識されていること

### バックエンド テスト実行

```bash
# Rustテスト実行
cd src-tauri && cargo test

# 特定モジュールのテスト実行
cd src-tauri && cargo test sql_generator

# 詳細出力付き
cd src-tauri && cargo test -- --nocapture
```

**期待結果:**
- 全テストがパスすること
- 新規追加したテストが認識されていること

### 型チェック

```bash
# フロントエンド型チェック
npm run typecheck

# バックエンド型チェック
cd src-tauri && cargo check
```

**期待結果:**
- 型エラーがないこと

## テスト追加後の確認チェックリスト

### バックエンド SQL Generator

| テスト対象 | 確認項目 | 確認結果 |
|-----------|---------|---------|
| builder.rs | 基本的なSELECT文が生成される | [ ] OK / NG |
| builder.rs | 複合クエリ（JOIN, WHERE, ORDER BY）が生成される | [ ] OK / NG |
| clause/select.rs | カラム選択が正しく生成される | [ ] OK / NG |
| clause/from.rs | テーブル指定が正しく生成される | [ ] OK / NG |
| clause/where_clause.rs | 条件句が正しく生成される | [ ] OK / NG |
| clause/join.rs | JOIN句が正しく生成される | [ ] OK / NG |
| clause/order_by.rs | ORDER BY句が正しく生成される | [ ] OK / NG |
| clause/group_by.rs | GROUP BY句が正しく生成される | [ ] OK / NG |
| clause/limit.rs | LIMIT句が正しく生成される | [ ] OK / NG |
| dialects/mysql.rs | MySQL固有の構文が正しい | [ ] OK / NG |
| dialects/postgres.rs | PostgreSQL固有の構文が正しい | [ ] OK / NG |
| dialects/sqlite.rs | SQLite固有の構文が正しい | [ ] OK / NG |

### バックエンド Commands

| テスト対象 | 確認項目 | 確認結果 |
|-----------|---------|---------|
| query.rs | クエリ生成コマンドが動作する | [ ] OK / NG |
| database_structure.rs | DB構造取得コマンドが動作する | [ ] OK / NG |
| security.rs | セキュリティコマンドが動作する | [ ] OK / NG |

### フロントエンド Stores

| テスト対象 | 確認項目 | 確認結果 |
|-----------|---------|---------|
| query-builder.ts | 初期状態が正しい | [ ] OK / NG |
| query-builder.ts | テーブル追加/削除が動作する | [ ] OK / NG |
| query-builder.ts | カラム選択が動作する | [ ] OK / NG |
| database-structure.ts | DB構造の取得が動作する | [ ] OK / NG |
| database-structure.ts | 構造のキャッシュが動作する | [ ] OK / NG |

### フロントエンド Utils

| テスト対象 | 確認項目 | 確認結果 |
|-----------|---------|---------|
| query-converter.ts | クエリ変換が正しく動作する | [ ] OK / NG |
| query-converter.ts | エッジケースが処理される | [ ] OK / NG |

### フロントエンド API

| テスト対象 | 確認項目 | 確認結果 |
|-----------|---------|---------|
| database-structure.ts | Tauri invokeが正しく呼ばれる | [ ] OK / NG |
| query.ts | Tauri invokeが正しく呼ばれる | [ ] OK / NG |

### フロントエンド Composables

| テスト対象 | 確認項目 | 確認結果 |
|-----------|---------|---------|
| useProviderChangeDialog.ts | ダイアログ状態管理が動作する | [ ] OK / NG |
| useProviderSwitch.ts | プロバイダー切り替えが動作する | [ ] OK / NG |
| useTableSelection.ts | テーブル選択が動作する | [ ] OK / NG |

## 回帰テスト

既存機能への影響がないことを確認します。

```bash
# 全テスト実行
npm run test:run
cd src-tauri && cargo test
```

- [ ] 既存のフロントエンドテストが全てパスする
- [ ] 既存のバックエンドテストが全てパスする
- [ ] `npm run typecheck` がエラーなく完了する
- [ ] `cargo check` がエラーなく完了する

## エッジケース

| ケース | 期待動作 | 確認結果 |
|--------|---------|---------|
| 空のテーブル選択 | エラーまたは空のクエリ | [ ] OK / NG |
| 特殊文字を含むカラム名 | 適切にエスケープされる | [ ] OK / NG |
| 大量のカラム選択 | パフォーマンス問題なし | [ ] OK / NG |
