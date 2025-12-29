# テスト手順書: 結果表示UI

## 概要

結果表示UI（Phase 2.2）の機能を検証するためのテスト手順書。
可能な限り操作手順で確認し、操作で確認できない項目のみテストコードで検証する。

## 前提条件

- Phase 2.1 クエリ実行基盤（Rust）が完成していること
- テスト用のデータベース接続が設定されていること
- `npm run tauri:dev` でアプリが起動できること

## テスト環境準備

### テスト用データベース

PostgreSQL、MySQL、SQLiteのいずれかで以下のテストデータを用意：

```sql
-- テスト用テーブル
CREATE TABLE test_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    age INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- テストデータ（100行程度）
INSERT INTO test_users (name, email, age, is_active) VALUES
    ('Alice', 'alice@example.com', 30, true),
    ('Bob', NULL, 25, true),  -- NULLテスト用
    ('Charlie', 'charlie@example.com', NULL, false),  -- NULLテスト用
    -- ... 追加データ
;
```

---

## 操作テスト手順

### T-1: 基本的なクエリ実行と結果表示

**目的**: クエリを実行して結果が正しく表示されることを確認

**手順**:

1. アプリを起動（`npm run tauri:dev`）
2. 接続を選択してクエリビルダー画面を開く
3. データベースツリーから`test_users`テーブルをドラッグ&ドロップ
4. SELECTタブで`id`, `name`, `email`カラムを選択
5. ツールバーの「実行」ボタンをクリック

**期待結果**:

- [ ] 結果パネルが表示される
- [ ] ヘッダーに「実行結果」と表示される
- [ ] カラムヘッダーに`id`, `name`, `email`が表示される
- [ ] データ行が表形式で表示される
- [ ] 実行情報（行数、実行時間）がヘッダーに表示される

### T-2: NULL値の表示

**目的**: NULL値が視覚的に識別可能に表示されることを確認

**手順**:

1. `test_users`テーブルで`email`と`age`カラムを選択
2. クエリを実行

**期待結果**:

- [ ] NULL値が`NULL`というラベルで表示される
- [ ] NULL値は斜体またはグレー背景で表示される
- [ ] 空文字列とNULLが区別できる

### T-3: カラムヘッダーのデータ型表示

**目的**: カラムヘッダーにデータ型が表示されることを確認

**手順**:

1. `test_users`テーブルで全カラムを選択
2. クエリを実行
3. カラムヘッダーを確認

**期待結果**:

- [ ] `id`の下に`integer`または類似の型名が表示される
- [ ] `name`の下に`varchar`または`text`が表示される
- [ ] `is_active`の下に`boolean`が表示される
- [ ] `created_at`の下に`timestamp`が表示される

### T-4: ページネーション - ページ切り替え

**目的**: ページネーションが正しく動作することを確認

**手順**:

1. 50行以上のデータがあるテーブルでクエリを実行
2. ページサイズを「10件」に設定
3. 次ページボタン（→）をクリック
4. 前ページボタン（←）をクリック
5. 最終ページボタン（»）をクリック
6. 最初ページボタン（«）をクリック

**期待結果**:

- [ ] 次ページに移動すると11-20行目が表示される
- [ ] 前ページに戻ると1-10行目が表示される
- [ ] 最終ページに移動すると最後の行が表示される
- [ ] 最初ページに戻ると1-10行目が表示される
- [ ] 現在ページ/総ページ数が正しく表示される

### T-5: ページネーション - ページサイズ変更

**目的**: ページサイズ変更が正しく動作することを確認

**手順**:

1. 100行以上のデータでクエリを実行
2. ページサイズを「25件」に変更
3. ページサイズを「50件」に変更
4. ページサイズを「100件」に変更

**期待結果**:

- [ ] 25件に変更すると25行が表示される
- [ ] 50件に変更すると50行が表示される
- [ ] 100件に変更すると100行が表示される
- [ ] ページサイズ変更後は1ページ目に戻る

### T-6: ページネーション - 境界値

**目的**: ページネーションの境界値が正しく処理されることを確認

**手順**:

1. 最初のページで前ページボタンを確認
2. 最終ページで次ページボタンを確認
3. 総件数がページサイズより少ない場合を確認

**期待結果**:

- [ ] 最初のページで前ページボタンが無効化されている
- [ ] 最終ページで次ページボタンが無効化されている
- [ ] 総件数がページサイズより少ない場合、ページネーションは1/1

