# プロジェクトガイド (sql-query-build)

## 概要
- Vue 3 + TypeScript + Vuetify 3 を使った SQL クエリビルダーのデスクトップアプリ。
- フロントは Vite、状態管理は Pinia、デスクトップ化は Tauri 2.x、バックエンドは Rust。
- 主要ドキュメントは `docs/` 配下（要件・WBS・設計書など）に整理されている。

## 作業フロー
1. **実装前に設計書／要件を確認**  
   例: テーマ切り替えは `docs/design/1.4.2_theme_switcher.md` を参照。
2. **フロントは `src/`、Rust サイドは `src-tauri/` を編集**  
   - Tauri コマンド追加時は `src-tauri/src/lib.rs` の `invoke_handler` への登録を忘れない。
3. **実装後は必ずテストを実行**（詳細は後述）。
4. **エラー内容が既知のもの（例: Rust側の timeout テスト等）か確認し、必要であれば別途Issue化。**
5. **実装が設計書と異なる場合は、整合するよう設計書を必ず更新する。**

## テスト手順
- フロントエンド: `npm run test:run`（ウォッチが不要ならこのコマンド）。  
- バックエンド: `cargo test --manifest-path=src-tauri/Cargo.toml`。  
- まとめてチェックする場合:  
  ```bash
  npm run test:run && cargo test --manifest-path=src-tauri/Cargo.toml
  ```
- 失敗したテストのログは必ず確認し、必要に応じて `RUST_BACKTRACE=1` で再実行。

- 実装後は、テストコードを実行してエラーがないかを必ず確認すること。

## 補足
- Tauri API を使う開発実行は `npm run tauri dev` が前提。`npm run dev` だけでは API が呼べない。
- UI テストで Vuetify の依存を避けるため、必要に応じてコンポーネントをモックする（例: `src/App.test.ts`）。
- UI ライブラリは **Nuxt UI v4** を使用。旧バージョン（UFormGroup 等 v2/v3系）の情報を参照しないこと。コンポーネントは v4 の API を前提にする。

## 追加設定
- 個人設定は `.claude/slack-config.local.md` を参照（Slack通知の設定とルール、git管理外）。
