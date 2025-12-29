# SQL Query Builder - Tauri Desktop App

Nuxt 4 + Vue 3 + TypeScript + Tauriで構築されたSQLクエリビルダーデスクトップアプリケーション

## 🚀 開発環境セットアップ

### 前提条件
- Node.js (v18以上)
- Rust (最新安定版)
- 必要に応じて各OSの開発ツール

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
# Tauriアプリを起動（通常はこちらを使用）
npm run tauri:dev
```

**重要**: `npm run dev` だけではNuxt開発サーバーのみが起動し、Tauri APIが使えません。必ず `npm run tauri:dev` を使用してください。

### ビルド

```bash
# 開発用ビルド（TypeScriptチェック + Nuxtビルド）
npm run build

# 本番用アプリビルド（配布可能なインストーラー生成）
npm run tauri:build
```

## 🛠️ 技術スタック

- **フレームワーク**: Nuxt 4 + Vue 3 (Composition API) + TypeScript
- **UIライブラリ**: Nuxt UI v4 (Tailwind CSS 4ベース)
- **状態管理**: Pinia
- **ビルドツール**: Vite 6
- **デスクトップフレームワーク**: Tauri 2.x
- **バックエンド**: Rust
- **テスト**: Vitest (フロントエンド) + Rust標準テスト (バックエンド)

## 📖 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run tauri:dev` | Tauriアプリを起動（**推奨**） |
| `npm run dev` | Nuxt開発サーバーのみ起動（フロントエンドUI確認用） |
| `npm run build` | フロントエンドをビルド（TypeScriptチェック + Nuxtビルド） |
| `npm run tauri:build` | 本番用アプリをビルド |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run typecheck` | TypeScript型チェック |
| `npm test` | フロントエンドテストをウォッチモードで実行 |
| `npm run test:run` | フロントエンドテストを1回実行 |
| `npm run test:ui` | Vitest UIでテストを実行 |

## 🧪 テスト

このプロジェクトは、フロントエンドとバックエンドの両方に対して包括的なテストを実装しています。

### フロントエンドテスト（Vitest）

```bash
# ウォッチモードでテストを実行（ファイル変更を自動検知）
npm test

# テストを1回だけ実行（CI用）
npm run test:run

# ブラウザUIでテストを実行
npm run test:ui
```

**テストフレームワーク**:
- Vitest（Nuxt 4 + Viteと最適に統合）
- @vue/test-utils（Vueコンポーネントテスト）
- happy-dom（軽量DOM環境）

### バックエンドテスト（Rust）

```bash
# プロジェクトルートから全テストを実行
cargo test --manifest-path=src-tauri/Cargo.toml

# 出力を詳細表示
cargo test --manifest-path=src-tauri/Cargo.toml -- --nocapture

# ユニットテストのみ実行
cargo test --manifest-path=src-tauri/Cargo.toml --lib

# 統合テストのみ実行
cargo test --manifest-path=src-tauri/Cargo.toml --test integration_persistence
```

**テストフレームワーク**: Rust標準のテストフレームワーク + tempfile（一時ファイル）

### すべてのテストを実行

```bash
# フロントエンドとバックエンドの両方
npm run test:run && cargo test --manifest-path=src-tauri/Cargo.toml
```

## 📁 ディレクトリ構成

```
sql-query-build/
├── app/                    # フロントエンド（Nuxt 4）
│   ├── pages/              # ページコンポーネント（自動ルーティング）
│   ├── components/         # 再利用可能なコンポーネント
│   ├── stores/             # Piniaストア
│   ├── composables/        # Composable関数
│   ├── types/              # TypeScript型定義
│   ├── api/                # API呼び出し関数
│   └── assets/css/         # グローバルCSS
├── src-tauri/              # バックエンド（Rust + Tauri）
│   ├── src/                # Rustソースコード
│   └── tauri.conf.json     # Tauri設定
├── docs/                   # ドキュメント
│   └── archive/            # 古いドキュメントのアーカイブ
└── nuxt.config.ts          # Nuxt設定
```

## 📚 ドキュメント

- [要件定義書](docs/sql_editor_requirements_md.md)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
