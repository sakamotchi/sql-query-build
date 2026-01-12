# Scripts

開発・リリース用のユーティリティスクリプト集です。

## release.js

リリース作業を一括で実行するスクリプトです。

### 使い方

```bash
# ドライラン（実行内容を確認のみ）
npm run release -- --dry-run patch

# パッチリリース (0.1.0 → 0.1.1)
npm run release -- patch

# マイナーリリース (0.1.0 → 0.2.0)
npm run release -- minor

# メジャーリリース (0.1.0 → 1.0.0)
npm run release -- major

# 特定バージョンを指定
npm run release -- 1.2.3
```

### 実行される処理

1. 未コミットの変更がないかチェック
2. 現在のブランチを確認（main/master以外の場合は警告）
3. テスト実行 (`npm run test:run`)
4. `package.json` のバージョン更新
5. `tauri.conf.json` と `Cargo.toml` にバージョン同期
6. コミット作成 (`release: vX.Y.Z`)
7. タグ作成 (`vX.Y.Z`)
8. リモートにpush（コミット + タグ）
9. GitHub Actions のリリースワークフローが自動起動

### 前提条件

- 未コミットの変更がないこと
- リモートリポジトリへのpush権限があること

---

## sync-version.js

`package.json` のバージョンを他の設定ファイルに同期するスクリプトです。

### 使い方

```bash
npm run version:sync
```

### 同期先

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### 備考

このスクリプトは `npm version` のライフサイクルフックで自動実行されるため、通常は直接実行する必要はありません。`release.js` を使用してください。
