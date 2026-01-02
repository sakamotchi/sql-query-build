# テスト手順書: 8.5 安全機能統合

## 概要

このドキュメントでは、8.5 安全機能統合のテスト手順を記載します。
可能な限り操作手順で確認する方法を優先し、操作で確認できない項目のみテストコードを記載します。

## テスト環境

### 前提条件

- ✅ Tauri開発サーバーが起動している（`npm run tauri:dev`）
- ✅ テスト用データベース接続が設定されている（PostgreSQL/MySQL/SQLite）
- ✅ テスト用データベースにテストテーブルが存在する
- ✅ 安全設定が有効になっている（本番環境モード）

### テスト用データベース準備

以下のSQLを実行してテストテーブルを作成します:

```sql
-- PostgreSQL/MySQL/SQLite共通

-- テストテーブル作成
CREATE TABLE test_safety_users (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  age INTEGER
);

-- テストデータ挿入
INSERT INTO test_safety_users (id, name, email, age) VALUES
  (1, 'Alice', 'alice@example.com', 25),
  (2, 'Bob', 'bob@example.com', 30),
  (3, 'Charlie', 'charlie@example.com', 35),
  (4, 'David', 'david@example.com', 40),
  (5, 'Eve', 'eve@example.com', 45);
```

## 操作手順によるテスト

### テストケース1: INSERT実行時の確認ダイアログ

**目的**: INSERT実行時にinfoレベルの確認ダイアログが表示されることを確認

**手順**:

1. アプリを起動し、データベースに接続
2. サイドバーから「データ変更」を選択
3. ツールバーの「INSERT」タブをクリック
4. テーブル選択ドロップダウンから「test_safety_users」を選択
5. カラム値を入力:
   - id: 6
   - name: 'Frank'
   - email: 'frank@example.com'
   - age: 50

**期待結果**:
- ✅ InsertPanel.vueが表示される
- ✅ カラム値入力フォームが表示される
- ✅ SQLプレビューに「INSERT INTO test_safety_users ...」が表示される

6. ツールバーの「実行」ボタンをクリック

**期待結果**:
- ✅ DangerousQueryDialogが表示される
- ✅ ダイアログのタイトルが「データを挿入します」
- ✅ ダイアログの説明に「テーブルに新しいデータを挿入します。よろしいですか?」が含まれる
- ✅ 危険度バッジが表示される（riskLevel: 'safe'または表示なし）
- ✅ カウントダウンは表示されない
- ✅ 確認チェックボックスは表示されない

7. 「実行する」ボタンをクリック

**期待結果**:
- ✅ INSERT文が実行される
- ✅ 結果パネルに「1 rows inserted」が表示される

8. SQLエディタで「SELECT * FROM test_safety_users WHERE id = 6」を実行

**期待結果**:
- ✅ id=6のレコードが挿入されている

---

### テストケース2: UPDATE（WHERE有）実行時の警告ダイアログ

**目的**: UPDATE（WHERE有）実行時にwarningレベルの警告ダイアログが表示されることを確認

**手順**:

1. mutation-builderページで「UPDATE」タブを選択
2. test_safety_usersテーブルを選択
3. SETタブで以下を設定:
   - カラム: age
   - 値: 99
4. WHEREタブで以下を設定:
   - カラム: test_safety_users.id
   - 演算子: =
   - 値: 6

**期待結果**:
- ✅ UpdatePanel.vueが表示される
- ✅ SETタブにカラム=値のペアが表示される
- ✅ WHEREタブにWHERE条件が表示される
- ✅ SQLプレビューに「UPDATE test_safety_users SET age = 99 WHERE test_safety_users.id = 6」が表示される

5. ツールバーの「実行」ボタンをクリック

**期待結果**:
- ✅ DangerousQueryDialogが表示される
- ✅ ダイアログのタイトルが「データを更新します」
- ✅ ダイアログの説明に「選択した行のデータを更新します。よろしいですか?」が含まれる
- ✅ 危険度バッジが「警告」レベル（warningレベル、黄色）
- ✅ カウントダウンが3秒から開始される
- ✅ カウントダウン中は実行ボタンが「実行する (3秒待機)」のように表示される

