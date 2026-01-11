# 技術仕様書

**バージョン**: 1.0
**作成日**: 2025年12月29日
**最終更新**: 2025年12月29日

---

## 1. 技術スタック

### 1.1 概要

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| デスクトップフレームワーク | Tauri | 2.x |
| フロントエンドフレームワーク | Nuxt | 4.2.2 |
| UIフレームワーク | Nuxt UI | 4.2.1 |
| CSSフレームワーク | Tailwind CSS | 4.1.18 |
| 状態管理 | Pinia | 3.0.3 |
| フロントエンド言語 | Vue 3 + TypeScript | 3.5.13 / 5.7.2 |
| バックエンド言語 | Rust | 1.70+ |
| テストフレームワーク | Vitest | 3.2.4 |
| ビルドツール | Vite | 6.0.3 |

### 1.2 主要依存関係

#### フロントエンド (package.json)
```json
{
  "dependencies": {
    "@nuxt/icon": "^1.8.0",
    "@nuxt/ui": "^4.2.1",
    "@pinia/nuxt": "^0.11.3",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2.4.2",
    "@tauri-apps/plugin-opener": "^2",
    "nuxt": "^4.2.2",
    "pinia": "^3.0.3",
    "tailwindcss": "^4.1.18",
    "vue": "^3.5.13",
    "vuedraggable": "^4.1.0"
  }
}
```

#### バックエンド (Cargo.toml)
```toml
[dependencies]
tauri = "2.0"
tauri-plugin-opener = "2.0"
tauri-plugin-dialog = "2.0"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
async-trait = "0.1"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres", "mysql", "sqlite"] }
aes-gcm = "0.10"
argon2 = "0.5"
pbkdf2 = "0.12"
keyring = "3"
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
```

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────┐
│                     デスクトップアプリケーション               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │               フロントエンド (WebView)               │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │            Nuxt 4 + Vue 3                   │    │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐      │    │   │
│  │  │  │  Pages  │ │Components│ │ Stores  │      │    │   │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘      │    │   │
│  │  │       └───────────┴───────────┘            │    │   │
│  │  │                    │                       │    │   │
│  │  │           Composables / API                │    │   │
│  │  └────────────────────┼───────────────────────┘    │   │
│  └───────────────────────┼────────────────────────────┘   │
│                          │ Tauri IPC (invoke)              │
│  ┌───────────────────────┼────────────────────────────┐   │
│  │               バックエンド (Rust)                   │   │
│  │  ┌────────────────────┴───────────────────────┐   │   │
│  │  │               Tauri Commands                │   │   │
│  │  └────────────────────┬───────────────────────┘   │   │
│  │                       │                            │   │
│  │  ┌─────────┐ ┌────────┴────────┐ ┌─────────────┐ │   │
│  │  │Services │ │  SQL Generator  │ │   Storage   │ │   │
│  │  └────┬────┘ └────────┬────────┘ └──────┬──────┘ │   │
│  │       │               │                  │        │   │
│  │  ┌────┴───────────────┴──────────────────┴────┐  │   │
│  │  │              Database Layer                 │  │   │
│  │  │  (PostgreSQL / MySQL / SQLite Drivers)     │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  外部データベースサーバー                      │
│       PostgreSQL / MySQL / SQLite                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 データフロー

```
ユーザー操作
    │
    ▼
Vue Component (UI)
    │ @event / v-model
    ▼
Pinia Store (状態管理)
    │ invoke()
    ▼
Tauri IPC Layer
    │ serde JSON
    ▼
Rust Command Handler
    │
    ├──► Service Layer (ビジネスロジック)
    │         │
    │         ├──► Storage Layer (ファイル永続化)
    │         │
    │         └──► Database Layer (DB接続・クエリ実行)
    │
    ▼
Result<T, Error>
    │ serde JSON
    ▼
フロントエンドへ返却
```

---

## 3. モジュール構成

### 3.1 フロントエンドモジュール

