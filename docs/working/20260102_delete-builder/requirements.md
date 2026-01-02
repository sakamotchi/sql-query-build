# 要件定義書: 8.4 DELETEビルダー

## 概要

データ変更クエリビルダー（mutation-builder）にDELETE文を構築・実行する機能を追加します。
この機能は、既に実装されているINSERTビルダー（8.2）およびUPDATEビルダー（8.3）と同様のUIパターンに従い、
mutation-builderページ内のタブ切り替えで実装します。

## 目的

- GUIでDELETE文を構築できるようにする
- WHERE条件を簡単に設定できるようにする
- WHERE句がない場合の全行削除を強く警告する
- 本番環境での誤操作を防止する

## スコープ

### 対象範囲

- DELETE文のGUI構築機能
  - テーブル選択UI
  - WHERE条件設定UI（既存のMutationWhereTabを再利用）
- DELETE SQL生成機能（Rust）
- DELETE実行機能
  - 削除行数の表示
- 安全機能
  - WHERE句なし警告（最重要レベル）
  - DangerousQueryDialogとの連携

### 対象外

- 複数テーブルのDELETE（JOINを伴うDELETE）は将来対応
- TRUNCATE文は別機能として扱う
- DELETE ... RETURNING句（PostgreSQL固有）は将来対応

## 機能要件

### FR-1: DELETE操作の基本フロー

1. ユーザーがmutation-builderページでDELETEタブを選択
2. テーブル選択ドロップダウンから削除対象テーブルを選択
3. WHERE条件を設定（省略可能だが強く警告）
4. SQLプレビューで生成されたDELETE文を確認
5. 実行ボタンをクリック
6. WHERE句がない場合、最も強い警告ダイアログを表示
7. 確認後、DELETE文を実行
8. 削除行数を表示

### FR-2: テーブル選択UI

- 検索フィルター付きドロップダウン（InsertInputPanel/UpdatePanelと同様）
- スキーマ名を含むテーブル名を表示（例: `public.users`）
- システムスキーマは除外

### FR-3: WHERE条件設定

- 既存のMutationWhereTab.vueを再利用
- 条件の追加・削除・編集が可能
- 複数条件のAND/OR結合に対応
- グループ化（ネスト）に対応

### FR-4: DELETE SQL生成（Rust）

- Rustバックエンドで`generate_delete_sql`コマンドを実装
- 入力: テーブル名、WHERE条件
- 出力: DELETE文の文字列
- DB方言（PostgreSQL/MySQL/SQLite）に対応

### FR-5: DELETE実行機能

- ツールバーの実行ボタンでDELETE文を実行
- 削除行数を結果パネルに表示
- エラー発生時は適切なエラーメッセージを表示

### FR-6: WHERE句なし警告

- WHERE句がない場合、最も強い警告を表示
  - 赤背景のアラート表示
  - 全行削除の危険性を強調
  - DangerousQueryDialogでの最重要レベル警告（danger）
  - 確認チェックボックス必須

## 非機能要件

### NFR-1: 一貫性

- INSERTビルダー、UPDATEビルダーと同じUIパターンに従う
- 同じコンポーネント（MutationWhereTab等）を再利用する
- mutation-builderストアの既存機能を活用する

### NFR-2: 安全性

- WHERE句なしのDELETEは最も強く警告する
- 本番環境では特に厳重な確認を行う
- 実行前に必ずSQLプレビューで確認可能にする

### NFR-3: パフォーマンス

- テーブル選択時の応答速度は1秒以内
- SQL生成は即座に行われる（100ms以内）

### NFR-4: 保守性

- 既存のコンポーネントを最大限再利用する
- mutation-builderストアの既存パターンに従う
- コードの重複を避ける

## ユーザーストーリー

### US-1: 基本的なDELETE操作

**As a** データベースユーザー
**I want to** GUIでDELETE文を構築できる
**So that** SQLを手書きせずに安全にデータを削除できる

**受け入れ基準:**
- テーブルを選択できる
- WHERE条件を設定できる
- 生成されたSQLを確認できる
- DELETE文を実行できる
- 削除行数が表示される

### US-2: WHERE句なし警告

**As a** データベース管理者
**I want to** WHERE句のないDELETEを実行する前に強い警告を受ける
**So that** 誤って全行削除することを防止できる

**受け入れ基準:**
- WHERE句がない場合、赤背景のアラートが表示される
- 実行時に最も強い警告ダイアログが表示される
- 確認チェックボックスをオンにしないと実行できない

## 制約条件

- mutation-builderページの既存レイアウトに従う
- 既存のINSERT/UPDATEビルダーに影響を与えない
- 既存のMutationWhereTab.vueを再利用し、DELETEでも利用できるように拡張する

## 依存関係

- Phase 8.1: 共通基盤（mutation-builderストア、MutationBuilderLayout等）
- Phase 8.3: UPDATEビルダー（MutationWhereTabの実装）
- Phase 3: 本番環境安全機能（DangerousQueryDialog）

## 成功基準

- ✅ GUIでDELETE文を構築・実行できる
- ✅ WHERE条件を設定できる
- ✅ WHERE句のないDELETEは特に強い警告が表示される
- ✅ 削除行数が表示される
- ✅ 既存のINSERT/UPDATEビルダーに影響を与えていない

## 参考資料

- [docs/sql_editor_wbs_v3.md](../../sql_editor_wbs_v3.md) - フェーズ8.4の詳細
- [app/components/mutation-builder/UpdatePanel.vue](../../../app/components/mutation-builder/UpdatePanel.vue) - UPDATEビルダーの参考実装
- [app/components/mutation-builder/MutationWhereTab.vue](../../../app/components/mutation-builder/MutationWhereTab.vue) - WHERE条件設定UI
