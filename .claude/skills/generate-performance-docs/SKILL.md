---
name: generate-performance-docs
description: パフォーマンス改善作業の開発ドキュメントを自動生成します。YYYYMMDD_要件名の形式でディレクトリを作成し、requirements.md、design.md、tasklist.md、testing.mdを生成します。「パフォーマンス改善のドキュメント作って」「最適化作業のドキュメント」「高速化のドキュメント生成」などで呼び出されます。
---

# パフォーマンス改善ドキュメント生成スキル

## 概要

このスキルは、パフォーマンス改善・最適化作業のドキュメント群を `docs/working/{YYYYMMDD}_{要件名}/` 配下に自動生成します。

**新規機能開発には `generate-working-docs` を使用してください。**

## 使用シーン

- パフォーマンスボトルネックの調査・改善時
- 計測→分析→実装→検証のサイクルを進めたいとき
- ベンチマーク結果を記録したいとき

## 生成ファイル

| ファイル | 内容 |
|---------|------|
| `requirements.md` | 改善要件定義書。現状の問題点と目標値を記載 |
| `design.md` | 最適化設計書。ベンチマーク、ボトルネック分析、最適化方針を記載 |
| `tasklist.md` | タスクリスト。計測→分析→実装→検証の進捗を管理 |
| `testing.md` | 検証手順書。Before/After 性能比較の方法を記載 |

## 実行手順

### 1. 要件名の確認

ユーザーに要件名を確認します。要件名は英語のケバブケース（例：`optimize-rendering`, `improve-query-performance`）を推奨します。

### 2. ディレクトリ作成

本日の日付（YYYYMMDD形式）と要件名を組み合わせてディレクトリを作成します：

```bash
mkdir -p docs/working/{YYYYMMDD}_{要件名}
```

### 3. ドキュメントの生成

以下の4ファイルをすべて生成します。

**重要**: テンプレートの穴埋めではなく、ユーザーが提供した要件や `docs/steering/` の永続化ドキュメントを参照しながら実際の内容を記載してください。

#### requirements.md の生成

`.claude/skills/generate-requirements/template-performance.md` のテンプレートを使用して生成します。

参照すべき永続化ドキュメント：
- `docs/steering/01_product_requirements.md` - 性能要件・目標値を確認
- `docs/steering/03_architecture_specifications.md` - 現在のアーキテクチャを確認
- `docs/steering/06_ubiquitous_language.md` - プロジェクト用語の正しい使用

#### design.md の生成

`.claude/skills/generate-design/template-performance.md` のテンプレートを使用して生成します。

参照すべき永続化ドキュメント：
- `docs/steering/03_architecture_specifications.md` - 技術スタック・アーキテクチャを確認
- `docs/steering/04_repository_structure.md` - ディレクトリ構造・命名規則を確認
- `docs/steering/05_development_guidelines.md` - コーディング規約を確認

#### tasklist.md の生成

`.claude/skills/generate-tasklist/template.md` のテンプレートを使用して生成します。

**重要**: パフォーマンス改善の文脈に合わせ、タスクは以下の順序で構成してください：
1. 計測基盤整備（ベンチマーク環境のセットアップ）
2. 現状測定（Before 計測）
3. ボトルネック分析
4. 最適化実装（ボトルネックごとに分割）
5. 効果検証（After 計測・目標値との比較）
6. 永続化ドキュメント更新

参照すべき永続化ドキュメント：
- `docs/steering/04_repository_structure.md` - ディレクトリ構造・命名規則を確認
- `docs/steering/05_development_guidelines.md` - 開発プロセスを確認

#### testing.md の生成

`.claude/skills/generate-testing/template-performance.md` のテンプレートを使用して生成します。

参照すべき永続化ドキュメント：
- `docs/steering/01_product_requirements.md` - 性能要件の確認

**重要**: Before/After の性能比較手順を中心に記載します。

`task_{タスクID}.md` は初期生成せず、開発中に必要に応じて作成します。

### 4. 完了報告

生成したディレクトリとファイル一覧をユーザーに報告します。

## 関連スキル

- `generate-working-docs` - 新規機能開発用ドキュメント生成スキル
- `generate-requirements` - 要件定義書のみを単体再生成するスキル
- `generate-design` - 設計書のみを単体再生成するスキル
- `generate-tasklist` - タスクリストのみを単体再生成するスキル
- `generate-testing` - テスト手順書のみを単体再生成するスキル

## 関連ドキュメント

- `CLAUDE.md` - 開発作業ドキュメントの構成ルール
- `docs/` - 永続化ドキュメント群
