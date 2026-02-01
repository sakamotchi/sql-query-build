# 要件定義書 - SQLエディタ Phase 2: エディタUI基本構築

## 概要

SQLエディタウィンドウに、SQLを入力・編集できる基本的なエディタUIを構築します。
構文ハイライト、行番号表示、基本的なテキスト編集機能（Undo/Redo含む）を実装し、ユーザーがSQLを快適に記述できる環境を提供します。

## 背景・目的

Phase 1でSQLエディタウィンドウの基盤を構築しました。次のステップとして、実際にSQLクエリを記述するためのエディタUIが必要です。

### 解決すべき課題

- **現状**: SQLエディタウィンドウは起動できるが、中身が空
- **課題**: SQLを記述・編集する手段がない
- **解決策**: Monaco Editorベースのエディタコンポーネントを実装

### 目的

1. SQLを快適に記述できるテキストエディタを提供
2. SQLキーワードの構文ハイライトによる可読性向上
3. 行番号表示による編集作業の効率化
4. Undo/Redoなど基本的なエディタ機能の提供
5. Phase 3（クエリ実行機能）の土台を構築

## 要件一覧

### 機能要件

#### F-1: レイアウト構築

- **説明**: SQLエディタの全体レイアウトを構築します（ツールバー、エディタエリア、将来の結果パネル用スペース）
- **受け入れ条件**:
  - [ ] `SqlEditorLayout.vue` コンポーネントが作成されている
  - [ ] ツールバー、エディタエリア、結果エリア（プレースホルダー）の3つのセクションが存在する
  - [ ] レスポンシブ対応（ウィンドウサイズに追従）
  - [ ] Nuxt UI v4のコンポーネント記法に準拠

#### F-2: ツールバーUI

- **説明**: エディタ上部に操作用ツールバーを配置します（Phase 2では外観のみ、機能はPhase 3以降で実装）
- **受け入れ条件**:
  - [ ] `SqlEditorToolbar.vue` コンポーネントが作成されている
  - [ ] 実行ボタン（無効状態）が表示される
  - [ ] 停止ボタン（無効状態）が表示される
  - [ ] 保存ボタン（無効状態）が表示される
  - [ ] ツールバーが `SqlEditorLayout` に組み込まれている

#### F-3: テキストエディタコンポーネント

- **説明**: Monaco Editorを使用したSQLテキストエディタコンポーネントを実装します
- **受け入れ条件**:
  - [ ] `SqlTextEditor.vue` コンポーネントが作成されている
  - [ ] Monaco Editorが正しく初期化される
  - [ ] テキストの入力、削除、コピー、ペーストが動作する
  - [ ] v-modelまたはストア経由でテキスト内容が管理される
  - [ ] ダークモード/ライトモード両方に対応

#### F-4: SQL構文ハイライト

- **説明**: SQLキーワードを色分け表示し、可読性を向上させます
- **受け入れ条件**:
  - [ ] Monaco EditorのSQL言語サポートが有効化されている
  - [ ] SQLキーワード（SELECT, FROM, WHERE, JOIN等）が色分けされる
  - [ ] 文字列リテラル（'...'）が色分けされる
  - [ ] コメント（-- ... / /* ... */）が色分けされる
  - [ ] テーマがアプリ全体のカラースキームと調和している

#### F-5: 行番号表示

- **説明**: エディタの左側に行番号を表示します
- **受け入れ条件**:
  - [ ] Monaco Editorの行番号機能が有効化されている
  - [ ] 行番号が左側に表示される
  - [ ] スクロール時も行番号が追従する
  - [ ] 行番号の色がテーマに適合している

#### F-6: Undo/Redo機能

- **説明**: 編集操作の取り消し・やり直しを可能にします
- **受け入れ条件**:
  - [ ] Monaco Editorの編集履歴機能が有効化されている（デフォルトで有効）
  - [ ] Ctrl+Z（macOS: Cmd+Z）でUndoが動作する
  - [ ] Ctrl+Shift+Z（macOS: Cmd+Shift+Z）でRedoが動作する
  - [ ] 編集履歴が適切に管理される

#### F-7: SQLエディタストア

- **説明**: SQLエディタの状態を管理するPiniaストアを作成します
- **受け入れ条件**:
  - [ ] `app/stores/sql-editor.ts` が作成されている
  - [ ] エディタの内容（SQL文字列）を保持する
  - [ ] 接続情報を保持する
  - [ ] 将来のクエリ実行・保存機能のための拡張ポイントがある
  - [ ] TypeScriptの型定義が適切に行われている

#### F-8: 型定義

- **説明**: SQLエディタ機能で使用する型定義を作成します
- **受け入れ条件**:
  - [ ] `app/types/sql-editor.ts` が作成されている
  - [ ] `SqlEditorState` インターフェースが定義されている
  - [ ] `SqlEditorTab` インターフェース（将来のタブ機能用）が定義されている
  - [ ] ユビキタス言語定義書の用語と整合している

#### F-9: ページ統合

- **説明**: 作成したコンポーネントを `sql-editor.vue` ページに統合します
- **受け入れ条件**:
  - [ ] `app/pages/sql-editor.vue` に `SqlEditorLayout` が組み込まれている
  - [ ] ストアが初期化されている
  - [ ] 接続情報がクエリパラメータまたはストアから取得される
  - [ ] エディタが表示され、動作する