6. カウントダウンが完了するまで待つ（3秒）

**期待結果**:
- ✅ カウントダウンが0秒になる
- ✅ 実行ボタンが「実行する」に変わる
- ✅ 実行ボタンがクリック可能になる

7. 「実行する」ボタンをクリック

**期待結果**:
- ✅ UPDATE文が実行される
- ✅ 結果パネルに「1 rows updated」が表示される

8. SQLエディタで「SELECT * FROM test_safety_users WHERE id = 6」を実行

**期待結果**:
- ✅ id=6のレコードのageが99に更新されている

---

### テストケース3: UPDATE（WHERE無）実行時の最重要警告

**目的**: UPDATE（WHERE無）実行時にdangerレベルの警告ダイアログが表示されることを確認

**手順**:

1. mutation-builderページで「UPDATE」タブを選択
2. test_safety_usersテーブルを選択
3. SETタブで以下を設定:
   - カラム: age
   - 値: 100
4. WHEREタブでWHERE条件をすべて削除（×ボタンをクリック）

**期待結果**:
- ✅ UpdatePanel内に赤色のアラートが表示される
- ✅ アラートのタイトルが「警告: WHERE句がありません」
- ✅ アラートの説明に「WHERE句を指定しないと、テーブルの全行が更新されます」が含まれる
- ✅ SQLプレビューに「UPDATE test_safety_users SET age = 100」が表示される（WHERE句なし）

5. ツールバーの「実行」ボタンをクリック

**期待結果**:
- ✅ DangerousQueryDialogが表示される
- ✅ ダイアログのタイトルが「全行を更新します」
- ✅ ダイアログの説明に「WHERE句がないため、テーブルの全行が更新されます。本当に実行しますか?」が含まれる
- ✅ 危険度バッジが「危険」レベル（dangerレベル、赤色）
- ✅ リスクファクターに「WHERE句がないため、テーブルの全行が更新されます」が表示される
- ✅ カウントダウンが5秒から開始される
- ✅ 確認チェックボックスが表示される（「上記の内容を理解し、実行することを確認しました」）

6. チェックボックスをオンにせずに「実行する」ボタンをクリック

**期待結果**:
- ✅ 実行されない（ボタンが無効化されている）

7. チェックボックスをオンにする

**期待結果**:
- ✅ カウントダウン完了まで待つ必要がある

8. カウントダウンが完了するまで待つ（5秒）

**期待結果**:
- ✅ カウントダウンが0秒になる
- ✅ 実行ボタンがクリック可能になる

9. 「実行する」ボタンをクリック

**期待結果**:
- ✅ UPDATE文が実行される
- ✅ 結果パネルに「6 rows updated」が表示される（テスト用に挿入した6件すべて）

10. SQLエディタで「SELECT * FROM test_safety_users」を実行

**期待結果**:
- ✅ すべてのレコードのageが100に更新されている

---

### テストケース4: DELETE（WHERE有）実行時の警告ダイアログ

**目的**: DELETE（WHERE有）実行時にwarningレベルの警告ダイアログが表示されることを確認

**手順**:

1. テストデータを再挿入（上記の「テスト用データベース準備」のINSERT文を実行）
2. mutation-builderページで「DELETE」タブを選択
3. test_safety_usersテーブルを選択
4. WHERE条件を設定:
   - カラム: test_safety_users.id
   - 演算子: =
   - 値: 1

**期待結果**:
- ✅ DeletePanel.vueが表示される
- ✅ WHERE条件が表示される
- ✅ SQLプレビューに「DELETE FROM test_safety_users WHERE test_safety_users.id = 1」が表示される

5. ツールバーの「実行」ボタンをクリック

**期待結果**:
- ✅ DangerousQueryDialogが表示される
- ✅ ダイアログのタイトルが「データを削除します」
- ✅ ダイアログの説明に「選択した行を削除します。よろしいですか?」が含まれる
- ✅ 危険度バッジが「警告」レベル（warningレベル、黄色）
- ✅ カウントダウンが3秒から開始される

