# 要件定義書: 結果表示UI

## 概要

WBS Phase 2.2で定義されている「結果表示UI」の実装を行う。
Rustバックエンドで実行されたクエリの結果をフロントエンドで表形式で表示する機能を実装する。

## 背景

- Phase 2.1でクエリ実行基盤（Rust）が完成予定
- `execute_query`コマンドにより実行結果（QueryResult）が返却される
- 現在`ResultPanel.vue`はプレースホルダー状態で実際の結果表示機能がない

## 実現したいこと

1. **クエリ実行結果の表形式表示**
   - カラム名をヘッダーとして表示
   - 行データを表形式で表示
   - NULL値を視覚的に識別可能に表示

2. **フロントエンドからのクエリ実行**
   - `queryApi.executeQuery`でTauriコマンドを呼び出し
   - query-builderストアの`executeQuery`メソッドを実装

3. **大量データへの対応**
   - ページネーションUIで大量行を効率的に表示
   - 表示行数の選択（10/25/50/100件など）

4. **クエリ情報の表示**
   - 実行時間の表示
   - 取得行数の表示

## 機能要件

### FR-1: 型定義

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1.1 | フロントエンド用QueryResult型を定義（Rust側と整合性を取る） | 必須 |
| FR-1.2 | QueryResultColumn型（カラム情報）を定義 | 必須 |
| FR-1.3 | QueryResultRow型（行データ）を定義 | 必須 |

### FR-2: API実装

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-2.1 | `queryApi.executeQuery`でTauriコマンドをラップ | 必須 |
| FR-2.2 | 実行リクエスト型（QueryExecuteRequest）を定義 | 必須 |
| FR-2.3 | エラーハンドリング | 必須 |

### FR-3: 結果表示コンポーネント

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-3.1 | ResultTable.vueで結果を表形式で表示 | 必須 |
| FR-3.2 | ResultColumnHeader.vueでカラムヘッダー表示（型情報含む） | 必須 |
| FR-3.3 | ResultRow.vueで行データ表示 | 必須 |
| FR-3.4 | NULL値を視覚的に区別して表示 | 必須 |
| FR-3.5 | 空の結果（0件）の適切な表示 | 必須 |

### FR-4: ページネーション

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-4.1 | Pagination.vueでページ切り替えUI | 必須 |
| FR-4.2 | 表示件数の選択（10/25/50/100） | 必須 |
| FR-4.3 | 現在ページ/総ページ数の表示 | 必須 |
| FR-4.4 | 先頭/末尾ページへのジャンプ | 推奨 |

### FR-5: ストア実装

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-5.1 | query-builderストアの`executeQuery`メソッド実装 | 必須 |
| FR-5.2 | 実行結果の状態管理 | 必須 |
| FR-5.3 | 実行中状態の管理（ローディング表示用） | 必須 |
| FR-5.4 | エラー状態の管理 | 必須 |

### FR-6: ResultPanel統合

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-6.1 | 既存ResultPanel.vueを拡張して結果表示統合 | 必須 |
| FR-6.2 | クエリ情報（実行時間、行数）の表示 | 必須 |
| FR-6.3 | エクスポートボタンの配置（機能はPhase 5） | 推奨 |

## 非機能要件

| ID | 要件 | 内容 |
|----|------|------|
| NFR-1 | パフォーマンス | 1000行程度のデータを遅延なく表示 |
| NFR-2 | ユーザビリティ | NULL値が明確に識別可能 |
| NFR-3 | アクセシビリティ | テーブルに適切なaria属性を付与 |

## 制約事項

- 仮想スクロールはPhase 7で対応予定（当面はページネーションで対応）
- エクスポート機能はPhase 5で実装
- Phase 2.1のクエリ実行基盤（Rust）の完成が前提

## WBSタスク対応

| タスクID | タスク名 | 対応要件 |
|---------|---------|---------|
| 2.2.1 | QueryResult型定義（フロントエンド） | FR-1.* |
| 2.2.2 | queryApi.executeQuery実装 | FR-2.* |
| 2.2.3 | ResultTable.vue コンポーネント | FR-3.1 |
| 2.2.4 | ResultColumnHeader.vue | FR-3.2 |
| 2.2.5 | ResultRow.vue | FR-3.3, FR-3.4 |
| 2.2.6 | Pagination.vue | FR-4.* |
| 2.2.7 | ResultPanel.vue拡張 | FR-6.* |
| 2.2.8 | query-builderストア executeQuery実装 | FR-5.* |

## 参照資料

- WBS: `docs/sql_editor_wbs_v3.md` Phase 2.2
- Rust側QueryResult: `docs/working/20251229_query-execution-rust/design.md`
- 既存ResultPanel: `app/components/query-builder/ResultPanel.vue`
- 既存query-builderストア: `app/stores/query-builder.ts` (L481-498のTODO)
- 既存QueryResult型: `app/types/query.ts`

## 成果物

- `app/types/query-result.ts` - QueryResult関連型定義
- `app/api/query.ts` - executeQuery API追加
- `app/components/query-builder/result/ResultTable.vue` - 結果テーブル
- `app/components/query-builder/result/ResultColumnHeader.vue` - カラムヘッダー
- `app/components/query-builder/result/ResultRow.vue` - 行データ
- `app/components/query-builder/result/ResultPagination.vue` - ページネーション
- `app/components/query-builder/ResultPanel.vue` - 拡張版
- `app/stores/query-builder.ts` - executeQuery実装
