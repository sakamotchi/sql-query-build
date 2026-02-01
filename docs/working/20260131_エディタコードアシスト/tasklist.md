# タスクリスト：SQLエディタコードアシスト機能

## 進捗状況

- ✅ 完了
- 🚧 進行中
- ⏳ 待機中

## Phase 1: 基盤構築（型定義・定数）

### Task 1.1: 型定義ファイルの作成
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `app/types/sql-completion.ts` を作成
- [ ] 以下の型を定義：
  - [ ] `SqlCompletionKind`
  - [ ] `SqlCompletionItem`
  - [ ] `SqlKeyword`
  - [ ] `CompletionContext`
  - [ ] ~~`SqlFunction`~~ → 既存の `FunctionDefinition` (app/data/function-catalog.ts) を使用

**成果物**: `app/types/sql-completion.ts`

**確認方法**:
```bash
npm run typecheck
```

---

### Task 1.2: SQLキーワード定義ファイルの作成
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `app/constants/sql-keywords.ts` を作成
- [ ] SQLキーワード定義（`SQL_KEYWORDS`）
  - [ ] DML: SELECT, INSERT, UPDATE, DELETE
  - [ ] DDL: CREATE, ALTER, DROP, TRUNCATE
  - [ ] 句: FROM, WHERE, JOIN, GROUP BY, ORDER BY等
  - [ ] 演算子: AND, OR, IN, LIKE等
  - [ ] 最低30個のキーワードを定義
- [ ] Monaco CompletionItemKindマッピング（`COMPLETION_KIND_MAP`）
- [ ] ~~SQL関数定義~~ → 既存の `app/data/function-catalog.ts` を活用（作業不要）

**成果物**: `app/constants/sql-keywords.ts`

**確認方法**:
```bash
npm run typecheck
```

**補足**: SQL関数の定義は既存の `function-catalog.ts` に実装済みのため、新規作成は不要。`getFunctionCatalog(dbType)` 関数でDB種別に応じた関数リストを取得可能。

---

## Phase 2: Composable実装

### Task 2.1: useSqlCompletion Composableの作成
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `app/composables/useSqlCompletion.ts` を作成
- [ ] 基本構造の実装
  - [ ] Store（`useDatabaseStructureStore`, `useConnectionStore`）の取得
  - [ ] `provideCompletionItems()` 関数のスケルトン作成

**成果物**: `app/composables/useSqlCompletion.ts` (基本構造のみ)

**確認方法**:
```bash
npm run typecheck
```

---

### Task 2.2: createCompletionContext()の実装
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `createCompletionContext()` 関数を実装
  - [ ] 現在行のテキスト取得
  - [ ] 現在入力中の単語を抽出
  - [ ] 直前の単語を抽出
  - [ ] アクティブな接続情報を取得
  - [ ] `CompletionContext` オブジェクトを返す

**成果物**: `createCompletionContext()` 関数

**テストケース**:
```typescript
// "SELECT u" と入力した場合
// currentWord: "u"
// previousWord: "SELECT"
```

---

### Task 2.3: getKeywordCompletions()の実装
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `getKeywordCompletions()` 関数を実装
  - [ ] `SQL_KEYWORDS` からフィルタリング
  - [ ] 大文字小文字を区別しない前方一致
  - [ ] Monaco CompletionItemフォーマットに変換
  - [ ] ソート順を設定（優先度: 1）

**成果物**: `getKeywordCompletions()` 関数

**テストケース**:
```typescript
// "SEL" → SELECT, ...
// "sel" → SELECT, ... (大文字小文字区別なし)
// "JOIN" → JOIN, INNER JOIN, LEFT JOIN, ...
```

---

### Task 2.4: getFunctionCompletions()の実装
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `getFunctionCompletions()` 関数を実装
  - [ ] `getFunctionCatalog(dbType)` で関数リストを取得（既存ファイルを活用）
  - [ ] 入力中の文字でフィルタリング
  - [ ] スニペット形式での挿入（`COUNT($0)`）
  - [ ] パラメータ数に応じて挿入テキストを調整（paramCount: 0の場合は`()`のみ）
  - [ ] 詳細情報（カテゴリ、説明、例）の設定
  - [ ] ソート順を設定（優先度: 2）

**成果物**: `getFunctionCompletions()` 関数

**テストケース**:
```typescript
// "COU" → COUNT()
// "array" + PostgreSQL接続 → array_agg() (自動でPostgreSQL専用関数が含まれる)
// "array" + MySQL接続 → 候補なし (自動でMySQL用カタログにはarray_aggなし)
// "GROUP" + MySQL接続 → GROUP_CONCAT() (MySQL専用関数)
```

**補足**: `getFunctionCatalog()` はDB種別に応じて適切な関数リストを返すため、DBMS別フィルタは不要。

---

### Task 2.5: getTableCompletions()の実装
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `getTableCompletions()` 関数を実装
  - [ ] スキーマキャッシュからテーブル情報取得
  - [ ] スキーマ名を含む完全修飾名対応（`public.users`）
  - [ ] テーブルコメント・行数の表示
  - [ ] システムテーブルの優先度を下げる
  - [ ] ソート順を設定（優先度: 3 or 4）

**成果物**: `getTableCompletions()` 関数

**テストケース**:
```typescript
// "use" → users, user_sessions
// "public.u" → public.users
// システムテーブルは後方に表示
```

---

