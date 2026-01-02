# テスト手順書: 8.4 DELETEビルダー

## 概要

このドキュメントでは、8.4 DELETEビルダー機能のテスト手順を記載します。
可能な限り操作手順で確認する方法を優先し、操作で確認できない項目のみテストコードを記載します。

## テスト環境

### 前提条件

- ✅ Tauri開発サーバーが起動している（`npm run tauri:dev`）
- ✅ テスト用データベース接続が設定されている（PostgreSQL/MySQL/SQLite）
- ✅ テスト用データベースにテストテーブルが存在する

### テスト用データベース準備

以下のSQLを実行してテストテーブルを作成します:

```sql
-- PostgreSQL/MySQL/SQLite共通

-- テストテーブル作成
CREATE TABLE test_delete_users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  age INTEGER
);

-- テストデータ挿入
INSERT INTO test_delete_users (id, name, email, age) VALUES
  (1, 'Alice', 'alice@example.com', 25),
  (2, 'Bob', 'bob@example.com', 30),
  (3, 'Charlie', 'charlie@example.com', 35),
  (4, 'David', 'david@example.com', 40),
  (5, 'Eve', 'eve@example.com', 45);
```

## 操作手順によるテスト

### テストケース1: 基本的なDELETE操作

**目的**: テーブル選択 → WHERE条件設定 → DELETE実行が正しく動作することを確認

**手順**:

1. アプリを起動し、データベースに接続
2. サイドバーから「データ変更」を選択
3. ツールバーの「DELETE」タブをクリック
4. テーブル選択ドロップダウンから「test_delete_users」を選択

**期待結果**:
- ✅ DeletePanel.vueが表示される
- ✅ テーブル選択ドロップダウンに「test_delete_users」が表示される
- ✅ WHERE条件設定エリアが表示される
- ✅ SQLプレビューに「DELETE FROM test_delete_users」が表示される

5. 「条件追加」ボタンをクリック
6. カラムドロップダウンから「test_delete_users.id」を選択
7. 演算子は「=」のまま
8. 値に「1」を入力

**期待結果**:
- ✅ WHERE条件が追加される
- ✅ SQLプレビューに「DELETE FROM test_delete_users WHERE test_delete_users.id = 1」が表示される

9. ツールバーの「実行」ボタンをクリック
10. 警告ダイアログが表示されるので「確認」をクリック

**期待結果**:
- ✅ DELETE文が実行される
- ✅ 結果パネルに「1 rows deleted」が表示される

11. SQLエディタで「SELECT * FROM test_delete_users」を実行

**期待結果**:
- ✅ id=1のレコードが削除されている
- ✅ id=2,3,4,5のレコードは残っている

---

### テストケース2: WHERE句なし警告（最重要）

**目的**: WHERE句がない場合に最も強い警告が表示されることを確認

**手順**:

1. テストケース1の後、test_delete_usersテーブルを再度選択
2. WHERE条件をすべて削除（×ボタンをクリック）

**期待結果**:
- ✅ DeletePanel内に赤色のアラートが表示される
- ✅ アラートのタイトルが「警告: WHERE句がありません」
- ✅ アラートの説明に「WHERE句を指定しないと、テーブルの全行が削除されます」が含まれる
- ✅ SQLプレビューに「DELETE FROM test_delete_users」が表示される（WHERE句なし）

3. ツールバーの「実行」ボタンをクリック

**期待結果**:
- ✅ DangerousQueryDialogが表示される
- ✅ ダイアログの警告レベルが「danger」（赤色）
- ✅ ダイアログのメッセージに「WHERE句がないため、テーブルの全行が削除されます」が含まれる
- ✅ 確認チェックボックスが表示される

4. チェックボックスをオンにせずに「実行」ボタンをクリック

**期待結果**:
- ✅ 実行されない（ボタンが無効化されている、またはエラーメッセージが表示される）

5. チェックボックスをオンにして「実行」ボタンをクリック

**期待結果**:
- ✅ DELETE文が実行される
- ✅ 結果パネルに「4 rows deleted」が表示される（残りの4件が削除）

6. SQLエディタで「SELECT * FROM test_delete_users」を実行

**期待結果**:
- ✅ すべてのレコードが削除されている（0件）

---

### テストケース3: 複数条件のDELETE

**目的**: 複数のWHERE条件を設定してDELETE実行できることを確認

**手順**:

1. テストデータを再挿入（上記の「テスト用データベース準備」のINSERT文を実行）
2. mutation-builderページで「DELETE」タブを選択
3. test_delete_usersテーブルを選択
4. 「条件追加」ボタンをクリック
5. 1つ目の条件: 「test_delete_users.age」 「>」 「30」
6. 「条件追加」ボタンをクリック
7. 2つ目の条件: 「test_delete_users.age」 「<」 「45」

