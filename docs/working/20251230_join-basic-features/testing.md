# Phase 6A: 基本的なJOIN機能 - テスト手順書

**作成日**: 2025-12-30
**フェーズ**: 6A

---

## 1. 概要

このドキュメントは、Phase 6A（基本的なJOIN機能）の動作確認手順を記載します。
可能な限り、手動操作による確認を優先し、操作で確認できない項目のみテストコードで確認します。

---

## 2. テスト環境

### 2.1 前提条件

- [ ] Tauriアプリが起動できる（`npm run tauri:dev`）
- [ ] PostgreSQL/MySQL/SQLiteのいずれかに接続できる
- [ ] サンプルデータベースが存在する（複数テーブル、外部キー関係あり）

### 2.2 サンプルデータベース構造（推奨）

**テーブル構成例**:

```sql
-- users テーブル
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);

-- orders テーブル
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  created_at TIMESTAMP
);

-- products テーブル
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  price DECIMAL(10, 2)
);
```

---

## 3. 操作による動作確認

### 3.1 JOIN追加の基本フロー

#### テストケース 1: INNER JOINの追加

**目的**: INNER JOINが正しく追加できることを確認

**手順**:
1. [ ] クエリビルダーを開く
2. [ ] データベースツリーから`orders`テーブルをドラッグ＆ドロップ
3. [ ] テーブル選択パネルで「+ JOINを追加」ボタンをクリック
4. [ ] JoinConfigDialogが表示されることを確認
5. [ ] JOIN種別で「INNER」を選択
6. [ ] 結合テーブルで「users」を選択
7. [ ] エイリアスに「u」を入力
8. [ ] ON条件の左側で「orders.user_id」を選択
9. [ ] 演算子で「=」を選択
10. [ ] ON条件の右側で「users.id」を選択
11. [ ] 「保存」ボタンをクリック
12. [ ] ダイアログが閉じることを確認
13. [ ] テーブル選択パネルにJOINが表示されることを確認
14. [ ] 生成されたSQLを確認

**期待される結果**:
```sql
SELECT ...
FROM "orders" AS "o"
INNER JOIN "users" AS "u" ON "o"."user_id" = "u"."id"
```

**確認項目**:
- [ ] JoinConfigDialogが正しく表示される
- [ ] JOIN種別、テーブル、エイリアス、ON条件が設定できる
- [ ] 保存後にダイアログが閉じる
- [ ] テーブル選択パネルにJOINが表示される
- [ ] 生成されたSQLにINNER JOIN句が含まれる

---

#### テストケース 2: LEFT JOINの追加

**目的**: LEFT JOINが正しく追加できることを確認

**手順**:
1. [ ] テストケース1の状態から続ける
2. [ ] 「+ JOINを追加」ボタンをクリック
3. [ ] JOIN種別で「LEFT」を選択
4. [ ] 結合テーブルで「products」を選択
5. [ ] エイリアスに「p」を入力
6. [ ] ON条件の左側で「orders.product_id」を選択
7. [ ] 演算子で「=」を選択
8. [ ] ON条件の右側で「products.id」を選択
9. [ ] 「保存」ボタンをクリック

**期待される結果**:
```sql
SELECT ...
FROM "orders" AS "o"
INNER JOIN "users" AS "u" ON "o"."user_id" = "u"."id"
LEFT JOIN "products" AS "p" ON "o"."product_id" = "p"."id"
```

**確認項目**:
- [ ] 複数のJOINが追加できる
- [ ] 生成されたSQLに複数のJOIN句が含まれる
- [ ] JOIN順序が正しい

---

#### テストケース 3: CROSS JOINの追加

**目的**: CROSS JOIN（ON条件なし）が正しく追加できることを確認

**手順**:
1. [ ] 新しいクエリビルダーを開く
2. [ ] `orders`テーブルを追加
3. [ ] 「+ JOINを追加」ボタンをクリック
4. [ ] JOIN種別で「CROSS」を選択
5. [ ] 結合テーブルで「users」を選択
6. [ ] ON条件の入力欄が非表示になることを確認
7. [ ] 「保存」ボタンをクリック

**期待される結果**:
```sql
SELECT ...
FROM "orders" AS "o"
CROSS JOIN "users" AS "u"
```

