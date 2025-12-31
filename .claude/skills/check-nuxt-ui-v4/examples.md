# 使用例

このドキュメントでは、`check-nuxt-ui-v4` スキルの具体的な使用例を示します。

## 例1: 特定のディレクトリをチェック

### ユーザーの指示

```
docs/working/20251230_join-basic-features/ のドキュメントをチェックして
```

### 実行フロー

1. **スコープ確認**: `docs/working/20251230_join-basic-features/` 配下の `.md` ファイルを対象
2. **ファイルスキャン**:
   ```bash
   find docs/working/20251230_join-basic-features -name "*.md" -type f
   ```
3. **パターン検出**: 各ファイルで `UFormGroup` と `options` 属性を検索
4. **結果レポート**:
   ```markdown
   ## チェック結果

   ### 検出された問題

   #### ファイル: docs/working/20251230_join-basic-features/design.md

   **問題1: UFormGroup の使用（行45）**

   **問題2: options 属性の使用（行78）**

   ### サマリー

   - チェック対象ファイル: 4件
   - 問題検出ファイル: 1件
   - 検出された問題: 2件
   ```

5. **修正オプション提示**:
   - 自動修正しますか？
   - 手動で修正しますか？
   - スキップしますか？

---

## 例2: プロジェクト全体をチェック

### ユーザーの指示

```
プロジェクト全体のドキュメントをNuxt UI v4の記法でチェックして
```

### 実行フロー

1. **スコープ確認**: ユーザーに確認
   ```
   以下のディレクトリをチェックしますか？
   - docs/working/
   - docs/
   - .claude/skills/

   すべてチェックしますか？それとも特定のディレクトリのみですか？
   ```

2. **ファイルスキャン**:
   ```bash
   find docs -name "*.md" -type f
   find .claude/skills -name "*.md" -type f
   ```

3. **パターン検出**: すべてのファイルで検索

4. **結果レポート**: 複数ファイルの問題を一覧表示

---

## 例3: 自動修正の実行

### ユーザーの指示

```
ドキュメントをチェックして、問題があったら自動修正して
```

### 実行フロー

1. **スコープ確認**: `docs/working/` をデフォルトで使用
2. **ファイルスキャン**: `.md` ファイルを検索
3. **パターン検出**: 問題を検出
4. **自動修正**:
   ```typescript
   // Edit ツールを使用して各ファイルを修正

   // 例: design.md の修正
   Edit({
     file_path: "docs/working/20251230_join-basic-features/design.md",
     old_string: "<UFormGroup label=\"データベース\">\n  <USelect v-model=\"selected\" :options=\"databases\" />",
     new_string: "<UFormField label=\"データベース\" name=\"database\">\n  <USelect v-model=\"selected\" :items=\"databases\" />"
   })
   ```

5. **完了報告**:
   ```markdown
   ## 修正完了

   以下のファイルを修正しました：

   - docs/working/20251230_join-basic-features/design.md
     - UFormGroup → UFormField (2箇所)
     - options → items (3箇所)

   合計: 1ファイル、5箇所を修正
   ```

---

## 例4: 誤検出の回避

### シナリオ

ドキュメント内に「v3 の例」として意図的に古い記法を記載している場合

### ドキュメントの内容

```markdown
## 誤った記法（v3）

以下は v3 の記法で、使用しないでください：

```vue
<!-- ❌ v3 の例 -->
<UFormGroup label="データベース">
  <USelect v-model="selected" :options="databases" />
</UFormGroup>
```
```

### チェック結果

```markdown
## チェック結果

ファイル: docs/example.md

**検出**: `UFormGroup` が見つかりましたが、「v3 の例」として記載されているため、修正は不要です。

### サマリー

- チェック対象ファイル: 1件
- 問題検出ファイル: 0件（誤検出を除外）
```

---

## 例5: コードブロック外の検出

### シナリオ

説明文に `options` という単語が含まれている場合

### ドキュメントの内容

```markdown
## 設定オプション

以下のオプション (options) を設定できます：

- database: データベース名
- host: ホスト名
```

### チェック結果

```markdown
## チェック結果

ファイル: docs/example.md

**検出**: `options` が見つかりましたが、コードブロック外の説明文であるため、修正は不要です。

### サマリー

- チェック対象ファイル: 1件
- 問題検出ファイル: 0件（誤検出を除外）
```

---

## 例6: 複数パターンの同時検出

### ドキュメントの内容

```vue
<template>
  <UFormGroup label="データベース">
    <USelect v-model="db" :options="databases" />
  </UFormGroup>

  <USelectMenu v-model="type" :options="types" />
</template>
```

### チェック結果

```markdown
## チェック結果

### 検出された問題

#### ファイル: docs/working/20251230_example/design.md

**問題1: UFormGroup の使用（行10）**
```vue
<!-- 現在 -->
<UFormGroup label="データベース">
  <USelect v-model="db" :options="databases" />
</UFormGroup>

<!-- 修正案 -->
<UFormField label="データベース" name="db">
  <USelect v-model="db" :items="databases" />
</UFormField>
```

**問題2: options 属性の使用（行11）**
```vue
<!-- 現在 -->
<USelect v-model="db" :options="databases" />

<!-- 修正案 -->
<USelect v-model="db" :items="databases" />
```

**問題3: options 属性の使用（行14）**
```vue
<!-- 現在 -->
<USelectMenu v-model="type" :options="types" />

<!-- 修正案 -->
<USelectMenu v-model="type" :items="types" />
```

### サマリー

- チェック対象ファイル: 1件
- 問題検出ファイル: 1件
- 検出された問題: 3件
  - UFormGroup: 1件
  - options 属性: 2件
```

---

## 使用上の注意

1. **バックアップの推奨**: 自動修正前にバックアップを取ることを推奨
2. **レビューの実施**: 自動修正後は必ず内容をレビュー
3. **誤検出の確認**: 文脈によっては誤検出の可能性があるため、結果を確認
4. **Git管理**: 修正前にコミットしておくと、問題があれば revert できる
