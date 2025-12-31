# Phase 6B: JOIN設定UI拡張（ビジュアル表現） - テスト手順書

**作成日**: 2025-12-31
**フェーズ**: 6B

---

## 1. テスト方針

Phase 6Bでは、視覚的な操作が中心となるため、**手動テスト（操作確認）を優先**します。
ただし、ロジック部分（位置計算、線の座標計算など）は単体テストで検証します。

### テスト種別

| テスト種別 | 対象 | 実施方法 |
|----------|------|---------|
| 単体テスト | ロジック（computed、関数） | Vitest + @vue/test-utils |
| 操作確認テスト | UI操作（ドラッグ、クリック、ズーム） | 手動テスト |
| パフォーマンステスト | 大量データでの動作 | 手動テスト（Chrome DevTools） |
| アクセシビリティテスト | キーボード操作 | 手動テスト |

---

## 2. 単体テスト

### 2.1 query-builder.ts - テーブル位置管理

**テストファイル**: `app/stores/query-builder.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQueryBuilderStore } from '~/stores/query-builder'

describe('query-builder store - テーブル位置管理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('テーブル位置を更新できる', () => {
    const store = useQueryBuilderStore()
    store.updateTablePosition('t1', 100, 200)

    expect(store.tablePositions).toEqual({ t1: { x: 100, y: 200 } })
  })

  it('テーブル位置をリセットできる', () => {
    const store = useQueryBuilderStore()
    store.updateTablePosition('t1', 100, 200)
    store.resetTablePositions()

    expect(store.tablePositions).toEqual({})
  })

  it('テーブル削除時に位置情報も削除される', () => {
    const store = useQueryBuilderStore()

    // テーブルを追加
    store.addTable({
      id: '1',
      alias: 't1',
      name: 'users',
      schema: 'public',
      columns: [],
    })
    store.updateTablePosition('t1', 100, 200)

    // テーブルを削除
    store.removeTable('1')

    expect(store.tablePositions).not.toHaveProperty('t1')
  })

  it('QueryModelに位置情報が含まれる', () => {
    const store = useQueryBuilderStore()
    store.updateTablePosition('t1', 100, 200)

    const model = store.toQueryModel()

    expect(model.tablePositions).toEqual({ t1: { x: 100, y: 200 } })
  })

  it('QueryModelから位置情報を復元できる', () => {
    const store = useQueryBuilderStore()
    const model = {
      // ... 他のプロパティ ...
      tablePositions: { t1: { x: 100, y: 200 } },
    }

    store.loadFromQueryModel(model)

    expect(store.tablePositions).toEqual({ t1: { x: 100, y: 200 } })
  })
})
```

**実行方法**:
```bash
npm run test -- query-builder.test.ts
```

**期待結果**:
- すべてのテストがパスすること

---

### 2.2 TableCanvas.vue - リレーション線の計算

**テストファイル**: `app/components/query-builder/TableCanvas.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TableCanvas from '~/components/query-builder/TableCanvas.vue'

describe('TableCanvas - リレーション線の計算', () => {
  it('JOIN関係から線の座標が計算される', () => {
    const wrapper = mount(TableCanvas, {
      props: {
        tables: [
          { id: '1', alias: 't1', name: 'users', schema: 'public', columns: [] },
          { id: '2', alias: 't2', name: 'orders', schema: 'public', columns: [] },
        ],
        joins: [
          {
            id: 'join-1',
            type: 'INNER',
            table: { schema: 'public', name: 'orders', alias: 't2' },
            conditions: [
              {
                left: { tableAlias: 't1', columnName: 'id' },
                operator: '=',
                right: { tableAlias: 't2', columnName: 'user_id' },
              },
            ],
            conditionLogic: 'AND',
          },
        ],
        tablePositions: {
          t1: { x: 100, y: 100 },
          t2: { x: 400, y: 100 },
        },
      },
    })

    const vm = wrapper.vm as any
    const lines = vm.relationLines

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      x1: 200, // 100 + 100 (カード幅の半分)
      y1: 175, // 100 + 75 (カード高さの半分)
      x2: 500, // 400 + 100
      y2: 175, // 100 + 75
    })
  })

  it('JOIN種別に応じたstrokeDasharrayが設定される', () => {
    const wrapper = mount(TableCanvas, {
      props: {
        tables: [
          { id: '1', alias: 't1', name: 'users', schema: 'public', columns: [] },
          { id: '2', alias: 't2', name: 'orders', schema: 'public', columns: [] },
        ],
        joins: [
          {
            id: 'join-1',
            type: 'LEFT',
            table: { schema: 'public', name: 'orders', alias: 't2' },
            conditions: [],
            conditionLogic: 'AND',
          },
        ],
        tablePositions: {
          t1: { x: 100, y: 100 },
          t2: { x: 400, y: 100 },
        },
      },
    })

    const vm = wrapper.vm as any
    const lines = vm.relationLines

    expect(lines[0].strokeDasharray).toBe('5,5') // LEFT JOINは破線
  })
})
```