**確認項目**:
- [ ] CROSS JOIN選択時にON条件が非表示になる
- [ ] 生成されたSQLにON句が含まれない

---

### 3.2 JOIN編集フロー

#### テストケース 4: JOINの編集

**目的**: 既存のJOINを編集できることを確認

**手順**:
1. [ ] テストケース1の状態（INNER JOINが1つある状態）
2. [ ] テーブル選択パネルのJOINカードをクリック
3. [ ] JoinConfigDialogが表示され、既存の設定が表示されることを確認
4. [ ] JOIN種別を「LEFT」に変更
5. [ ] 「保存」ボタンをクリック
6. [ ] 生成されたSQLを確認

**期待される結果**:
```sql
SELECT ...
FROM "orders" AS "o"
LEFT JOIN "users" AS "u" ON "o"."user_id" = "u"."id"
```

**確認項目**:
- [ ] JOINカードクリックでダイアログが開く
- [ ] 既存の設定が表示される
- [ ] 設定を変更できる
- [ ] 変更が生成されたSQLに反映される

---

### 3.3 JOIN削除フロー

#### テストケース 5: JOINの削除

**目的**: JOINを削除できることを確認

**手順**:
1. [ ] テストケース2の状態（2つのJOINがある状態）
2. [ ] テーブル選択パネルの1つ目のJOINの削除ボタン（×）をクリック
3. [ ] JOINが削除されることを確認
4. [ ] 生成されたSQLを確認

**期待される結果**:
```sql
SELECT ...
FROM "orders" AS "o"
LEFT JOIN "products" AS "p" ON "o"."product_id" = "p"."id"
```

**確認項目**:
- [ ] 削除ボタンでJOINが削除される
- [ ] 削除されたJOINが生成SQLから消える
- [ ] 残りのJOINは正しく表示される

---

### 3.4 複数ON条件

#### テストケース 6: 複数ON条件（AND）

**目的**: 複数のON条件をANDで結合できることを確認

**手順**:
1. [ ] 新しいクエリビルダーを開く
2. [ ] `orders`テーブルを追加
3. [ ] 「+ JOINを追加」ボタンをクリック
4. [ ] JOIN種別で「INNER」を選択
5. [ ] 結合テーブルで「users」を選択
6. [ ] 1つ目のON条件: `orders.user_id = users.id`
7. [ ] 「+ 条件を追加」ボタンをクリック
8. [ ] 2つ目のON条件: `orders.status = users.status`
9. [ ] 条件の結合で「AND」を選択
10. [ ] 「保存」ボタンをクリック

**期待される結果**:
```sql
SELECT ...
FROM "orders" AS "o"
INNER JOIN "users" AS "u" ON "o"."user_id" = "u"."id" AND "o"."status" = "u"."status"
```

**確認項目**:
- [ ] 複数のON条件を追加できる
- [ ] AND結合が正しく動作する

---

#### テストケース 7: 複数ON条件（OR）

**目的**: 複数のON条件をORで結合できることを確認

**手順**:
1. [ ] テストケース6の状態から続ける
2. [ ] JOINカードをクリックして編集
3. [ ] 条件の結合で「OR」を選択
4. [ ] 「保存」ボタンをクリック

**期待される結果**:
```sql
SELECT ...
FROM "orders" AS "o"
INNER JOIN "users" AS "u" ON "o"."user_id" = "u"."id" OR "o"."status" = "u"."status"
```

**確認項目**:
- [ ] OR結合が正しく動作する

---

### 3.5 データベース方言対応

#### テストケース 8: PostgreSQL

**手順**:
1. [ ] PostgreSQLに接続
2. [ ] テストケース1のJOINを設定
3. [ ] 生成されたSQLを確認
4. [ ] 「実行」ボタンをクリック
5. [ ] クエリが正常に実行されることを確認

**確認項目**:
- [ ] PostgreSQL方言でSQLが生成される（識別子がダブルクォート）
- [ ] 実行可能なSQLが生成される

---

#### テストケース 9: MySQL

**手順**:
1. [ ] MySQLに接続
2. [ ] テストケース1のJOINを設定
3. [ ] 生成されたSQLを確認
4. [ ] 「実行」ボタンをクリック
5. [ ] クエリが正常に実行されることを確認

