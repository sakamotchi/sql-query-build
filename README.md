# SQL Query Builder - Tauri Desktop App

Vue 3 + TypeScript + Tauriで構築されたSQLクエリビルダーデスクトップアプリケーション

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
npm run tauri dev
```

**重要**: `npm run dev` だけではViteサーバーのみが起動し、Tauri APIが使えません。必ず `npm run tauri dev` を使用してください。

### ビルド

```bash
# 開発用ビルド（TypeScriptチェック + Viteビルド）
npm run build

# 本番用アプリビルド（配布可能なインストーラー生成）
npm run tauri build
```

## 🛠️ 技術スタック

- **フロントエンド**: Vue 3 (Composition API) + TypeScript + Vuetify 3
- **状態管理**: Pinia
- **ビルドツール**: Vite
- **デスクトップフレームワーク**: Tauri 2.x
- **バックエンド**: Rust

## 📖 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run tauri dev` | Tauriアプリを起動（**推奨**） |
| `npm run dev` | Vite開発サーバーのみ起動（フロントエンドUI確認用） |
| `npm run build` | フロントエンドをビルド |
| `npm run tauri build` | 本番用アプリをビルド |
| `npm run preview` | ビルド結果をプレビュー |

## 📚 ドキュメント

- [要件定義書](docs/sql_editor_requirements_md.md)
- [WBS（作業計画）](docs/sql_editor_wbs.md)
- [タスク詳細](docs/tasks/)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