**期待結果**:
- ✅ 2つの条件が表示される
- ✅ SQLプレビューに「DELETE FROM test_delete_users WHERE test_delete_users.age > 30 AND test_delete_users.age < 45」が表示される

8. 「実行」ボタンをクリック
9. 警告ダイアログが表示されるので「確認」をクリック

**期待結果**:
- ✅ DELETE文が実行される
- ✅ 結果パネルに「2 rows deleted」が表示される（age=35,40の2件が削除）

10. SQLエディタで「SELECT * FROM test_delete_users」を実行

**期待結果**:
- ✅ id=1,2,5のレコードが残っている（age=25,30,45）
- ✅ id=3,4のレコードが削除されている（age=35,40）

---

### テストケース4: 条件グループのDELETE

**目的**: 条件グループ（ネスト）を使用したDELETE実行ができることを確認

**手順**:

1. テストデータを再挿入（上記の「テスト用データベース準備」のINSERT文を実行）
2. mutation-builderページで「DELETE」タブを選択
3. test_delete_usersテーブルを選択
4. 「条件追加」ボタンをクリック
5. 1つ目の条件: 「test_delete_users.age」 「<」 「30」
6. 「グループ追加」ボタンをクリック
7. グループ内に条件を追加: 「test_delete_users.name」 「=」 「'Charlie'」
8. グループ内にもう1つ条件を追加: 「test_delete_users.name」 「=」 「'Eve'」
9. グループのロジックを「OR」に変更

**期待結果**:
- ✅ 条件グループが表示される
- ✅ SQLプレビューに「DELETE FROM test_delete_users WHERE test_delete_users.age < 30 AND (test_delete_users.name = 'Charlie' OR test_delete_users.name = 'Eve')」が表示される

10. 「実行」ボタンをクリック
11. 警告ダイアログが表示されるので「確認」をクリック

**期待結果**:
- ✅ DELETE文が実行される
- ✅ 結果パネルに「3 rows deleted」が表示される（age<30のAlice + Charlie + Eve）

12. SQLエディタで「SELECT * FROM test_delete_users」を実行

**期待結果**:
- ✅ id=2,4のレコードが残っている（Bob, David）

---

### テストケース5: エラーハンドリング

**目的**: エラー発生時に適切なエラーメッセージが表示されることを確認

**手順**:

1. mutation-builderページで「DELETE」タブを選択
2. 存在しないテーブル名を直接入力（または選択）
   - 注: テーブルドロップダウンではなく、ストアを直接操作する必要があるかもしれません
   - テスト目的のため、一時的に無効なテーブル名を設定
3. 「実行」ボタンをクリック

**期待結果**:
- ✅ エラーダイアログが表示される
- ✅ エラーメッセージに「Table does not exist」または同様のメッセージが含まれる

---

### テストケース6: クエリ履歴への記録

**目的**: DELETE実行がクエリ履歴に記録されることを確認

**手順**:

1. テストケース1〜5のいずれかを実行
2. ツールバーの「履歴」ボタンをクリック

**期待結果**:
- ✅ QueryHistorySlideoverが表示される
- ✅ 実行したDELETE文が履歴に記録されている
- ✅ 削除行数が表示されている
- ✅ 実行日時が表示されている

---

### テストケース7: DB方言対応

**目的**: PostgreSQL/MySQL/SQLiteで正しいDELETE文が生成されることを確認

**手順**:

1. PostgreSQL接続でテストケース1を実行

**期待結果**:
- ✅ SQLプレビューに「DELETE FROM "test_delete_users" WHERE "test_delete_users"."id" = 1」が表示される（ダブルクォート）

2. MySQL接続でテストケース1を実行

**期待結果**:
- ✅ SQLプレビューに「DELETE FROM `test_delete_users` WHERE `test_delete_users`.`id` = 1」が表示される（バッククォート）

3. SQLite接続でテストケース1を実行

**期待結果**:
- ✅ SQLプレビューに「DELETE FROM "test_delete_users" WHERE "test_delete_users"."id" = 1」が表示される（ダブルクォート）

---

## テストコードによるテスト

操作で確認できない項目について、以下のテストコードを作成します。

### 単体テスト（Rust）