### T-7: 空の結果（0件）

**目的**: 結果が0件の場合の表示を確認

**手順**:

1. WHERE条件で存在しない条件を設定（例: `id = -1`）
2. クエリを実行

**期待結果**:

- [ ] 「結果が0件です」というメッセージが表示される
- [ ] ページネーションは表示されないか、0件と表示される

### T-8: ローディング表示

**目的**: クエリ実行中のローディング表示を確認

**手順**:

1. 大量データまたは時間のかかるクエリを用意
2. クエリを実行

**期待結果**:

- [ ] 実行中はローディングスピナーが表示される
- [ ] 「実行中...」というテキストが表示される
- [ ] 実行完了後、結果が表示される

### T-9: エラー表示

**目的**: クエリエラー時の表示を確認

**手順**:

1. 構文エラーのあるSQLを実行（手動でSQLを編集する場合）
2. 存在しないテーブルを参照するクエリを実行

**期待結果**:

- [ ] エラーメッセージが表示される
- [ ] エラーの内容がわかりやすく表示される

### T-10: 結果パネルの閉じるボタン

**目的**: 結果パネルを閉じられることを確認

**手順**:

1. クエリを実行して結果を表示
2. 結果パネルの×ボタンをクリック

**期待結果**:

- [ ] 結果パネルが閉じられる
- [ ] 再度実行すると結果パネルが表示される

---

## 自動テスト（テストコード）

操作で確認しにくい項目をテストコードで検証する。

### コンポーネントテスト

#### ResultTable.spec.ts

```typescript
describe('ResultTable', () => {
  it('renders column headers correctly')
  it('renders rows correctly')
  it('displays NULL indicator for null values')
  it('shows empty message when no rows')
  it('applies sticky header style')
})
```

#### ResultColumnHeader.spec.ts

```typescript
describe('ResultColumnHeader', () => {
  it('displays column name')
  it('displays data type')
  it('maps data type to display name')
})
```

#### ResultRow.spec.ts

```typescript
describe('ResultRow', () => {
  it('renders all values in row')
  it('formats null value correctly')
  it('formats boolean value correctly')
  it('formats number value correctly')
  it('formats binary data correctly')
  it('applies hover style')
})
```

#### ResultPagination.spec.ts

```typescript
describe('ResultPagination', () => {
  it('calculates total pages correctly')
  it('emits page-change event when navigating')
  it('emits page-size-change event')
  it('disables previous button on first page')
  it('disables next button on last page')
  it('displays row range correctly')
})
```

### ストアテスト

#### query-builder.spec.ts（追加分）

```typescript
describe('query-builder store - executeQuery', () => {
  it('sets isExecuting during query execution')
  it('stores query result on success')
  it('handles query error')
  it('resets to page 1 after new query')
})

describe('query-builder store - pagination', () => {
  it('calculates paginated rows correctly')
  it('updates current page')
  it('updates page size and resets to page 1')
  it('clears result')
})
```

---

## テスト実行コマンド

```bash
# 全テスト実行
npm run test:run

# 特定のテストファイル実行
npm run test:run -- app/components/query-builder/result/__tests__/ResultTable.spec.ts

# ウォッチモードでテスト
npm run test -- app/components/query-builder/result/
```

---

## チェックリスト

### 機能テスト完了チェック

- [ ] T-1: 基本的なクエリ実行と結果表示
- [ ] T-2: NULL値の表示
- [ ] T-3: カラムヘッダーのデータ型表示
- [ ] T-4: ページネーション - ページ切り替え
- [ ] T-5: ページネーション - ページサイズ変更
- [ ] T-6: ページネーション - 境界値
- [ ] T-7: 空の結果（0件）
- [ ] T-8: ローディング表示
- [ ] T-9: エラー表示
- [ ] T-10: 結果パネルの閉じるボタン

### 自動テスト実行チェック

- [ ] ResultTable.spec.ts パス
- [ ] ResultColumnHeader.spec.ts パス
- [ ] ResultRow.spec.ts パス
- [ ] ResultPagination.spec.ts パス
- [ ] query-builder store テスト パス

### 非機能テスト

- [ ] 1000行のデータを遅延なく表示できる
- [ ] ダークモードで正しく表示される
- [ ] テーブルにaria属性が付与されている
