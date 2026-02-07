# ユビキタス言語定義書

**バージョン**: 1.0
**作成日**: 2025年12月29日
**最終更新**: 2026年02月07日

---

## 1. 概要

このドキュメントは、SQL Query Builderプロジェクトで使用する共通用語（ユビキタス言語）を定義します。開発チーム、ドキュメント、コード内で一貫した用語を使用することで、コミュニケーションの齟齬を防ぎます。

---

## 2. コアドメイン用語

### 2.1 接続管理（Connection Management）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| 接続 | Connection | データベースへの接続情報の一式。ホスト、ポート、ユーザー名、パスワード等を含む | `Connection` |
| 接続ID | Connection ID | 接続を一意に識別するUUID | `connectionId: string` |
| 接続名 | Connection Name | ユーザーが識別しやすいように付ける表示名 | `name: string` |
| 環境 | Environment | 接続先の環境タイプ（開発/テスト/ステージング/本番） | `Environment` |
| 環境色 | Environment Color | 環境を視覚的に識別するための色設定 | `environmentColor` |
| カスタム色 | Custom Color | ユーザーが環境色を上書きするための設定 | `customColor` |
| 接続テスト | Connection Test | 入力した接続情報でDBに接続できるか確認する操作 | `testConnection()` |
| ランチャー | Launcher | 登録済み接続一覧を表示し、接続を起動する画面 | `LauncherPage` |

### 2.2 データベース（Database）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| データベースタイプ | Database Type | DBMSの種類（PostgreSQL/MySQL/SQLite等） | `DatabaseType` |
| スキーマ | Schema | データベース内の名前空間（PostgreSQL/MySQL） | `Schema` |
| テーブル | Table | データを格納する表構造 | `Table` |
| ビュー | View | 仮想テーブル（SELECT文から生成） | `View` |
| カラム | Column | テーブル内の列（属性） | `Column` |
| データ型 | Data Type | カラムに格納できるデータの型 | `dataType: string` |
| 主キー | Primary Key | 行を一意に識別するカラム | `primaryKey: boolean` |
| 外部キー | Foreign Key | 他テーブルを参照するカラム | `foreignKey` |
| データベース構造 | Database Structure | スキーマ、テーブル、カラムの階層構造 | `DatabaseStructure` |
| データベースツリー | Database Tree | データベース構造を階層表示するUIコンポーネント | `DatabaseTree` |

### 2.3 クエリビルダー（Query Builder）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| クエリビルダー | Query Builder | GUIでSQLを構築する機能・画面 | `QueryBuilder` |
| クエリモデル | Query Model | 構築中のクエリを表すデータ構造 | `QueryModel` |
| 選択テーブル | Selected Table | クエリで使用するために選択されたテーブル | `SelectedTable` |
| テーブルエイリアス | Table Alias | SQLでテーブルに付ける短縮名（例: `users AS u`） | `alias: string` |
| 選択カラム | Selected Column | SELECT句に含めるカラム | `SelectedColumn` |
| カラムエイリアス | Column Alias | SELECT句でカラムに付ける別名（AS句） | `columnAlias` |
| ドロップゾーン | Drop Zone | テーブルをドラッグ&ドロップで配置するエリア | `DropZone` |
| テーブルカード | Table Card | 選択されたテーブルを表示するUIコンポーネント | `TableCard` |
| テーブル関係エリア | Table Relation Area | 選択されたテーブルとその関係を表示するエリア | `TableRelationArea` |
| 条件設定タブ | Condition Tabs | SELECT/WHERE/GROUP BY等を設定するタブUI | `ConditionTabs` |

### 2.4 SQL句（SQL Clauses）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| SELECT句 | Select Clause | 取得するカラムを指定する句 | `SelectClause` |
| FROM句 | From Clause | 対象テーブルを指定する句 | `FromClause` |
| JOIN句 | Join Clause | テーブル結合を指定する句 | `JoinClause` |
| WHERE句 | Where Clause | 抽出条件を指定する句 | `WhereClause` |
| GROUP BY句 | Group By Clause | グループ化を指定する句 | `GroupByClause` |
| HAVING句 | Having Clause | グループに対する条件を指定する句 | `HavingClause` |
| ORDER BY句 | Order By Clause | ソート順を指定する句 | `OrderByClause` |
| LIMIT句 | Limit Clause | 取得件数を制限する句 | `LimitClause` |
| DISTINCT | Distinct | 重複行を除外するキーワード | `distinct: boolean` |
| 集計関数 | Aggregate Function | COUNT/SUM/AVG/MIN/MAX等の関数 | `AggregateFunction` |