### Task 2.6: getColumnCompletions()の実装
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `getColumnCompletions()` 関数を実装
  - [ ] すべてのテーブルのカラムを候補に含める
  - [ ] カラムの型情報を表示（`displayType`）
  - [ ] 制約情報を表示（PK, FK, UNIQUE, AUTO）
  - [ ] カラムコメントを表示
  - [ ] PRIMARY KEYの優先度を上げる
  - [ ] ソート順を設定（優先度: 3 or 4）

**成果物**: `getColumnCompletions()` 関数

**テストケース**:
```typescript
// "user_id" → user_id (integer, PK)
// "email" → email (varchar(255))
// PKカラムは優先的に表示
```

---

### Task 2.7: provideCompletionItems()の完成
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `provideCompletionItems()` 関数を完成させる
  - [ ] `createCompletionContext()` の呼び出し
  - [ ] 各補完関数の呼び出し
  - [ ] 結果を統合して `CompletionList` を返す

**成果物**: 完成した `useSqlCompletion()` Composable

**確認方法**:
```bash
npm run typecheck
npm run test -- useSqlCompletion.test.ts
```

---

## Phase 3: エディタコンポーネント統合

### Task 3.1: SqlTextEditor.vueへの統合
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `app/components/sql-editor/SqlTextEditor.vue` を編集
- [ ] `useSqlCompletion` をimport
- [ ] Monaco Editor作成後に補完プロバイダーを登録
  - [ ] `monaco.languages.registerCompletionItemProvider('sql', ...)`
  - [ ] トリガー文字を設定（`.`, ` `）
- [ ] コンポーネント破棄時に補完プロバイダーを解除（`dispose()`）

**成果物**: 補完機能が統合された `SqlTextEditor.vue`

**確認方法**:
```bash
npm run tauri:dev
# エディタで "SEL" と入力し、補完候補が表示されることを確認
```

---

## Phase 4: テスト実装

### Task 4.1: ユニットテストの作成
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `app/composables/useSqlCompletion.test.ts` を作成
- [ ] テストケースの実装
  - [ ] `getKeywordCompletions` のテスト（3ケース以上）
  - [ ] `getFunctionCompletions` のテスト（DBMS別フィルタ含む）
  - [ ] `getTableCompletions` のテスト（モックデータ使用）
  - [ ] `getColumnCompletions` のテスト（制約情報含む）
- [ ] モックヘルパー関数の作成

**成果物**: `useSqlCompletion.test.ts`

**確認方法**:
```bash
npm run test -- useSqlCompletion.test.ts
# すべてのテストがパスすることを確認
```

---

### Task 4.2: 統合テストの作成（オプション）
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `app/components/sql-editor/SqlTextEditor.integration.test.ts` を作成
- [ ] Monaco Editorとの統合テスト
  - [ ] 補完プロバイダーが登録されることを確認
  - [ ] dispose時に解除されることを確認

**成果物**: `SqlTextEditor.integration.test.ts`

**確認方法**:
```bash
npm run test -- SqlTextEditor.integration.test.ts
```

---

## Phase 5: 動作確認・調整

### Task 5.1: 手動テスト
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `testing.md` の手順に従って手動テスト実施
- [ ] キーワード補完の確認
- [ ] 関数補完の確認
- [ ] テーブル名補完の確認
- [ ] カラム名補完の確認
- [ ] 各DBMS（PostgreSQL/MySQL/SQLite）での動作確認
- [ ] パフォーマンス確認（大規模スキーマ）

**成果物**: テスト結果レポート

**確認方法**: [testing.md](./testing.md) 参照

---

### Task 5.2: UIの調整
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] 補完候補の表示スタイル確認
- [ ] ダークモードでの視認性確認
- [ ] 必要に応じてMonaco Editorのテーマ調整
- [ ] トリガー文字の調整（必要に応じて）

**成果物**: 調整後のエディタ設定

---

### Task 5.3: パフォーマンスチューニング
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] 大規模スキーマ（1000テーブル以上）でのパフォーマンス測定
- [ ] 必要に応じてフィルタリングロジックの最適化
- [ ] 候補数の制限（1カテゴリ100件まで）
- [ ] レスポンスタイムが100ms以内であることを確認

**成果物**: パフォーマンス測定結果

**確認方法**:
```javascript
console.time('completion')
// 補完候補を表示
console.timeEnd('completion')
// 結果が100ms以内であることを確認
```

---

## Phase 6: ドキュメント更新

### Task 6.1: 永続化ドキュメントの更新
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] `docs/steering/02_functional_design.md` にコードアシスト機能を追記
- [ ] `docs/steering/03_architecture_specifications.md` に技術仕様を追記
- [ ] 必要に応じて他の永続化ドキュメントを更新

**成果物**: 更新された永続化ドキュメント

---

### Task 6.2: 開発作業ドキュメントのアーカイブ
**状態**: ⏳ 待機中
**担当**:
**期限**:

**内容**:
- [ ] 実装完了後、`docs/local/20260131_エディタコードアシスト/` を `docs/archive/` に移動
- [ ] または不要なドキュメントを削除
- [ ] 重要な設計判断は永続化ドキュメントに反映済みであることを確認

**成果物**: アーカイブ済みドキュメント

---

## 進捗メモ

### YYYY-MM-DD
- タスクX.X完了
- 課題: ...
- 次回: ...

---

## 備考

- 各タスクは独立しているため、Phase内であれば並行作業可能
- Phase 1, 2は依存関係が強いため順次実施推奨
- テストは実装と並行して作成することを推奨
