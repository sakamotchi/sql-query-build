# テスト手順書 - INSERTビルダー

## 概要

このドキュメントでは、INSERTビルダー機能のテスト手順を記載します。
可能な限り手動操作で確認し、操作で確認できない項目のみ自動テストを記載します。

**設計変更（2026-01-01）**: 上下分割レイアウトに変更。テーブル選択はセレクトボックス（検索付き）、入力形式はタブ切り替え。

## 前提条件

- `npm run tauri:dev` でアプリが起動していること
- テスト用データベース接続が設定されていること（PostgreSQL, MySQL, SQLiteのいずれか）
- データベースに以下のテストテーブルが存在すること:
  - `users` テーブル（id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR, email VARCHAR, is_active BOOLEAN）
  - `posts` テーブル（id INT PRIMARY KEY AUTO_INCREMENT, title VARCHAR, content TEXT, published_at TIMESTAMP NULL）

## 手動テスト

### ケース 1: 基本的なINSERT文の構築と実行

**手順:**

1. アプリを起動する（`npm run tauri:dev`）
2. トップページから「データ変更」メニューを選択して `/mutation-builder` ページを開く
3. ツールバーの「INSERT」タブを選択する
4. 左パネルのDatabaseTreeで `users` テーブルをクリックする
5. 右パネルのInsertPanelに `users` テーブルのカラムが表示されることを確認する
6. 以下の値を入力する:
   - `id`: （AUTO_INCREMENTのため入力不可であることを確認）
   - `name`: "Alice"
   - `email`: "alice@example.com"
   - `is_active`: チェックを入れる（true）
7. 中央パネルのSQLプレビューに以下のようなINSERT文が表示されることを確認する:
   ```sql
   INSERT INTO users (name, email, is_active) VALUES ('Alice', 'alice@example.com', true)
   ```
8. ツールバーの「実行」ボタンをクリックする
9. 本番環境の場合は確認ダイアログが表示されることを確認し、「実行」をクリックする

**期待結果:**

- InsertPanelに `users` テーブルのカラムが表示される
- `id` カラムは入力無効化されている（AUTO_INCREMENTのため）
- SQLプレビューに正しいINSERT文が表示される
- 実行後、「1行挿入されました」というメッセージが表示される
- 実行履歴に記録される

**確認結果:**

- [ ] OK / NG

---

### ケース 2: 複数行INSERT

**手順:**

1. `/mutation-builder` ページを開き、「INSERT」タブを選択する
2. 左パネルで `users` テーブルを選択する
3. 右パネルで1行目のデータを入力:
   - `name`: "Bob"
   - `email`: "bob@example.com"
   - `is_active`: チェックを入れる
4. 「行を追加」ボタンをクリックする
5. 2行目のデータを入力:
   - `name`: "Charlie"
   - `email`: "charlie@example.com"
   - `is_active`: チェックを外す（false）
6. もう一度「行を追加」ボタンをクリックして3行目を追加:
   - `name`: "Diana"
   - `email`: "diana@example.com"
   - `is_active`: チェックを入れる
7. 中央パネルのSQLプレビューに以下のような複数行INSERT文が表示されることを確認する:
   ```sql
   INSERT INTO users (name, email, is_active)
   VALUES
     ('Bob', 'bob@example.com', true),
     ('Charlie', 'charlie@example.com', false),
     ('Diana', 'diana@example.com', true)
   ```
8. 「実行」ボタンをクリックする

**期待結果:**

- 「行を追加」ボタンで新しい行が追加される
- 各行ごとに独立して値を入力できる
- SQLプレビューに複数行のVALUES句が表示される
- 実行後、「3行挿入されました」というメッセージが表示される

**確認結果:**

- [ ] OK / NG

---

### ケース 3: 行の削除

**手順:**

1. `/mutation-builder` ページを開き、「INSERT」タブを選択する
2. 左パネルで `users` テーブルを選択する
3. 初期状態で1行のみ表示されていることを確認する
4. 1行目の「削除」ボタンが表示されていないことを確認する（最低1行は必須）
5. 「行を追加」ボタンをクリックして2行目を追加する
6. 各行に「削除」ボタンが表示されることを確認する
7. 2行目の「削除」ボタンをクリックする
8. 2行目が削除され、1行のみ表示されることを確認する
9. 再度1行目の「削除」ボタンが表示されていないことを確認する

**期待結果:**

- 1行のみの場合、削除ボタンは表示されない
- 2行以上の場合、各行に削除ボタンが表示される
- 削除ボタンをクリックすると該当行が削除される
- 最後の1行は削除できない

**確認結果:**

- [ ] OK / NG

---

### ケース 4: NULL値の設定

**手順:**

1. `/mutation-builder` ページを開き、「INSERT」タブを選択する
2. 左パネルで `posts` テーブルを選択する（`published_at` カラムがNULL許可の前提）
3. 以下の値を入力する:
   - `title`: "Test Post"
   - `content`: "This is a test post content."
   - `published_at`: 「NULL」チェックボックスにチェックを入れる