6. カウントダウンが完了するまで待つ（3秒）

**期待結果**:
- ✅ カウントダウンが0秒になる
- ✅ 実行ボタンがクリック可能になる

7. 「実行する」ボタンをクリック

**期待結果**:
- ✅ DELETE文が実行される
- ✅ 結果パネルに「1 rows deleted」が表示される

8. SQLエディタで「SELECT * FROM test_safety_users」を実行

**期待結果**:
- ✅ id=1のレコードが削除されている
- ✅ id=2,3,4,5のレコードは残っている

---

### テストケース5: DELETE（WHERE無）実行時の最重要警告

**目的**: DELETE（WHERE無）実行時にdangerレベルの警告ダイアログが表示されることを確認

**手順**:

1. mutation-builderページで「DELETE」タブを選択
2. test_safety_usersテーブルを選択
3. WHERE条件をすべて削除（×ボタンをクリック）

**期待結果**:
- ✅ DeletePanel内に赤色のアラートが表示される
- ✅ アラートのタイトルが「警告: WHERE句がありません」
- ✅ アラートの説明に「WHERE句を指定しないと、テーブルの全行が削除されます」が含まれる
- ✅ SQLプレビューに「DELETE FROM test_safety_users」が表示される（WHERE句なし）

4. ツールバーの「実行」ボタンをクリック

**期待結果**:
- ✅ DangerousQueryDialogが表示される
- ✅ ダイアログのタイトルが「全行を削除します」
- ✅ ダイアログの説明に「WHERE句がないため、テーブルの全行が削除されます。本当に実行しますか?」が含まれる
- ✅ 危険度バッジが「危険」レベル（dangerレベル、赤色）
- ✅ リスクファクターに「WHERE句がないため、テーブルの全行が削除されます」が表示される
- ✅ カウントダウンが5秒から開始される
- ✅ 確認チェックボックスが表示される

5. チェックボックスをオンにせずに「実行する」ボタンをクリック

**期待結果**:
- ✅ 実行されない（ボタンが無効化されている）

6. チェックボックスをオンにして、カウントダウンが完了するまで待つ（5秒）

**期待結果**:
- ✅ カウントダウンが0秒になる
- ✅ 実行ボタンがクリック可能になる

7. 「実行する」ボタンをクリック

**期待結果**:
- ✅ DELETE文が実行される
- ✅ 結果パネルに「4 rows deleted」が表示される（残りの4件が削除）

8. SQLエディタで「SELECT * FROM test_safety_users」を実行

**期待結果**:
- ✅ すべてのレコードが削除されている（0件）

---

### テストケース6: クエリ履歴への記録

**目的**: INSERT/UPDATE/DELETE実行時にクエリ履歴に記録されることを確認

**手順**:

1. テストケース1〜5のいずれかを実行
2. ツールバーの「履歴」ボタンをクリック

**期待結果**:
- ✅ QueryHistorySlideoverが表示される
- ✅ 実行したINSERT/UPDATE/DELETE文が履歴に記録されている
- ✅ 履歴にクエリ種別（INSERT/UPDATE/DELETE）が表示されている
- ✅ 履歴に影響行数が表示されている
- ✅ 履歴に実行日時が表示されている

3. 履歴の1つをクリック

**期待結果**:
- ✅ 履歴の詳細が表示される
- ✅ 実行したSQLが表示される

---

### テストケース7: クエリ保存機能

**目的**: mutation-builderでクエリを保存できることを確認

**手順**:

1. mutation-builderページで任意のINSERT/UPDATE/DELETEを構築
2. ツールバーの「保存」ボタンをクリック

**期待結果**:
- ✅ SaveQueryDialogが表示される

3. クエリ名を入力（例: 「テスト用DELETE」）
4. 説明を入力（例: 「test_safety_usersの全行削除」）
5. 「保存」ボタンをクリック

**期待結果**:
- ✅ クエリが保存される
- ✅ 保存完了トーストが表示される

6. ツールバーの「保存済み」ボタンをクリック

