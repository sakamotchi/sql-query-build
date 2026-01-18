# テスト手順書 - SQLエディタ Phase 3: クエリ実行機能

## 概要

このドキュメントでは、SQLエディタ Phase 3（クエリ実行機能）のテスト手順を記載します。
可能な限り手動操作で確認し、操作で確認できない項目のみ自動テストを記載します。

## 前提条件

### テスト環境

- `npm run tauri:dev` でアプリが起動していること
- テスト用のデータベース接続が登録されていること
  - PostgreSQL、MySQL、またはSQLiteの接続
  - テスト用のテーブル・データが準備されていること

### テストデータ準備

```sql
-- テスト用テーブル作成（例: PostgreSQL）
CREATE TABLE test_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- テストデータ挿入
INSERT INTO test_users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com'),
  ('Charlie', 'charlie@example.com');
```

## 手動テスト

### ケース 1: 基本的なSELECTクエリ実行

**手順:**

1. アプリを起動する
2. ランチャーでテスト用接続カードの「エディタ」ボタンをクリック
3. SQLエディタウィンドウが開くことを確認
4. エディタに以下のSQLを入力:
   ```sql
   SELECT * FROM test_users;
   ```
5. 「実行」ボタンをクリック

**期待結果:**

- 実行ボタンが無効化され、停止ボタンが有効化される
- 結果パネルにテーブル形式で結果が表示される
- 列名（id, name, email, created_at）がヘッダーに表示される
- 3件のデータが表示される
- 実行時間（例: 「実行時間: 0.023秒」）が表示される
- 取得件数（「3件」）が表示される

**確認結果:**

- [ ] OK / NG

---

### ケース 2: キーボードショートカットでクエリ実行

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力:
   ```sql
   SELECT id, name FROM test_users WHERE id = 1;
   ```
3. Ctrl+Enter（macOSではCmd+Enter）を押下

**期待結果:**

- クエリが実行される
- 結果パネルに1件のデータが表示される
- id=1のユーザー（Alice）のデータが表示される

**確認結果:**

- [ ] OK / NG

---

### ケース 3: 選択範囲のみ実行

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力:
   ```sql
   SELECT * FROM test_users WHERE id = 1;
   SELECT * FROM test_users WHERE id = 2;
   SELECT * FROM test_users WHERE id = 3;
   ```
3. 2行目のSQLのみをマウスで選択
4. Ctrl+Enter（macOSではCmd+Enter）を押下

**期待結果:**

- 選択した2行目のSQLのみが実行される
- 結果パネルにid=2のユーザー（Bob）のデータのみが表示される

**確認結果:**

- [ ] OK / NG

---

### ケース 4: INSERT文の実行と影響行数表示

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力:
   ```sql
   INSERT INTO test_users (name, email) VALUES ('Dave', 'dave@example.com');
   ```
3. 「実行」ボタンをクリック

**期待結果:**

- 結果パネルに「1行を挿入しました」と表示される
- 実行時間が表示される
- エラーが発生しない

**確認結果:**

- [ ] OK / NG

---

### ケース 5: UPDATE文の実行と影響行数表示

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力:
   ```sql
   UPDATE test_users SET name = 'Alice Smith' WHERE id = 1;
   ```
3. 「実行」ボタンをクリック

**期待結果:**

- 結果パネルに「1行を更新しました」と表示される
- 実行時間が表示される
- エラーが発生しない

**確認結果:**

- [ ] OK / NG

---

### ケース 6: DELETE文の実行と影響行数表示

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力:
   ```sql
   DELETE FROM test_users WHERE id = 3;
   ```
3. 「実行」ボタンをクリック

**期待結果:**

- 結果パネルに「1行を削除しました」と表示される
- 実行時間が表示される
- エラーが発生しない

**確認結果:**

- [ ] OK / NG

---

### ケース 7: 構文エラーのハンドリング

**手順:**

1. SQLエディタを開く
2. エディタに以下の無効なSQLを入力:
   ```sql
   SELEC * FROM test_users;
   ```
   （SELECTのスペルミス）
3. 「実行」ボタンをクリック

**期待結果:**

- 結果パネルにエラーメッセージ（UAlert）が表示される
- エラーメッセージに「syntax error」等の内容が含まれる
- エディタ内でエラー行（1行目）がハイライトされる（赤背景）
- 実行ボタンが再度有効化される

**確認結果:**

- [ ] OK / NG

---

