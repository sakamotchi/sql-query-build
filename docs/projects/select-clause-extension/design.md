# 技術設計書: SELECT句拡張（関数・サブクエリ対応）

**全体アーキテクチャ概要**

このドキュメントはSELECT句拡張プロジェクト全体のアーキテクチャ概要を示します。
詳細な設計は各フェーズの設計書を参照してください：

- [Phase 1 詳細設計](phases/phase1/design.md) - 式ツリー基盤（型定義、SQL生成ロジック）
- [Phase 2 詳細設計](phases/phase2/design.md) - 関数ビルダーUI
- [Phase 3 詳細設計](phases/phase3/design.md) - サブクエリビルダーUI

---

## 1. アーキテクチャ概要

### 1.1 システム全体構成

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Frontend (Nuxt + Vue 3)                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   Expression Editor UI                         │  │
│  │  ┌──────────────┬──────────────┬───────────────────────────┐  │  │
│  │  │ Column       │ Function     │ Subquery                  │  │  │
│  │  │ Selector     │ Builder      │ Builder                   │  │  │
│  │  └──────────────┴──────────────┴───────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │            Expression Preview                            │  │  │
│  │  │      SUBSTRING(UPPER(u.name), 1, 3) AS short_name       │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              query-builder.ts (Pinia Store)                   │  │
│  │  - ExpressionNode型管理                                       │  │
│  │  - プレビューSQL生成（フロント側簡易版）                       │  │
│  │  - バリデーション                                             │  │
│  └───────────────┬───────────────────────────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────────────┘
                   │ invoke("generate_sql", { query: QueryModel })
                   │ invoke("validate_expression", { expression: ExpressionNode })
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Tauri Backend (Rust)                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  SQL Generator                                 │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │           QueryBuilder (既存拡張)                         │  │  │
│  │  │  - SELECT句生成: select_builder.rs                       │  │  │
│  │  │  - WHERE句生成: where_builder.rs (既存)                  │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │         ExpressionBuilder (新規)                          │  │  │
│  │  │  - 式ツリー → SQL変換                                     │  │  │
│  │  │  - 関数マッピング（DB方言対応）                            │  │  │
│  │  │  - ネスト処理                                             │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │      DialectMapper (新規)                                 │  │  │
│  │  │  - PostgreSQL関数マッピング                               │  │  │
│  │  │  - MySQL関数マッピング                                    │  │  │
│  │  │  - SQLite関数マッピング                                   │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 データフロー

```
[ユーザー操作]
    │
    ▼
[Expression Editor UI]
    │ (関数選択、引数設定、サブクエリ構築)
    ▼
[ExpressionNode型構築]
    │
    ▼
[query-builder store更新]
    │
    ├─→ [フロント側プレビュー生成] → [プレビュー表示]
    │
    └─→ [Rust invoke] → [ExpressionBuilder] → [SQL生成]
                              │
                              ▼
                        [DialectMapper] → [DB方言別SQL]
```

### 1.3 主要データモデル概要

**ExpressionNode（式ツリー）**:
- 再帰的な型定義で、関数やサブクエリをネスト可能
- TypeScript（フロントエンド）とRust（バックエンド）で同等の型を定義
- 種類: ColumnReference、LiteralValue、FunctionCall、SubqueryExpression、BinaryOperation、UnaryOperation

詳細な型定義は [Phase 1 設計書](phases/phase1/design.md#2-データ構造設計) を参照。

### 1.4 技術スタック

**フロントエンド**:
- Nuxt 4 + Vue 3 (Composition API)
- Nuxt UI v4（Tailwind CSS 4ベース）
- Pinia（状態管理）
- TypeScript 5.7

**バックエンド**:
- Rust（Tauri 2.x）
- serde（シリアライゼーション）
- 既存のQueryBuilderを拡張

### 1.5 フェーズ別実装方針

**Phase 1: 式ツリー基盤構築**
- ExpressionNode型定義（TypeScript + Rust）
- ExpressionBuilder（SQL生成）
- DialectMapper（DB方言対応）
- 詳細: [Phase 1 設計書](phases/phase1/design.md)

**Phase 2: 関数ビルダーUI**
- FunctionBuilderコンポーネント
- 関数マスタデータ
- UIからExpressionNodeへの変換
- 詳細: [Phase 2 設計書](phases/phase2/design.md)

**Phase 3: サブクエリビルダーUI**
- SubqueryBuilderコンポーネント
- ミニクエリビルダー
- 相関サブクエリ対応
- 詳細: [Phase 3 設計書](phases/phase3/design.md)

---

## 2. 全体的な設計方針

### 2.1 後方互換性

既存の `SelectColumn` 型を維持しつつ、新しい `ExpressionNode` 型を追加：

```typescript
export interface SelectColumn {
  type: 'column' | 'expression' | 'aggregate' | 'expression_node' // 'expression_node'を追加
  column?: string
  expression?: string
  aggregate?: AggregateFunction
  expressionNode?: ExpressionNode // 新規追加
  alias?: string
}
```

### 2.2 段階的移行

- Phase 1完了時: バックエンドSQL生成が可能、フロントは文字列入力
- Phase 2完了時: 関数ビルダーUIで一般的な関数を構築可能
- Phase 3完了時: サブクエリも含めた完全な式構築が可能

### 2.3 エラーハンドリング

- フロントエンド: 入力バリデーション、プレビュー生成エラー
- バックエンド: SQL生成エラー、データベース方言非対応エラー
- ユーザーフレンドリーな日本語エラーメッセージ

### 2.4 パフォーマンス考慮

- プレビュー生成は1秒以内
- 式ツリーの深さ制限（最大10レベル）
- 関数引数数の制限（最大10個）

---

## 3. テスト戦略

### 3.1 単体テスト

- 型定義の妥当性検証
- SQL生成ロジックのテスト（各データベース方言）
- バリデーションロジックのテスト

### 3.2 統合テスト

- フロントエンド・バックエンド連携テスト
- 実際のデータベースでのクエリ実行テスト

### 3.3 E2Eテスト

- ユーザーシナリオベースのテスト
- 各フェーズ完了時にE2Eテストを実施

詳細なテスト手順は各フェーズの `testing.md` を参照：
- [Phase 1 テスト手順](phases/phase1/testing.md)
- [Phase 2 テスト手順](phases/phase2/testing.md)
- [Phase 3 テスト手順](phases/phase3/testing.md)

---

## 4. セキュリティ考慮事項

- SQLインジェクション対策: パラメータ化クエリの使用
- リテラル値の適切なエスケープ
- サブクエリの深さ制限（DoS攻撃対策）

---

## 5. 関連ドキュメント

- [プロジェクト計画書](project-plan.md)
- [要件定義書](requirements.md)
- [WBS](wbs.md)
- [実装計画書](implementation-plan.md)
- [Phase 1 タスクリスト](phases/phase1/tasklist.md)
- [Phase 2 タスクリスト](phases/phase2/tasklist.md)
- [Phase 3 タスクリスト](phases/phase3/tasklist.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|--------|
| 2026-01-03 | 2.0 | 設計書をフェーズ別に分割、ルートは全体概要のみに簡潔化 | Claude |
| 2026-01-02 | 1.0 | 初版作成 | Claude |