**期待結果**:
- ✅ SavedQuerySlideoverが表示される
- ✅ 保存したクエリが一覧に表示される

7. 保存したクエリをクリック

**期待結果**:
- ✅ 保存したクエリの詳細が表示される
- ✅ SQLが表示される

**注**: Phase 1では、保存したクエリをmutation-builderで読み込む機能は実装しない。
保存したクエリを読み込む場合は、SQLエディタで開く形式にする。

---

### テストケース8: 安全設定のON/OFF切り替え

**目的**: 安全設定に従って警告ダイアログが表示されることを確認

**手順**:

1. 設定ページを開く
2. 安全設定タブを選択
3. 「確認ダイアログを表示する」をOFFにする

**期待結果**:
- ✅ 設定が保存される

4. mutation-builderページでINSERT/UPDATE/DELETEを実行

**期待結果**:
- ✅ 警告ダイアログが表示されない
- ✅ 直接実行される

5. 設定ページで「確認ダイアログを表示する」をONにする

**期待結果**:
- ✅ 設定が保存される

6. mutation-builderページでINSERT/UPDATE/DELETEを実行

**期待結果**:
- ✅ 警告ダイアログが表示される

---

### テストケース9: 本番環境での動作確認

**目的**: 本番環境での安全設定が正しく動作することを確認

**手順**:

1. 設定ページを開く
2. 安全設定タブを選択
3. 環境を「本番環境」に設定

**期待結果**:
- ✅ 設定が保存される

4. mutation-builderページでUPDATE（WHERE無）を実行

**期待結果**:
- ✅ dangerレベルの警告ダイアログが表示される
- ✅ カウントダウンが5秒から開始される
- ✅ 確認チェックボックスが表示される

5. 環境を「開発環境」に設定

**期待結果**:
- ✅ 設定が保存される

6. mutation-builderページでUPDATE（WHERE無）を実行

**期待結果**:
- ✅ dangerレベルの警告ダイアログが表示される（本番環境と同じ）
- ✅ カウントダウンが5秒から開始される
- ✅ 確認チェックボックスが表示される

**注**: 本番環境と開発環境での警告レベルは同じですが、将来的に開発環境では警告を緩和する可能性があります。

---

## テストコードによるテスト

操作で確認できない項目について、以下のテストコードを作成します。

### コンポーネントテスト（Vue）

#### DangerousQueryDialog.vueテスト（mutation-builder対応）

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DangerousQueryDialog from '@/components/query-builder/dialog/DangerousQueryDialog.vue'

