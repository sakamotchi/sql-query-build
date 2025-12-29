# テスト手順書: エラーハンドリング

## 概要

エラーハンドリング（Phase 2.3）の機能を検証するためのテスト手順書。
可能な限り操作手順で確認し、操作で確認できない項目のみテストコードで検証する。

## 前提条件

- Phase 2.1 クエリ実行基盤（Rust）が完成していること
- Phase 2.2 結果表示UIが完成していること
- テスト用のデータベース接続が設定されていること
- `npm run tauri:dev` でアプリが起動できること

## テスト環境準備

### テスト用データベース

PostgreSQL、MySQL、SQLiteのいずれかで以下のテストデータを用意：

```sql
-- テスト用テーブル
CREATE TABLE error_test_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユニーク制約テスト用データ
INSERT INTO error_test_users (username, email) VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com');

-- 外部キーテスト用テーブル
CREATE TABLE error_test_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES error_test_users(id),
    amount DECIMAL(10, 2) NOT NULL
);
```

---

## 操作テスト手順

### T-1: 構文エラーの表示

**目的**: SQL構文エラー時に適切なエラーメッセージが表示されることを確認

**手順**:

1. アプリを起動（`npm run tauri:dev`）
2. 接続を選択してクエリビルダー画面を開く
3. SQLプレビューを手動で編集し、意図的に構文エラーを含むSQLにする
   - 例: `SELEC * FROM users` （SELECTのスペルミス）
4. 「実行」ボタンをクリック

**期待結果**:

- [ ] 「SQL構文エラー」というタイトルが表示される
- [ ] 「SQLの構文に誤りがあります」という説明が表示される
- [ ] エラーアイコン（コードブラケット）が表示される
- [ ] ヒントセクションに「構文を確認してください」が表示される
- [ ] 「技術的な詳細」を展開するとDBオリジナルのエラーメッセージが表示される

### T-2: テーブル未存在エラーの表示

**目的**: 存在しないテーブルを参照した際のエラー表示を確認

**手順**:

1. SQLプレビューを手動で編集
   - 例: `SELECT * FROM nonexistent_table`
2. 「実行」ボタンをクリック

**期待結果**:

- [ ] 「テーブルが見つかりません」というタイトルが表示される
- [ ] 「指定されたテーブルが存在しません」という説明が表示される
- [ ] テーブルアイコンが表示される
- [ ] ヒントセクションに「テーブル名を確認してください」が表示される
- [ ] 対象オブジェクト名（nonexistent_table）が表示される

### T-3: カラム未存在エラーの表示

**目的**: 存在しないカラムを参照した際のエラー表示を確認

**手順**:

1. 既存テーブルを選択
2. SQLプレビューを手動で編集し、存在しないカラムを追加
   - 例: `SELECT nonexistent_column FROM error_test_users`
3. 「実行」ボタンをクリック

**期待結果**:

- [ ] 「カラムが見つかりません」というタイトルが表示される
- [ ] 「指定されたカラムが存在しません」という説明が表示される
- [ ] カラムアイコンが表示される
- [ ] ヒントセクションに「カラム名を確認してください」が表示される
- [ ] 対象オブジェクト名（nonexistent_column）が表示される

### T-4: 権限エラーの表示（該当する場合）

**目的**: 権限エラー時の表示を確認

**手順**:

1. 権限のないテーブルに対してクエリを実行
   - ※環境依存：権限制限された接続が必要

**期待結果**:

- [ ] 「権限エラー」というタイトルが表示される
- [ ] 「この操作を実行する権限がありません」という説明が表示される
- [ ] シールドアイコンが表示される
- [ ] ヒントセクションに「権限を確認してください」が表示される

### T-5: 接続エラーの表示

**目的**: 接続エラー時の表示を確認

**手順**:

1. 存在しないホストまたは停止しているDBへの接続を作成
2. その接続でクエリを実行

**期待結果**:

- [ ] 「接続エラー」というタイトルが表示される
- [ ] 「データベースへの接続に失敗しました」という説明が表示される
- [ ] 接続アイコン（シグナルスラッシュ）が表示される

### T-6: タイムアウトエラーの表示

**目的**: クエリタイムアウト時の表示を確認

