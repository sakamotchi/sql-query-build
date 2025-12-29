# リポジトリ構造定義書

**バージョン**: 1.0
**作成日**: 2025年12月29日
**最終更新**: 2025年12月29日

---

## 1. ディレクトリ構造

### 1.1 ルートディレクトリ

```
sql-query-build/
├── .claude/                  # Claude Code設定
├── .git/                     # Git管理
├── .github/                  # GitHub設定（CI/CD等）
├── .nuxt/                    # Nuxt ビルド出力（自動生成）
├── .output/                  # ビルド成果物（自動生成）
├── .vscode/                  # VSCode設定
├── app/                      # フロントエンドソース（Nuxt 4）
├── dist/                     # ビルド成果物
├── docs/                     # プロジェクトドキュメント
├── node_modules/             # npm依存関係（自動生成）
├── public/                   # 静的ファイル
├── src-tauri/                # バックエンドソース（Rust/Tauri）
├── tests/                    # テストファイル
├── .gitignore                # Git除外設定
├── AGENTS.md                 # AIエージェント用ガイド
├── CLAUDE.md                 # Claude Code用ガイド
├── README.md                 # プロジェクト説明
├── nuxt.config.ts            # Nuxt設定
├── package.json              # npm設定
├── package-lock.json         # npm依存関係ロック
├── tailwind.config.ts        # Tailwind CSS設定
├── tsconfig.json             # TypeScript設定
├── tsconfig.node.json        # Node用TypeScript設定
└── vitest.config.ts          # Vitest設定
```

### 1.2 app/ ディレクトリ（フロントエンド）

```
app/
├── api/                      # Tauri IPCラッパー
│   ├── database-structure.ts
│   ├── query.ts
│   └── window.ts
│
├── assets/                   # 静的アセット
│   └── css/
│       └── tailwind.css
│
├── components/               # Vueコンポーネント
│   ├── common/               # 共通コンポーネント
│   ├── connection/           # 接続管理関連
│   ├── launcher/             # ランチャー関連
│   ├── query-builder/        # クエリビルダー関連
│   │   ├── group-by/
│   │   ├── limit/
│   │   ├── order-by/
│   │   ├── select/
│   │   ├── table/
│   │   ├── tree/
│   │   └── where/
│   ├── security/             # セキュリティ関連
│   │   └── provider-change/
│   └── settings/             # 設定関連
│
├── composables/              # Composition API関数
│   ├── useEnvironment.ts
│   ├── useProviderChangeDialog.ts
│   ├── useProviderSwitch.ts
│   ├── useTableSelection.ts
│   ├── useTauri.ts
│   ├── useTheme.ts
│   └── useWindow.ts
│
├── pages/                    # ページコンポーネント
│   ├── index.vue             # ランチャー
│   ├── connection-form.vue   # 接続設定
│   ├── query-builder.vue     # クエリビルダー
│   └── settings.vue          # 設定
│
├── stores/                   # Piniaストア
│   ├── connection.ts
│   ├── database-structure.ts
│   ├── query-builder.ts
│   ├── security.ts
│   ├── settings.ts
│   ├── theme.ts
│   └── window.ts
│
├── types/                    # TypeScript型定義
│   ├── index.ts              # 共通型
│   ├── database-structure.ts
│   ├── query-model.ts
│   └── query.ts
│
├── utils/                    # ユーティリティ関数
│   └── query-converter.ts
│
├── app.config.ts             # アプリ設定
└── app.vue                   # ルートコンポーネント
```

### 1.3 src-tauri/ ディレクトリ（バックエンド）

