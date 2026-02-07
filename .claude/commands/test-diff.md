# 差分ベーステスト実行

mainブランチ（またはPRのマージ先ブランチ）との差分を分析し、変更内容に応じて適切なテストを実行してください。

## 手順

### 1. ベースブランチの特定

以下の優先順位でベースブランチを決定してください：

1. `gh pr view --json baseRefName --jq '.baseRefName'` でPRのベースブランチを取得
2. PRが存在しない場合は `origin/main` をベースとする

### 2. 差分ファイルの取得

以下の両方から変更ファイルを収集してください：

- **コミット済みの差分**: `git diff --name-only <ベースブランチ>...HEAD`
- **未コミットの変更**: `git diff --name-only HEAD` と `git diff --name-only --cached`

### 3. テスト対象の判定

変更ファイルのパスに基づいて、以下のルールで判定してください：

| 変更パス | テスト対象 |
|---------|-----------|
| `app/**`, `nuxt.config.*`, `package.json`, `vitest.config.*`, `tsconfig.json` | フロントエンド |
| `src-tauri/src/**`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tests/**` | バックエンド |
| `docs/**`, `.github/**`, `CLAUDE.md`, `.claude/**` | テスト不要 |
| その他のルートファイル | フロントエンド |

### 4. テスト実行

判定結果に基づいて、以下のコマンドを実行してください：

- **フロントエンドテスト**: `npm run test:run`
- **バックエンドテスト**: `cargo test --manifest-path src-tauri/Cargo.toml`

両方が対象の場合は両方実行してください。

### 5. 結果報告

以下の形式で結果を報告してください：

- ベースブランチ
- 変更ファイル一覧
- 判定結果（フロントエンド / バックエンド / 両方 / テスト不要）
- 各テストの実行結果（成功 / 失敗）