**手順**:

1. 長時間かかるクエリを実行（例: 大量データでJOINなど）
2. タイムアウトを待つ

**期待結果**:

- [ ] 「クエリタイムアウト」というタイトルが表示される
- [ ] 「クエリの実行がタイムアウトしました」という説明が表示される
- [ ] 時計アイコンが表示される
- [ ] ヒントセクションに「クエリを最適化してください」が表示される

### T-7: 一意制約違反エラーの表示

**目的**: UNIQUE制約違反時の表示を確認

**手順**:

1. 直接SQLを実行してINSERTを試みる
   - 例: `INSERT INTO error_test_users (username, email) VALUES ('alice', 'test@example.com')`
   - （aliceは既に存在する）

**期待結果**:

- [ ] 「一意制約違反」というタイトルが表示される
- [ ] 「重複する値を挿入しようとしました」という説明が表示される
- [ ] 重複アイコンが表示される
- [ ] ヒントセクションに「重複データを確認してください」が表示される

### T-8: 外部キー制約違反エラーの表示

**目的**: 外部キー制約違反時の表示を確認

**手順**:

1. 直接SQLを実行してINSERTを試みる
   - 例: `INSERT INTO error_test_orders (user_id, amount) VALUES (9999, 100.00)`
   - （user_id=9999は存在しない）

**期待結果**:

- [ ] 「外部キー制約違反」というタイトルが表示される
- [ ] 「参照先のレコードが存在しません」という説明が表示される
- [ ] リンクアイコンが表示される
- [ ] ヒントセクションに「参照先データを確認してください」が表示される

### T-9: NOT NULL制約違反エラーの表示

**目的**: NOT NULL制約違反時の表示を確認

**手順**:

1. 直接SQLを実行してINSERTを試みる
   - 例: `INSERT INTO error_test_users (username) VALUES ('test')`
   - （emailがNULL）

**期待結果**:

- [ ] 「NOT NULL制約違反」というタイトルが表示される
- [ ] 「NULL値を許可しないカラムにNULLを挿入しようとしました」という説明が表示される
- [ ] 警告三角アイコンが表示される
- [ ] ヒントセクションに「必須項目を入力してください」が表示される

### T-10: 構文エラー位置のハイライト

**目的**: 構文エラー時にSQLプレビュー内でエラー位置がハイライトされることを確認

**手順**:

1. SQLプレビューを手動で編集し、意図的に構文エラーを含むSQLにする
   - 例:
     ```sql
     SELECT id, name
     FROM users
     WHER id = 1
     ```
     （WHEREのスペルミス）
2. 「実行」ボタンをクリック
3. SQLプレビューを確認

**期待結果**:

- [ ] エラーが発生した行（3行目）が赤背景でハイライトされる
- [ ] エラー箇所に波線下線が表示される
- [ ] 「エラー位置: 3行目, X列目」というインジケーターが表示される

### T-11: エラー詳細の展開・折りたたみ

**目的**: エラー詳細が展開・折りたたみできることを確認

**手順**:

1. 何らかのエラーを発生させる
2. 「技術的な詳細」リンクをクリック
3. 再度クリック

**期待結果**:

- [ ] 初期状態では技術詳細は非表示
- [ ] 「技術的な詳細」クリックで展開される
- [ ] DBオリジナルのエラーメッセージが表示される
- [ ] エラーコード（nativeCode）があれば表示される
- [ ] 再度クリックで折りたたまれる

### T-12: リトライボタンの動作

**目的**: リトライボタンでクエリが再実行されることを確認

**手順**:

1. 何らかのエラーを発生させる
2. エラー表示内の「再実行」ボタンをクリック

**期待結果**:

- [ ] クエリが再実行される
- [ ] ローディング表示になる
- [ ] 同じエラーが発生した場合は再度エラー表示される

### T-13: エラーからの回復

**目的**: エラー後に正常なクエリを実行できることを確認

**手順**:

1. 何らかのエラーを発生させる
2. SQLを修正
3. 「実行」ボタンをクリック

**期待結果**:

- [ ] エラー表示が消える
- [ ] 正常な結果が表示される

### T-14: ダークモードでのエラー表示