```
app/
├── api/                      # Tauri IPC ラッパー
│   ├── database-structure.ts # DB構造取得API
│   ├── query.ts              # クエリ関連API
│   └── window.ts             # ウィンドウ管理API
│
├── assets/css/               # グローバルCSS
│   └── tailwind.css
│
├── components/               # Vueコンポーネント
│   ├── common/               # 共通コンポーネント
│   │   ├── EnvironmentHeader.vue
│   │   ├── EnvironmentBadge.vue
│   │   └── ...
│   ├── connection/           # 接続管理
│   │   ├── ConnectionCard.vue
│   │   ├── ConnectionList.vue
│   │   └── ...
│   ├── query-builder/        # クエリビルダー
│   │   ├── DatabaseTree.vue
│   │   ├── select/
│   │   ├── where/
│   │   ├── group-by/
│   │   ├── order-by/
│   │   └── ...
│   ├── security/             # セキュリティ
│   │   ├── MasterPasswordSetupDialog.vue
│   │   └── ...
│   └── settings/             # 設定
│       ├── GeneralSettings.vue
│       └── SecuritySettings.vue
│
├── composables/              # Composition API関数
│   ├── useEnvironment.ts     # 環境情報
│   ├── useTauri.ts           # Tauri API ラッパー
│   ├── useTheme.ts           # テーマ管理
│   └── useWindow.ts          # ウィンドウ操作
│
├── pages/                    # ページコンポーネント
│   ├── index.vue             # ランチャー
│   ├── connection-form.vue   # 接続設定
│   ├── query-builder.vue     # クエリビルダー
│   └── settings.vue          # 設定
│
├── stores/                   # Pinia ストア
│   ├── connection.ts         # 接続情報
│   ├── database-structure.ts # DB構造
│   ├── query-builder.ts      # クエリ状態
│   ├── security.ts           # セキュリティ
│   ├── settings.ts           # 設定
│   ├── theme.ts              # テーマ
│   └── window.ts             # ウィンドウ
│
├── types/                    # TypeScript型定義
│   ├── index.ts              # 共通型
│   ├── database-structure.ts # DB構造型
│   ├── query-model.ts        # クエリモデル型
│   └── query.ts              # クエリ関連型
│
├── utils/                    # ユーティリティ
│   └── query-converter.ts    # クエリ変換
│
├── app.config.ts             # アプリ設定
└── app.vue                   # ルートコンポーネント
```

### 3.2 バックエンドモジュール

```
src-tauri/src/
├── main.rs                   # エントリーポイント
├── lib.rs                    # ライブラリクレート
│
├── commands/                 # Tauriコマンド
│   ├── mod.rs
│   ├── database_structure.rs # DB構造取得
│   ├── query.rs              # クエリ関連
│   ├── security.rs           # セキュリティ
│   ├── settings.rs           # 設定
│   └── window.rs             # ウィンドウ管理
│
├── connection/               # 接続管理モジュール
│   ├── mod.rs
│   ├── builder.rs            # 接続ビルダー
│   ├── collection.rs         # 接続コレクション
│   ├── commands.rs           # 接続コマンド
│   ├── service.rs            # 接続サービス
│   ├── storage.rs            # 接続永続化
│   └── types.rs              # 接続型定義
│
├── crypto/                   # 暗号化モジュール
│   ├── mod.rs
│   ├── encryption.rs         # 暗号化ユーティリティ
│   ├── master_key/           # マスターキー管理
│   │   ├── manager.rs
│   │   └── keychain.rs
│   └── security_provider/    # セキュリティプロバイダー
│       ├── traits.rs
│       ├── simple.rs
│       ├── master_password.rs
│       ├── keychain.rs
│       ├── manager.rs
│       └── config.rs
│
├── database/                 # データベースモジュール
│   ├── mod.rs
│   ├── postgresql_inspector.rs
│   ├── mysql_inspector.rs
│   └── sqlite_inspector.rs
│
├── models/                   # データモデル
│   ├── mod.rs
│   ├── database_structure.rs
│   ├── query.rs
│   └── window.rs
│
├── services/                 # サービス層
│   ├── mod.rs
│   ├── database_inspector.rs
│   └── window_manager.rs
│
├── sql_generator/            # SQL生成エンジン
│   ├── mod.rs
│   ├── builder.rs            # SQL構築メイン
│   ├── dialect.rs            # 方言トレイト
│   ├── dialects/             # DB方言実装
│   │   ├── postgres.rs
│   │   ├── mysql.rs
│   │   └── sqlite.rs
│   └── clause/               # 句生成
│       ├── select.rs
│       ├── from.rs
│       ├── join.rs
│       ├── where_clause.rs
│       ├── group_by.rs
│       ├── order_by.rs
│       └── limit.rs
│
└── storage/                  # ストレージモジュール
    ├── mod.rs
    ├── file_storage.rs       # ファイルI/O
    ├── path_manager.rs       # パス管理
    └── window_state.rs       # ウィンドウ状態
```

---

## 4. Tauri IPC設計

### 4.1 通信パターン

```
フロントエンド                     バックエンド
     │                                  │
     │  invoke("command_name", args)    │
     │ ─────────────────────────────►   │
     │                                  │
     │  Result<T, Error> (JSON)         │
     │ ◄─────────────────────────────   │
     │                                  │
```

### 4.2 コマンド一覧