describe('DangerousQueryDialog.vue - mutation-builder対応', () => {
  it('INSERT実行時にinfoレベルの確認ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'insert',
          riskLevel: 'safe',
          riskFactors: [],
          affectedTables: ['test_safety_users'],
          hasWhereClause: false
        },
        sql: 'INSERT INTO test_safety_users (id, name) VALUES (6, \'Frank\')',
        countdownSeconds: 0
      }
    })

    expect(wrapper.text()).toContain('データを挿入します')
    expect(wrapper.text()).toContain('テーブルに新しいデータを挿入します')
  })

  it('UPDATE（WHERE有）実行時にwarningレベルの警告ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'update',
          riskLevel: 'warning',
          riskFactors: [],
          affectedTables: ['test_safety_users'],
          hasWhereClause: true
        },
        sql: 'UPDATE test_safety_users SET age = 99 WHERE id = 6',
        countdownSeconds: 3
      }
    })

    expect(wrapper.text()).toContain('データを更新します')
    expect(wrapper.text()).toContain('選択した行のデータを更新します')
  })

  it('UPDATE（WHERE無）実行時にdangerレベルの警告ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'update',
          riskLevel: 'danger',
          riskFactors: [
            {
              code: 'UPDATE_WITHOUT_WHERE',
              message: 'WHERE句がないため、テーブルの全行が更新されます'
            }
          ],
          affectedTables: ['test_safety_users'],
          hasWhereClause: false
        },
        sql: 'UPDATE test_safety_users SET age = 100',
        countdownSeconds: 5
      }
    })

    expect(wrapper.text()).toContain('全行を更新します')
    expect(wrapper.text()).toContain('WHERE句がないため、テーブルの全行が更新されます')
  })

  it('DELETE（WHERE有）実行時にwarningレベルの警告ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'delete',
          riskLevel: 'warning',
          riskFactors: [],
          affectedTables: ['test_safety_users'],
          hasWhereClause: true
        },
        sql: 'DELETE FROM test_safety_users WHERE id = 1',
        countdownSeconds: 3
      }
    })

    expect(wrapper.text()).toContain('データを削除します')
    expect(wrapper.text()).toContain('選択した行を削除します')
  })

  it('DELETE（WHERE無）実行時にdangerレベルの警告ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'delete',
          riskLevel: 'danger',
          riskFactors: [
            {
              code: 'DELETE_WITHOUT_WHERE',
              message: 'WHERE句がないため、テーブルの全行が削除されます'
            }
          ],
          affectedTables: ['test_safety_users'],
          hasWhereClause: false
        },
        sql: 'DELETE FROM test_safety_users',
        countdownSeconds: 5
      }
    })

    expect(wrapper.text()).toContain('全行を削除します')
    expect(wrapper.text()).toContain('WHERE句がないため、テーブルの全行が削除されます')
  })

  it('カウントダウンが正しく動作する', async () => {
    vi.useFakeTimers()

    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'delete',
          riskLevel: 'danger',
          riskFactors: [
            {
              code: 'DELETE_WITHOUT_WHERE',
              message: 'WHERE句がないため、テーブルの全行が削除されます'
            }
          ],
          affectedTables: ['test_safety_users'],
          hasWhereClause: false
        },
        sql: 'DELETE FROM test_safety_users',
        countdownSeconds: 5
      }
    })

    // 初期状態: カウントダウン5秒
    expect(wrapper.text()).toContain('実行する (5秒待機)')

    // 1秒経過
    await vi.advanceTimersByTimeAsync(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('実行する (4秒待機)')

    // 5秒経過
    await vi.advanceTimersByTimeAsync(4000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('実行する')
    expect(wrapper.text()).not.toContain('待機')

    vi.useRealTimers()
  })
})
```

#### mutation-builderストアテスト

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

describe('mutation-builderストア - 安全機能統合', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('INSERT時のhasWhereConditionsがfalseになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('INSERT')

    expect(store.hasWhereConditions).toBe(false)
  })

  it('UPDATE（WHERE有）時のhasWhereConditionsがtrueになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    store.addWhereCondition({
      id: '1',
      type: 'condition',
      column: { tableId: 'users', columnName: 'id' },
      operator: '=',
      value: '1',
      isValid: true
    })

    expect(store.hasWhereConditions).toBe(true)
  })

  it('UPDATE（WHERE無）時のhasWhereConditionsがfalseになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')

    expect(store.hasWhereConditions).toBe(false)
  })

  it('INSERT時のanalysisResultがsafeレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('INSERT')

    expect(store.analysisResult.queryType).toBe('insert')
    expect(store.analysisResult.riskLevel).toBe('safe')
    expect(store.analysisResult.riskFactors).toHaveLength(0)
  })

  it('UPDATE（WHERE有）時のanalysisResultがwarningレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    store.addWhereCondition({
      id: '1',
      type: 'condition',
      column: { tableId: 'users', columnName: 'id' },
      operator: '=',
      value: '1',
      isValid: true
    })

    expect(store.analysisResult.queryType).toBe('update')
    expect(store.analysisResult.riskLevel).toBe('warning')
    expect(store.analysisResult.hasWhereClause).toBe(true)
    expect(store.analysisResult.riskFactors).toHaveLength(0)
  })

  it('UPDATE（WHERE無）時のanalysisResultがdangerレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')

    expect(store.analysisResult.queryType).toBe('update')
    expect(store.analysisResult.riskLevel).toBe('danger')
    expect(store.analysisResult.hasWhereClause).toBe(false)
    expect(store.analysisResult.riskFactors).toHaveLength(1)
    expect(store.analysisResult.riskFactors[0].code).toBe('UPDATE_WITHOUT_WHERE')
    expect(store.analysisResult.riskFactors[0].message).toContain('WHERE句がないため')
  })

  it('DELETE（WHERE有）時のanalysisResultがwarningレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('DELETE')
    store.addWhereCondition({
      id: '1',
      type: 'condition',
      column: { tableId: 'users', columnName: 'id' },
      operator: '=',
      value: '1',
      isValid: true
    })

    expect(store.analysisResult.queryType).toBe('delete')
    expect(store.analysisResult.riskLevel).toBe('warning')
    expect(store.analysisResult.hasWhereClause).toBe(true)
    expect(store.analysisResult.riskFactors).toHaveLength(0)
  })

  it('DELETE（WHERE無）時のanalysisResultがdangerレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('DELETE')

    expect(store.analysisResult.queryType).toBe('delete')
    expect(store.analysisResult.riskLevel).toBe('danger')
    expect(store.analysisResult.hasWhereClause).toBe(false)
    expect(store.analysisResult.riskFactors).toHaveLength(1)
    expect(store.analysisResult.riskFactors[0].code).toBe('DELETE_WITHOUT_WHERE')
    expect(store.analysisResult.riskFactors[0].message).toContain('WHERE句がないため')
  })
})
```

