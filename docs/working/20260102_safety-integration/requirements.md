# 要件定義書: 8.5 安全機能統合

## ⚠️ 重要: 主要機能は既に実装済みです

調査の結果、8.5.1〜8.5.3および8.5.5は**既に実装済み**であることが判明しました。
- **8.5.1**: Phase 3で実装済み
- **8.5.2**: Phase 8.1-8.4で実装済み
- **8.5.3**: Phase 3, 8.1-8.4で実装済み
- **8.5.5**: Phase 4.3で実装済み

詳細は [README.md](./README.md) を参照してください。

## 概要

mutation-builder（データ変更クエリビルダー）は既にPhase 3, 4.3, 8.1-8.4で安全機能と統合されています。
INSERT/UPDATE/DELETEの各クエリ種別に応じた適切な警告レベルが設定されており、
特にWHERE句のないUPDATE/DELETEについては最も強い警告が表示される仕組みになっています。

8.5では、**既存実装の動作確認とテスト**のみを実施します。

## 目的

- 既存実装の動作確認
  - INSERT/UPDATE/DELETEの各クエリ種別に対応した警告メッセージが表示されることを確認
  - WHERE句の有無に応じた適切な警告レベル（warning/danger）が設定されることを確認
  - DangerousQueryDialogがmutation-builderで正しく動作することを確認
  - mutation-builderでもクエリ履歴・保存機能が動作することを確認
- 統合テストの実施
- ドキュメントの更新

## スコープ

### 対象範囲

- DangerousQueryDialog拡張
  - INSERT/UPDATE/DELETEに対応した警告メッセージ
  - クエリ種別とWHERE句有無に応じた警告レベル設定
- WHERE句なし検出ロジック
  - mutation-builderストアでWHERE句の有無を判定
  - UPDATE/DELETEでWHERE句がない場合は最重要レベル警告
- 警告レベル設定
  - INSERT: info（通常の確認）
  - UPDATE（WHERE有）: warning（注意が必要）
  - UPDATE（WHERE無）: danger（全行更新の危険性）
  - DELETE（WHERE有）: warning（注意が必要）
  - DELETE（WHERE無）: danger（全行削除の危険性、最重要）
- クエリ履歴・保存機能の動作確認
  - mutation-builderでもクエリ履歴に記録されることを確認
  - 既存のquery-historyストアが正しく動作することを確認
  - mutation-builderでもクエリ保存機能が動作することを確認
  - **注**: この機能は既に実装済み（Phase 4.3）のため、動作確認のみ
- 影響行数プレビュー（オプション）
  - EXPLAIN結果で影響行数を事前表示
  - データベースがサポートしている場合のみ実装

### 対象外

- クエリのロールバック機能（Phase 9以降で検討）
- トランザクション管理（Phase 9以降で検討）
- 監査ログ機能（Phase 9で実装予定）

## 機能要件

### FR-1: DangerousQueryDialog拡張

1. INSERT/UPDATE/DELETEクエリに対応した警告メッセージを表示
2. クエリ種別に応じた適切なアイコン・色を表示
3. WHERE句の有無に応じた警告レベルを設定
4. 本番環境では特に厳重な確認を行う

**受け入れ基準:**
- ✅ INSERT実行時に「info」レベルの確認ダイアログが表示される
- ✅ UPDATE（WHERE有）実行時に「warning」レベルの警告ダイアログが表示される
- ✅ UPDATE（WHERE無）実行時に「danger」レベルの警告ダイアログが表示される
- ✅ DELETE（WHERE有）実行時に「warning」レベルの警告ダイアログが表示される
- ✅ DELETE（WHERE無）実行時に「danger」レベルの警告ダイアログが表示される

### FR-2: WHERE句なし検出ロジック

1. mutation-builderストアでWHERE句の有無を判定
2. UPDATE/DELETEでWHERE句がない場合は最重要レベル警告
3. 判定結果をQueryAnalysisResultに反映