```
src-tauri/
├── icons/                    # アプリアイコン
├── src/                      # Rustソースコード
│   ├── commands/             # Tauriコマンド
│   │   ├── mod.rs
│   │   ├── database_structure.rs
│   │   ├── query.rs
│   │   ├── security.rs
│   │   ├── settings.rs
│   │   └── window.rs
│   │
│   ├── connection/           # 接続管理モジュール
│   │   ├── mod.rs
│   │   ├── builder.rs
│   │   ├── collection.rs
│   │   ├── commands.rs
│   │   ├── connection_test_service.rs
│   │   ├── frontend_types.rs
│   │   ├── service.rs
│   │   ├── storage.rs
│   │   ├── tests.rs
│   │   └── types.rs
│   │
│   ├── crypto/               # 暗号化モジュール
│   │   ├── mod.rs
│   │   ├── encryption.rs
│   │   ├── error.rs
│   │   ├── types.rs
│   │   ├── master_key/
│   │   │   ├── mod.rs
│   │   │   ├── error.rs
│   │   │   ├── keychain.rs
│   │   │   ├── manager.rs
│   │   │   └── types.rs
│   │   └── security_provider/
│   │       ├── mod.rs
│   │       ├── config.rs
│   │       ├── credential_storage.rs
│   │       ├── error.rs
│   │       ├── keychain.rs
│   │       ├── manager.rs
│   │       ├── master_password.rs
│   │       ├── password_validator.rs
│   │       ├── provider_switcher.rs
│   │       ├── simple.rs
│   │       ├── simple_key.rs
│   │       ├── traits.rs
│   │       └── types.rs
│   │
│   ├── database/             # DB接続モジュール
│   │   ├── mod.rs
│   │   ├── postgresql_inspector.rs
│   │   ├── mysql_inspector.rs
│   │   └── sqlite_inspector.rs
│   │
│   ├── models/               # データモデル
│   │   ├── mod.rs
│   │   ├── database_structure.rs
│   │   ├── database_structure_test.rs
│   │   ├── query.rs
│   │   ├── window.rs
│   │   └── window_test.rs
│   │
│   ├── services/             # サービス層
│   │   ├── mod.rs
│   │   ├── database_inspector.rs
│   │   ├── database_inspector_test.rs
│   │   └── window_manager.rs
│   │
│   ├── sql_generator/        # SQL生成エンジン
│   │   ├── mod.rs
│   │   ├── builder.rs
│   │   ├── dialect.rs
│   │   ├── reserved_words.rs
│   │   ├── clause/
│   │   │   ├── mod.rs
│   │   │   ├── from.rs
│   │   │   ├── group_by.rs
│   │   │   ├── join.rs
│   │   │   ├── limit.rs
│   │   │   ├── order_by.rs
│   │   │   ├── select.rs
│   │   │   └── where_clause.rs
│   │   └── dialects/
│   │       ├── mod.rs
│   │       ├── mysql.rs
│   │       ├── postgres.rs
│   │       └── sqlite.rs
│   │
│   ├── storage/              # ストレージモジュール
│   │   ├── mod.rs
│   │   ├── error.rs
│   │   ├── file_storage.rs
│   │   ├── path_manager.rs
│   │   └── window_state.rs
│   │
│   ├── lib.rs                # ライブラリクレート
│   └── main.rs               # エントリーポイント
│
├── build.rs                  # ビルドスクリプト
├── Cargo.toml                # Rust依存関係
├── Cargo.lock                # Rust依存関係ロック
└── tauri.conf.json           # Tauri設定
```

### 1.4 docs/ ディレクトリ（ドキュメント）

```
docs/
├── 01_product_requirements.md      # プロダクト要求定義書
├── 02_functional_design.md         # 機能設計書
├── 03_architecture_specifications.md # 技術仕様書
├── 04_repository_structure.md      # リポジトリ構造定義書（本ドキュメント）
├── 05_development_guidelines.md    # 開発ガイドライン
├── 06_ubiquitous_language.md       # ユビキタス言語定義書
├── sql_editor_requirements_md.md   # レガシー要件定義（参考）
├── sql_editor_wbs_v3.md            # WBS v3
├── features/                       # 機能詳細仕様
│   ├── connection.md
│   ├── query-builder.md
│   ├── security.md
│   ├── settings.md
│   └── window.md
└── archive/                        # アーカイブ（過去のドキュメント）
    └── 20251229/
```

---

## 2. 命名規則

### 2.1 ファイル・ディレクトリ命名

| 種類 | 規則 | 例 |
|------|------|---|
| Vue コンポーネント | PascalCase | `ConnectionCard.vue` |
| Vue ページ | kebab-case | `query-builder.vue` |
| TypeScript ファイル | kebab-case | `database-structure.ts` |
| Rust ファイル | snake_case | `database_structure.rs` |
| ディレクトリ | kebab-case | `query-builder/` |
| 設定ファイル | kebab-case | `nuxt.config.ts` |

### 2.2 コード命名規則

#### TypeScript / Vue

| 種類 | 規則 | 例 |
|------|------|---|
| 変数・関数 | camelCase | `connectionId`, `getConnection()` |
| 定数 | UPPER_SNAKE_CASE | `MAX_CONNECTIONS` |
| クラス・型・インターフェース | PascalCase | `Connection`, `DatabaseType` |
| コンポーネント名 | PascalCase | `ConnectionCard` |
| Composable | usePascalCase | `useConnection()` |
| Pinia ストア | camelCase + Store | `connectionStore` |
| イベント | kebab-case | `@connection-selected` |
| Props | camelCase | `:connectionId` |

