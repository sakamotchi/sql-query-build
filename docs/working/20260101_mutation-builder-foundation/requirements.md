# 要件定義書: データ変更クエリビルダー共通基盤（8.1）

## 概要

INSERT/UPDATE/DELETEクエリをGUIで構築する「データ変更クエリビルダー」の共通基盤を構築します。
既存のSELECTクエリビルダー（`/query-builder`）とは完全に独立した新規ページ（`/mutation-builder`）として実装します。

## 目的

- SELECTビルダーに影響を与えずに、データ変更クエリビルダーを実装する基盤を構築
- INSERT/UPDATE/DELETEの3つのクエリ種別を切り替えられるUIを提供
- 既存のコンポーネント（DatabaseTree、WhereTab等）を再利用できる設計

## 背景

- Phase 1-7でSELECTクエリビルダーが完成
- データ変更（INSERT/UPDATE/DELETE）機能が未実装
- SELECTビルダーとデータ変更ビルダーを同一UI内で切り替える実装は複雑になるため、別ページとして実装

## スコープ

### 含まれるもの

1. **型定義**:
   - INSERT/UPDATE/DELETE用のデータ構造（MutationQueryModel）
   - クエリ種別の型定義（'INSERT' | 'UPDATE' | 'DELETE'）

2. **ストア**:
   - データ変更クエリ用のPiniaストア（mutation-builder.ts）
   - クエリ種別の状態管理
   - 基本的なアクション（setQueryType等）

3. **ページ**:
   - `/mutation-builder` ページの作成
   - ページメタデータの設定

4. **レイアウト**:
   - MutationBuilderLayout.vue（3ペインレイアウト）
   - 左パネル: DatabaseTree（既存コンポーネント再利用）
   - 中央パネル: SQLプレビュー
   - 右パネル: クエリ種別に応じた入力フォーム（動的切り替え）

5. **ツールバー**:
   - MutationBuilderToolbar.vue
   - INSERT/UPDATE/DELETE切り替えタブ（UButtonGroup）
   - アクションボタン（実行、保存、履歴）のプレースホルダー

6. **ナビゲーション**:
   - トップページ（index.vue）に「データ変更」メニュー追加

### 含まれないもの

- INSERT/UPDATE/DELETE各ビルダーの詳細実装（8.2-8.4で実装）
- SQL生成ロジック（Rust側、8.2-8.4で実装）
- クエリ実行機能（8.2-8.4で実装）
- 安全機能統合（8.5で実装）

## 要求仕様

### 機能要件

#### FR-8.1.1: 型定義

- INSERT/UPDATE/DELETE用のデータ構造を定義
- 既存のQueryModelとは独立した型定義
- ファイル: `app/types/mutation-query.ts`

**型の概要**:
```typescript
// クエリ種別
type MutationType = 'INSERT' | 'UPDATE' | 'DELETE'

// INSERT用
interface InsertQueryModel {
  type: 'INSERT'
  table: string
  columns: string[]
  values: Array<Record<string, any>>
}

// UPDATE用
interface UpdateQueryModel {
  type: 'UPDATE'
  table: string
  setClause: Array<{ column: string; value: any }>
  whereConditions: Array<WhereCondition | ConditionGroup>
}

// DELETE用
interface DeleteQueryModel {
  type: 'DELETE'
  table: string
  whereConditions: Array<WhereCondition | ConditionGroup>
}

// ユニオン型
type MutationQueryModel = InsertQueryModel | UpdateQueryModel | DeleteQueryModel
```

#### FR-8.1.2: Piniaストア

- ファイル: `app/stores/mutation-builder.ts`
- 状態管理:
  - `mutationType: MutationType` - 現在のクエリ種別
  - `queryModel: MutationQueryModel | null` - クエリモデル
  - `generatedSql: string` - 生成されたSQL
  - `selectedTable: string | null` - 選択中のテーブル
- アクション:
  - `setMutationType(type: MutationType)` - クエリ種別変更
  - `setSelectedTable(table: string)` - テーブル選択
  - `resetState()` - 状態リセット

#### FR-8.1.3: ページ作成

- ファイル: `app/pages/mutation-builder.vue`
- ルート: `/mutation-builder`
- ページメタデータ:
  - title: 'データ変更'
  - layout: false
- MutationBuilderLayoutコンポーネントを表示

