# 設計書：単体テストカバレッジの向上

## 概要

このドキュメントでは、単体テストカバレッジを向上させるための具体的な設計とテスト実装方針を定義します。

## テスト設計の基本方針

### 1. テストパターンの統一

既存のテストパターンに準拠し、以下の方針を採用します：

```typescript
// AAA パターン (Arrange-Act-Assert)
it('テストケース名は日本語で明確に記述', () => {
  // Arrange: テストの準備
  const store = useExampleStore()

  // Act: 実行
  store.someAction()

  // Assert: 検証
  expect(store.someState).toBe(expectedValue)
})
```

### 2. モック戦略

- **Nuxt UI コンポーネント**: スタブ化
- **Tauri API**: モック化
- **API呼び出し**: vi.mock() でモック化
- **ストア依存**: 必要に応じてモック化

### 3. テストファイルの配置

```
app/
  stores/
    example.ts
    __tests__/
      example.spec.ts
  composables/
    useExample.ts
tests/
  composables/
    useExample.spec.ts
  stores/
    example.spec.ts
app/components/
  example/
    Example.vue
    Example.spec.ts  # コンポーネントと同じディレクトリ
```

## Phase 1: 優先度高（2週間）

### 1.1 Saved Query Store のテスト

#### テスト対象: `app/stores/saved-query.ts`

**テストファイル**: `app/stores/__tests__/saved-query.spec.ts`

#### テストケース設計

```typescript
describe('SavedQueryStore', () => {
  // 初期状態のテスト
  describe('初期状態', () => {
    it('デフォルトの初期状態を持つ')
  })

  // Getters のテスト
  describe('getters', () => {
    it('filteredQueries は queries を返す')
    it('uniqueTags は重複なしのタグ一覧を返す')
    it('uniqueTags は空配列の場合も正しく処理する')
  })

  // Actions のテスト
  describe('actions', () => {
    describe('fetchQueries', () => {
      it('クエリ一覧を取得できる')
      it('検索条件付きで取得できる')
      it('エラー時は error にメッセージを設定する')
      it('ローディング状態を正しく管理する')
    })

    describe('saveQuery', () => {
      it('SELECT クエリを保存できる')
      it('INSERT クエリを保存できる')
      it('UPDATE クエリを保存できる')
      it('DELETE クエリを保存できる')
      it('タグ付きで保存できる')
      it('保存後に一覧を再取得する')
      it('エラー時は適切に処理する')
    })

    describe('loadQuery', () => {
      it('SELECT クエリをロードできる')
      it('INSERT クエリをロードできる')
      it('UPDATE クエリをロードできる')
      it('DELETE クエリをロードできる')
      it('クエリビルダーストアに状態を復元する')
      it('ミューテーションビルダーストアに状態を復元する')
    })

    describe('deleteQuery', () => {
      it('クエリを削除できる')
      it('削除後に一覧を再取得する')
    })

    describe('updateSearchKeyword', () => {
      it('検索キーワードを更新できる')
    })

    describe('toggleTag', () => {
      it('タグを追加できる')
      it('タグを削除できる')
    })

    describe('clearFilters', () => {
      it('フィルタをクリアできる')
    })
  })
})
```

**モック設計**:
```typescript
// queryStorageApi をモック
vi.mock('@/api/query-storage', () => ({
  queryStorageApi: {
    searchSavedQueries: vi.fn(),
    saveQuery: vi.fn(),
    loadQuery: vi.fn(),
    deleteQuery: vi.fn(),
  }
}))

// ストアをモック（必要に応じて）
vi.mock('@/stores/query-builder')
vi.mock('@/stores/mutation-builder')
vi.mock('@/stores/connection')
vi.mock('@/stores/window')
```

### 1.2 useColumnResize Composable のテスト

#### テスト対象: `app/composables/useColumnResize.ts`

**テストファイル**: `tests/composables/useColumnResize.spec.ts`

#### テストケース設計

```typescript
describe('useColumnResize', () => {
  describe('getColumnWidth', () => {
    it('未設定のカラムはデフォルト幅を返す')
    it('設定済みのカラムは設定値を返す')
  })

  describe('startResize', () => {
    it('リサイズ開始時に状態を正しく設定する')
    it('イベントリスナーを追加する')
    it('event.preventDefault() を呼び出す')
  })

  describe('handleMouseMove', () => {
    it('リサイズ中に幅を更新する')
    it('最小幅を下回らない')
    it('リサイズ中でない場合は何もしない')
  })

  describe('stopResize', () => {
    it('リサイズ終了時に状態をリセットする')
    it('イベントリスナーを削除する')
  })

  describe('resetColumnWidths', () => {
    it('全カラムの幅をリセットできる')
  })
})
```

