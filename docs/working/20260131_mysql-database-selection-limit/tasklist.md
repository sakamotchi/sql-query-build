# タスクリスト - MySQLデータベース選択機能の制限対応

## 概要

設計書に基づき、実装タスクを順序立てて記載します。

## タスク一覧

**注**: 未コミット分を破棄したため、バックエンドのクリーンアップは不要です。

### Phase 1: 型定義の追加

#### Task 1-1: SqlEditorState型にselectedDatabaseを追加

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 5分
- **説明**: `SqlEditorState`インターフェースに`selectedDatabase`フィールドを追加する
- **受け入れ基準**:
  - [ ] `selectedDatabase: string | null`を`connectionId`の後ろに追加
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/types/sql-editor.ts`
- **依存**: なし

#### Task 1-2: SqlEditorTab型にselectedDatabaseを追加

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 5分
- **説明**: `SqlEditorTab`インターフェースに`selectedDatabase`フィールドを追加する
- **受け入れ基準**:
  - [ ] `selectedDatabase?: string`を`savedQueryId`の後ろに追加
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/types/sql-editor.ts`
- **依存**: なし

### Phase 2: フロントエンドストアの修正

#### Task 2-1: stateにselectedDatabaseを追加

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 10分
- **説明**: sql-editor.tsのstateとcreateEditorTab関数に`selectedDatabase`を追加する
- **受け入れ基準**:
  - [ ] stateに`selectedDatabase: null`を追加
  - [ ] `createEditorTab`関数に`selectedDatabase: undefined`を追加
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/stores/sql-editor.ts`
- **依存**: Task 1-1, Task 1-2

#### Task 2-2: setSelectedDatabase()アクションの追加

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 10分
- **説明**: 選択中のデータベース/スキーマを設定するアクションを追加する
- **受け入れ基準**:
  - [ ] `setSelectedDatabase(database: string | null)`メソッドを追加
  - [ ] アクティブタブにも反映される
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/stores/sql-editor.ts`
- **依存**: Task 2-1

#### Task 2-3: setConnectionId()メソッドの修正

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 20分
- **説明**: 接続時にデータベースタイプに応じて初期値を設定するロジックを追加する
- **受け入れ基準**:
  - [ ] MySQLの場合、`connection.database`を`selectedDatabase`に設定
  - [ ] PostgreSQLの場合、デフォルトスキーマ('public')を設定
  - [ ] SQLiteの場合、nullを設定
  - [ ] アクティブタブにも反映される
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/stores/sql-editor.ts`
- **依存**: Task 2-1, Task 2-2

#### Task 2-4: generateContextSql()メソッドの修正

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 15分
- **説明**: MySQLの場合はnullを返すように修正し、PostgreSQLのSET search_pathロジックは維持する
- **受け入れ基準**:
  - [ ] MySQLの場合、nullを返す
  - [ ] PostgreSQLの場合、`SET search_path TO "schema_name";`を返す
  - [ ] SQLiteの場合、nullを返す
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/stores/sql-editor.ts`
- **依存**: なし

#### Task 2-5: executeSqlText()メソッドの修正

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 15分
- **説明**: PostgreSQLの場合のみSET search_path文を追加するロジックに修正する
- **受け入れ基準**:
  - [ ] MySQLの場合、contextSqlが追加されない
  - [ ] PostgreSQLの場合、contextSqlが追加される
  - [ ] SQLiteの場合、contextSqlが追加されない
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/stores/sql-editor.ts`
- **依存**: Task 2-4

### Phase 3: UIコンポーネントの修正

#### Task 3-1: SqlEditorToolbarにcomputed追加

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 15分
- **説明**: 接続タイプとデフォルトデータベース名を取得するcomputed propertyを追加する
- **受け入れ基準**:
  - [ ] `connectionType` computedが実装されている
  - [ ] `defaultDatabase` computedが実装されている
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/components/sql-editor/SqlEditorToolbar.vue`
- **依存**: なし

#### Task 3-2: SqlEditorToolbarのテンプレート修正

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 30分
- **説明**: データベースタイプに応じて異なるUIを表示するようテンプレートを修正する
- **受け入れ基準**:
  - [ ] MySQLの場合、読み取り専用でデータベース名が表示される
  - [ ] PostgreSQLの場合、USelectMenuでスキーマ選択が可能
  - [ ] SQLiteの場合、何も表示されない
  - [ ] ロックアイコンが表示される（MySQL）
  - [ ] Nuxt UI v4の記法（items属性）を使用している
  - [ ] TypeScript型チェックでエラーがないことを確認
- **ファイル**:
  - `app/components/sql-editor/SqlEditorToolbar.vue`
- **依存**: Task 3-1

### Phase 4: 多言語対応

#### Task 4-1: 日本語翻訳追加

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: Medium
- **所要時間**: 10分
- **説明**: ja.jsonに翻訳キーを追加する
- **受け入れ基準**:
  - [ ] `sqlEditor.toolbar.database.placeholder`が追加されている
  - [ ] `sqlEditor.toolbar.database.mysqlReadonlyTooltip`が追加されている
  - [ ] JSON構文エラーがないことを確認
- **ファイル**:
  - `i18n/locales/ja.json`
- **依存**: なし

#### Task 4-2: 英語翻訳追加

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: Medium
- **所要時間**: 10分
- **説明**: en.jsonに翻訳キーを追加する
- **受け入れ基準**:
  - [ ] `sqlEditor.toolbar.database.placeholder`が追加されている
  - [ ] `sqlEditor.toolbar.database.mysqlReadonlyTooltip`が追加されている
  - [ ] JSON構文エラーがないことを確認
