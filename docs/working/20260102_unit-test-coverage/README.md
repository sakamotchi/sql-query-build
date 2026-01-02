# 単体テストカバレッジ向上プロジェクト

## プロジェクト概要

このプロジェクトは、SQL Query Builderアプリケーションのフロントエンド単体テストカバレッジを向上させるための開発作業です。

**現状**: テストカバレッジ約20%（31ファイル/157ファイル）
**目標**: テストカバレッジ50%以上（Phase 3完了時）

## ドキュメント構成

| ファイル | 内容 | 用途 |
|---------|------|------|
| [requirements.md](./requirements.md) | 要件定義書 | プロジェクトの背景、目的、スコープ、成功基準を定義 |
| [design.md](./design.md) | 設計書 | テスト設計、実装方針、具体的なテストケースを定義 |
| [tasklist.md](./tasklist.md) | タスクリスト | Phase別の作業タスク、見積もり、進捗管理 |
| [testing.md](./testing.md) | テスト手順書 | テスト実行方法、確認手順、トラブルシューティング |

## プロジェクト構造

### Phase 1: 優先度高（2週間）

**対象**:
- Saved Query Store（未テスト）
- useColumnResize, useSqlFormatter Composable（未テスト）
- Query Builder主要7コンポーネント

**目標カバレッジ**: Store/Composable 80-90%、全体 30%以上

**見積もり**: 16日

### Phase 2: 優先度中（2週間）

**対象**:
- Connection関連コンポーネント5つ
- Security関連コンポーネント5つ

**目標カバレッジ**: 全体 40%以上

**見積もり**: 7日

### Phase 3: 優先度低（1週間）

**対象**:
- Settings/Launcher関連コンポーネント（簡易テスト）

**目標カバレッジ**: 全体 50%以上

**見積もり**: 4日

**総見積もり**: 27日（約5週間）

## クイックスタート

### 現在の状態確認

```bash
# 現在のテスト実行
npm run test:run

# 現在のカバレッジ確認
npm run test:coverage
open coverage/index.html
```

### Phase 1の開始

1. [design.md](./design.md) を読み、テスト設計を理解
2. [tasklist.md](./tasklist.md) のPhase 1タスクを確認
3. Task 1-1から順次実装開始

```bash
# 例: Saved Query Store テストの実装
# 1. ファイル作成
touch tests/stores/saved-query.spec.ts

# 2. テスト実装（design.mdを参照）
# 3. テスト実行
npm run test -- tests/stores/saved-query.spec.ts

# 4. カバレッジ確認
npm run test:coverage -- app/stores/saved-query.ts
```

## 主要な技術スタック

- **テストフレームワーク**: Vitest 3.2.4
- **コンポーネントテスト**: @vue/test-utils
- **モック**: vi.mock()
- **カバレッジ**: v8 provider

## テストパターン

### Store テスト

```typescript
describe('ExampleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('アクションが正しく動作する', async () => {
    const store = useExampleStore()
    await store.someAction()
    expect(store.someState).toBe(expected)
  })
})
```

### Composable テスト

```typescript
describe('useExample', () => {
  it('機能が正しく動作する', () => {
    const { someFunction } = useExample()
    const result = someFunction(input)
    expect(result).toBe(expected)
  })
})
```

### Component テスト

```typescript
const stubs = {
  UIcon: { template: '<i></i>', props: ['name'] },
  UButton: { template: '<button><slot /></button>', props: ['color', 'variant'] }
}

describe('ExampleComponent', () => {
  it('レンダリングが正しい', () => {
    const wrapper = mount(ExampleComponent, {
      props: { /* ... */ },
      global: { stubs }
    })
    expect(wrapper.text()).toContain('Expected Text')
  })
})
```

## 進捗管理

### タスク完了基準

各タスクは以下を満たした時点で完了:

1. ✅ テストコードが実装されている
2. ✅ 全テストが合格している
3. ✅ コードレビューが完了している
4. ✅ カバレッジ目標を達成している

### 報告タイミング

- **日次**: tasklist.mdのタスクをチェック
- **週次**: Phase進捗レポート作成
- **Phase完了時**: カバレッジレポート作成

## カバレッジ目標

| Phase | 目標カバレッジ | 重点領域 |
|-------|--------------|---------|
| Phase 1完了 | 30%以上 | Store, Composable, Query Builder |
| Phase 2完了 | 40%以上 | Connection, Security |
| Phase 3完了 | **50%以上** | Settings, Launcher |

## 関連リンク

### ドキュメント

- [要件定義書](./requirements.md) - プロジェクトの背景と目的
- [設計書](./design.md) - テスト設計と実装方針
- [タスクリスト](./tasklist.md) - 作業タスクと進捗管理
- [テスト手順書](./testing.md) - テスト実行方法

### 外部リンク

- [Vitest公式ドキュメント](https://vitest.dev/)
- [Vue Test Utils公式ドキュメント](https://test-utils.vuejs.org/)
- [プロジェクトREADME](../../../README.md)

## 注意事項

### 実装時の注意

1. **既存テストを壊さない**: 新規テスト追加時は必ず全テストを実行
2. **モックを適切に**: Nuxt UI、Tauri API、外部APIは適切にモック化
3. **テスト実行時間**: 全テスト5秒以内を維持
4. **コードレビュー**: 実装後は必ずレビューを受ける

### テスト設計の原則

1. **AAAパターン**: Arrange-Act-Assertに従う
2. **日本語テスト名**: 何をテストするか明確に記述
3. **独立性**: テスト間で状態を共有しない
4. **ユーザー視点**: 実装詳細ではなく動作をテスト

## トラブルシューティング

### よくある問題

**Q: `[nuxt] instance unavailable` エラーが出る**
A: Nuxt UIコンポーネントのスタブが不足しています。[design.md](./design.md)のスタブ設計を参照してください。

**Q: テストが非同期処理でタイムアウトする**
A: async/awaitを使用し、非同期処理が完了するまで待機してください。

**Q: カバレッジが目標に届かない**
A: `npm run test:coverage`でHTMLレポートを確認し、未カバーの箇所にテストを追加してください。

詳細は[testing.md](./testing.md)のトラブルシューティングセクションを参照してください。

## 連絡先・サポート

- GitHubイシュー: プロジェクトのissuesセクション
- コードレビュー: Pull Requestでレビュー依頼

## 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2026-01-02 | プロジェクト立ち上げ、ドキュメント作成 | - |

---

**次のアクション**: [tasklist.md](./tasklist.md)のPhase 1 Task 1-1から開始してください。
