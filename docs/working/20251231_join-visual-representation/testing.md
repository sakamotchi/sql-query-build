# Phase 6B: JOIN設定UI拡張（ビジュアル表現） - テスト手順書

**作成日**: 2025-12-31
**フェーズ**: 6B
**更新日**: 2025-12-31 (TableRelationArea方式に変更)

---

## 1. テスト方針

Phase 6Bでは、**既存のTableRelationArea.vueの拡張**を行うため、既存機能への影響がないことを確認します。
新規機能（JOIN線表示、ズーム操作）は手動テストで確認し、ロジック部分は単体テストで検証します。

### テスト種別

| テスト種別 | 対象 | 実施方法 |
|----------|------|---------|
| 単体テスト | relationLines computed、RelationLine.vue | Vitest + @vue/test-utils |
| 操作確認テスト | JOIN線クリック、ズーム操作 | 手動テスト |
| 回帰テスト | 既存のTableRelationArea機能 | 手動テスト |
| パフォーマンステスト | 大量データでの動作 | 手動テスト（Chrome DevTools） |

---

## 2. 単体テスト

### 2.1 RelationLine.vue - JOIN線描画

**テストファイル**: `app/components/query-builder/RelationLine.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RelationLine from '~/components/query-builder/RelationLine.vue'

describe('RelationLine', () => {
  it('INNER JOINは実線で表示される', () => {
    const wrapper = mount(RelationLine, {
      props: {
        join: {
          id: 'join-1',
          type: 'INNER',
          table: { schema: 'public', name: 'users', alias: 'u' },
          conditions: [],
          conditionLogic: 'AND',
        },
        x1: 100,
        y1: 100,
        x2: 300,
        y2: 100,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.strokeDasharray).toBe('none')
  })

  it('LEFT JOINは破線で表示される', () => {
    const wrapper = mount(RelationLine, {
      props: {
        join: {
          id: 'join-1',
          type: 'LEFT',
          table: { schema: 'public', name: 'users', alias: 'u' },
          conditions: [],
          conditionLogic: 'AND',
        },
        x1: 100,
        y1: 100,
        x2: 300,
        y2: 100,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.strokeDasharray).toBe('5,5')
  })

  it('線の中央座標が正しく計算される', () => {
    const wrapper = mount(RelationLine, {
      props: {
        join: {
          id: 'join-1',
          type: 'INNER',
          table: { schema: 'public', name: 'users', alias: 'u' },
          conditions: [],
          conditionLogic: 'AND',
        },
        x1: 100,
        y1: 100,
        x2: 300,
        y2: 200,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.midX).toBe(200) // (100 + 300) / 2
    expect(vm.midY).toBe(150) // (100 + 200) / 2
  })

  it('クリックするとclickイベントが発火する', async () => {
    const wrapper = mount(RelationLine, {
      props: {
        join: {
          id: 'join-1',
          type: 'INNER',
          table: { schema: 'public', name: 'users', alias: 'u' },
          conditions: [],
          conditionLogic: 'AND',
        },
        x1: 100,
        y1: 100,
        x2: 300,
        y2: 100,
      },
    })

    await wrapper.find('g').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })
})
```

**実行方法**:
```bash
npm run test -- RelationLine.test.ts
```

**期待結果**:
- すべてのテストがパスすること

---

### 2.2 TableRelationArea.vue - relationLines computed

**注**: TableRelationArea.vueのテストは既存のテストファイルに追加します。

```typescript
// app/components/query-builder/TableRelationArea.test.ts に追加
describe('TableRelationArea - relationLines computed', () => {
  it('JOIN関係から線の座標が計算される', () => {
    // テストケースは tasklist.md の 6B.2.6 で実装
  })
})
```

**期待結果**:
- 既存のテストに追加し、すべてパスすること

---

## 3. 操作確認テスト

**前提**: 中央パネル（TableRelationArea）で直接テストを行います。

### 3.1 JOIN線の表示確認