**確認項目**:
- [ ] MySQL方言でSQLが生成される（識別子がバッククォート）
- [ ] 実行可能なSQLが生成される

---

#### テストケース 10: SQLite

**手順**:
1. [ ] SQLiteに接続
2. [ ] テストケース1のJOINを設定
3. [ ] 生成されたSQLを確認
4. [ ] 「実行」ボタンをクリック
5. [ ] クエリが正常に実行されることを確認

**確認項目**:
- [ ] SQLite方言でSQLが生成される
- [ ] 実行可能なSQLが生成される

---

### 3.6 クエリ保存・復元

#### テストケース 11: JOIN設定を含むクエリの保存

**手順**:
1. [ ] テストケース2の状態（2つのJOINがある状態）
2. [ ] 「保存」ボタンをクリック
3. [ ] クエリ名を入力
4. [ ] 保存ダイアログで「保存」ボタンをクリック
5. [ ] 保存済みクエリ一覧を開く
6. [ ] 保存したクエリが表示されることを確認

**確認項目**:
- [ ] JOIN設定を含むクエリが保存できる

---

#### テストケース 12: JOIN設定を含むクエリの復元

**手順**:
1. [ ] 保存済みクエリ一覧を開く
2. [ ] テストケース11で保存したクエリをクリック
3. [ ] クエリビルダーが復元されることを確認
4. [ ] JOINが正しく復元されることを確認
5. [ ] 生成されたSQLが元と同じことを確認

**確認項目**:
- [ ] JOIN設定を含むクエリが正しく復元される
- [ ] 生成されるSQLが元と同じ

---

### 3.7 エッジケース

#### テストケース 13: テーブル削除時のJOIN削除

**手順**:
1. [ ] テストケース2の状態（2つのJOINがある状態）
2. [ ] テーブル選択パネルで`users`テーブルを削除
3. [ ] `users`をJOINしているJOINも削除されることを確認
4. [ ] 生成されたSQLを確認

**確認項目**:
- [ ] テーブル削除時に関連するJOINも削除される
- [ ] 他のJOINは残る

---

#### テストケース 14: エイリアス重複チェック

**手順**:
1. [ ] 新しいクエリビルダーを開く
2. [ ] `orders`テーブルを追加（エイリアス: `o`）
3. [ ] 「+ JOINを追加」ボタンをクリック
4. [ ] エイリアスに「o」を入力（重複）
5. [ ] エラーメッセージが表示されることを確認
6. [ ] 「保存」ボタンが無効になることを確認

**確認項目**:
- [ ] エイリアス重複時にエラーメッセージが表示される
- [ ] 保存ボタンが無効になる

---

#### テストケース 15: ON条件なしでの保存（CROSS JOIN以外）

**手順**:
1. [ ] 「+ JOINを追加」ボタンをクリック
2. [ ] JOIN種別で「INNER」を選択
3. [ ] 結合テーブルを選択
4. [ ] ON条件を追加せずに「保存」ボタンをクリック
5. [ ] エラーメッセージが表示されることを確認
6. [ ] ダイアログが閉じないことを確認

**確認項目**:
- [ ] ON条件がない場合にエラーメッセージが表示される
- [ ] 保存できない

---

### 3.8 パフォーマンス

#### テストケース 16: 複数JOIN（最大10個）

**手順**:
1. [ ] 新しいクエリビルダーを開く
2. [ ] メインテーブルを追加
3. [ ] 10個のJOINを追加
4. [ ] 各JOINが正しく表示されることを確認
5. [ ] 生成されたSQLを確認
6. [ ] SQL生成が300ms以内であることを確認（開発者ツールのパフォーマンスタブで計測）

**確認項目**:
- [ ] 10個のJOINを設定できる
- [ ] UIがスムーズに動作する
- [ ] SQL生成が300ms以内

---

## 4. テストコードによる確認

操作で確認できない以下の項目は、テストコードで確認します。

### 4.1 単体テスト（Vitest）

#### 4.1.1 JoinConditionRow.vue

```typescript
// app/components/query-builder/dialog/JoinConditionRow.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JoinConditionRow from './JoinConditionRow.vue'

describe('JoinConditionRow', () => {
  it('条件を正しく表示する', () => {
    // テスト実装
  })

  it('テーブル変更時にupdateイベントを発火する', async () => {
    // テスト実装
  })

  it('削除ボタンクリック時にremoveイベントを発火する', async () => {
    // テスト実装
  })
})
```