### E2Eテスト（Playwright）

```typescript
import { test, expect } from '@playwright/test'

test.describe('安全機能統合', () => {
  test.beforeEach(async ({ page }) => {
    // アプリ起動
    await page.goto('http://localhost:1420')

    // データベース接続（テスト用接続を選択）
    await page.click('text=テスト用PostgreSQL')

    // mutation-builderページに移動
    await page.click('text=データ変更')
  })

  test('INSERT実行時の確認ダイアログ', async ({ page }) => {
    // INSERTタブを選択
    await page.click('button:has-text("INSERT")')

    // テーブル選択
    await page.click('button:has-text("テーブルを選択")')
    await page.click('text=test_safety_users')

    // カラム値入力
    await page.fill('input[name="id"]', '6')
    await page.fill('input[name="name"]', 'Frank')
    await page.fill('input[name="email"]', 'frank@example.com')
    await page.fill('input[name="age"]', '50')

    // 実行
    await page.click('button:has-text("実行")')

    // 確認ダイアログ
    await expect(page.locator('text=データを挿入します')).toBeVisible()
    await page.click('button:has-text("実行する")')

    // 結果確認
    await expect(page.locator('text=1 rows inserted')).toBeVisible()
  })

  test('UPDATE（WHERE無）実行時の最重要警告', async ({ page }) => {
    // UPDATEタブを選択
    await page.click('button:has-text("UPDATE")')

    // テーブル選択
    await page.click('button:has-text("テーブルを選択")')
    await page.click('text=test_safety_users')

    // SETタブ
    await page.click('button:has-text("SET")')
    await page.selectOption('select[name="column"]', 'age')
    await page.fill('input[name="value"]', '100')

    // 実行
    await page.click('button:has-text("実行")')

    // dangerレベルダイアログ確認
    await expect(page.locator('text=全行を更新します')).toBeVisible()
    await expect(page.locator('text=WHERE句がないため')).toBeVisible()
    await expect(page.locator('[data-level="danger"]')).toBeVisible()

    // チェックボックス確認
    const checkbox = page.locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()

    // チェックせずに実行ボタンクリック → 無効化されているはず
    const executeButton = page.locator('button:has-text("実行する")')
    await expect(executeButton).toBeDisabled()

    // チェックして、カウントダウン完了まで待つ
    await checkbox.check()
    await page.waitForTimeout(6000) // 5秒 + 余裕
    await executeButton.click()

    // 結果確認
    await expect(page.locator('text=rows updated')).toBeVisible()
  })

  test('DELETE（WHERE無）実行時の最重要警告', async ({ page }) => {
    // DELETEタブを選択
    await page.click('button:has-text("DELETE")')

    // テーブル選択
    await page.click('button:has-text("テーブルを選択")')
    await page.click('text=test_safety_users')

    // 実行
    await page.click('button:has-text("実行")')

    // dangerレベルダイアログ確認
    await expect(page.locator('text=全行を削除します')).toBeVisible()
    await expect(page.locator('text=WHERE句がないため')).toBeVisible()
    await expect(page.locator('[data-level="danger"]')).toBeVisible()

    // チェックボックス確認
    const checkbox = page.locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()

    // チェックして、カウントダウン完了まで待つ
    await checkbox.check()
    await page.waitForTimeout(6000) // 5秒 + 余裕
    await page.click('button:has-text("実行する")')

    // 結果確認
    await expect(page.locator('text=rows deleted')).toBeVisible()
  })

  test('クエリ履歴への記録', async ({ page }) => {
    // INSERT実行
    await page.click('button:has-text("INSERT")')
    await page.click('button:has-text("テーブルを選択")')
    await page.click('text=test_safety_users')
    await page.fill('input[name="id"]', '7')
    await page.fill('input[name="name"]', 'Grace')
    await page.click('button:has-text("実行")')
    await page.click('button:has-text("実行する")')

    // 履歴を開く
    await page.click('button:has-text("履歴")')

    // 履歴確認
    await expect(page.locator('text=INSERT')).toBeVisible()
    await expect(page.locator('text=1 rows')).toBeVisible()
  })
})
```