**実行方法**:
```bash
npm run test -- TableCanvas.test.ts
```

**期待結果**:
- すべてのテストがパスすること

---

## 3. 操作確認テスト

以下の手順で、実際にアプリケーションを操作して動作を確認します。

### 3.1 キャンバス表示の確認

**手順**:
1. `npm run tauri:dev` でアプリを起動
2. 接続を開き、クエリビルダー画面を表示
3. 2つ以上のテーブルを選択
4. JOINタブを開く
5. [キャンバス表示] タブをクリック

**期待結果**:
- ✅ キャンバスが表示される
- ✅ 選択したテーブルがカード形式で表示される
- ✅ テーブルが重ならずに自動配置される

---

### 3.2 テーブルのドラッグ&ドロップ

**手順**:
1. キャンバス表示を開く
2. テーブルカードをドラッグする
3. 別の位置にドロップする

**期待結果**:
- ✅ ドラッグ中、カードが半透明になる
- ✅ ドロップ後、新しい位置に配置される
- ✅ ドラッグ操作が滑らか（カクつきなし）

---

### 3.3 リレーション線の表示

**手順**:
1. キャンバス表示を開く
2. JOINを1つ設定する（[リスト表示]タブから設定可能）
3. [キャンバス表示]タブに戻る

**期待結果**:
- ✅ テーブル間に線が表示される
- ✅ INNER JOINは実線で表示される
- ✅ LEFT JOINは破線で表示される
- ✅ 線の中央にJOIN種別（「INNER」など）が表示される

---

### 3.4 線クリックでJOIN編集

**手順**:
1. キャンバス表示でリレーション線をクリック
2. JoinConfigDialogが開くことを確認
3. JOIN設定を変更（例: INNER → LEFT）
4. 保存する

**期待結果**:
- ✅ 線クリックでダイアログが開く
- ✅ 既存のJOIN設定が表示される
- ✅ 変更後、線のスタイルが更新される（実線→破線）

---

### 3.5 ズーム操作

**手順**:
1. キャンバス表示を開く
2. マウスホイールを上に回す（ズームイン）
3. マウスホイールを下に回す（ズームアウト）
4. ツールバーの [100%] ボタンをクリック

**期待結果**:
- ✅ ズームイン時、キャンバスが拡大される
- ✅ ズームアウト時、キャンバスが縮小される
- ✅ 100%ボタンでズームがリセットされる
- ✅ ズーム範囲が50%～200%に制限される

---

### 3.6 パン操作

**手順**:
1. キャンバス表示を開く
2. マウスの中ボタンを押しながらドラッグ
3. ツールバーの [リセット] ボタンをクリック

**期待結果**:
- ✅ 中ボタンドラッグでキャンバスが移動する
- ✅ リセットボタンでパン位置が元に戻る

---

### 3.7 テーブル位置の保存・復元

**手順**:
1. キャンバス表示でテーブルをドラッグして配置を変更
2. クエリを保存（[保存]ボタンをクリック）
3. クエリビルダーをリセット（新規クエリを開始）
4. 保存したクエリを読み込む
5. [キャンバス表示]タブを開く

**期待結果**:
- ✅ 保存前の配置がそのまま復元される

---

### 3.8 レイアウトリセット

**手順**:
1. キャンバス表示でテーブルをドラッグして配置を変更
2. ツールバーの [レイアウトリセット] ボタンをクリック

**期待結果**:
- ✅ すべてのテーブルが初期位置（3列レイアウト）に戻る

---

## 4. パフォーマンステスト

### 4.1 大量データでの動作確認

**手順**:
1. 10個のテーブルを選択
2. 20個のJOINを設定
3. キャンバス表示を開く
4. Chrome DevToolsでパフォーマンスを計測
   - DevTools > Performance > Record
   - テーブルをドラッグ操作
   - 記録を停止

**期待結果**:
- ✅ FPSが60fps以上を維持している
- ✅ ドラッグ操作が滑らか
- ✅ 線の再描画が300ms以内

**確認方法**:
- DevToolsのPerformanceタブで「Frames」を確認
- 緑色のバーが連続していればOK（60fps）
- 赤色のバーが表示される場合はパフォーマンス低下

---

## 5. アクセシビリティテスト

### 5.1 キーボード操作

**手順**:
1. キャンバス表示を開く
2. Tabキーでテーブルカードにフォーカスを移動
3. 矢印キーを押す