- **ファイル**:
  - `i18n/locales/en.json`
- **依存**: なし

### Phase 5: 動作確認とテスト

#### Task 5-1: MySQL接続での動作確認

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 30分
- **説明**: MySQL接続でデフォルトデータベースが正しく表示され、読み取り専用であることを確認する
- **受け入れ基準**:
  - [ ] デフォルトデータベース名が表示される
  - [ ] クリックしても選択できない
  - [ ] ツールチップが表示される
  - [ ] デフォルトデータベースに対してクエリが実行できる
  - [ ] 完全修飾名（`database.table`）で他のデータベースにアクセスできる
- **ファイル**: -
- **依存**: Task 1-1, Task 1-2, Task 2-1, Task 2-2, Task 2-3, Task 2-4, Task 2-5, Task 3-1, Task 3-2, Task 4-1, Task 4-2

#### Task 5-2: PostgreSQL接続での動作確認

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: High
- **所要時間**: 30分
- **説明**: PostgreSQL接続でスキーマ選択が可能であることを確認する
- **受け入れ基準**:
  - [ ] スキーマ一覧がドロップダウンで表示される
  - [ ] スキーマを選択できる
  - [ ] 選択したスキーマに対してクエリが実行できる
  - [ ] SET search_path文が正しく実行される
- **ファイル**: -
- **依存**: Task 2-1, Task 2-2, Task 2-3, Task 2-4, Task 2-5, Task 3-1, Task 3-2, Task 4-1, Task 4-2

#### Task 5-3: SQLite接続での動作確認

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: Medium
- **所要時間**: 15分
- **説明**: SQLite接続でデータベースセレクターが非表示になることを確認する
- **受け入れ基準**:
  - [ ] データベースセレクターが非表示になる
  - [ ] クエリが正常に実行できる
- **ファイル**: -
- **依存**: Task 2-1, Task 2-2, Task 2-3, Task 2-4, Task 2-5, Task 3-1, Task 3-2

#### Task 5-4: 多言語切り替えの動作確認

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: Medium
- **所要時間**: 15分
- **説明**: 日本語/英語切り替えで翻訳が正しく表示されることを確認する
- **受け入れ基準**:
  - [ ] 日本語で正しく表示される
  - [ ] 英語で正しく表示される
  - [ ] ツールチップも翻訳される
  - [ ] プレースホルダーも翻訳される
- **ファイル**: -
- **依存**: Task 4-1, Task 4-2

#### Task 5-5: タブ切り替え時の動作確認

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: Medium
- **所要時間**: 15分
- **説明**: タブを切り替えても選択されたデータベース/スキーマが保持されることを確認する
- **受け入れ基準**:
  - [ ] タブごとに`selectedDatabase`が保持される
  - [ ] タブ切り替え時に正しいデータベース/スキーマが表示される
- **ファイル**: -
- **依存**: Task 2-1, Task 2-2, Task 2-3

### Phase 6: ドキュメント更新

#### Task 6-1: testing.mdの更新

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: Low
- **所要時間**: 20分
- **説明**: testing.mdに動作確認手順を記載する
- **受け入れ基準**:
  - [ ] MySQL、PostgreSQL、SQLiteの各テストケースが記載されている
  - [ ] 期待される動作が明確に記述されている
- **ファイル**:
  - `docs/working/20260131_mysql-database-selection-limit/testing.md`
- **依存**: Task 5-1, Task 5-2, Task 5-3, Task 5-4, Task 5-5

#### Task 6-2: 永続化ドキュメントの更新検討

- **状態**: 📝 TODO
- **担当**: -
- **優先度**: Low
- **所要時間**: 15分
- **説明**: 必要に応じて永続化ドキュメントを更新する
- **受け入れ基準**:
  - [ ] SQLエディタ機能に関する仕様変更が機能設計書に反映されている（必要な場合）
  - [ ] 技術的制約がアーキテクチャ仕様書に記載されている（必要な場合）
- **ファイル**:
  - `docs/steering/02_functional_design.md`（必要に応じて）
  - `docs/steering/03_architecture_specifications.md`（必要に応じて）
- **依存**: 全タスク完了後

## 進捗管理

### 全体進捗

- **総タスク数**: 17
- **完了**: 0
- **進行中**: 0
- **未着手**: 17
- **進捗率**: 0%

### マイルストーン

| マイルストーン | 予定日 | 状態 |
|--------------|--------|------|
| Phase 1完了（型定義追加） | - | 📝 TODO |
| Phase 2完了（ストア修正） | - | 📝 TODO |
| Phase 3完了（UI修正） | - | 📝 TODO |
| Phase 4完了（多言語対応） | - | 📝 TODO |
| Phase 5完了（動作確認） | - | 📝 TODO |
| Phase 6完了（ドキュメント更新） | - | 📝 TODO |
| 全体完了 | - | 📝 TODO |

## 注意事項

- Phase 1（型定義）から順番に実装すること
- 各Phaseが完了してから次のPhaseに進むこと
- TypeScript型チェックを随時実行すること
- 動作確認は各データベースタイプで必ず実施すること
- 多言語対応を忘れないこと

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| UIの多言語対応漏れ | Low | チェックリストで確認（Task 5-4） |
| タブ切り替え時の状態管理不具合 | Medium | 動作確認を実施（Task 5-5） |
| 型定義とストア実装の不整合 | Medium | TypeScript型チェックを随時実行 |