---

## テスト完了チェックリスト

### 操作手順によるテスト

- [ ] テストケース1: INSERT実行時の確認ダイアログ
- [ ] テストケース2: UPDATE（WHERE有）実行時の警告ダイアログ
- [ ] テストケース3: UPDATE（WHERE無）実行時の最重要警告
- [ ] テストケース4: DELETE（WHERE有）実行時の警告ダイアログ
- [ ] テストケース5: DELETE（WHERE無）実行時の最重要警告
- [ ] テストケース6: クエリ履歴への記録
- [ ] テストケース7: クエリ保存機能
- [ ] テストケース8: 安全設定のON/OFF切り替え
- [ ] テストケース9: 本番環境での動作確認

### テストコードによるテスト

- [ ] コンポーネントテスト（Vue）: DangerousQueryDialog.vue
- [ ] コンポーネントテスト（Vue）: mutation-builderストア
- [ ] E2Eテスト（Playwright）: 安全機能統合

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
| テストケース8 | - | - | - |
| テストケース9 | - | - | - |
| コンポーネントテスト（DangerousQueryDialog） | - | - | - |
| コンポーネントテスト（mutation-builderストア） | - | - | - |
| E2Eテスト（Playwright） | - | - | - |

## トラブルシューティング

### 問題: 警告ダイアログが表示されない

**原因**: 安全設定が無効化されている

**対処**:
1. 設定ページを開く
2. 安全設定タブを選択
3. 「確認ダイアログを表示する」をONにする

### 問題: カウントダウンが動作しない

**原因**: DangerousQueryDialogのcountdownSecondsが0に設定されている

**対処**:
1. MutationBuilderToolbar.vueのcountdownSecondsを確認
2. dangerレベルの場合は5秒、warningレベルの場合は3秒に設定

### 問題: 確認チェックボックスが表示されない

**原因**: riskLevel が 'danger' になっていない

**対処**:
1. mutation-builderストアのanalysisResultを確認
2. WHERE句がない場合、riskLevel が 'danger' になるか確認

### 問題: クエリ履歴に記録されない

**原因**: query-historyストアへの記録処理が実装されていない

**対処**:
1. mutation-builderストアのexecuteQuery()を確認
2. query-historyストアのaddHistory()が呼ばれているか確認

---

## まとめ

このテスト手順書に従って、8.5 安全機能統合のすべての側面をテストします。
操作手順によるテストで基本的な動作を確認し、テストコードで細かいエッジケースをカバーします。

すべてのテストが完了したら、永続化ドキュメント（docs/features/）を更新し、
Phase 8.5が完了したことをdocs/sql_editor_wbs_v3.mdに記録します。