#### Rust

| 種類 | 規則 | 例 |
|------|------|---|
| 変数・関数 | snake_case | `connection_id`, `get_connection()` |
| 定数 | UPPER_SNAKE_CASE | `MAX_CONNECTIONS` |
| 構造体・列挙型・トレイト | PascalCase | `Connection`, `DatabaseType` |
| モジュール | snake_case | `database_structure` |
| クレート | kebab-case (Cargo.toml) | `sql-query-build` |

### 2.3 コンポーネント命名パターン

| パターン | 説明 | 例 |
|---------|------|---|
| Base* | 基底コンポーネント | `BaseButton.vue` |
| App* | アプリ固有の単一インスタンス | `AppHeader.vue` |
| The* | 単一インスタンス | `TheNavbar.vue` |
| V* | 外部ライブラリのラッパー | `VIcon.vue` |
| *Dialog | ダイアログ | `MasterPasswordSetupDialog.vue` |
| *Panel | パネルコンポーネント | `LeftPanel.vue` |
| *Tab | タブコンテンツ | `SelectTab.vue` |
| *Row | 行コンポーネント | `ConditionRow.vue` |
| *Card | カードコンポーネント | `ConnectionCard.vue` |
| *List | リストコンポーネント | `ConnectionList.vue` |

---

## 3. バージョン管理方針

### 3.1 ブランチ戦略

```
main (本番リリース)
 │
 ├── develop (開発統合)
 │    │
 │    ├── feature/xxx (機能開発)
 │    │
 │    ├── fix/xxx (バグ修正)
 │    │
 │    └── refactor/xxx (リファクタリング)
 │
 └── release/vX.X.X (リリース準備)
```

### 3.2 ブランチ命名規則

| プレフィックス | 用途 | 例 |
|--------------|------|---|
| `feature/` | 新機能開発 | `feature/query-execution` |
| `fix/` | バグ修正 | `fix/connection-timeout` |
| `refactor/` | リファクタリング | `refactor/store-structure` |
| `docs/` | ドキュメント更新 | `docs/update-readme` |
| `release/` | リリース準備 | `release/v0.2.0` |
| `hotfix/` | 緊急修正 | `hotfix/security-patch` |

### 3.3 コミットメッセージ規則

```
[type] 概要

詳細説明（任意）
```

#### タイプ一覧

| タイプ | 説明 |
|--------|------|
| `[add]` | 新機能追加 |
| `[update]` | 既存機能の更新・改善 |
| `[fix]` | バグ修正 |
| `[refactor]` | リファクタリング |
| `[docs]` | ドキュメント更新 |
| `[test]` | テスト追加・修正 |
| `[chore]` | ビルド・設定変更 |
| `[style]` | コードスタイル変更 |

#### 例

```
[add] クエリ実行機能の追加

- QueryExecutorトレイトの実装
- PostgreSQL/MySQL/SQLite対応
- 結果表示UIの追加
```

### 3.4 バージョニング

セマンティックバージョニング (SemVer) に従う。

```
MAJOR.MINOR.PATCH
```

| 要素 | 更新タイミング |
|------|--------------|
| MAJOR | 後方互換性のない変更 |
| MINOR | 後方互換性のある機能追加 |
| PATCH | 後方互換性のあるバグ修正 |

### 3.5 タグ規則

```
v{MAJOR}.{MINOR}.{PATCH}
```

例: `v0.1.0`, `v1.0.0`

---

## 4. Git管理対象外 (.gitignore)

```gitignore
# 依存関係
node_modules/
.nuxt/
.output/

# ビルド成果物
dist/
target/

# 環境設定
.env
.env.*

# IDE設定
.idea/
*.swp
*.swo

# OS生成ファイル
.DS_Store
Thumbs.db

# ログ
*.log
npm-debug.log*

# テスト
coverage/

# Tauri
src-tauri/target/
```

---

## 5. 設定ファイル一覧

| ファイル | 説明 |
|---------|------|
| `nuxt.config.ts` | Nuxtフレームワーク設定 |
| `tailwind.config.ts` | Tailwind CSS設定 |
| `tsconfig.json` | TypeScript設定 |
| `vitest.config.ts` | Vitestテスト設定 |
| `package.json` | npm依存関係・スクリプト |
| `src-tauri/Cargo.toml` | Rust依存関係 |
| `src-tauri/tauri.conf.json` | Tauriアプリ設定 |

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2025-12-29 | 1.0 | 初版作成 | - |
