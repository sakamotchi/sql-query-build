# CLAUDE.md

このファイルはClaude Code (claude.ai/code)がこのリポジトリで作業する際のガイダンスを提供します。

## 開発コマンド

- `npm run dev` - 開発サーバーを起動（Viteフロントエンド + Tauri）
- `npm run build` - 本番アプリケーションをビルド（TypeScriptチェック + Viteビルド）
- `npm run preview` - ビルドしたアプリケーションをプレビュー
- `npm run tauri` - Tauri CLIコマンドにアクセス

## アーキテクチャ概要

これはVue.jsフロントエンドを持つ **Tauriデスクトップアプリケーション** です：

### フロントエンド（Vue 3 + TypeScript）
- **フレームワーク**: Vue 3とComposition API（`<script setup>`）
- **ビルドツール**: TypeScriptサポート付きVite
- **メインファイル**: 
  - `src/main.ts` - Vueアプリのエントリーポイント
  - `src/App.vue` - Tauri API統合を含むルートコンポーネント
- **通信**: `@tauri-apps/api/core`を使用してRustバックエンドコマンドを呼び出し

### バックエンド（Rust + Tauri）
- **場所**: `src-tauri/`ディレクトリ
- **メインファイル**:
  - `src-tauri/src/main.rs` - Tauriアプリのエントリーポイント
  - `src-tauri/src/lib.rs` - ライブラリクレート
  - `src-tauri/tauri.conf.json` - Tauri設定
- **ビルド**: RustコンパイルにはCargoを使用

### 開発環境設定
- **開発サーバー**: `localhost:1420`で実行（Tauri用固定ポート）
- **ホットリロード**: ポート1421でVite HMR
- **ビルドプロセス**: フロントエンドが`dist/`にビルド後、Tauriがネイティブアプリにバンドル
- **クロスプラットフォーム**: すべてのプラットフォーム用にビルドするよう設定（"targets": "all"）

### 主要な統合ポイント
- フロントエンドはTauriの`invoke()` APIを介してRustバックエンドと通信
- 例: `invoke("greet", { name: value })`はRustコマンド関数を呼び出し
- TauriはWebフロントエンドとネイティブOS APIの橋渡しを担当

このプロジェクトは、Vue 3 Composition APIとTypeScriptを全体で使用する標準的なTauriパターンに従っています。