**期待結果**:
- ✅ Tabキーでテーブルカードにフォーカスできる
- ✅ 矢印キーでテーブル位置が10pxずつ移動する
- ✅ フォーカス時に視覚的なインジケータが表示される

---

### 5.2 スクリーンリーダー対応

**手順**:
1. MacのVoiceOverを有効化（Command + F5）
2. キャンバス表示を開く
3. VoiceOverでテーブルカードを選択

**期待結果**:
- ✅ テーブル名とエイリアスが読み上げられる
- ✅ JOIN種別が読み上げられる

---

## 6. ブラウザ互換性テスト

### 6.1 対応ブラウザ

| ブラウザ | バージョン | 動作確認 |
|---------|----------|---------|
| Chrome | 最新 | ✅ |
| Firefox | 最新 | ⬜ |
| Safari | 最新 | ⬜ |
| Edge | 最新 | ⬜ |

**手順**:
1. 各ブラウザでアプリを開く
2. 上記の操作確認テスト（3.1～3.8）を実施

**期待結果**:
- ✅ すべてのブラウザで同様に動作する

---

## 7. エラーケーステスト

### 7.1 テーブルが1つのみの場合

**手順**:
1. テーブルを1つだけ選択
2. [キャンバス表示]タブを開く

**期待結果**:
- ✅ 空状態メッセージが表示される
- ✅ 「JOINを設定するには2つ以上のテーブルが必要です」と表示される

---

### 7.2 JOINが設定されていない場合

**手順**:
1. テーブルを2つ選択
2. JOINを設定せずに[キャンバス表示]タブを開く

**期待結果**:
- ✅ テーブルカードは表示される
- ✅ リレーション線は表示されない

---

## 8. 回帰テスト

Phase 6Aで実装した機能が壊れていないことを確認します。

### 8.1 リスト表示の動作確認

**手順**:
1. [リスト表示]タブを開く
2. Phase 6Aの機能を確認
   - [新規JOIN]ボタンでダイアログが開く
   - JOIN一覧が表示される
   - [編集]ボタンでダイアログが開く
   - [削除]ボタンでJOINが削除される

**期待結果**:
- ✅ Phase 6Aの機能がすべて動作する

---

## 9. 完了条件チェックリスト

- [ ] キャンバス上でテーブルをドラッグ配置できる（3.2）
- [ ] JOIN関係が線で可視化される（3.3）
- [ ] 線をクリックしてJOIN設定を編集できる（3.4）
- [ ] テーブル位置が保存される（3.7）
- [ ] ズーム・パン操作が可能（3.5、3.6）
- [ ] 10テーブル、20JOINでもスムーズに動作する（4.1）
- [ ] 単体テストがすべてパスする（2.1、2.2）
- [ ] 主要ブラウザで動作する（6.1）
- [ ] アクセシビリティ要件を満たす（5.1、5.2）

---

## 10. バグ報告テンプレート

テスト中に問題を発見した場合は、以下のフォーマットで報告してください。

```markdown
## バグ報告

**発見日**: YYYY-MM-DD
**テストケース**: [テストケース番号]
**環境**: [ブラウザ/OS]

### 再現手順
1.
2.
3.

### 期待結果


### 実際の結果


### スクリーンショット/ログ


### 優先度
- [ ] 高（リリースブロッカー）
- [ ] 中（修正推奨）
- [ ] 低（軽微な問題）
```

---

## 11. テスト実施記録

| テストケース | 実施日 | 実施者 | 結果 | 備考 |
|------------|--------|--------|------|------|
| 2.1 単体テスト - テーブル位置管理 | - | - | - | - |
| 2.2 単体テスト - リレーション線 | - | - | - | - |
| 3.1 キャンバス表示 | - | - | - | - |
| 3.2 ドラッグ&ドロップ | - | - | - | - |
| 3.3 リレーション線表示 | - | - | - | - |
| 3.4 線クリックでJOIN編集 | - | - | - | - |
| 3.5 ズーム操作 | - | - | - | - |
| 3.6 パン操作 | - | - | - | - |
| 3.7 テーブル位置の保存・復元 | - | - | - | - |
| 3.8 レイアウトリセット | - | - | - | - |
| 4.1 パフォーマンステスト | - | - | - | - |
| 5.1 キーボード操作 | - | - | - | - |
| 5.2 スクリーンリーダー対応 | - | - | - | - |
| 6.1 ブラウザ互換性 | - | - | - | - |
| 7.1 テーブル1つのみ | - | - | - | - |
| 7.2 JOIN未設定 | - | - | - | - |
| 8.1 リスト表示（回帰テスト） | - | - | - | - |