#### FR-8.1.4: レイアウトコンポーネント

- ファイル: `app/components/mutation-builder/MutationBuilderLayout.vue`
- 3ペインレイアウト（左・中央・右）
- ResizablePanelを使用してパネルサイズ変更可能
- パネル構成:
  - 左パネル: DatabaseTree（既存コンポーネント）
  - 中央パネル: SQLプレビュー + クエリ情報
  - 右パネル: クエリ種別に応じた入力フォーム（動的切り替え）

#### FR-8.1.5: ツールバーコンポーネント

- ファイル: `app/components/mutation-builder/MutationBuilderToolbar.vue`
- クエリ種別切り替え:
  - UButtonGroupでINSERT/UPDATE/DELETEを切り替え
  - 選択中のタブは`color="primary"`で表示
- アクションボタン:
  - 実行ボタン（プレースホルダー、8.2-8.4で実装）
  - 保存ボタン（プレースホルダー、8.5で実装）
  - 履歴ボタン（プレースホルダー、8.5で実装）
  - クエリビルダーへのリンクボタン

#### FR-8.1.6: ナビゲーション追加

- ファイル: `app/pages/index.vue`
- 「データ変更」メニューカードを追加
- `/mutation-builder` へのリンク
- アイコン: `i-heroicons-pencil-square`（または適切なアイコン）

### 非機能要件

#### NFR-8.1.1: パフォーマンス

- ページ遷移は1秒以内
- パネルリサイズは滑らか（60fps）

#### NFR-8.1.2: 保守性

- 既存のquery-builderコードに変更を加えない
- コンポーネントは単一責任の原則に従う
- TypeScript strictモードに準拠

#### NFR-8.1.3: 再利用性

- 既存のコンポーネント（DatabaseTree、WhereTab等）を再利用
- 共通ロジックはcomposableに抽出

#### NFR-8.1.4: テスタビリティ

- 各コンポーネントは単体テスト可能
- ストアはVitestでテスト可能

## 制約条件

- Nuxt 4の標準ディレクトリ構成に従う
- Nuxt UI v4のコンポーネントを使用
- 既存のquery-builderストアは変更しない
- 既存のQueryBuilderLayoutは変更しない

## 依存関係

- Phase 7（クエリ実行の最適化）が完了していること
- 既存のDatabaseTreeコンポーネントが使用可能
- 既存のWhereTabコンポーネントが使用可能

## 成果物

1. `app/types/mutation-query.ts` - 型定義
2. `app/stores/mutation-builder.ts` - Piniaストア
3. `app/pages/mutation-builder.vue` - ページ
4. `app/components/mutation-builder/MutationBuilderLayout.vue` - レイアウト
5. `app/components/mutation-builder/MutationBuilderToolbar.vue` - ツールバー
6. `app/pages/index.vue` - ナビゲーション追加（既存ファイル更新）

## 完了条件

- [ ] `/mutation-builder` ページにアクセスできる
- [ ] INSERT/UPDATE/DELETEのタブ切り替えが動作する
- [ ] 左パネルにDatabaseTreeが表示される
- [ ] 中央パネルにSQLプレビューエリアが表示される
- [ ] 右パネルが表示される（内容は空でも可）
- [ ] トップページから「データ変更」メニューで遷移できる
- [ ] 既存のquery-builderページが正常に動作する（影響がない）
- [ ] TypeScript型エラーがない
- [ ] npm run tauri:dev でアプリが起動する

## リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| 既存コンポーネント（DatabaseTree）が再利用できない | 高 | 事前に既存コンポーネントの設計を確認 |
| レイアウトが複雑になりすぎる | 中 | QueryBuilderLayoutを参考にシンプルに実装 |
| Piniaストアの設計ミス | 高 | 既存のquery-builderストアを参考に設計 |

## 参考資料

- [docs/sql_editor_wbs_v3.md](../../sql_editor_wbs_v3.md) - フェーズ8 WBS
- [app/stores/query-builder.ts](../../../app/stores/query-builder.ts) - 既存ストアの実装
- [app/components/query-builder/QueryBuilderLayout.vue](../../../app/components/query-builder/QueryBuilderLayout.vue) - 既存レイアウトの実装
- [app/pages/index.vue](../../../app/pages/index.vue) - トップページ
