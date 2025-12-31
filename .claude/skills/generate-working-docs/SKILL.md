---
name: generate-working-docs
description: 開発作業ドキュメントを自動生成します。YYYYMMDD_要件名の形式でディレクトリを作成し、requirements.md、design.md、tasklist.md、testing.mdを生成します。「開発作業ドキュメント作成」「新規開発のドキュメント作って」「ドキュメント生成」などで呼び出されます。
---

# 開発作業ドキュメント生成スキル

## 概要

このスキルは、プロジェクトの開発ガイドライン（`CLAUDE.md`の開発作業ドキュメント構成）に準拠した開発作業ドキュメント群を `docs/working/{YYYYMMDD}_{要件名}/` 配下に自動生成します。

## 使用シーン

- 新規開発作業の開始時
- 要件定義から実装までを体系的に進めたいとき
- ドキュメント構成を統一したいとき

## 生成ファイル

| ファイル | 内容 |
|---------|------|
| `requirements.md` | 要件定義書。この開発作業で実現したいことを記載 |
| `design.md` | 設計書。実装方針、データ構造、テストコードを記載 |
| `tasklist.md` | タスクリスト。作業項目と進捗状況を管理 |
| `task_{タスクID}.md` | 各タスクの詳細ドキュメント。必要に応じて作成 |
| `testing.md` | テスト手順書。操作手順で確認する方法を記載 |

## 実行手順

このスキルが呼び出されたら、以下の手順で実行してください：

### 1. 要件名の確認

ユーザーに要件名を確認します。要件名は英語のケバブケース（例：`query-execution`, `export-csv`）を推奨します。

### 2. ディレクトリ作成

本日の日付（YYYYMMDD形式）と要件名を組み合わせてディレクトリを作成します：

```bash
mkdir -p docs/working/{YYYYMMDD}_{要件名}
```

### 3. ファイル生成

[templates.md](templates.md) のテンプレートを使用して、以下の4ファイルを生成します：

- `requirements.md` - 要件定義書テンプレート
- `design.md` - 設計書テンプレート
- `tasklist.md` - タスクリストテンプレート
- `testing.md` - テスト手順書テンプレート

**注意**: `task_{タスクID}.md` は初期生成せず、開発中に必要に応じて作成します。
タスクの詳細を記載する必要がある場合、[templates.md](templates.md) の `task_{タスクID}.md` テンプレートを使用してください。

### 4. 完了報告

生成したディレクトリとファイル一覧をユーザーに報告します。

## 使用例

詳細は [examples.md](examples.md) を参照してください。

## 関連ドキュメント

- `CLAUDE.md` - 開発作業ドキュメントの構成ルール
- `docs/` - 永続化ドキュメント群

## 技術仕様の注意事項

### Nuxt UI v4 コンポーネント記法

**重要**: このプロジェクトは Nuxt UI v4 を使用しています。ドキュメント内のコード例では必ず以下の記法を使用してください。

#### v3 → v4 移行対応表

| v3（使用禁止） | v4（使用必須） | 説明 |
|---------------|---------------|------|
| `UFormGroup` | `UFormField` | フォームフィールドラッパー |
| `options` 属性 | `items` 属性 | USelect, USelectMenu等の選択肢 |
| `v-model` | `v-model` | 同じだが、itemsとの組み合わせに注意 |

#### 正しい記法例（v4）

```vue
<template>
  <!-- ✅ 正しい: UFormField + items -->
  <UFormField label="データベース" name="database">
    <USelect v-model="selected" :items="databases" />
  </UFormField>

  <!-- ✅ 正しい: USelectMenu + items -->
  <USelectMenu v-model="selected" :items="options" />
</template>
```

#### 誤った記法例（v3）

```vue
<template>
  <!-- ❌ 間違い: UFormGroup（v3） -->
  <UFormGroup label="データベース">
    <USelect v-model="selected" :options="databases" />
  </UFormGroup>

  <!-- ❌ 間違い: options 属性（v3） -->
  <USelectMenu v-model="selected" :options="options" />
</template>
```

### ドキュメント生成時のルール

1. **コード例には必ず Nuxt UI v4 の記法を使用する**
2. **v3 の記法（UFormGroup, options 属性）は絶対に使用しない**
3. **既存の `CLAUDE.md` に記載された技術スタック情報を参照する**
