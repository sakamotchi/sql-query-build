# テスト手順書: データ変更クエリビルダー共通基盤（8.1）

## 概要

このドキュメントは、8.1 共通基盤の実装完了後に実施する手動テストの手順を記載します。

## 前提条件

- 8.1の全タスクが完了していること
- `npm run tauri:dev` でアプリが起動すること
- データベース接続が設定されていること

---

## テストケース

### TC-8.1.1: ページアクセス（データ変更起動）

**目的**: `/mutation-builder` ページにアクセスできることを確認

**手順**:
1. アプリを起動（`npm run tauri:dev`）
2. トップページ（`/`）を表示
3. 任意の接続カードの「データ変更」ボタンをクリック

**期待結果**:
- 新しいウィンドウで `/mutation-builder` ページが開く
- 3ペインレイアウトが表示される
- ツールバーが表示される
- エラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.2: クエリ種別切り替え（INSERT）

**目的**: INSERTタブが正しく動作することを確認

**手順**:
1. `/mutation-builder` ページを表示
2. ツールバーの「INSERT」タブをクリック

**期待結果**:
- INSERTタブがアクティブ状態（primary色）になる
- 右パネルのヘッダーが「INSERT 設定」になる
- コンソールエラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.3: クエリ種別切り替え（UPDATE）

**目的**: UPDATEタブが正しく動作することを確認

**手順**:
1. `/mutation-builder` ページを表示
2. ツールバーの「UPDATE」タブをクリック

**期待結果**:
- UPDATEタブがアクティブ状態（primary色）になる
- 右パネルのヘッダーが「UPDATE 設定」になる
- 中央パネルにWHERE句なし警告が表示される
- 警告メッセージ: 「WHERE句がありません。このクエリは全ての行を更新します。」
- コンソールエラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.4: クエリ種別切り替え（DELETE）

**目的**: DELETEタブが正しく動作することを確認

**手順**:
1. `/mutation-builder` ページを表示
2. ツールバーの「DELETE」タブをクリック

**期待結果**:
- DELETEタブがアクティブ状態（primary色）になる
- 右パネルのヘッダーが「DELETE 設定」になる
- 中央パネルに重大警告が表示される
- 警告メッセージ: 「🚨 重大な警告」「WHERE句がありません。このクエリは全ての行を削除します。」
- 警告の背景色が赤色
- コンソールエラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.5: DatabaseTree表示

**目的**: 左パネルにDatabaseTreeが表示されることを確認

**手順**:
1. `/mutation-builder` ページを表示
2. 左パネルを確認

**期待結果**:
- 左パネルに「データベース」ヘッダーが表示される
- DatabaseTreeコンポーネントが表示される
- スキーマ・テーブル一覧が表示される
- 既存の `/query-builder` と同じ見た目

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.6: テーブル選択（INSERT）

**目的**: テーブル選択が正しく動作することを確認（INSERTモード）

**手順**:
1. `/mutation-builder` ページを表示
2. INSERTタブを選択
3. 左パネルのDatabaseTreeで「users」テーブルをクリック

**期待結果**:
- 右パネルに「テーブル: users」と表示される
- 右パネルに「INSERTパネルは次のタスクで実装します」と表示される
- コンソールエラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.7: テーブル選択（UPDATE）

**目的**: テーブル選択が正しく動作することを確認（UPDATEモード）

**手順**:
1. `/mutation-builder` ページを表示
2. UPDATEタブを選択
3. 左パネルのDatabaseTreeで「posts」テーブルをクリック

**期待結果**:
- 右パネルに「テーブル: posts」と表示される
- 中央パネルのWHERE句なし警告が継続表示される
- コンソールエラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.8: テーブル選択（DELETE）

**目的**: テーブル選択が正しく動作することを確認（DELETEモード）

**手順**:
1. `/mutation-builder` ページを表示
2. DELETEタブを選択
3. 左パネルのDatabaseTreeで「tags」テーブルをクリック

**期待結果**:
- 右パネルに「テーブル: tags」と表示される
- 中央パネルの重大警告が継続表示される
- コンソールエラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.9: クエリ種別切り替え後のテーブル保持

**目的**: クエリ種別を切り替えてもテーブル選択が保持されることを確認

**手順**:
1. `/mutation-builder` ページを表示
2. INSERTタブで「users」テーブルを選択
3. UPDATEタブに切り替え

**期待結果**:
- 右パネルに「テーブル: users」が継続表示される
- クエリモデルがINSERTからUPDATEに変更される
- コンソールエラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.10: アクションボタン（プレースホルダー）

**目的**: アクションボタンが表示され、クリックできることを確認

**手順**:
1. `/mutation-builder` ページを表示
2. ツールバーの「実行」ボタンをクリック
3. ツールバーの「保存」ボタンをクリック
4. ツールバーの「履歴」ボタンをクリック

**期待結果**:
- 各ボタンがクリック可能
- 開発者コンソールに以下のログが表示される:
  - 「Execute query」
  - 「Save query」
  - 「Show history」
- エラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.11: クエリビルダーへのリンク

**目的**: クエリビルダーへのリンクが動作することを確認

**手順**:
1. `/mutation-builder` ページを表示
2. ツールバーの「クエリビルダーへ」ボタンをクリック

**期待結果**:
- `/query-builder` ページに遷移する
- 既存のクエリビルダーが正常に表示される
- エラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.12: トップページからのナビゲーション

**目的**: トップページから正しく遷移できることを確認

**手順**:
1. トップページ（`/`）を表示
2. 任意の接続カードに「データ参照」「データ変更」ボタンが表示されることを確認
3. 「データ変更」ボタンをクリック