### ケース 8: 存在しないテーブルへのアクセス

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力:
   ```sql
   SELECT * FROM non_existent_table;
   ```
3. 「実行」ボタンをクリック

**期待結果:**

- エラーメッセージが表示される
- エラーメッセージに「table "non_existent_table" does not exist」等の内容が含まれる

**確認結果:**

- [ ] OK / NG

---

### ケース 9: NULL値の表示

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力して実行:
   ```sql
   SELECT id, name, NULL as null_column FROM test_users WHERE id = 1;
   ```
3. 「実行」ボタンをクリック

**期待結果:**

- 結果パネルにid=1のユーザーデータが表示される
- null_column列に「NULL」とグレー・イタリックで表示される
- NULL値と空文字列が視覚的に区別できる

**確認結果:**

- [ ] OK / NG

---

### ケース 10: 空のSQLの実行

**手順:**

1. SQLエディタを開く
2. エディタに何も入力しない（または空白のみ入力）
3. 「実行」ボタンの状態を確認

**期待結果:**

- 実行ボタンが無効化されている（クリックできない）

**確認結果:**

- [ ] OK / NG

---

### ケース 11: 実行中の停止（長時間クエリ）

**手順:**

1. SQLエディタを開く
2. エディタに以下の長時間クエリを入力:
   ```sql
   SELECT pg_sleep(10); -- PostgreSQLの場合
   -- または SELECT SLEEP(10); -- MySQLの場合
   ```
3. 「実行」ボタンをクリック
4. 実行開始後すぐに「停止」ボタンをクリック

**期待結果:**

- 停止ボタンクリック後、クエリ実行が中断される
- 実行ボタンが再度有効化される
- エラーメッセージ（「クエリがキャンセルされました」等）が表示される

**確認結果:**

- [ ] OK / NG

---

### ケース 12: 複数クエリの実行（選択なし）

**手順:**

1. SQLエディタを開く
2. エディタに以下のSQLを入力:
   ```sql
   SELECT * FROM test_users WHERE id = 1;
   SELECT * FROM test_users WHERE id = 2;
   ```
3. 選択せずにCtrl+Enterを押下

**期待結果:**

- 全体のSQLが実行される
- 最後のクエリ（id=2）の結果のみが表示される（複数結果セット対応はPhase 6）

**確認結果:**

- [ ] OK / NG

---

## 自動テスト

### ユニットテスト

**実行コマンド:**

```bash
npm run test:run
```

**対象:**

- `app/stores/sql-editor.ts` のストアロジック
  - `executeQuery()` アクション
  - `cancelQuery()` アクション
  - `canExecute` getter
  - エラーハンドリング

**テストケース:**

- [ ] ストアの初期状態が正しい
- [ ] `updateSql()` でSQL文字列が更新され、`isDirty`がtrueになる
- [ ] `executeQuery()` 成功時に`result`が設定される
- [ ] `executeQuery()` エラー時に`error`が設定される
- [ ] 接続IDなしで`executeQuery()`を呼ぶとエラーになる
- [ ] SQL空白で`executeQuery()`を呼ぶとエラーになる
- [ ] `canExecute` が`isExecuting`と`sql`の状態に基づいて正しく動作する

---

### 型チェック

**実行コマンド:**

```bash
npm run typecheck
```

**確認:**

- [ ] TypeScriptの型エラーがない
- [ ] `app/types/sql-editor.ts` の型定義が正しい
- [ ] `app/stores/sql-editor.ts` の型が正しい

---

### E2Eテスト（Playwright）

**実行コマンド:**

```bash
npm run test:e2e
```

**テストシナリオ:**

- [ ] SQLエディタウィンドウが起動できる
- [ ] クエリ実行ボタンクリックでクエリが実行される
- [ ] Ctrl+Enterでクエリが実行される
- [ ] SELECT結果がテーブル形式で表示される
- [ ] エラー発生時にエラーメッセージが表示される
- [ ] 選択範囲のみ実行できる

**テストコード例** (`tests/sql-editor.spec.ts`):