### 非機能要件

- **パフォーマンス**:
  - エディタの初期化時間は2秒以内（Monaco Editorの初期化を考慮）
  - 大きなSQL文（10,000行）でもスムーズにスクロール・編集可能
  - Monaco Editorの仮想スクロール機能を活用

- **アクセシビリティ**:
  - キーボード操作のみでエディタ操作が可能
  - フォーカス状態が視覚的に明確

- **保守性**:
  - コンポーネントは責務が明確に分離されている
  - ストアとコンポーネントのロジックが適切に分離されている
  - TypeScriptの型安全性が確保されている

## スコープ

### 対象

- SQLエディタのレイアウト構築
- テキストエディタコンポーネントの実装（Monaco Editor）
- SQL構文ハイライト
- 行番号表示
- Undo/Redo機能
- 基本的な状態管理（Piniaストア）
- ツールバーUI（外観のみ、機能は未実装）

### 対象外

- クエリ実行機能（Phase 3で実装）
- 結果表示パネル（Phase 3で実装）
- クエリ保存機能（Phase 4で実装）
- 履歴機能（Phase 5で実装）
- SQLフォーマット、検索・置換、タブ機能（Phase 6で実装）
- SQLオートコンプリート（将来機能）

## 実装対象ファイル（予定）

### 新規作成

- `app/components/sql-editor/SqlEditorLayout.vue` - レイアウトコンポーネント
- `app/components/sql-editor/SqlEditorToolbar.vue` - ツールバーコンポーネント
- `app/components/sql-editor/SqlTextEditor.vue` - テキストエディタコンポーネント
- `app/stores/sql-editor.ts` - SQLエディタストア
- `app/types/sql-editor.ts` - 型定義

### 更新

- `app/pages/sql-editor.vue` - Phase 1で作成した空ページにコンポーネントを組み込む
- `package.json` - Monaco Editor関連パッケージの追加

## 依存関係

### 技術的依存

- **Monaco Editor**: テキストエディタ本体
  - `monaco-editor` - エディタ本体
  - `@monaco-editor/react` または Vue用ラッパー（必要に応じて）
  - SQL言語サポート（monaco-editorに標準搭載）
- **Phase 1の成果物**: SQLエディタウィンドウ、ページが既に存在

### 機能的依存

- Phase 1が完了していること
- 接続管理機能（接続情報の取得に使用）

## 技術的検討事項

### Monaco Editorの選定根拠

検討の結果、Monaco Editorを採用します。

| 選択肢 | メリット | デメリット |
|--------|---------|-----------|
| **Monaco Editor（採用）** | VSCode同等の機能、IntelliSense対応、SQL言語サポート標準搭載 | バンドルサイズ大（数MB）、初期化に時間がかかる |
| CodeMirror 6 | 軽量、Vue統合良好、カスタマイズ性高 | SQL言語サポートは別パッケージ、高度な機能は限定的 |
| Prism.js + contenteditable | 超軽量 | エディタ機能を自前実装必要 |
| 自前実装 | 完全制御可能 | 開発工数大 |

**採用理由**:
- VSCodeと同じエディタで、ユーザーに馴染みのあるUX
- SQL言語サポートが標準搭載されている
- IntelliSense、構文エラー検出などの高度な機能
- 将来的なSQL補完・検証機能の拡張が容易
- バンドルサイズのデメリットよりも機能性を優先

### Vue 3 + Monaco Editor統合パターン

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'

const editorElement = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
  if (!editorElement.value) return

  editor = monaco.editor.create(editorElement.value, {
    value: '',
    language: 'sql',
    theme: 'vs-dark', // または 'vs' (light)
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
  })

  // 内容変更時のハンドラー
  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() || ''
    // ストアに保存
  })
})

onBeforeUnmount(() => {
  editor?.dispose()
})
</script>

<template>
  <div ref="editorElement" class="h-full w-full"></div>
</template>
```

### テーマ設定

- Nuxt UIのカラースキーム（ライト/ダーク）に追従
- Monaco Editorのテーマを動的に切り替え
  - ライトモード: `vs`
  - ダークモード: `vs-dark`
- カスタムテーマも作成可能（Tailwindカラーに合わせる）

## 既知の制約

- Monaco Editorはバンドルサイズが大きい（約2-3MB）
- 初期化に時間がかかる可能性がある（2秒以内を目標）
- SQLの方言（PostgreSQL, MySQL, SQLite）の差異は、Phase 2では考慮しない（基本的なSQLキーワードのみハイライト）
- 大規模SQL（100,000行以上）での動作は保証しない（通常の使用範囲を想定）

## 参考資料

- [Monaco Editor公式ドキュメント](https://microsoft.github.io/monaco-editor/)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [WBS Phase 2](../../local/20260117_エディタ機能/wbs.md#phase-2-エディタui基本構築)
- [プロダクト要求定義書](../../steering/01_product_requirements.md)
- [技術仕様書](../../steering/03_architecture_specifications.md)
- [開発ガイドライン](../../steering/05_development_guidelines.md)
- [ユビキタス言語定義書](../../steering/06_ubiquitous_language.md)
