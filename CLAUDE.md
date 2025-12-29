# CLAUDE.md

このファイルはClaude Code (claude.ai/code)がこのリポジトリで作業する際のガイダンスを提供します。

## 開発コマンド

- `npm run tauri:dev` - **Tauriアプリを起動（推奨）** - Nuxt + Rustバックエンド + デスクトップアプリ
- `npm run dev` - Nuxt開発サーバーのみ起動（Tauri API使用不可、フロントエンドUI確認用）
- `npm run build` - 本番アプリケーションをビルド（TypeScriptチェック + Nuxtビルド）
- `npm run tauri:build` - 本番用Tauriアプリをビルド（配布可能なインストーラー生成）
- `npm run preview` - ビルドしたアプリケーションをプレビュー
- `npm run typecheck` - TypeScript型チェック
- `npm run test` - Vitestテスト実行（watch モード）
- `npm run test:run` - Vitestテスト実行（一回のみ）
- `npm run tauri` - Tauri CLIコマンドにアクセス

**重要**: 通常の開発では `npm run tauri:dev` を使用してください。`npm run dev` だけではTauri APIが動作しません。

## アーキテクチャ概要

これはVue.jsフロントエンドを持つ **Tauriデスクトップアプリケーション** です：

### フロントエンド（Nuxt 4 + Vue 3 + TypeScript）
- **フレームワーク**: Nuxt 4（Vue 3ベース）とComposition API（`<script setup>`）
- **UIライブラリ**: Nuxt UI v4（Tailwind CSS 4ベース）
- **状態管理**: Pinia（`@pinia/nuxt`）
- **アイコン**: `@nuxt/icon`（Iconifyベース）
- **ビルドツール**: Vite 6 + TypeScript 5.7
- **テスト**: Vitest 3 + `@vue/test-utils`
- **ディレクトリ構成**: Nuxt 4標準（`app/`ディレクトリ）
  - `app/app.vue` - ルートコンポーネント（Tauri API統合含む）
  - `app/pages/` - ページコンポーネント（自動ルーティング）
  - `app/components/` - 再利用可能なコンポーネント
  - `app/stores/` - Piniaストア
  - `app/composables/` - Composable関数（`useTauri()`など）
  - `app/types/` - TypeScript型定義
  - `app/assets/css/` - グローバルCSS
- **通信**: `@tauri-apps/api/core`を使用してRustバックエンドコマンドを呼び出し
  - Composable `useTauri()` でTauri APIをラップ（ブラウザモード対応）

### バックエンド（Rust + Tauri）
- **場所**: `src-tauri/`ディレクトリ
- **メインファイル**:
  - `src-tauri/src/main.rs` - Tauriアプリのエントリーポイント
  - `src-tauri/src/lib.rs` - ライブラリクレート
  - `src-tauri/tauri.conf.json` - Tauri設定
- **ビルド**: RustコンパイルにはCargoを使用

### 開発環境設定
- **SSRモード**: 無効（`ssr: false`）- Tauriデスクトップアプリ用
- **開発サーバー**: `localhost:1420`で実行（Tauri用固定ポート）
- **ホットリロード**: ポート1421でVite HMR（WebSocket）
- **ビルドプロセス**: Nuxtが`.output/public/`にビルド後、Tauriがネイティブアプリにバンドル
- **クロスプラットフォーム**: すべてのプラットフォーム用にビルドするよう設定（"targets": "all"）
- **型チェック**: `strict: true`（開発時のtypeCheckは無効化してパフォーマンス向上）

### 主要な統合ポイント
- フロントエンドはTauriの`invoke()` APIを介してRustバックエンドと通信
- 例: `invoke("greet", { name: value })`はRustコマンド関数を呼び出し
- `useTauri()` ComposableでTauri環境検出とコマンド実行を抽象化
  - ブラウザモード（`npm run dev`）でもエラーなく動作
  - Tauriモード（`npm run tauri:dev`）で実際のバックエンドと通信
- TauriはWebフロントエンドとネイティブOS APIの橋渡しを担当

このプロジェクトは、Nuxt 4標準構成とVue 3 Composition API、TypeScriptを全体で使用する現代的なTauriパターンに従っています。

### 技術スタック詳細
- **Nuxt**: 4.2.2
- **Vue**: 3.5.13
- **Nuxt UI**: 4.2.1
- **Tailwind CSS**: 4.1.18
- **Pinia**: 3.0.3
- **Vite**: 6.0.3
- **TypeScript**: 5.7.2
- **Vitest**: 3.2.4
- **Tauri**: 2.x
- **Tauri Plugins**: dialog, opener

## ドキュメント

- `docs/` - プロジェクトのドキュメント
- `docs/archive/` - 古いドキュメントのアーカイブ（過去の仕様書、廃止された計画など）

### 永続化ドキュメント（常に整合性を保つ必要あり）

以下のドキュメントはプロジェクトの信頼できる情報源（Single Source of Truth）として管理されています。
**コードを変更した際は、関連するドキュメントも必ず更新してください。**

| ドキュメント | 内容 | 更新タイミング |
|------------|------|--------------|
| `docs/01_product_requirements.md` | プロダクト要求定義書 | 要件・機能の追加/変更時 |
| `docs/02_functional_design.md` | 機能設計書 | 画面・機能の追加/変更時 |
| `docs/03_architecture_specifications.md` | 技術仕様書 | アーキテクチャ・技術スタック変更時 |
| `docs/04_repository_structure.md` | リポジトリ構造定義書 | ディレクトリ構造・命名規則変更時 |
| `docs/05_development_guidelines.md` | 開発ガイドライン | コーディング規約・レビュー手順変更時 |
| `docs/06_ubiquitous_language.md` | ユビキタス言語定義書 | 用語の追加/変更時 |

#### 機能詳細仕様（docs/features/）

| ドキュメント | 内容 |
|------------|------|
| `docs/features/connection.md` | 接続管理機能の詳細仕様 |
| `docs/features/query-builder.md` | クエリビルダー機能の詳細仕様 |
| `docs/features/security.md` | セキュリティ機能の詳細仕様 |
| `docs/features/settings.md` | 設定機能の詳細仕様 |
| `docs/features/window.md` | ウィンドウ管理機能の詳細仕様 |

#### ドキュメント更新のルール

1. **機能追加時**: 該当する機能詳細仕様を更新し、必要に応じて機能設計書・要求定義書も更新
2. **API追加/変更時**: 技術仕様書のコマンド一覧を更新
3. **型定義変更時**: ユビキタス言語定義書を確認し、必要に応じて更新
4. **ディレクトリ/ファイル追加時**: リポジトリ構造定義書を更新
5. **実装状態の変更時**: 各ドキュメントの「状態」欄を更新（✅完了、⚠️一部完了、📝計画中 等）

## 追加設定

個人設定については以下のファイルを参照してください：

- `.claude/slack-config.local.md` - Slack通知の設定とルール（git管理外）