#### `src-tauri/src/query/mutation.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::dialect::{PostgresDialect, MysqlDialect, SqliteDialect};
    use crate::types::query::{DeleteQueryModel, WhereCondition};

    #[test]
    fn test_generate_delete_sql_with_where_postgres() {
        let model = DeleteQueryModel {
            table: Some("users".to_string()),
            where_conditions: vec![
                WhereCondition {
                    id: "1".to_string(),
                    r#type: "condition".to_string(),
                    column: Some(ColumnRef {
                        table_id: "users".to_string(),
                        column_name: "id".to_string(),
                    }),
                    operator: "=".to_string(),
                    value: "1".to_string(),
                    is_valid: true,
                },
            ],
        };

        let dialect = PostgresDialect::new();
        let sql = generate_delete_sql(&model, &dialect).unwrap();

        assert_eq!(sql, "DELETE FROM \"users\" WHERE \"users\".\"id\" = 1");
    }

    #[test]
    fn test_generate_delete_sql_with_where_mysql() {
        let model = DeleteQueryModel {
            table: Some("users".to_string()),
            where_conditions: vec![
                WhereCondition {
                    id: "1".to_string(),
                    r#type: "condition".to_string(),
                    column: Some(ColumnRef {
                        table_id: "users".to_string(),
                        column_name: "id".to_string(),
                    }),
                    operator: "=".to_string(),
                    value: "1".to_string(),
                    is_valid: true,
                },
            ],
        };

        let dialect = MysqlDialect::new();
        let sql = generate_delete_sql(&model, &dialect).unwrap();

        assert_eq!(sql, "DELETE FROM `users` WHERE `users`.`id` = 1");
    }

    #[test]
    fn test_generate_delete_sql_without_where() {
        let model = DeleteQueryModel {
            table: Some("users".to_string()),
            where_conditions: vec![],
        };

        let dialect = PostgresDialect::new();
        let sql = generate_delete_sql(&model, &dialect).unwrap();

        assert_eq!(sql, "DELETE FROM \"users\"");
    }

    #[test]
    fn test_generate_delete_sql_with_multiple_conditions() {
        let model = DeleteQueryModel {
            table: Some("users".to_string()),
            where_conditions: vec![
                WhereCondition {
                    id: "1".to_string(),
                    r#type: "condition".to_string(),
                    column: Some(ColumnRef {
                        table_id: "users".to_string(),
                        column_name: "age".to_string(),
                    }),
                    operator: ">".to_string(),
                    value: "30".to_string(),
                    is_valid: true,
                },
                WhereCondition {
                    id: "2".to_string(),
                    r#type: "condition".to_string(),
                    column: Some(ColumnRef {
                        table_id: "users".to_string(),
                        column_name: "age".to_string(),
                    }),
                    operator: "<".to_string(),
                    value: "50".to_string(),
                    is_valid: true,
                },
            ],
        };

        let dialect = PostgresDialect::new();
        let sql = generate_delete_sql(&model, &dialect).unwrap();

        assert_eq!(
            sql,
            "DELETE FROM \"users\" WHERE \"users\".\"age\" > 30 AND \"users\".\"age\" < 50"
        );
    }

    #[test]
    fn test_generate_delete_sql_without_table() {
        let model = DeleteQueryModel {
            table: None,
            where_conditions: vec![],
        };

        let dialect = PostgresDialect::new();
        let result = generate_delete_sql(&model, &dialect);

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Table is required");
    }
}
```

### コンポーネントテスト（Vue）

#### `app/components/mutation-builder/DeletePanel.vue`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DeletePanel from '@/components/mutation-builder/DeletePanel.vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

describe('DeletePanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('テーブル未選択時に空状態を表示する', () => {
    const wrapper = mount(DeletePanel)
    expect(wrapper.text()).toContain('テーブルを選択してください')
  })

  it('WHERE句がない場合に警告を表示する', async () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('public.users')
    store.setMutationType('DELETE')

    const wrapper = mount(DeletePanel)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('WHERE句がありません')
    expect(wrapper.text()).toContain('テーブルの全行が削除されます')
  })

  it('WHERE条件がある場合に警告を表示しない', async () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('public.users')
    store.setMutationType('DELETE')
    store.addWhereCondition({
      id: '1',
      type: 'condition',
      column: { tableId: 'users', columnName: 'id' },
      operator: '=',
      value: '1',
      isValid: true,
    })

    const wrapper = mount(DeletePanel)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('WHERE句がありません')
  })
})
```

### E2Eテスト（Playwright）