**目的**: ダークモードでエラー表示が適切にスタイリングされることを確認

**手順**:

1. ダークモードに切り替え
2. 何らかのエラーを発生させる

**期待結果**:

- [ ] エラー背景色がダークモードに適応（赤系のダークカラー）
- [ ] テキストが読みやすい
- [ ] ヒント背景色がダークモードに適応（黄色系のダークカラー）

---

## 自動テスト（テストコード）

操作で確認しにくい項目をテストコードで検証する。

### ユーティリティテスト

#### error-messages.spec.ts

```typescript
describe('error-messages', () => {
  describe('getErrorMessage', () => {
    it('returns correct message for each error code')
    it('returns unknown message for undefined code')
  })

  describe('getErrorHint', () => {
    it('returns hint for errors that have hints')
    it('returns null for errors without hints')
  })

  describe('getErrorIcon', () => {
    it('returns correct icon for each error code')
  })
})
```

### コンポーネントテスト

#### QueryErrorDisplay.spec.ts

```typescript
describe('QueryErrorDisplay', () => {
  it('renders error title and description')
  it('shows appropriate icon for error code')
  it('shows error position when available')
  it('shows object name when available')
  it('renders ErrorHint when hint is available')
  it('toggles details section on click')
  it('shows native error code when available')
  it('emits retry event when button clicked')
  it('has aria-live attribute for accessibility')
})
```

#### ErrorHint.spec.ts

```typescript
describe('ErrorHint', () => {
  it('renders hint title')
  it('renders suggestion text')
  it('renders examples when provided')
  it('does not render examples section when empty')
})
```

#### SqlPreview.spec.ts（エラーハイライト部分）

```typescript
describe('SqlPreview - error highlighting', () => {
  it('highlights error line with red background')
  it('calculates error line from position')
  it('calculates error column from position')
  it('shows wavy underline at error position')
  it('shows error position indicator')
  it('does not show highlighting when no error')
})
```

### ストアテスト

#### query-builder.spec.ts（エラー関連追加分）

```typescript
describe('query-builder store - error handling', () => {
  it('stores queryError on execution failure')
  it('clears queryError on successful execution')
  it('parses JSON error string correctly')
  it('handles Error object')
  it('handles unknown error type')
  it('clearError resets queryError')
})
```

---

## テスト実行コマンド

```bash
# 全テスト実行
npm run test:run

# エラー関連テストのみ実行
npm run test:run -- app/utils/__tests__/error-messages.spec.ts
npm run test:run -- app/components/query-builder/error/

# ウォッチモードでテスト
npm run test -- app/utils/__tests__/error-messages.spec.ts
```

---

## チェックリスト

### 機能テスト完了チェック

- [ ] T-1: 構文エラーの表示
- [ ] T-2: テーブル未存在エラーの表示
- [ ] T-3: カラム未存在エラーの表示
- [ ] T-4: 権限エラーの表示（該当する場合）
- [ ] T-5: 接続エラーの表示
- [ ] T-6: タイムアウトエラーの表示
- [ ] T-7: 一意制約違反エラーの表示
- [ ] T-8: 外部キー制約違反エラーの表示
- [ ] T-9: NOT NULL制約違反エラーの表示
- [ ] T-10: 構文エラー位置のハイライト
- [ ] T-11: エラー詳細の展開・折りたたみ
- [ ] T-12: リトライボタンの動作
- [ ] T-13: エラーからの回復
- [ ] T-14: ダークモードでのエラー表示

### 自動テスト実行チェック

- [ ] error-messages.spec.ts パス
- [ ] QueryErrorDisplay.spec.ts パス
- [ ] ErrorHint.spec.ts パス
- [ ] SqlPreview.spec.ts パス
- [ ] query-builder store テスト パス

### DB別テスト

- [ ] PostgreSQLでエラーマッピングが正しく動作する
- [ ] MySQLでエラーマッピングが正しく動作する
- [ ] SQLiteでエラーマッピングが正しく動作する

### 非機能テスト

- [ ] エラーメッセージが日本語で表示される
- [ ] ダークモードで正しく表示される
- [ ] aria-live属性が付与されている
- [ ] エラー種別ごとに適切なアイコンが表示される