### 2.5 WHERE条件（Where Conditions）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| 条件 | Condition | WHERE句の1つの比較条件 | `WhereCondition` |
| 条件グループ | Condition Group | ANDまたはORで結合された条件の集合 | `WhereConditionGroup` |
| 演算子 | Operator | 比較に使用する記号（=, !=, LIKE等） | `WhereOperator` |
| 条件値 | Condition Value | 比較対象の値 | `WhereValue` |
| 論理演算子 | Logic Operator | 条件の結合方法（AND/OR） | `logic: 'AND' \| 'OR'` |
| 条件行 | Condition Row | 1つの条件を設定するUIコンポーネント | `ConditionRow` |
| ネスト | Nesting | 条件グループを階層化すること | - |

### 2.6 JOIN（結合）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| 内部結合 | Inner Join | 両テーブルに存在するデータのみ結合 | `'INNER'` |
| 左外部結合 | Left Join | 左テーブルの全データを保持して結合 | `'LEFT'` |
| 右外部結合 | Right Join | 右テーブルの全データを保持して結合 | `'RIGHT'` |
| 完全外部結合 | Full Join | 両テーブルの全データを保持して結合 | `'FULL'` |
| クロス結合 | Cross Join | 全組み合わせを生成（直積） | `'CROSS'` |
| 結合条件 | Join Condition | テーブルを結合する条件（ON句） | `JoinCondition` |

### 2.7 保存クエリ管理（Saved Query Management）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| フォルダパス | Folder Path | 保存クエリのフォルダ階層を表すパス | `folderPath: string \| null` |
| ツリーノード | Tree Node | フォルダ/クエリを表すツリー構造のノード | `TreeNode` |
| 展開状態 | Expansion State | フォルダの展開/折りたたみ状態 | `expandedFolders: Set<string>` |
| クエリツリー | Query Tree | フォルダとクエリの階層ツリー | `queryTree` |

### 2.8 SQLエディタ（SQL Editor）

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| SQLエディタ | SQL Editor | フリーフォームでSQLを入力・実行する機能・画面 | `SqlEditor` |
| エディタタブ | Editor Tab | SQLエディタ内の1つの編集タブ | `SqlEditorTab` |
| SQLテキストエディタ | SQL Text Editor | Monaco Editorベースのテキスト入力エリア | `SqlTextEditor` |
| コード補完 | Code Completion | テーブル名・カラム名・キーワードの自動補完機能 | `useSqlCompletion` |
| 補完コンテキスト | Completion Context | コード補完に必要なDB構造情報 | `CompletionContext` |
| SQLフォーマッター | SQL Formatter | SQL文を読みやすく自動整形する機能 | `sql-formatter` |
| 保存クエリ | Saved Query | SQLエディタで保存されたクエリ | `SavedQuery` |
| クエリフォルダ | Query Folder | 保存クエリを整理するフォルダ | `folder` |
| 実行履歴 | Execution History | 実行されたSQLの履歴記録 | `SqlEditorHistoryEntry` |
| 段階的取得 | Progressive Loading | DB構造を軽量サマリー→詳細の順に段階的に取得する方式 | `fetchDatabaseStructureSummary` |
| DB構造サマリー | Database Structure Summary | テーブル名のみの軽量なDB構造情報 | `DatabaseStructureSummary` |
| ダーティフラグ | Dirty Flag | タブ内のSQLが未保存の変更を持つことを示すフラグ | `dirty: boolean` |

---

## 3. セキュリティドメイン用語

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| セキュリティプロバイダー | Security Provider | 認証情報の暗号化方式を提供するモジュール | `SecurityProvider` |
| Simpleプロバイダー | Simple Provider | アプリ固定キーで暗号化する方式 | `'simple'` |
| マスターパスワード | Master Password | ユーザー設定のパスワードで暗号化する方式 | `'master-password'` |
| キーチェーン | Keychain | OSのセキュアストレージを使用する方式 | `'keychain'` |
| セキュリティレベル | Security Level | 暗号化方式のセキュリティ強度 | `SecurityLevel` |
| 認証情報 | Credentials | パスワード等の機密情報 | `credentials` |
| 暗号化 | Encryption | データを秘密の形式に変換すること | `encrypt()` |
| 復号 | Decryption | 暗号化されたデータを元に戻すこと | `decrypt()` |
| ソルト | Salt | 暗号化の安全性を高めるランダム値 | `salt` |
| キー導出 | Key Derivation | パスワードから暗号化キーを生成する処理 | `deriveKey()` |

---

## 4. ウィンドウ管理ドメイン用語

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| ウィンドウ | Window | アプリケーションの1つの画面インスタンス | `Window` |
| ウィンドウラベル | Window Label | ウィンドウを識別するTauri内部の名前 | `windowLabel` |
| ウィンドウタイプ | Window Type | ウィンドウの種類（ランチャー/クエリビルダー/設定） | `WindowType` |
| ウィンドウ状態 | Window State | ウィンドウの位置、サイズ、最大化状態 | `WindowState` |
| ウィンドウコンテキスト | Window Context | 各ウィンドウ固有の状態情報 | `WindowContext` |
| マルチウィンドウ | Multi-Window | 複数のウィンドウを同時に開く機能 | - |
| ウィンドウ復元 | Window Restore | 前回終了時のウィンドウ状態を復元する機能 | `windowRestore` |
| 環境識別ヘッダー | Environment Header | 環境を色で識別するヘッダーUI | `EnvironmentHeader` |
| 警告バナー | Warning Banner | 本番環境での警告を表示するUI | `EnvironmentWarningBanner` |