**受け入れ基準:**
- ✅ `queryModel.whereConditions`が空配列の場合、`hasWhereClause: false`と判定される
- ✅ WHERE句がない場合、`riskLevel: 'danger'`が設定される
- ✅ WHERE句がある場合、`riskLevel: 'warning'`または`'info'`が設定される

### FR-3: 警告レベル設定

1. クエリ種別とWHERE句有無に応じた警告レベル設定
2. 警告レベルに応じた表示内容の調整
   - info: 通常の確認（カウントダウンなし）
   - warning: 注意喚起（カウントダウンあり、短め）
   - danger: 最重要警告（カウントダウンあり、長め、確認チェックボックス必須）

**警告レベル一覧:**

| クエリ種別 | WHERE句 | 警告レベル | カウントダウン | チェックボックス |
|----------|---------|----------|-------------|----------------|
| INSERT | - | info | なし | なし |
| UPDATE | あり | warning | 3秒 | なし |
| UPDATE | なし | danger | 5秒 | あり |
| DELETE | あり | warning | 3秒 | なし |
| DELETE | なし | danger | 5秒 | あり |

**受け入れ基準:**
- ✅ 上記の警告レベル一覧に従った警告が表示される
- ✅ dangerレベルではカウントダウン完了まで実行ボタンが無効化される
- ✅ dangerレベルでは確認チェックボックスがオンでないと実行できない

### FR-4: 影響行数プレビュー（オプション）

1. EXPLAIN結果で影響行数を事前表示
2. データベースがサポートしている場合のみ実装
3. PostgreSQL/MySQL/SQLiteで動作確認

**受け入れ基準:**
- ✅ UPDATE/DELETEの実行前に影響行数が表示される（可能な場合）
- ✅ 影響行数が0件の場合は警告レベルを下げる
- ✅ データベースがサポートしていない場合はスキップする

**注**: この機能は実装が困難な場合は後回しにする（Phase 9以降）

### FR-5: クエリ履歴・保存機能の動作確認

**注**: この機能は既に実装済み（Phase 4.3）のため、**新規実装は不要**です。
既存の実装が正しく動作していることを確認するのみです。

1. mutation-builderでもクエリ履歴に記録されることを確認
2. 既存のquery-historyストアが正しく動作することを確認
3. mutation-builderでもクエリ保存機能が動作することを確認
4. 履歴・保存したクエリをmutation-builderで読み込めることを確認

**受け入れ基準:**
- ✅ INSERT/UPDATE/DELETE実行時にクエリ履歴に記録される（既存実装の動作確認）
- ✅ 履歴にクエリ種別・影響行数・実行日時が記録される（既存実装の動作確認）
- ✅ mutation-builderでクエリを保存できる（既存実装の動作確認）
- ✅ 保存したクエリをmutation-builderで読み込める（既存実装の動作確認）

### FR-6: 統合テスト

1. 全機能の動作確認（各クエリ種別の構築・実行・警告表示）
2. 本番環境での動作確認
3. 開発環境での動作確認
4. 安全設定のON/OFF切り替え確認

**受け入れ基準:**
- ✅ INSERT/UPDATE/DELETEの全機能が正常に動作する
- ✅ 警告ダイアログが適切に表示される
- ✅ クエリ履歴・保存機能が動作する
- ✅ 安全設定に従って動作する

## 非機能要件

### NFR-1: 一貫性

- 既存のDangerousQueryDialog（Phase 3実装）と一貫した挙動にする
- query-builderとmutation-builderで同じ警告メッセージフォーマットを使用する
- クエリ履歴・保存機能も既存実装と一貫性を保つ

### NFR-2: 安全性

- WHERE句なしのUPDATE/DELETEは最も強く警告する
- 本番環境では特に厳重な確認を行う
- 実行前に必ずSQLプレビューで確認可能にする
- カウントダウン中は実行ボタンを無効化する

### NFR-3: パフォーマンス

- WHERE句チェックは即座に行われる（100ms以内）
- 警告ダイアログの表示は即座に行われる（200ms以内）
- 影響行数プレビューは1秒以内に表示される（可能な場合）

