# フェーズ5: エクスポート機能 - テスト手順書

**作成日**: 2025-12-30
**テスト方針**: 可能な限り操作手順で確認。操作で確認できない項目のみテストコードで補完。

## 1. 事前準備

### 1.1 環境セットアップ
- [ ] Tauriアプリが起動できる（`npm run tauri:dev`）
- [ ] テスト用データベース接続が設定済み
- [ ] クエリ実行が正常に動作する

### 1.2 テストデータ準備

以下のSQLを実行してテストデータを作成：

```sql
-- テスト用テーブル作成
CREATE TABLE export_test (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  age INTEGER,
  created_at TIMESTAMP,
  description TEXT
);

-- テストデータ挿入
INSERT INTO export_test VALUES
  (1, 'Alice', 'alice@example.com', 25, '2024-01-01 10:00:00', 'Test user 1'),
  (2, 'Bob', 'bob@example.com', 30, '2024-01-02 11:00:00', 'Test user 2'),
  (3, 'Charlie', NULL, 28, '2024-01-03 12:00:00', NULL),
  (4, 'David', 'david@example.com', NULL, '2024-01-04 13:00:00', 'Description with
newline'),
  (5, 'Eve', 'eve@example.com', 35, '2024-01-05 14:00:00', 'Description, with, commas');
```

## 2. 基本機能テスト

### 2.1 CSVエクスポート

#### 2.1.1 基本的なCSVエクスポート
1. クエリビルダーで`SELECT * FROM export_test`を実行
2. 結果が表示されることを確認
3. 右上の"Export"ボタンをクリック
4. ExportDialogが表示されることを確認
5. "CSV"を選択
6. "Export"ボタンをクリック
7. ファイル保存ダイアログが表示される
8. ファイル名を`test_export.csv`として保存
9. 成功通知が表示されることを確認
10. 保存したCSVファイルを開く

**期待結果**:
- [ ] ヘッダー行に`id,name,email,age,created_at,description`が含まれる
- [ ] 5行のデータが出力されている
- [ ] NULL値が空文字列として出力されている（行3のemail、行4のage）
- [ ] 改行を含むデータが適切にエスケープされている（行4のdescription）
- [ ] カンマを含むデータが引用符で囲まれている（行5のdescription）
- [ ] 文字化けがない（UTF-8 BOM付き）

#### 2.1.2 Excelで開く
1. 保存した`test_export.csv`をExcelで開く

**期待結果**:
- [ ] 文字化けせずに表示される
- [ ] カラム名が正しく表示される

### 2.2 Excelエクスポート

#### 2.2.1 基本的なExcelエクスポート
1. クエリビルダーで`SELECT * FROM export_test`を実行
2. 右上の"Export"ボタンをクリック
3. "Excel"を選択
4. "Export"ボタンをクリック
5. ファイル名を`test_export.xlsx`として保存
6. 成功通知が表示されることを確認
7. 保存したExcelファイルを開く

**期待結果**:
- [ ] ヘッダー行が太字で表示されている
- [ ] 5行のデータが出力されている
- [ ] NULL値が空セルになっている
- [ ] カラム幅が自動調整されている（長い文字列が見切れない）
- [ ] 改行を含むデータがセル内改行として表示される

### 2.3 JSONエクスポート

#### 2.3.1 基本的なJSONエクスポート
1. クエリビルダーで`SELECT * FROM export_test`を実行
2. 右上の"Export"ボタンをクリック
3. "JSON"を選択
4. "Export"ボタンをクリック
5. ファイル名を`test_export.json`として保存
6. 成功通知が表示されることを確認
7. 保存したJSONファイルをテキストエディタで開く

**期待結果**:
- [ ] Pretty-printされている（インデント付き）
- [ ] 配列形式`[{...}, {...}, ...]`になっている
- [ ] NULL値が`null`として出力されている
- [ ] 有効なJSON形式である（JSONパーサーでエラーにならない）

```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "age": 25,
    "created_at": "2024-01-01 10:00:00",
    "description": "Test user 1"
  },
  {
    "id": 3,
    "name": "Charlie",
    "email": null,
    "age": 28,
    "created_at": "2024-01-03 12:00:00",
    "description": null
  }
]
```

## 3. エラーハンドリングテスト

### 3.1 キャンセル操作

#### 3.1.1 ダイアログキャンセル
1. クエリビルダーで`SELECT * FROM export_test`を実行
2. "Export"ボタンをクリック
3. "Cancel"ボタンをクリック

**期待結果**:
- [ ] ダイアログが閉じる
- [ ] エクスポートが実行されない
- [ ] エラーメッセージが表示されない

#### 3.1.2 ファイル保存ダイアログキャンセル
1. クエリビルダーで`SELECT * FROM export_test`を実行
2. "Export"ボタンをクリック
3. "CSV"を選択して"Export"ボタンをクリック
4. ファイル保存ダイアログで"キャンセル"をクリック

**期待結果**:
- [ ] ダイアログが閉じる
- [ ] エクスポートが実行されない
- [ ] エラーメッセージが表示されない

### 3.2 ファイル書き込みエラー

#### 3.2.1 読み取り専用ディレクトリへの保存（macOS/Linux）
1. クエリビルダーで`SELECT * FROM export_test`を実行
2. "Export"ボタンをクリック
3. "CSV"を選択して"Export"ボタンをクリック
4. ファイル保存先を`/usr/test.csv`（書き込み不可）に指定

**期待結果**:
- [ ] エラーメッセージが表示される
- [ ] "Permission denied"等のメッセージが含まれる

### 3.3 無効なデータ