**手順**:
1. `npm run tauri:dev` でアプリを起動
2. 接続を開き、クエリビルダー画面を表示
3. 2つ以上のテーブルを中央パネルに配置
4. Phase 6AのJOINタブでJOINを1つ設定
5. 中央パネルを確認

**期待結果**:
- ✅ テーブル間にJOIN線が表示される
- ✅ INNER JOINは実線で表示される
- ✅ LEFT JOINは破線で表示される
- ✅ 線の中央にJOIN種別（「INNER」など）が表示される

---

### 3.2 線クリックでJOIN編集

**手順**:
1. 中央パネルのリレーション線をクリック
2. JoinConfigDialogが開くことを確認
3. JOIN設定を変更（例: INNER → LEFT）
4. 保存する

**期待結果**:
- ✅ 線クリックでダイアログが開く
- ✅ 既存のJOIN設定が表示される
- ✅ 変更後、線のスタイルが更新される（実線→破線）

---

### 3.3 ズーム操作

**手順**:
1. 中央パネル右上のツールバーを確認（テーブルが2つ以上ある場合に表示）
2. [+] ボタンをクリック（ズームイン）
3. [-] ボタンをクリック（ズームアウト）
4. [100%] ボタンをクリック（リセット）

**期待結果**:
- ✅ ツールバーが表示される（selectedTables.length >= 2 の時のみ）
- ✅ ズームイン・アウトで線が拡大縮小される
- ✅ ズームリセットで元の大きさに戻る

---

### 3.4 テーブル位置の保存・復元

**手順**:
1. テーブルをドラッグして配置を変更（既存機能）
2. クエリを保存
3. クエリを読み込む

**期待結果**:
- ✅ テーブル位置が正しく復元される（既存機能）
- ✅ JOIN線も正しい位置に表示される


---

## 4. 回帰テスト（既存機能）

### 4.1 TableRelationArea の既存機能

**手順**:
1. テーブルをドラッグ&ドロップして配置（既存機能）
2. テーブルのエイリアスを編集（既存機能）
3. テーブルを削除（既存機能）

**期待結果**:
- ✅ 既存のすべての機能が正常に動作する
- ✅ JOIN線の追加によって既存機能に影響がない

---

## 5. パフォーマンステスト

### 5.1 大量データでの動作確認

**手順**:
1. 10個のテーブルを選択
2. 20個のJOINを設定
3. Chrome DevToolsでパフォーマンスを計測
   - DevTools > Performance > Record
   - テーブルをドラッグ操作
   - 記録を停止

**期待結果**:
- ✅ FPSが60fps以上を維持している
- ✅ ドラッグ操作が滑らか
- ✅ 線の再描画が300ms以内

---

## 6. 完了条件チェックリスト

- [ ] JOIN関係が線で可視化される（3.1）
- [ ] 線をクリックしてJOIN設定を編集できる（3.2）
- [ ] ズーム操作が可能（3.3）
- [ ] テーブル位置が保存される（3.4 - 既存機能）
- [ ] 10テーブル、20JOINでもスムーズに動作する（5.1）
- [ ] 既存機能が正常に動作する（4.1）
- [ ] 単体テストがすべてパスする（2.1、2.2）

---

## 7. テスト実施記録

| テストケース | 実施日 | 実施者 | 結果 | 備考 |
|------------|--------|--------|------|------|
| 2.1 単体テスト - RelationLine.vue | - | - | - | - |
| 2.2 単体テスト - relationLines computed | - | - | - | - |
| 3.1 JOIN線表示 | - | - | - | - |
| 3.2 線クリックでJOIN編集 | - | - | - | - |
| 3.3 ズーム操作 | - | - | - | - |
| 3.4 テーブル位置の保存・復元 | - | - | - | - |
| 4.1 既存機能の回帰テスト | - | - | - | - |
| 5.1 パフォーマンステスト | - | - | - | - |

---

## 8. バグ報告テンプレート

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