### NFR-4: 保守性

- 既存のDangerousQueryDialogを拡張し、新規コンポーネントは作成しない
- mutation-builderストアの既存パターンに従う
- コードの重複を避ける

## ユーザーストーリー

### US-1: INSERT実行時の確認

**As a** データベースユーザー
**I want to** INSERT実行時に確認ダイアログが表示される
**So that** 誤操作を防止できる

**受け入れ基準:**
- INSERT実行時に「info」レベルの確認ダイアログが表示される
- ダイアログには挿入するデータのプレビューが表示される
- 確認後、INSERT文を実行できる

### US-2: UPDATE（WHERE有）実行時の警告

**As a** データベースユーザー
**I want to** UPDATE（WHERE有）実行時に警告ダイアログが表示される
**So that** 意図しない更新を防止できる

**受け入れ基準:**
- UPDATE（WHERE有）実行時に「warning」レベルの警告ダイアログが表示される
- カウントダウン（3秒）が表示される
- カウントダウン完了後、UPDATE文を実行できる

### US-3: UPDATE/DELETE（WHERE無）実行時の最重要警告

**As a** データベース管理者
**I want to** WHERE句のないUPDATE/DELETEを実行する前に最も強い警告を受ける
**So that** 誤って全行更新・削除することを防止できる

**受け入れ基準:**
- WHERE句がない場合、「danger」レベルの警告ダイアログが表示される
- カウントダウン（5秒）が表示される
- 確認チェックボックスが表示される
- チェックボックスをオンにしないと実行できない
- カウントダウン完了後、実行できる

### US-4: クエリ履歴の記録

**As a** データベースユーザー
**I want to** 実行したINSERT/UPDATE/DELETEが履歴に記録される
**So that** 後で確認・再実行できる

**受け入れ基準:**
- INSERT/UPDATE/DELETE実行時にクエリ履歴に記録される
- 履歴にクエリ種別・影響行数・実行日時が記録される
- 履歴から再度クエリを読み込める

### US-5: クエリ保存機能

**As a** データベースユーザー
**I want to** mutation-builderで構築したクエリを保存できる
**So that** 後で再利用できる

**受け入れ基準:**
- mutation-builderでクエリを保存できる
- 保存したクエリに名前を付けられる
- 保存したクエリをmutation-builderで読み込める

## 制約条件

- 既存のDangerousQueryDialog.vueを拡張する（新規作成しない）
- 既存のquery-historyストアを再利用する
- mutation-builderページの既存レイアウトに従う
- 既存のINSERT/UPDATE/DELETEビルダーに影響を与えない

## 依存関係

- Phase 3: 本番環境安全機能（DangerousQueryDialog、QueryAnalyzer）
- Phase 4: クエリ保存・履歴機能（query-historyストア）
- Phase 8.1-8.4: mutation-builder基盤（INSERT/UPDATE/DELETEビルダー）

## 成功基準

- ✅ INSERT/UPDATE/DELETEの各クエリ種別に対応した警告が表示される
- ✅ WHERE句の有無に応じた適切な警告レベルが設定される
- ✅ WHERE句のないUPDATE/DELETEは特に強い警告が表示される
- ✅ mutation-builderでクエリ履歴・保存機能が動作する
- ✅ 本番環境での動作確認が完了している
- ✅ 既存のquery-builder（SELECTビルダー）に影響を与えていない

## 参考資料

- [docs/sql_editor_wbs_v3.md](../../sql_editor_wbs_v3.md) - フェーズ8.5の詳細
- [app/components/query-builder/dialog/DangerousQueryDialog.vue](../../../app/components/query-builder/dialog/DangerousQueryDialog.vue) - 既存の警告ダイアログ実装
- [app/types/query-analysis.ts](../../../app/types/query-analysis.ts) - クエリ分析結果の型定義
- [app/stores/query-history.ts](../../../app/stores/query-history.ts) - クエリ履歴ストア（参考）