**テスト実装例**:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useColumnResize } from '@/composables/useColumnResize'

describe('useColumnResize', () => {
  let addEventListenerSpy: any
  let removeEventListenerSpy: any

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
  })

  it('未設定のカラムはデフォルト幅を返す', () => {
    const { getColumnWidth } = useColumnResize()
    expect(getColumnWidth('column1')).toBe(150)
  })

  it('リサイズ開始時にイベントリスナーを追加する', () => {
    const { startResize } = useColumnResize()
    const event = new MouseEvent('mousedown', { clientX: 100 })

    startResize(event, 'column1')

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })
})
```

### 1.3 useSqlFormatter Composable のテスト

#### テスト対象: `app/composables/useSqlFormatter.ts`

**テストファイル**: `tests/composables/useSqlFormatter.spec.ts`

#### テストケース設計

```typescript
describe('useSqlFormatter', () => {
  describe('formatInsertSql', () => {
    it('単一行INSERTを整形する')
    it('複数行VALUESを整形する')
    it('セミコロンの前で改行する')
    it('空文字列を正しく処理する')
    it('エラー時は元のSQLを返す')
  })

  describe('formatUpdateSql', () => {
    it('UPDATEを整形する')
    it('複数SETを改行する')
    it('WHERE句の前で改行する')
    it('空文字列を正しく処理する')
  })

  describe('formatDeleteSql', () => {
    it('DELETEを整形する')
    it('WHERE句の前で改行する')
    it('空文字列を正しく処理する')
  })

  describe('formatMutationSql', () => {
    it('INSERTタイプで正しいフォーマッターを呼び出す')
    it('UPDATEタイプで正しいフォーマッターを呼び出す')
    it('DELETEタイプで正しいフォーマッターを呼び出す')
  })
})
```

### 1.4 Query Builder コンポーネントのテスト

#### 1.4.1 TableRelationArea.vue

**テストファイル**: `app/components/query-builder/TableRelationArea.spec.ts`

**テストケース**:
```typescript
describe('TableRelationArea', () => {
  describe('レンダリング', () => {
    it('テーブルがない場合はドロップゾーンを表示する')
    it('テーブルがある場合はTableNodeを表示する')
  })

  describe('ドラッグ&ドロップ', () => {
    it('テーブルをドロップできる')
    it('無効なドロップは無視する')
  })

  describe('テーブル削除', () => {
    it('テーブルを削除できる')
    it('削除時にストアのremoveTableを呼び出す')
  })

  describe('リレーション表示', () => {
    it('JOINがある場合はリレーション線を表示する')
  })
})
```

#### 1.4.2 WhereTab.vue

**テストファイル**: `app/components/query-builder/where/WhereTab.spec.ts`

**テストケース**:
```typescript
describe('WhereTab', () => {
  describe('条件追加', () => {
    it('条件を追加できる')
    it('グループを追加できる')
  })

  describe('条件削除', () => {
    it('条件を削除できる')
    it('グループを削除できる')
  })

  describe('論理演算子切り替え', () => {
    it('ANDとORを切り替えできる')
  })
})
```

#### 1.4.3 ConditionRow.vue

**テストケース**:
```typescript
describe('ConditionRow', () => {
  describe('カラム選択', () => {
    it('カラムを選択できる')
    it('選択したカラムでデータ型が変わる')
  })

  describe('演算子選択', () => {
    it('演算子を選択できる')
    it('IS NULLの場合は値入力を非表示にする')
    it('IN演算子の場合は複数値入力にする')
    it('BETWEEN演算子の場合は範囲入力にする')
  })

  describe('値入力', () => {
    it('値を入力できる')
    it('数値型の場合は数値検証する')
  })

  describe('削除', () => {
    it('削除ボタンで削除イベントを発行する')
  })
})
```

#### 1.4.4 ConditionGroup.vue

**テストケース**:
```typescript
describe('ConditionGroup', () => {
  describe('レンダリング', () => {
    it('ネストした条件を表示する')
    it('論理演算子を表示する')
  })

  describe('条件追加', () => {
    it('グループ内に条件を追加できる')
  })

  describe('削除', () => {
    it('グループごと削除できる')
  })
})
```

#### 1.4.5 GroupByPanel.vue

**テストケース**:
```typescript
describe('GroupByPanel', () => {
  describe('カラム追加', () => {
    it('GROUP BYカラムを追加できる')
  })

  describe('カラム削除', () => {
    it('GROUP BYカラムを削除できる')
  })

  describe('順序変更', () => {
    it('カラムの順序を変更できる')
  })
})
```

#### 1.4.6 OrderByPanel.vue

**テストケース**:
```typescript
describe('OrderByPanel', () => {
  describe('カラム追加', () => {
    it('ORDER BYカラムを追加できる')
  })

  describe('カラム削除', () => {
    it('ORDER BYカラムを削除できる')
  })

  describe('ソート順変更', () => {
    it('ASCとDESCを切り替えできる')
  })

  describe('順序変更', () => {
    it('カラムの順序を変更できる')
  })
})
```

### Nuxt UI コンポーネントのスタブ設計

全コンポーネントテストで共通して使用するスタブを定義：

```typescript
// test/utils/nuxt-ui-stubs.ts
export const nuxtUiStubs = {
  UIcon: {
    template: '<i></i>',
    props: ['name']
  },
  UButton: {
    template: '<button><slot /></button>',
    props: ['color', 'variant', 'icon', 'size', 'disabled', 'loading']
  },
  UInput: {
    template: '<input />',
    props: ['modelValue', 'type', 'placeholder', 'disabled']
  },
  USelect: {
    template: '<select><slot /></select>',
    props: ['modelValue', 'options', 'placeholder', 'disabled']
  },
  UModal: {
    template: '<div><slot name="body" /><slot name="footer" /></div>',
    props: ['open', 'title', 'ui']
  },
  UBadge: {
    template: '<div><slot /></div>',
    props: ['color', 'size', 'variant']
  },
  UAlert: {
    template: '<div><slot name="title" /><slot /></div>',
    props: ['color', 'variant', 'icon']
  }
}
```

## Phase 2: 優先度中（2週間）

### 2.1 Connection Components

#### ConnectionList.vue

**テストケース**:
- 接続一覧の表示
- 環境フィルタリング
- 接続の選択
- 接続の削除
- 空状態の表示

#### ConnectionCard.vue

**テストケース**:
- 接続情報の表示
- アクティブ状態の表示
- クリックイベント
- 削除ボタン

#### ConnectionTestResultDialog.vue

**テストケース**:
- 成功時の表示
- 失敗時の表示
- エラーメッセージの表示
- ダイアログの開閉

### 2.2 Security Components

#### MasterPasswordSetupDialog.vue

**テストケース**:
- パスワード入力
- パスワード確認入力
- バリデーション
- 強度メーターの表示
- 送信処理

#### PasswordStrengthMeter.vue

**テストケース**:
- 強度レベルの計算
- 強度に応じた色の変化
- メッセージの表示

## Phase 3: 優先度低（1週間）

### 3.1 Settings Components

**簡易的なテストのみ実装**
- レンダリング確認
- 主要な操作のみテスト

### 3.2 Launcher Components

**簡易的なテストのみ実装**
- レンダリング確認
- 主要な操作のみテスト

## テスト実装のベストプラクティス

### 1. テストの独立性

```typescript
// 良い例
beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// 悪い例: テスト間で状態が共有される
const store = useExampleStore() // beforeEachの外
```

### 2. 非同期処理のテスト

```typescript
// async/await を使用
it('非同期処理のテスト', async () => {
  await store.someAsyncAction()
  expect(store.someState).toBe(expectedValue)
})
```

### 3. エラーハンドリングのテスト

```typescript
it('エラー時の処理', async () => {
  vi.mocked(apiCall).mockRejectedValue(new Error('test error'))

  await store.someAction()

  expect(store.error).toBe('test error')
})
```

### 4. ユーザーインタラクションのテスト

```typescript
it('ボタンクリックでイベントを発行', async () => {
  const wrapper = mount(Component)

  await wrapper.find('button').trigger('click')

  expect(wrapper.emitted('event-name')).toBeTruthy()
})
```

## テストカバレッジの測定

Vitestのカバレッジ機能を使用：

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.config.ts'
      ]
    }
  }
})
```

実行コマンド:
```bash
npm run test:coverage
```

## まとめ

このテスト設計により、以下を達成します：

1. **高品質なテストコード**: AAAパターンと明確なテストケース
2. **保守性**: 既存パターンに準拠し、理解しやすい
3. **段階的な実装**: Phase 1→2→3で優先度に応じて実装
4. **測定可能**: カバレッジで進捗を可視化

Phase 1完了時点で主要機能のテストカバレッジが大幅に向上し、品質が確保されます。