**期待結果**:
- 「データ参照」「データ変更」の2つのボタンが表示される
- 「データ変更」ボタンをクリックすると新しいウィンドウで `/mutation-builder` が開く

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.13: パネルリサイズ

**目的**: パネルのリサイズが動作することを確認

**手順**:
1. `/mutation-builder` ページを表示
2. 左パネルと中央パネルの境界線をドラッグ
3. 中央パネルと右パネルの境界線をドラッグ

**期待結果**:
- パネル幅が変更される
- リサイズが滑らか（カクつかない）
- 最小幅・最大幅の制約が効いている
  - 左パネル: 200px〜400px
  - 右パネル: 280px〜500px

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.14: ダークモード

**目的**: ダークモードでも正常に表示されることを確認

**手順**:
1. 設定ページでダークモードを有効化
2. `/mutation-builder` ページを表示
3. 各パネル、ツールバーの表示を確認

**期待結果**:
- ダークモードで正常に表示される
- テキストが読める（コントラストが適切）
- ボタンのアクティブ状態が識別できる
- 警告メッセージが読める

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.15: 既存クエリビルダーへの影響確認

**目的**: 既存の `/query-builder` に影響がないことを確認

**手順**:
1. `/query-builder` ページを表示
2. テーブルを追加してクエリを構築
3. クエリを実行
4. 結果が表示されることを確認

**期待結果**:
- 既存のクエリビルダーが正常に動作する
- クエリ実行が成功する
- エラーが発生しない

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.16: TypeScript型チェック

**目的**: TypeScript型エラーがないことを確認

**手順**:
1. ターミナルで `npm run typecheck` を実行

**期待結果**:
- 型エラーが0件
- ビルドが成功する

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

### TC-8.1.17: Vitestテスト

**目的**: Vitestテストが全て通ることを確認

**手順**:
1. ターミナルで `npm run test:run` を実行

**期待結果**:
- 全テストが成功
- `mutation-builder.spec.ts` のテストが全て通る
- テスト失敗が0件

**実施結果**: [ ] 成功 / [ ] 失敗

**備考**:

---

## 自動テストコード

### ストアのテスト

```typescript
// tests/stores/mutation-builder.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

describe('useMutationBuilderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with INSERT type', () => {
    const store = useMutationBuilderStore()
    expect(store.mutationType).toBe('INSERT')
  })

  it('should change mutation type', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    expect(store.mutationType).toBe('UPDATE')
  })

  it('should select table', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')
    expect(store.selectedTable).toBe('users')
  })

  it('should create INSERT query model', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')
    expect(store.queryModel).toEqual({
      type: 'INSERT',
      table: 'users',
      columns: [],
      values: []
    })
  })

  it('should create UPDATE query model', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    store.setSelectedTable('users')
    expect(store.queryModel).toEqual({
      type: 'UPDATE',
      table: 'users',
      setClause: [],
      whereConditions: []
    })
  })

  it('should create DELETE query model', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('DELETE')
    store.setSelectedTable('users')
    expect(store.queryModel).toEqual({
      type: 'DELETE',
      table: 'users',
      whereConditions: []
    })
  })

  it('should detect WHERE conditions', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    store.setSelectedTable('users')
    expect(store.hasWhereConditions).toBe(false)
  })

  it('should reset state', () => {
    const store = useMutationBuilderStore()
    store.setSelectedTable('users')
    store.resetState()
    expect(store.selectedTable).toBeNull()
    expect(store.queryModel).toBeNull()
  })
})
```

**実行**: `npm run test:run`

**期待結果**: 全テストが成功

---

## テスト結果サマリー

| テストケースID | テスト名 | 結果 | 備考 |
|--------------|---------|------|------|
| TC-8.1.1 | ページアクセス | - | - |
| TC-8.1.2 | クエリ種別切り替え（INSERT） | - | - |
| TC-8.1.3 | クエリ種別切り替え（UPDATE） | - | - |
| TC-8.1.4 | クエリ種別切り替え（DELETE） | - | - |
| TC-8.1.5 | DatabaseTree表示 | - | - |
| TC-8.1.6 | テーブル選択（INSERT） | - | - |
| TC-8.1.7 | テーブル選択（UPDATE） | - | - |
| TC-8.1.8 | テーブル選択（DELETE） | - | - |
| TC-8.1.9 | クエリ種別切り替え後のテーブル保持 | - | - |
| TC-8.1.10 | アクションボタン（プレースホルダー） | - | - |
| TC-8.1.11 | クエリビルダーへのリンク | - | - |
| TC-8.1.12 | トップページからのナビゲーション | - | - |
| TC-8.1.13 | パネルリサイズ | - | - |
| TC-8.1.14 | ダークモード | - | - |
| TC-8.1.15 | 既存クエリビルダーへの影響確認 | - | - |
| TC-8.1.16 | TypeScript型チェック | - | - |
| TC-8.1.17 | Vitestテスト | - | - |

**成功**: 0/17
**失敗**: 0/17
**未実施**: 17/17

---

## バグ・課題

実施後に発見されたバグや課題を記載:

| ID | 内容 | 優先度 | 状態 |
|----|------|--------|------|
| - | - | - | - |

---

## 完了条件

- [ ] 全テストケースが成功
- [ ] TypeScript型エラーが0件
- [ ] Vitestテストが全て通る
- [ ] 既存クエリビルダーに影響がない
- [ ] バグ・課題がない、または対応済み

---

## 承認

テスト実施者: ________________
テスト実施日: ________________
承認者: ________________
承認日: ________________