#### 4.1.2 JoinConfigDialog.vue

```typescript
// app/components/query-builder/dialog/JoinConfigDialog.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JoinConfigDialog from './JoinConfigDialog.vue'

describe('JoinConfigDialog', () => {
  it('新規作成時は空の状態で表示される', () => {
    // テスト実装
  })

  it('編集時は既存のJOIN設定が表示される', () => {
    // テスト実装
  })

  it('CROSS JOIN選択時にON条件が非表示になる', async () => {
    // テスト実装
  })

  it('バリデーションエラー時に保存できない', async () => {
    // テスト実装
  })
})
```

#### 4.1.3 query-builder.ts

```typescript
// app/stores/query-builder.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryBuilderStore } from './query-builder'

describe('query-builder store - JOIN機能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('JOINを追加できる', () => {
    // テスト実装
  })

  it('JOINを更新できる', () => {
    // テスト実装
  })

  it('JOINを削除できる', () => {
    // テスト実装
  })

  it('テーブル削除時に関連するJOINも削除される', () => {
    // テスト実装
  })
})
```

### 4.2 Rustテスト

#### 4.2.1 JOIN SQL生成テスト

```rust
// src-tauri/src/sql_generator/tests.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_inner_join() {
        // テスト実装
    }

    #[test]
    fn test_generate_left_join() {
        // テスト実装
    }

    #[test]
    fn test_generate_cross_join() {
        // テスト実装
    }

    #[test]
    fn test_generate_multiple_joins() {
        // テスト実装
    }

    #[test]
    fn test_generate_join_with_multiple_conditions_and() {
        // テスト実装
    }

    #[test]
    fn test_generate_join_with_multiple_conditions_or() {
        // テスト実装
    }
}
```

---

## 5. テスト実行コマンド

### 5.1 フロントエンドテスト

```bash
# 全テスト実行
npm run test:run

# JOINコンポーネントのみ
npm run test:run JoinConditionRow
npm run test:run JoinConfigDialog

# ストアテスト
npm run test:run query-builder
```

### 5.2 Rustテスト

```bash
# 全テスト実行
cd src-tauri
cargo test

# JOIN関連のみ
cargo test sql_generator
```

---

## 6. テスト結果記録

### 6.1 操作テスト結果

| テストケースID | テスト名 | 結果 | 実施日 | 備考 |
|---------------|---------|------|--------|------|
| TC1 | INNER JOINの追加 | - | - | - |
| TC2 | LEFT JOINの追加 | - | - | - |
| TC3 | CROSS JOINの追加 | - | - | - |
| TC4 | JOINの編集 | - | - | - |
| TC5 | JOINの削除 | - | - | - |
| TC6 | 複数ON条件（AND） | - | - | - |
| TC7 | 複数ON条件（OR） | - | - | - |
| TC8 | PostgreSQL | - | - | - |
| TC9 | MySQL | - | - | - |
| TC10 | SQLite | - | - | - |
| TC11 | クエリ保存 | - | - | - |
| TC12 | クエリ復元 | - | - | - |
| TC13 | テーブル削除時のJOIN削除 | - | - | - |
| TC14 | エイリアス重複チェック | - | - | - |
| TC15 | ON条件なしチェック | - | - | - |
| TC16 | 複数JOIN | - | - | - |

### 6.2 単体テスト結果

```bash
# テスト実行後にここに結果を貼り付ける
```

---

## 7. 完了条件チェックリスト

- [ ] JOIN設定ダイアログでINNER/LEFT/RIGHT/FULL OUTERを選択できる
- [ ] ON条件を複数設定できる（AND/OR対応）
- [ ] 設定したJOINが正しいSQLに変換される
- [ ] 保存したクエリにJOIN設定が含まれる
- [ ] PostgreSQL/MySQL/SQLiteで実行可能なSQLが生成される
- [ ] 全ての操作テストがパスする
- [ ] 全ての単体テストがパスする

---

## 8. 不具合・改善事項

実装・テスト中に発見した不具合や改善事項を記録します。

| ID | 内容 | 優先度 | 状態 | 対応策 |
|----|------|--------|------|--------|
| - | - | - | - | - |