4. 中央パネルのSQLプレビューに以下のようなINSERT文が表示されることを確認する:
   ```sql
   INSERT INTO posts (title, content, published_at) VALUES ('Test Post', 'This is a test post content.', NULL)
   ```
5. NULLチェックを外し、日付を入力する（例: "2026-01-01 12:00:00"）
6. SQLプレビューが更新され、NULLではなく入力した日付が表示されることを確認する
7. 「実行」ボタンをクリックする

**期待結果:**

- NULL許可カラムには「NULL」チェックボックスが表示される
- NULLチェックを入れるとSQLプレビューに `NULL` が表示される
- NULLチェックを外すと入力フィールドが有効化され、値を入力できる
- 実行が成功する

**確認結果:**

- [ ] OK / NG

---

### ケース 5: カラム型に応じた入力UI

**手順:**

1. `/mutation-builder` ページを開き、「INSERT」タブを選択する
2. 左パネルで `users` テーブルを選択する
3. 各カラムの入力UIを確認する:
   - `name` (VARCHAR): テキスト入力欄（UInput）が表示される
   - `email` (VARCHAR): テキスト入力欄（UInput）が表示される
   - `is_active` (BOOLEAN): チェックボックス（UCheckbox）が表示される
4. 左パネルで `posts` テーブルを選択する
5. 各カラムの入力UIを確認する:
   - `title` (VARCHAR): テキスト入力欄（UInput）が表示される
   - `content` (TEXT): テキストエリア（UTextarea）が表示される
   - `published_at` (TIMESTAMP): テキスト入力欄（UInput）が表示される

**期待結果:**

- VARCHAR型にはUInputが表示される
- TEXT型にはUTextareaが表示される
- BOOLEAN型にはUCheckboxが表示される
- 各カラムの型情報（カッコ内）が表示される

**確認結果:**

- [ ] OK / NG

---

### ケース 6: クエリ保存機能

**手順:**

1. `/mutation-builder` ページでINSERT文を構築する（ケース1と同様）
2. ツールバーの「保存」ボタンをクリックする
3. SaveQueryDialogが開く
4. 以下を入力する:
   - 名前: "ユーザー追加クエリ"
   - 説明: "新規ユーザーを追加するINSERT文"
   - タグ: "insert, users"
5. 「保存」ボタンをクリックする
6. ツールバーの「保存済み」ボタンをクリックする
7. SavedQuerySlideoverに「ユーザー追加クエリ」が表示されることを確認する
8. 「ユーザー追加クエリ」をクリックする
9. INSERT文がInsertPanelに復元されることを確認する

**期待結果:**

- INSERT文を保存できる
- 保存済みクエリ一覧に表示される
- 保存済みクエリから復元できる

**確認結果:**

- [ ] OK / NG

---

### ケース 7: クエリ履歴機能

**手順:**

1. `/mutation-builder` ページでINSERT文を構築・実行する（ケース1と同様）
2. ツールバーの「履歴」ボタンをクリックする
3. QueryHistorySlideoverに実行したINSERT文が表示されることを確認する
4. 履歴項目に以下が表示されることを確認する:
   - 実行日時
   - SQL文のプレビュー
   - 実行結果（成功/失敗）
   - 影響行数
5. 履歴項目をクリックする
6. INSERT文がInsertPanelに復元されることを確認する

**期待結果:**

- INSERT実行後、履歴に記録される
- 履歴一覧に実行日時、SQL文、結果が表示される
- 履歴から復元できる

**確認結果:**

- [ ] OK / NG

---

### ケース 8: データベース方言対応（PostgreSQL）

**手順:**

1. PostgreSQL接続を選択する
2. `/mutation-builder` ページでINSERT文を構築する
3. 中央パネルのSQLプレビューを確認する
4. PostgreSQL方言に応じた構文が生成されることを確認する:
   - 識別子がダブルクォートで囲まれている（例: `"users"`, `"name"`）
   - BOOLEAN型が `true`/`false` で表現されている

**期待結果:**

- PostgreSQL方言のINSERT文が生成される
- 実行が成功する

**確認結果:**

- [ ] OK / NG

---

### ケース 9: データベース方言対応（MySQL）

**手順:**

1. MySQL接続を選択する
2. `/mutation-builder` ページでINSERT文を構築する
3. 中央パネルのSQLプレビューを確認する
4. MySQL方言に応じた構文が生成されることを確認する:
   - 識別子がバッククォートで囲まれている（例: `` `users` ``, `` `name` ``）
   - BOOLEAN型が `1`/`0` で表現されている

**期待結果:**

- MySQL方言のINSERT文が生成される
- 実行が成功する

**確認結果:**

- [ ] OK / NG

---

### ケース 10: データベース方言対応（SQLite）

**手順:**