#### 3.3.1 結果がない場合
1. クエリビルダーで`SELECT * FROM export_test WHERE id = 999`を実行
2. 結果が0行になることを確認
3. "Export"ボタンが表示されない、または無効化されていることを確認

**期待結果**:
- [ ] Exportボタンが表示されないか、無効化されている

## 4. データ整合性テスト

### 4.1 大量データ

#### 4.1.1 1000行のデータ
```sql
-- 1000行のテストデータ生成
INSERT INTO export_test (id, name, email, age, created_at, description)
SELECT
  generate_series(100, 1099) AS id,
  'User' || generate_series(100, 1099) AS name,
  'user' || generate_series(100, 1099) || '@example.com' AS email,
  20 + (generate_series(100, 1099) % 40) AS age,
  NOW() AS created_at,
  'Description ' || generate_series(100, 1099) AS description;
```

1. `SELECT * FROM export_test`を実行（1000行以上）
2. CSV形式でエクスポート
3. ファイルを開き、行数を確認

**期待結果**:
- [ ] ヘッダー行 + 1000行以上のデータが含まれる
- [ ] すべての行が正しくエクスポートされている
- [ ] パフォーマンスが許容範囲内（5秒以内）

### 4.2 特殊文字

#### 4.2.1 各種特殊文字を含むデータ
```sql
INSERT INTO export_test VALUES
  (1001, 'Test"Quote', 'test@test.com', 25, NOW(), 'Has "double quotes"'),
  (1002, 'Test''Apostrophe', 'test@test.com', 26, NOW(), 'Has ''apostrophes'''),
  (1003, 'Test,Comma', 'test@test.com', 27, NOW(), 'Has, commas, multiple'),
  (1004, 'Test
Newline', 'test@test.com', 28, NOW(), 'Has
newlines
multiple');
```

1. `SELECT * FROM export_test WHERE id >= 1001`を実行
2. CSV形式でエクスポート
3. ファイルをテキストエディタで開く

**期待結果**:
- [ ] ダブルクォートが適切にエスケープされている（`""`）
- [ ] カンマを含むフィールドが引用符で囲まれている
- [ ] 改行を含むフィールドが引用符で囲まれている
- [ ] 行数が4行（ヘッダー除く）で一致する

## 5. 統合テスト

### 5.1 複数データベース

#### 5.1.1 PostgreSQL
1. PostgreSQL接続でテストを実施
2. すべての基本機能テスト（2.1〜2.3）を実行

**期待結果**:
- [ ] すべてのエクスポート形式が動作する

#### 5.1.2 MySQL
1. MySQL接続でテストを実施
2. すべての基本機能テスト（2.1〜2.3）を実行

**期待結果**:
- [ ] すべてのエクスポート形式が動作する

#### 5.1.3 SQLite
1. SQLite接続でテストを実施
2. すべての基本機能テスト（2.1〜2.3）を実行

**期待結果**:
- [ ] すべてのエクスポート形式が動作する

## 6. 単体テスト（コード）

操作で確認できない低レベルなロジックはテストコードで確認します。

### 6.1 Rustテスト

```bash
cd src-tauri
cargo test exporter
```

**期待結果**:
- [ ] すべてのテストが通過する
- [ ] CSVエクスポートテストが通過する
- [ ] JSONエクスポートテストが通過する
- [ ] Excelエクスポートテストが通過する

### 6.2 フロントエンドテスト

```bash
npm run test:run -- export
```

**期待結果**:
- [ ] すべてのテストが通過する
- [ ] ExportDialog.test.tsが通過する

## 7. パフォーマンステスト

### 7.1 1000行データ
1. 1000行のデータをエクスポート
2. 実行時間を計測

**期待結果**:
- [ ] CSV: 1秒以内
- [ ] Excel: 2秒以内
- [ ] JSON: 1秒以内

### 7.2 10000行データ（オプション）
```sql
-- 10000行のテストデータ生成
INSERT INTO export_test (id, name, email, age, created_at, description)
SELECT
  generate_series(2000, 11999) AS id,
  'User' || generate_series(2000, 11999) AS name,
  'user' || generate_series(2000, 11999) || '@example.com' AS email,
  20 + (generate_series(2000, 11999) % 40) AS age,
  NOW() AS created_at,
  'Description ' || generate_series(2000, 11999) AS description;
```

1. 10000行のデータをエクスポート
2. 実行時間を計測

**期待結果**:
- [ ] CSV: 5秒以内
- [ ] Excel: 10秒以内
- [ ] JSON: 5秒以内

## 8. クリーンアップ

```sql
-- テストデータ削除
DROP TABLE IF EXISTS export_test;
```

## 9. テスト結果まとめ

| テスト項目 | 結果 | 備考 |
|-----------|------|------|
| 2.1 CSVエクスポート | ⬜️ | |
| 2.2 Excelエクスポート | ⬜️ | |
| 2.3 JSONエクスポート | ⬜️ | |
| 3.1 キャンセル操作 | ⬜️ | |
| 3.2 ファイル書き込みエラー | ⬜️ | |
| 3.3 無効なデータ | ⬜️ | |
| 4.1 大量データ | ⬜️ | |
| 4.2 特殊文字 | ⬜️ | |
| 5.1 複数データベース | ⬜️ | |
| 6.1 Rustテスト | ⬜️ | |
| 6.2 フロントエンドテスト | ⬜️ | |
| 7.1 パフォーマンステスト | ⬜️ | |

## 10. 完了条件

- [ ] すべてのテスト項目が✅になる
- [ ] 未解決のバグがない
- [ ] パフォーマンスが要件を満たす
- [ ] ドキュメントが更新されている