```typescript
import { test, expect } from '@playwright/test'

test.describe('SQL Editor Query Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('[data-test="connection-card-sql-editor-button"]')
    await expect(page).toHaveTitle(/SQL Editor/)
  })

  test('should execute simple SELECT query', async ({ page }) => {
    await page.fill('.monaco-editor textarea', 'SELECT 1 as num')
    await page.click('button:has-text("実行")')
    await expect(page.locator('[data-test="result-table"]')).toBeVisible()
    await expect(page.locator('th:has-text("num")')).toBeVisible()
    await expect(page.locator('td:has-text("1")')).toBeVisible()
  })

  test('should execute query with Ctrl+Enter', async ({ page }) => {
    await page.fill('.monaco-editor textarea', 'SELECT 1')
    await page.keyboard.press('Control+Enter')
    await expect(page.locator('[data-test="result-table"]')).toBeVisible()
  })

  test('should display error for invalid SQL', async ({ page }) => {
    await page.fill('.monaco-editor textarea', 'INVALID SQL')
    await page.click('button:has-text("実行")')
    await expect(page.locator('[role="alert"]')).toBeVisible()
    await expect(page.locator('[role="alert"]')).toContainText('error')
  })
})
```

---

## エッジケース

| ケース | 期待動作 | 確認結果 |
|--------|---------|---------|
| 非常に長いSQL（10,000文字以上） | エディタで正常に入力・実行できる | [ ] |
| 大量結果（10,000件以上） | 結果パネルに表示される（パフォーマンス許容範囲） | [ ] |
| 特殊文字を含むSQL（絵文字、日本語等） | エディタで正常に入力・実行できる | [ ] |
| 接続が切れた状態でクエリ実行 | エラーメッセージが表示される | [ ] |
| 実行中にウィンドウを閉じる | クエリが停止し、ウィンドウが閉じる | [ ] |
| 複数ウィンドウで同時にクエリ実行 | 各ウィンドウで独立して実行される | [ ] |

---

## 回帰テスト

既存機能への影響がないことを確認します。

### 接続管理機能

- [ ] ランチャーで接続カードが表示される
- [ ] 接続カードの「接続」ボタンでクエリビルダーが起動する
- [ ] 接続カードの「変更」ボタンで接続設定画面が開く
- [ ] 接続カードの「エディタ」ボタンでSQLエディタが起動する

### クエリビルダー機能

- [ ] テーブル選択が正常に動作する
- [ ] WHERE条件設定が正常に動作する
- [ ] クエリ実行が正常に動作する
- [ ] 結果表示が正常に動作する
- [ ] エクスポート機能が正常に動作する

### ウィンドウ管理

- [ ] 複数のクエリビルダーウィンドウを同時に開ける
- [ ] SQLエディタとクエリビルダーを同時に開ける
- [ ] 同一接続で重複ウィンドウが開かない（既存にフォーカス）

### セキュリティ・設定

- [ ] 設定画面が正常に動作する
- [ ] 環境別安全設定が正常に動作する
- [ ] マスターパスワード認証が正常に動作する

---

## パフォーマンステスト

### クエリ実行レスポンス

**測定方法:**

1. SQLエディタで `SELECT * FROM large_table LIMIT 10000;` を実行
2. 実行時間を記録

**目標値:**

- DB応答時間 + 1秒以内

**結果:**

- [ ] OK / NG
- 実行時間: ______ 秒

---

### エディタ入力遅延

**測定方法:**

1. SQLエディタで長文のSQLを高速入力
2. 入力遅延を体感確認

**目標値:**

- 16ms以下（60fps）

**結果:**

- [ ] OK / NG
- 遅延を感じる: はい / いいえ

---

## テスト完了チェックリスト

- [ ] 手動テスト（ケース 1-12）が全て OK
- [ ] ユニットテストが全て PASS
- [ ] 型チェックが PASS
- [ ] E2Eテストが全て PASS
- [ ] エッジケースが確認済み
- [ ] 回帰テストが全て OK
- [ ] パフォーマンステストが目標値内
- [ ] 既知の問題がドキュメント化されている

---

## 既知の問題・制限事項

### queryIdの管理未実装

- **問題**: `cancelQuery()` でqueryIdを渡していない（空文字）
- **影響**: クエリキャンセルが正しく動作しない可能性
- **対応**: バックエンド側でqueryId管理の確認が必要（Phase 4以降で対応）

### 複数結果セット未対応

- **問題**: セミコロン区切りの複数クエリを実行した場合、最後の結果のみ表示
- **影響**: 複数クエリの結果を同時に確認できない
- **対応**: Phase 6でタブまたはアコーディオンで複数結果セット表示を実装

---

## 参考資料

- [要件定義書](requirements.md)
- [設計書](design.md)
- [タスクリスト](tasklist.md)
- [WBS Phase 3詳細](../20260117_エディタ機能/wbs.md#phase-3-クエリ実行機能)
