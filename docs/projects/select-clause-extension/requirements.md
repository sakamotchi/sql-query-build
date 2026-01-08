# 要件定義書: SELECT句拡張（関数・サブクエリ対応）

## 概要

クエリビルダーのSELECT句を拡張し、データベース関数とサブクエリに対応する。
現在はカラムの単純選択のみに対応しているが、以下の機能を追加する：

1. データベース関数（UPPER, CONCAT, DATE_FORMAT等）の適用
2. スカラーサブクエリによる計算カラム
3. 式（演算子、リテラル値）の組み合わせ

## 背景

- Phase 1.6までにクエリビルダー基盤が完成し、基本的なSELECT文の生成が可能
- 現在のSELECT句は単純なカラム選択とエイリアス設定のみに対応
- 実用的なクエリ構築のため、関数やサブクエリなど高度な式表現が必要
- WHERE句ではすでにサブクエリ対応が実装されている（`WhereValue::Subquery`）

## 実現したいこと

### 1. データベース関数のサポート

**ユースケース例**:
- 文字列の大文字変換: `SELECT UPPER(u.name) AS upper_name FROM users u`
- 日付フォーマット: `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date FROM orders`
- 文字列連結: `SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users`

**対応したい関数カテゴリ**:
- 文字列関数: UPPER, LOWER, CONCAT, SUBSTRING, LENGTH, TRIM
- 日付関数: NOW, CURRENT_DATE, DATE_FORMAT, EXTRACT
- 数値関数: ROUND, CEIL, FLOOR, ABS
- 条件関数: COALESCE, NULLIF, CASE WHEN
- 集計関数: COUNT, SUM, AVG, MIN, MAX（既存の`aggregate`タイプを拡張）

### 2. スカラーサブクエリのサポート

**ユースケース例**:
- 関連レコード数の取得:
  ```sql
  SELECT
    u.name,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
  FROM users u
  ```
- 関連データの最大値/最小値:
  ```sql
  SELECT
    u.name,
    (SELECT MAX(o.total) FROM orders o WHERE o.user_id = u.id) AS max_order
  FROM users u
  ```

### 3. ネストした式のサポート

**ユースケース例**:
- ネストした関数: `SUBSTRING(UPPER(u.name), 1, 3)`
- 演算子の組み合わせ: `price * quantity AS total`
- 関数とサブクエリの組み合わせ: `COALESCE((SELECT ...), 0)`

## 機能要件

### FR-1: 式ツリー型定義

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1.1 | `ExpressionNode`型を定義（再帰的な式構造を表現） | 必須 |
| FR-1.2 | ColumnReference、LiteralValue、FunctionCall、Subquery、BinaryOperation、UnaryOperation型を定義 | 必須 |
| FR-1.3 | フロントエンド（TypeScript）とバックエンド（Rust）で整合性のある型定義 | 必須 |
| FR-1.4 | 既存の`SelectColumn`型と後方互換性を維持 | 必須 |

### FR-2: バックエンド - SQL生成ロジック

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-2.1 | `ExpressionNode`からSQLを生成する`ExpressionBuilder`実装 | 必須 |
| FR-2.2 | データベース方言ごとの関数名マッピング（例: MySQL `CONCAT()` → SQLite `\|\|`） | 必須 |
| FR-2.3 | サブクエリの括弧付きSQL生成 | 必須 |
| FR-2.4 | ネストした式の正しい優先順位での生成 | 必須 |
| FR-2.5 | リテラル値の適切なエスケープとクォート処理 | 必須 |

### FR-3: フロントエンド - 式エディタUI

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-3.1 | 式の種類を選択するセレクター（カラム/関数/サブクエリ/式） | 必須 |
| FR-3.2 | カラム選択UI（既存のカラムセレクターを再利用） | 必須 |
| FR-3.3 | 関数ビルダーUI（関数選択、引数設定、プレビュー） | 必須 |
| FR-3.4 | サブクエリビルダーUI（ミニクエリビルダー） | 必須 |
| FR-3.5 | 式のプレビュー表示（SQL形式） | 必須 |
| FR-3.6 | エイリアス設定UI | 必須 |