#### `tests/e2e/delete-builder.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('DELETEビルダー', () => {
  test.beforeEach(async ({ page }) => {
    // アプリ起動
    await page.goto('http://localhost:1420')

    // データベース接続（テスト用接続を選択）
    await page.click('text=テスト用PostgreSQL')

    // mutation-builderページに移動
    await page.click('text=データ変更')

    // DELETEタブを選択
    await page.click('button:has-text("DELETE")')
  })

  test('基本的なDELETE操作', async ({ page }) => {
    // テーブル選択
    await page.click('button:has-text("テーブルを選択")')
    await page.click('text=test_delete_users')

    // WHERE条件追加
    await page.click('button:has-text("条件追加")')
    await page.selectOption('select[name="column"]', 'test_delete_users.id')
    await page.fill('input[name="value"]', '1')

    // SQLプレビュー確認
    const sqlPreview = await page.textContent('.sql-preview')
    expect(sqlPreview).toContain('DELETE FROM')
    expect(sqlPreview).toContain('WHERE')

    // 実行
    await page.click('button:has-text("実行")')

    // 確認ダイアログ
    await page.click('button:has-text("確認")')

    // 結果確認
    await expect(page.locator('text=1 rows deleted')).toBeVisible()
  })

  test('WHERE句なし警告', async ({ page }) => {
    // テーブル選択
    await page.click('button:has-text("テーブルを選択")')
    await page.click('text=test_delete_users')

    // 警告アラート確認
    await expect(page.locator('text=WHERE句がありません')).toBeVisible()
    await expect(page.locator('text=テーブルの全行が削除されます')).toBeVisible()

    // 実行
    await page.click('button:has-text("実行")')

    // dangerレベルダイアログ確認
    await expect(page.locator('[data-level="danger"]')).toBeVisible()

    // チェックボックス確認
    const checkbox = page.locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()

    // チェックせずに実行ボタンクリック → 無効化されているはず
    const executeButton = page.locator('button:has-text("実行")')
    await expect(executeButton).toBeDisabled()

    // チェックして実行
    await checkbox.check()
    await executeButton.click()

    // 結果確認
    await expect(page.locator('text=rows deleted')).toBeVisible()
  })
})
```

---

## テスト完了チェックリスト

### 操作手順によるテスト

- [ ] テストケース1: 基本的なDELETE操作
- [ ] テストケース2: WHERE句なし警告（最重要）
- [ ] テストケース3: 複数条件のDELETE
- [ ] テストケース4: 条件グループのDELETE
- [ ] テストケース5: エラーハンドリング
- [ ] テストケース6: クエリ履歴への記録
- [ ] テストケース7: DB方言対応

### テストコードによるテスト

- [ ] 単体テスト（Rust）: `generate_delete_sql`
- [ ] コンポーネントテスト（Vue）: DeletePanel.vue
- [ ] E2Eテスト（Playwright）: delete-builder.spec.ts

### テスト環境

- [ ] PostgreSQL
- [ ] MySQL
- [ ] SQLite

## テスト結果記録

| テストケース | 実施日 | 結果 | 備考 |
|------------|--------|------|------|
| テストケース1 | - | - | - |
| テストケース2 | - | - | - |
| テストケース3 | - | - | - |
| テストケース4 | - | - | - |
| テストケース5 | - | - | - |
| テストケース6 | - | - | - |
| テストケース7 | - | - | - |
| 単体テスト（Rust） | - | - | - |
| コンポーネントテスト（Vue） | - | - | - |
| E2Eテスト（Playwright） | - | - | - |

## トラブルシューティング

### 問題: WHERE句なし警告が表示されない

**原因**: mutation-builderストアの`queryModel.whereConditions`が正しく初期化されていない

**対処**:
1. ブラウザの開発者ツールでストアの状態を確認
2. `queryModel.whereConditions`が空配列（`[]`）であることを確認
3. 空配列でない場合、ストアの初期化ロジックを確認

### 問題: DELETE実行時にエラーが発生

**原因**: テーブルが存在しない、または権限がない

**対処**:
1. SQLエディタで「SELECT * FROM test_delete_users」を実行して、テーブルが存在することを確認
2. DELETE権限があることを確認（「DELETE FROM test_delete_users WHERE 1=0」を実行）
3. データベース接続情報を確認

### 問題: テストコードが実行されない

**原因**: Vitestの設定が不足している

**対処**:
1. `vitest.config.ts`にVueコンポーネントのサポートが含まれていることを確認
2. `@vue/test-utils`がインストールされていることを確認
3. `npm run test`でテストを実行

---

## まとめ

このテスト手順書に従って、8.4 DELETEビルダー機能のすべての側面をテストします。
操作手順によるテストで基本的な動作を確認し、テストコードで細かいエッジケースをカバーします。

すべてのテストが完了したら、永続化ドキュメント（docs/features/）を更新し、
Phase 8.4が完了したことをdocs/sql_editor_wbs_v3.mdに記録します。
