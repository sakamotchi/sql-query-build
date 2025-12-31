# Phase 6A: 基本的なJOIN機能 - 要件定義書

**作成日**: 2025-12-30
**フェーズ**: 6A
**優先度**: 中
**依存関係**: Phase 2（クエリ実行・結果表示）

---

## 1. 概要

モーダルベースのシンプルなUIでJOIN設定を可能にします。ビジュアル表現（キャンバス）は6Bフェーズで実装するため、このフェーズでは機能面を優先します。

---

## 2. 目的

- クエリビルダーでJOINを設定できるようにする
- INNER/LEFT/RIGHT/FULL OUTER JOIN に対応する
- 複数のON条件を設定できる（AND/OR対応）
- 設定したJOINが正しいSQLに変換される
- 保存したクエリにJOIN設定が含まれる

---

## 3. スコープ

### 含まれるもの

- JOIN設定ダイアログUI（JoinConfigDialog.vue）
- JOIN条件設定行UI（JoinConditionRow.vue）
- query-builderストアとの連携
- JOIN SQL生成機能の拡張（Rust側）

### 含まれないもの（後続フェーズ）

- キャンバスでのビジュアル表現（Phase 6B）
- 外部キーベースの自動提案（Phase 6C）
- ドラッグ&ドロップによるJOIN設定（Phase 6B）

---

## 4. 機能要件

### 4.1 JOIN設定ダイアログ

- テーブル選択パネルから「JOINを追加」ボタンでダイアログを開く
- 既存のJOINをクリックして編集できる
- 以下の設定項目を持つ：
  - JOIN種別（INNER/LEFT/RIGHT/FULL OUTER/CROSS）
  - 結合先テーブル（選択済みテーブルから選択）
  - ON条件（複数設定可能）
  - 条件の結合方法（AND/OR）

### 4.2 JOIN条件設定

- ON条件は以下の形式：
  - 左側テーブル.カラム [演算子] 右側テーブル.カラム
- 対応演算子：`=`, `!=`, `>`, `>=`, `<`, `<=`
- 複数のON条件を追加・削除できる
- 条件間の結合方法（AND/OR）を選択できる

### 4.3 JOIN管理

- 複数のJOINを設定できる
- JOINの順序を変更できる
- JOINを削除できる
- JOINの一覧を表示する（テーブル選択パネル内）

### 4.4 SQL生成

- 設定したJOINを正しいSQL構文に変換する
- 各データベース方言（PostgreSQL/MySQL/SQLite）に対応する
- CROSS JOINの場合はON条件なし

---

## 5. 非機能要件

### 5.1 パフォーマンス

- JOIN設定ダイアログは1秒以内に開く
- SQL再生成は300ms以内

### 5.2 ユーザビリティ

- 直感的なUI設計
- エラーメッセージは明確でわかりやすい
- キーボード操作に対応（Enter/Esc）

### 5.3 データ整合性

- 削除されたテーブルを参照するJOINは自動削除
- 保存時にJOIN設定を含める
- 復元時にJOIN設定を復元する

---

## 6. 制約事項

- 最初のFROMテーブルは削除できない
- JOINは最大10個まで（パフォーマンス考慮）
- サブクエリのJOINは今回対象外

---

## 7. 成功基準

- ✅ JOIN設定ダイアログでINNER/LEFT/RIGHT/FULL OUTERを選択できる
- ✅ ON条件を複数設定できる（AND/OR対応）
- ✅ 設定したJOINが正しいSQLに変換される
- ✅ 保存したクエリにJOIN設定が含まれる
- ✅ PostgreSQL/MySQL/SQLiteで実行可能なSQLが生成される

---

## 8. UI設計方針

### 8.1 JOIN追加フロー

1. テーブル選択パネルで「+ JOINを追加」ボタンをクリック
2. JoinConfigDialogが開く
3. JOIN種別を選択
4. 結合先テーブルを選択
5. ON条件を設定
6. 「保存」ボタンで確定

### 8.2 JOIN編集フロー

1. テーブル選択パネルのJOIN一覧から編集対象をクリック
2. JoinConfigDialogが開く（既存設定がセットされた状態）
3. 設定を変更
4. 「保存」ボタンで確定

### 8.3 JOIN削除フロー

1. テーブル選択パネルのJOIN一覧から削除対象の「×」をクリック
2. 確認なしで即座に削除（Undo機能は今回対象外）

---

## 9. データモデル

### 9.1 既存の型定義（app/types/query-model.ts）

すでに以下の型が定義されている：

```typescript
export interface JoinClause {
  id: string
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  table: TableReference
  conditions: JoinCondition[]
  conditionLogic: 'AND' | 'OR'
}

export interface JoinCondition {
  left: {
    tableAlias: string
    columnName: string
  }
  operator: '=' | '!=' | '>' | '>=' | '<' | '<='
  right: {
    tableAlias: string
    columnName: string
  }
}
```

### 9.2 Rust側の型定義（必要に応じて追加）

Rust側のSQL生成エンジンにJOIN対応を追加する必要がある。

---

## 10. 参考資料

- WBS: [docs/sql_editor_wbs_v3.md](../sql_editor_wbs_v3.md) - Phase 6A
- 既存のクエリビルダー: [app/stores/query-builder.ts](../../../app/stores/query-builder.ts)
- 既存の型定義: [app/types/query-model.ts](../../../app/types/query-model.ts)
- SQL生成エンジン: `src-tauri/src/sql_generator/` (想定パス)

---

## 11. リスク

| リスクID | リスク内容 | 影響度 | 発生確率 | 対策 |
|---------|-----------|--------|---------|------|
| R1 | Rust側のSQL生成エンジンが未実装 | 高 | 中 | 既存のWHERE生成パターンを参考に実装 |
| R2 | JOIN順序の管理が複雑 | 中 | 低 | 配列のインデックスで管理 |
| R3 | テーブル削除時のJOIN整合性 | 中 | 中 | テーブル削除時にJOINも削除するロジックを追加 |

---

## 12. 次のアクション

1. design.mdで詳細設計を行う
2. tasklist.mdでタスクを洗い出す
3. 実装開始