| カテゴリ | コマンド名 | 説明 |
|---------|-----------|------|
| 接続 | `create_connection` | 接続作成 |
| 接続 | `update_connection` | 接続更新 |
| 接続 | `delete_connection` | 接続削除 |
| 接続 | `get_connections` | 全接続取得 |
| 接続 | `test_connection` | 接続テスト |
| DB構造 | `get_database_structure` | DB構造取得 |
| クエリ | `generate_sql` | SQL生成 |
| クエリ | `execute_query` | クエリ実行（Phase 2） |
| セキュリティ | `get_security_settings` | セキュリティ設定取得 |
| セキュリティ | `switch_security_provider` | プロバイダー切替 |
| セキュリティ | `verify_master_password` | パスワード検証 |
| 設定 | `get_settings` | 設定取得 |
| 設定 | `save_settings` | 設定保存 |
| ウィンドウ | `open_query_builder_window` | ウィンドウ起動 |
| ウィンドウ | `get_window_context` | コンテキスト取得 |

### 4.3 エラーハンドリング

```rust
#[derive(Debug, thiserror::Error, serde::Serialize)]
pub enum AppError {
    #[error("Connection error: {0}")]
    Connection(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Security error: {0}")]
    Security(String),

    #[error("Storage error: {0}")]
    Storage(String),
}
```

---

## 5. データベース設計

### 5.1 データ永続化構造

```
~/.sql-query-build/
├── connections.json          # 接続情報（パスワード以外）
├── credentials.json          # 認証情報（暗号化）
├── security-config.json      # セキュリティ設定
├── settings.json             # アプリ設定
├── window-states.json        # ウィンドウ状態
└── saved-queries/            # 保存済みクエリ（Phase 4）
    └── {query_id}.json
```

### 5.2 主要データ構造

#### connections.json
```json
{
  "version": 1,
  "connections": [
    {
      "id": "uuid-1",
      "name": "開発DB",
      "type": "postgresql",
      "environment": "development",
      "host": "localhost",
      "port": 5432,
      "database": "dev_db",
      "username": "dev_user",
      "customColor": null,
      "createdAt": "2025-12-29T10:00:00Z",
      "updatedAt": "2025-12-29T10:00:00Z"
    }
  ]
}
```

#### credentials.json
```json
{
  "version": 1,
  "encryption_method": "aes-256-gcm",
  "credentials": {
    "uuid-1": {
      "encrypted_data": "base64...",
      "nonce": "base64...",
      "salt": "base64..."
    }
  }
}
```

---

## 6. セキュリティ設計

### 6.1 暗号化アーキテクチャ

```
              ┌──────────────────────────┐
              │   Security Provider      │
              │   (Simple/Master/Chain)  │
              └───────────┬──────────────┘
                          │
                          ▼
              ┌──────────────────────────┐
              │   Master Key Derivation  │
              │   (PBKDF2 / Keyring)     │
              └───────────┬──────────────┘
                          │
                          ▼
              ┌──────────────────────────┐
              │   AES-256-GCM Encryption │
              └───────────┬──────────────┘
                          │
                          ▼
              ┌──────────────────────────┐
              │   credentials.json       │
              └──────────────────────────┘
```

### 6.2 暗号化パラメータ

| パラメータ | 値 |
|-----------|---|
| 暗号化アルゴリズム | AES-256-GCM |
| キー長 | 256 bits |
| Nonce長 | 96 bits |
| ソルト長 | 256 bits |
| PBKDF2反復回数 | 600,000 |

---

## 7. ビルド・デプロイ

### 7.1 開発コマンド

```bash
# 開発サーバー起動（Tauriアプリ）
npm run tauri:dev

# フロントエンドのみ起動
npm run dev

# TypeScript型チェック
npm run typecheck

# テスト実行
npm run test:run
```

### 7.2 ビルドコマンド

```bash
# 本番ビルド
npm run tauri:build

# 出力先
# - macOS: src-tauri/target/release/bundle/dmg/
# - Windows: src-tauri/target/release/bundle/msi/
# - Linux: src-tauri/target/release/bundle/deb/
```

### 7.3 開発サーバー設定

| 設定 | 値 |
|------|---|
| 開発サーバーポート | 1420 |
| HMRポート | 1421 |
| SSRモード | 無効（`ssr: false`） |

---

## 8. パフォーマンス考慮事項

### 8.1 フロントエンド

- コンポーネントの遅延読み込み
- Pinia ストアの分割
- 仮想スクロール（大量データ表示時、Phase 2で検討）

### 8.2 バックエンド

- 接続プール管理（sqlx）
- 非同期処理（Tokio）
- 結果のストリーミング（Phase 2で検討）

### 8.3 目標指標

| 指標 | 目標値 |
|------|--------|
| 起動時間 | < 3秒 |
| クエリ実行レスポンス | DB応答 + 1秒以内 |
| UI操作反映 | < 0.5秒 |
| メモリ使用量 | < 500MB |

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2025-12-29 | 1.0 | 初版作成 | - |