---

## 5. SQL生成ドメイン用語

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| SQL生成エンジン | SQL Generator | QueryModelからSQLを生成するモジュール | `SqlGenerator` |
| SQLビルダー | SQL Builder | SQLの各句を組み立てるコンポーネント | `SqlBuilder` |
| ダイアレクト | Dialect | DB固有のSQL方言 | `Dialect` |
| SQLプレビュー | SQL Preview | 生成されたSQLをリアルタイム表示するUI | `SqlPreview` |
| 予約語 | Reserved Words | SQLで特別な意味を持つキーワード | `reservedWords` |
| エスケープ | Escape | 特殊文字を安全な形式に変換すること | `escape()` |
| 識別子引用 | Identifier Quoting | テーブル名やカラム名を引用符で囲むこと | `quoteIdentifier()` |

---

## 6. UIコンポーネント用語

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| パネル | Panel | 画面を分割する領域 | `Panel` |
| リサイズ可能パネル | Resizable Panel | サイズを調整できるパネル | `ResizablePanel` |
| ツールバー | Toolbar | アクションボタンを配置するバー | `Toolbar` |
| タブ | Tab | コンテンツを切り替えるUI | `Tab` |
| ダイアログ | Dialog | モーダルで表示される画面 | `Dialog` |
| カード | Card | 情報をまとめて表示するUI | `Card` |
| バッジ | Badge | 状態やカテゴリを示す小さなラベル | `Badge` |
| トースト | Toast | 一時的な通知メッセージ | `toast` |
| ツリー | Tree | 階層構造を表示するUI | `Tree` |
| ノード | Node | ツリーの1要素 | `Node` |
| ドロップダウン | Dropdown | 選択肢を展開表示するUI | `Dropdown` |
| チェックボックス | Checkbox | 複数選択可能な選択UI | `Checkbox` |

---

## 7. 開発用語

| 用語 | 英語表記 | 定義 | コード上の表現 |
|------|---------|------|---------------|
| ストア | Store | Piniaによる状態管理モジュール | `xxxStore` |
| コンポーザブル | Composable | Vue Composition API関数 | `useXxx()` |
| API | API | Tauri IPCラッパー関数群 | `xxxApi` |
| コマンド | Command | TauriのIPC呼び出しで実行されるRust関数 | `#[tauri::command]` |
| サービス | Service | ビジネスロジックを担当するモジュール | `XxxService` |
| インスペクター | Inspector | DB構造を取得するモジュール | `DatabaseInspector` |
| マネージャー | Manager | リソースを管理するモジュール | `XxxManager` |

---

## 8. コンテキスト別用語の使い方

### 8.1 ユーザー向け（UI/ドキュメント）

| コード上の用語 | ユーザー向け表現 |
|--------------|----------------|
| Connection | 接続、接続設定 |
| Environment | 環境 |
| Query Builder | クエリビルダー |
| Execute | 実行 |
| Save | 保存 |
| Delete | 削除 |
| Cancel | キャンセル |
| Error | エラー |
| Loading | 読み込み中 |

### 8.2 開発者向け（コード/コメント）

| 日本語 | 英語（コード内） |
|-------|-----------------|
| 接続を取得する | `getConnection()` |
| 接続を作成する | `createConnection()` |
| 接続を更新する | `updateConnection()` |
| 接続を削除する | `deleteConnection()` |
| クエリを実行する | `executeQuery()` |
| SQLを生成する | `generateSql()` |
| 認証情報を暗号化する | `encryptCredentials()` |
| DB構造を取得する | `getDatabaseStructure()` |

---

## 9. 略語集

| 略語 | 正式名称 | 説明 |
|------|---------|------|
| DB | Database | データベース |
| SQL | Structured Query Language | 構造化問い合わせ言語 |
| UI | User Interface | ユーザーインターフェース |
| API | Application Programming Interface | アプリケーションプログラミングインターフェース |
| IPC | Inter-Process Communication | プロセス間通信 |
| UUID | Universally Unique Identifier | 汎用一意識別子 |
| CRUD | Create, Read, Update, Delete | 基本的なデータ操作 |
| PR | Pull Request | プルリクエスト |
| WBS | Work Breakdown Structure | 作業分解構造 |

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2025-12-29 | 1.0 | 初版作成 | - |
| 2026-02-07 | 1.1 | SQLエディタ関連の用語を追加（2.8節） | - |
