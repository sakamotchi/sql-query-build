# タスクリスト: 8.5 安全機能統合

## ⚠️ 重要: 主要機能は既に実装済みです

調査の結果、8.5.1〜8.5.3および8.5.5は**既に実装済み**であることが判明しました。
詳細は [README.md](./README.md) を参照してください。

## 概要

このタスクリストは、[docs/sql_editor_wbs_v3.md](../../sql_editor_wbs_v3.md)のフェーズ8.5に基づいています。

## 進捗状況

- **全体進捗**: 4/6タスク完了（67% - 既存実装）
- **開始日**: 2026-01-02
- **目標完了日**: TBD
- **備考**: 8.5.1〜8.5.3, 8.5.5は既存実装の動作確認のみ実施

## タスク一覧

### 8.5.1 DangerousQueryDialog拡張 ✅

**説明**: INSERT/UPDATE/DELETEに対応した警告メッセージ表示

**注**: この機能は**Phase 3で既に実装済み**です。動作確認のみ実施してください。

**依存関係**: 8.2-8.4（INSERT/UPDATE/DELETEビルダー完了）

**完了条件**:
- ✅ INSERT実行時に適切な警告メッセージが表示される（既存実装）
- ✅ UPDATE実行時に適切な警告メッセージが表示される（既存実装）
- ✅ DELETE実行時に適切な警告メッセージが表示される（既存実装）
- ✅ クエリ種別に応じた適切なアイコン・色が表示される（既存実装）

**既存実装**:
- `app/components/query-builder/dialog/DangerousQueryDialog.vue`
  - 131行目: `{{ analysisResult.queryType.toUpperCase() }}` でクエリ種別表示
  - 144-146行目: `riskFactors` 表示（Rustの`query_analyzer.rs`からのメッセージ）
  - 91-100行目: 警告レベルに応じた色・アイコン
  - 108-113行目: カウントダウン機能

**動作確認内容**:
- INSERT/UPDATE/DELETE実行時に警告ダイアログが表示されることを確認
- 警告メッセージが適切に表示されることを確認

**担当者**: TBD

**実装時間見積もり**: 30分（動作確認のみ）

**状態**: ✅ **実装済み（Phase 3）** - 動作確認のみ実施

---

### 8.5.2 WHERE句なし検出ロジック ✅

**説明**: mutation-builderストアでWHERE句の有無を判定

**注**: この機能は**Phase 8.1-8.4で既に実装済み**です。動作確認のみ実施してください。

**依存関係**: 8.5.1

**完了条件**:
- ✅ `hasWhereConditions` computed が実装されている（既存実装）
- ✅ INSERT時は常にtrueを返す（INSERTは常に実行可能）（既存実装）
- ✅ UPDATE/DELETE時にWHERE条件の有無を正しく判定する（既存実装）
- ✅ 空配列の場合はfalseを返す（既存実装）

**既存実装**:
- `app/stores/mutation-builder.ts:223-237`
  ```typescript
  hasWhereConditions(state): boolean {
    if (state.mutationType === 'INSERT') {
      return true
    }
    if (state.queryModel.type === 'UPDATE' || state.queryModel.type === 'DELETE') {
      return hasValidWhereConditions(state.queryModel.whereConditions)
    }
    return true
  }
  ```

**動作確認内容**:
- UPDATE/DELETEでWHERE条件がある場合、`hasWhereConditions`がtrueを返すことを確認
- UPDATE/DELETEでWHERE条件がない場合、`hasWhereConditions`がfalseを返すことを確認

**担当者**: TBD

**実装時間見積もり**: 15分（動作確認のみ）

**状態**: ✅ **実装済み（Phase 8.1-8.4）** - 動作確認のみ実施

---

### 8.5.3 警告レベル設定 ✅

**説明**: クエリ種別とWHERE句有無に応じた警告レベル（warning/danger）

**注**: この機能は**Phase 3（Rust側）とPhase 8.1-8.4（フロント側）で既に実装済み**です。動作確認のみ実施してください。

**依存関係**: 8.5.2

**完了条件**:
- ✅ INSERT時は`riskLevel: 'warning'`が返される（既存実装）
- ✅ UPDATE（WHERE有）時は`riskLevel: 'warning'`が返される（既存実装）
- ✅ UPDATE（WHERE無）時は`riskLevel: 'danger'`が返される（既存実装）
- ✅ DELETE（WHERE有）時は`riskLevel: 'warning'`が返される（既存実装）
- ✅ DELETE（WHERE無）時は`riskLevel: 'danger'`が返される（既存実装）
- ✅ riskFactorsにWHERE句なし警告が含まれる（既存実装）

**既存実装**:
- **Rust側**: `src-tauri/src/services/query_analyzer.rs`
  - `analyze_insert()`: `RiskLevel::Warning` (58行目)
  - `analyze_update()`: WHERE有 → `Warning`、WHERE無 → `Danger` (75-91行目)
  - `analyze_delete()`: WHERE有 → `Warning`、WHERE無 → `Danger` (112-128行目)

- **フロント側**: `app/stores/mutation-builder.ts`
  - SQL生成後に`queryApi.analyzeQuery()`を呼び出し (469, 532, 594行目)
  - 結果を`this.analysisResult`に格納

**動作確認内容**:
- INSERT実行時に`riskLevel: 'warning'`が設定されることを確認
- UPDATE（WHERE有/無）で適切な警告レベルが設定されることを確認
- DELETE（WHERE有/無）で適切な警告レベルが設定されることを確認
- WHERE句なしの場合、riskFactorsに警告メッセージが含まれることを確認