1. SQLite接続を選択する
2. `/mutation-builder` ページでINSERT文を構築する
3. 中央パネルのSQLプレビューを確認する
4. SQLite方言に応じた構文が生成されることを確認する:
   - BOOLEAN型が `1`/`0` で表現されている

**期待結果:**

- SQLite方言のINSERT文が生成される
- 実行が成功する

**確認結果:**

- [ ] OK / NG

---

### ケース 11: 本番環境での確認ダイアログ（Phase 3連携）

**手順:**

1. 設定画面で接続の環境種別を「本番」に設定する
2. `/mutation-builder` ページでINSERT文を構築する
3. 「実行」ボタンをクリックする
4. DangerousQueryDialogが表示されることを確認する
5. ダイアログに以下が表示されることを確認する:
   - 警告メッセージ（「本番環境でINSERTを実行します」等）
   - SQL文のプレビュー
   - 「実行」ボタンと「キャンセル」ボタン
6. 「キャンセル」ボタンをクリックし、実行されないことを確認する
7. 再度「実行」ボタンをクリックし、ダイアログで「実行」を選択する
8. INSERT文が実行されることを確認する

**期待結果:**

- 本番環境ではDangerousQueryDialogが表示される
- キャンセルすると実行されない
- 確認後に実行できる

**確認結果:**

- [ ] OK / NG

---

### ケース 12: エラーハンドリング

**手順:**

1. `/mutation-builder` ページでINSERT文を構築する
2. 意図的に制約違反を起こす（例: UNIQUE制約のあるカラムに重複値を設定）
3. 「実行」ボタンをクリックする
4. エラーメッセージが表示されることを確認する
5. エラー内容が分かりやすく表示されることを確認する

**期待結果:**

- エラーメッセージが表示される
- エラー内容が明確に表示される（例: "UNIQUE constraint violation"）
- アプリがクラッシュしない

**確認結果:**

- [ ] OK / NG

---

## 自動テスト

### ユニットテスト

```bash
npm run test:run
```

**確認項目:**

- [ ] `InsertPanel.spec.ts`: InsertPanel.vueのテストがパスする
- [ ] `ColumnInputField.spec.ts`: ColumnInputField.vueのテストがパスする
- [ ] `mutation-builder.spec.ts`: mutation-builderストアのテストがパスする

### 型チェック

```bash
npm run typecheck
```

**確認項目:**

- [ ] 型エラーがないこと

### Rustテスト

```bash
cd src-tauri && cargo test
```

**確認項目:**

- [ ] `mutation.rs`のテストがパスする:
  - `test_generate_insert_sql_single_row`
  - `test_generate_insert_sql_multiple_rows`
  - `test_generate_insert_sql_with_null`
  - PostgreSQL/MySQL/SQLite各方言のテスト

---

## エッジケース

| ケース | 期待動作 | 確認結果 |
|--------|---------|---------|
| テーブル未選択の状態で「実行」ボタンをクリック | 実行ボタンが無効化されている | [ ] OK / NG |
| すべてのカラムがNULLの行を追加 | INSERT文が正しく生成される（すべてNULL） | [ ] OK / NG |
| 100カラム以上のテーブルを選択 | スクロール可能で快適に操作できる | [ ] OK / NG |
| 50行以上の複数行INSERTを構築 | パフォーマンス低下がない | [ ] OK / NG |
| 特殊文字を含む値を入力（例: `'`, `"`, `;`） | 正しくエスケープされ、SQLインジェクションが発生しない | [ ] OK / NG |
| 絵文字を含む値を入力（例: "😀"） | 正しく保存される | [ ] OK / NG |
| 非常に長いテキストを入力（10,000文字以上） | 正しく保存される | [ ] OK / NG |

---

## 回帰テスト

既存機能への影響がないことを確認します。

- [ ] 既存の接続機能が正常に動作する
- [ ] 既存のSELECTクエリビルダー（`/query-builder`）が正常に動作する
- [ ] 設定画面が正常に動作する
- [ ] クエリ保存・履歴機能が正常に動作する（SELECTクエリ）
- [ ] 本番環境安全機能が正常に動作する（SELECTクエリ）

---

## パフォーマンステスト

- [ ] 100カラムのテーブルでカラム一覧が1秒以内に表示される
- [ ] 10行のINSERTでSQL生成が0.5秒以内に完了する
- [ ] 50行のINSERTを実行し、5秒以内に完了する

---

## セキュリティテスト

- [ ] SQLインジェクションが発生しないこと（特殊文字のエスケープ確認）
- [ ] 本番環境で確認ダイアログが必ず表示されること
- [ ] SQL生成がRust側で行われていること（フロントエンド側で文字列結合していないこと）

---

## テスト完了条件

- [ ] すべての手動テストケースがOK
- [ ] すべての自動テストがパス
- [ ] すべてのエッジケースがOK
- [ ] 回帰テストがすべてパス
- [ ] パフォーマンステストがすべてパス
- [ ] セキュリティテストがすべてパス