### FR-4: 関数ビルダー機能

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-4.1 | 関数カテゴリ選択（文字列/日付/数値/条件） | 必須 |
| FR-4.2 | 各カテゴリ内の関数リスト表示と選択 | 必須 |
| FR-4.3 | 関数の引数数に応じた動的な引数入力UI | 必須 |
| FR-4.4 | 引数としてカラム/リテラル値/関数/サブクエリを選択可能 | 必須 |
| FR-4.5 | ネストした関数の構築（関数の引数として関数を設定） | 高 |
| FR-4.6 | データベース種別に応じた利用可能関数のフィルタリング | 中 |

### FR-5: サブクエリビルダー機能

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-5.1 | サブクエリ用のミニクエリビルダーUI | 必須 |
| FR-5.2 | FROM句のテーブル選択 | 必須 |
| FR-5.3 | SELECT句のカラム選択（単一カラムのみ） | 必須 |
| FR-5.4 | WHERE句の条件設定 | 必須 |
| FR-5.5 | 外部クエリのカラムを参照する相関サブクエリのサポート | 高 |
| FR-5.6 | サブクエリのバリデーション（スカラー値を返すかチェック） | 高 |
| FR-5.7 | 集計関数を含むサブクエリのサポート | 高 |

### FR-6: バリデーション

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-6.1 | 関数名のスペルチェック | 中 |
| FR-6.2 | 引数の数のバリデーション | 高 |
| FR-6.3 | 引数の型のバリデーション（文字列/数値/日付） | 中 |
| FR-6.4 | サブクエリがスカラー値を返すかのバリデーション | 高 |
| FR-6.5 | 循環参照の検出（サブクエリ内でさらにサブクエリを参照） | 中 |

## 非機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| NFR-1 | 既存のクエリビルダー機能との互換性を維持 | 必須 |
| NFR-2 | 式ツリーの深さは最大10レベルまで（無限再帰防止） | 必須 |
| NFR-3 | UIのレスポンス時間は1秒以内（プレビュー更新） | 高 |
| NFR-4 | データベース方言の違いをUIで適切に表示 | 中 |
| NFR-5 | エラーメッセージは日本語でわかりやすく表示 | 高 |

## 制約事項

| ID | 制約 |
|----|------|
| C-1 | 初期リリースでは最も一般的な関数のみをサポート（拡張は段階的に） |
| C-2 | サブクエリはSELECT句でのスカラーサブクエリのみ（FROM句のサブクエリは対象外） |
| C-3 | ウィンドウ関数（OVER句）は対象外 |
| C-4 | CTE（WITH句）は対象外 |
| C-5 | データベース固有の関数は各DB専用として扱う（自動変換しない） |

## 成功基準

| ID | 基準 |
|----|------|
| SC-1 | 文字列関数（UPPER, LOWER, CONCAT等）を使用したクエリが正しく生成される |
| SC-2 | 日付関数（NOW, DATE_FORMAT等）を使用したクエリが正しく生成される |
| SC-3 | スカラーサブクエリを使用したクエリが正しく生成される |
| SC-4 | ネストした関数（関数の引数として関数）が正しく生成される |
| SC-5 | PostgreSQL、MySQL、SQLiteの3つのDBで正しく動作する |
| SC-6 | UIでわかりやすく関数やサブクエリを構築できる |
| SC-7 | 既存のクエリビルダー機能が正常に動作する（後方互換性） |

## 除外事項

以下は本要件の対象外とする：

- ウィンドウ関数（ROW_NUMBER, RANK, PARTITION BY等）
- CTE（WITH句）
- FROM句のサブクエリ（派生テーブル）
- ユーザー定義関数（UDF）
- ストアドプロシージャの呼び出し
- 正規表現関数（REGEXP_REPLACE等の高度な関数）

## 参考資料

- [docs/features/query-builder.md](../../features/query-builder.md) - クエリビルダー機能の詳細仕様
- [app/types/query-model.ts](../../../app/types/query-model.ts) - 既存のクエリモデル型定義
- [src-tauri/src/models/query.rs](../../../src-tauri/src/models/query.rs) - Rust側のクエリモデル型定義
- PostgreSQL関数リファレンス: https://www.postgresql.org/docs/current/functions.html
- MySQL関数リファレンス: https://dev.mysql.com/doc/refman/8.0/en/functions.html
- SQLite関数リファレンス: https://www.sqlite.org/lang_corefunc.html

## 関連要件

- 既存のSELECT句実装（Phase 1.6完了）
- WHERE句のサブクエリ対応（実装済み）
- クエリ実行基盤（Phase 2.1完了）

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-01-02 | 1.0 | 初版作成 | Claude |