**担当者**: TBD

**実装時間見積もり**: 30分（動作確認のみ）

**状態**: ✅ **実装済み（Phase 3, 8.1-8.4）** - 動作確認のみ実施

---

### 8.5.4 影響行数プレビュー（オプション） ⏳

**説明**: EXPLAIN結果で影響行数を事前表示（実装可能な場合）

**依存関係**: 8.5.3

**完了条件**:
- ✅ UPDATE/DELETE実行前に影響行数が表示される（可能な場合）
- ✅ データベースがサポートしていない場合はスキップする
- ✅ 影響行数が0件の場合は警告レベルを下げる（オプション）

**実装内容**:
- Rustバックエンドに`estimate_affected_rows`コマンドを追加（オプション）
- フロントエンドで影響行数を表示
- DangerousQueryDialogに影響行数プレビューを追加

**参考実装**:
- `src-tauri/src/query/executor.rs`（クエリ実行機能）

**担当者**: TBD

**実装時間見積もり**: 3-4時間（実装が困難な場合は後回し）

**状態**: ⏳ 未着手

**注**: この機能は実装が困難な場合は後回しにする（Phase 9以降）

---

### 8.5.5 クエリ履歴・保存機能の動作確認 ⏳

**説明**: mutation-builderでクエリ履歴・保存機能が正しく動作することを確認

**注**: この機能は既に実装済み（Phase 4.3）のため、**新規実装は不要**です。

**依存関係**: 8.5.3

**完了条件**:
- ✅ INSERT/UPDATE/DELETE実行時にクエリ履歴に記録される（既存実装の動作確認）
- ✅ 履歴にクエリ種別・影響行数・実行日時が記録される（既存実装の動作確認）
- ✅ 履歴からmutation-builderにクエリを読み込める（既存実装の動作確認）
- ✅ mutation-builderでクエリを保存できる（既存実装の動作確認）
- ✅ 保存したクエリをmutation-builderで読み込める（既存実装の動作確認）

**確認内容**:
- `app/stores/query-history.ts`の`loadToBuilder()`がmutation-builderに対応していることを確認
- `app/stores/saved-query.ts`の`saveCurrentQuery()`がmutation-builderに対応していることを確認
- 実際にINSERT/UPDATE/DELETEを実行して履歴に記録されることを確認
- 実際にクエリを保存・読み込みできることを確認

**参考実装**:
- `app/stores/query-history.ts`（クエリ履歴ストア、既存実装）
- `app/stores/saved-query.ts`（保存クエリストア、既存実装）

**担当者**: TBD

**実装時間見積もり**: 1-2時間（動作確認のみ）

**状態**: ⏳ 未着手

---

### 8.5.6 統合テスト ⏳

**説明**: 全機能の動作確認（各クエリ種別の構築・実行・警告表示）

**依存関係**: 8.5.5

**完了条件**:
- ✅ INSERT実行時の警告ダイアログが正しく表示される
- ✅ UPDATE（WHERE有/無）実行時の警告ダイアログが正しく表示される
- ✅ DELETE（WHERE有/無）実行時の警告ダイアログが正しく表示される
- ✅ カウントダウンが正しく動作する
- ✅ 確認チェックボックスが正しく動作する
- ✅ クエリ履歴に記録される
- ✅ クエリ保存機能が動作する
- ✅ 本番環境での動作確認が完了している

**実装内容**:
- E2Eテストを実装
- 操作手順によるテストを実施
- 本番環境での動作確認
- 開発環境での動作確認
- 安全設定のON/OFF切り替え確認

**参考実装**:
- `docs/working/20260102_safety-integration/testing.md`（テスト手順書）

**担当者**: TBD

**実装時間見積もり**: 2-3時間

**状態**: ⏳ 未着手

---

## タスク依存関係図

```
8.5.1 DangerousQueryDialog拡張
  ↓
8.5.2 WHERE句なし検出ロジック
  ↓
8.5.3 警告レベル設定
  ↓
8.5.4 影響行数プレビュー（オプション）
  ↓
8.5.5 クエリ履歴・保存機能
  ↓
8.5.6 統合テスト
```

## リスク管理

| リスクID | リスク内容 | 影響度 | 発生確率 | 対策 |
|---------|-----------|--------|---------|------|
| R1 | DangerousQueryDialogの既存機能への影響 | 中 | 低 | 既存のpropsは維持し、新規propsを追加 |
| R2 | WHERE句検出ロジックの漏れ | 高 | 低 | 単体テストで全パターンをカバー |
| R3 | 影響行数プレビュー実装の困難さ | 中 | 中 | オプション機能として、実装困難な場合は後回し |
| R4 | クエリ保存機能の複雑性 | 中 | 中 | Phase 1ではSQL文字列のみ保存、モデル復元は将来対応 |

## 完了の定義（Definition of Done）

各タスクは以下の条件を満たした時点で完了とします:

1. ✅ 完了条件がすべて満たされている
2. ✅ コードレビューが完了している
3. ✅ 単体テストが通っている（該当する場合）
4. ✅ E2Eテストが通っている（該当する場合）
5. ✅ ドキュメントが更新されている（該当する場合）

## 次のステップ

1. タスク8.5.1から順番に実装を開始
2. 各タスク完了後、このファイルの進捗状況を更新
3. 全タスク完了後、testing.mdに従ってテストを実施
4. テスト完了後、永続化ドキュメント（docs/features/）を更新
