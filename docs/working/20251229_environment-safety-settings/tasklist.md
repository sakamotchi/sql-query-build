# タスクリスト: 環境別安全設定

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.3 環境別安全設定

---

## タスク一覧

| タスクID | タスク名 | 状態 | 依存 | 完了条件 |
|---------|---------|------|------|---------|
| 3.3.1 | SafetySettings型定義（Rust） | 📝 未着手 | 3.2完了 | Rust側の型定義が完了 |
| 3.3.2 | SafetyConfigStorage実装（Rust） | 📝 未着手 | 3.3.1 | 設定の永続化が可能 |
| 3.3.3 | Tauriコマンド実装 | 📝 未着手 | 3.3.2 | get/update/resetコマンドが動作 |
| 3.3.4 | SafetySettings型定義（TypeScript） | 📝 未着手 | - | フロントエンド型定義が完了 |
| 3.3.5 | safetyApi実装 | 📝 未着手 | 3.3.3, 3.3.4 | API呼び出しが可能 |
| 3.3.6 | useSafetyStoreストア実装 | 📝 未着手 | 3.3.5 | 状態管理が可能 |
| 3.3.7 | EnvironmentSafetyCard.vue実装 | 📝 未着手 | 3.3.6 | 環境別設定カードが表示される |
| 3.3.8 | SafetySettingsPanel.vue実装 | 📝 未着手 | 3.3.7 | 設定パネルが表示される |
| 3.3.9 | 設定画面への統合 | 📝 未着手 | 3.3.8 | 設定ページに安全設定タブ追加 |
| 3.3.10 | DangerousQueryDialog変更 | 📝 未着手 | 3.3.6 | countdownSeconds動的化 |
| 3.3.11 | QueryBuilderToolbar統合 | 📝 未着手 | 3.3.10 | 環境設定に基づく制御 |
| 3.3.12 | テストコード作成 | 📝 未着手 | 3.3.11 | 全テストがパス |
| 3.3.13 | 手動テスト・動作確認 | 📝 未着手 | 3.3.12 | 要件を満たすことを確認 |

---

## 詳細タスク

### 3.3.1 SafetySettings型定義（Rust）

**概要**: Rust側の安全設定の型定義

**作業内容**:
1. `src-tauri/src/models/safety_settings.rs`作成
   - [ ] `ConfirmationThreshold` enum定義
   - [ ] `EnvironmentSafetyConfig` struct定義
   - [ ] `SafetySettings` struct定義
   - [ ] `Default` trait実装
2. `src-tauri/src/models/mod.rs`更新
   - [ ] `pub mod safety_settings;`追加

**完了条件**:
- [ ] `cargo check`が成功する
- [ ] デフォルト設定が正しく生成される

---

### 3.3.2 SafetyConfigStorage実装（Rust）

**概要**: 安全設定のファイル永続化

**作業内容**:
1. `src-tauri/src/services/safety_config.rs`作成
   - [ ] `SafetyConfigStorage` struct定義
   - [ ] `new()` コンストラクタ実装
   - [ ] `load()` メソッド実装
   - [ ] `save()` メソッド実装
   - [ ] `reset()` メソッド実装
2. `src-tauri/src/services/mod.rs`更新
   - [ ] `pub mod safety_config;`追加

**完了条件**:
- [ ] 設定ファイルが`~/.sql-query-build/safety-settings.json`に保存される
- [ ] ファイルがない場合はデフォルト設定が返される

---

### 3.3.3 Tauriコマンド実装

**概要**: フロントエンドからのAPI呼び出しエンドポイント

**作業内容**:
1. `src-tauri/src/commands/safety.rs`作成
   - [ ] `get_safety_settings` コマンド実装
   - [ ] `update_environment_safety` コマンド実装
   - [ ] `reset_safety_settings` コマンド実装
2. `src-tauri/src/commands/mod.rs`更新
   - [ ] `pub mod safety;`追加
3. `src-tauri/src/lib.rs`更新
   - [ ] コマンドをinvokeハンドラに登録

**完了条件**:
- [ ] `invoke("get_safety_settings")`で設定が取得できる
- [ ] `invoke("update_environment_safety", ...)`で設定が更新できる
- [ ] `invoke("reset_safety_settings")`でリセットできる

---

### 3.3.4 SafetySettings型定義（TypeScript）

**概要**: フロントエンド側の型定義

**作業内容**:
1. `app/types/safety-settings.ts`作成
   - [ ] `ConfirmationThreshold` type定義
   - [ ] `EnvironmentSafetyConfig` interface定義
   - [ ] `SafetySettings` interface定義
   - [ ] `DEFAULT_SAFETY_SETTINGS` const定義
2. `app/types/index.ts`更新（必要に応じて）
   - [ ] エクスポート追加

**完了条件**:
- [ ] 型定義が完了
- [ ] `npm run typecheck`がパス

---

### 3.3.5 safetyApi実装

**概要**: Tauri IPCラッパー

**作業内容**:
1. `app/api/safetyApi.ts`作成
   - [ ] `getSettings()` 関数実装
   - [ ] `updateEnvironmentSafety()` 関数実装
   - [ ] `resetSettings()` 関数実装

**完了条件**:
- [ ] Tauriコマンドを正しく呼び出せる
- [ ] 型安全なAPIが提供される

---

### 3.3.6 useSafetyStoreストア実装

**概要**: Pinia状態管理ストア

**作業内容**:
1. `app/stores/safety.ts`作成
   - [ ] state定義（settings, loading, error）
   - [ ] `getConfigForEnvironment` getter実装
   - [ ] `loadSettings` action実装
   - [ ] `updateEnvironmentConfig` action実装
   - [ ] `resetToDefault` action実装

**完了条件**:
- [ ] 設定の読み込み・更新・リセットが可能
- [ ] 環境別設定の取得が可能

---

### 3.3.7 EnvironmentSafetyCard.vue実装

**概要**: 各環境の設定を表示・編集するカードコンポーネント

**作業内容**:
1. `app/components/settings/EnvironmentSafetyCard.vue`作成
   - [ ] Props定義（environment, label, description, config）
   - [ ] ローカル状態管理
   - [ ] 確認ダイアログ有効/無効スイッチ
   - [ ] 確認ダイアログ表示レベル選択
   - [ ] カウントダウン秒数選択
   - [ ] DROP禁止スイッチ
   - [ ] TRUNCATE禁止スイッチ
   - [ ] 変更時の自動保存（デバウンス付き）
   - [ ] 本番環境の警告表示

**完了条件**:
- [ ] カードUIが正しく表示される
- [ ] 設定変更が自動保存される
- [ ] 本番環境で警告が表示される

---

### 3.3.8 SafetySettingsPanel.vue実装

**概要**: 環境別安全設定の全体パネル

**作業内容**:
1. `app/components/settings/SafetySettingsPanel.vue`作成
   - [ ] 4環境分のEnvironmentSafetyCard表示
   - [ ] デフォルトに戻すボタン
   - [ ] リセット確認モーダル
   - [ ] ローディング表示
   - [ ] エラー表示

**完了条件**:
- [ ] 4つの環境カードが表示される
- [ ] デフォルトリセット機能が動作する

---

### 3.3.9 設定画面への統合

**概要**: 既存の設定ページに安全設定タブを追加

**作業内容**:
1. `app/pages/settings.vue`更新
   - [ ] タブに「安全設定」を追加
   - [ ] SafetySettingsPanelコンポーネントを配置

**完了条件**:
- [ ] 設定ページから安全設定にアクセスできる

---

### 3.3.10 DangerousQueryDialog変更

**概要**: カウントダウン秒数を動的に受け取るよう変更

**作業内容**:
1. `app/components/query-builder/dialog/DangerousQueryDialog.vue`更新
   - [ ] `countdownSeconds` props追加
   - [ ] カウントダウンロジックを動的化
   - [ ] 0秒の場合はカウントダウンをスキップ

**完了条件**:
- [ ] 環境設定のカウントダウン秒数が適用される

---

### 3.3.11 QueryBuilderToolbar統合

**概要**: 実行ボタンクリック時に環境設定を参照

**作業内容**:
1. `app/components/query-builder/QueryBuilderToolbar.vue`更新
   - [ ] useSafetyStoreのインポート追加
   - [ ] 現在の環境取得ロジック追加
   - [ ] DROP/TRUNCATE禁止チェック追加
   - [ ] 確認ダイアログ表示判定ロジック追加
   - [ ] DangerousQueryDialogにcountdownSecondsを渡す
   - [ ] 禁止クエリのエラー表示

**完了条件**:
- [ ] DROP禁止設定時にDROPが実行できない
- [ ] TRUNCATE禁止設定時にTRUNCATEが実行できない
- [ ] 環境設定に基づき確認ダイアログが表示される

---

### 3.3.12 テストコード作成

**概要**: ユニットテストの作成

**作業内容**:
1. Rustテスト
   - [ ] `src-tauri/src/models/safety_settings_test.rs`作成
   - [ ] `src-tauri/src/services/safety_config_test.rs`作成
2. フロントエンドテスト
   - [ ] `app/stores/__tests__/safety.spec.ts`作成
   - [ ] `app/components/settings/__tests__/EnvironmentSafetyCard.spec.ts`作成

**完了条件**:
- [ ] `cargo test`がパス
- [ ] `npm run test:run`がパス

---

### 3.3.13 手動テスト・動作確認

**概要**: 実際のアプリケーションでの動作確認

**作業内容**:
1. testing.mdの全項目を確認

**完了条件**:
- [ ] testing.mdの全項目が確認済み

---

## 進捗状況

- **開始日**: -
- **完了日**: -
- **進捗率**: 0%

| 状態 | 件数 |
|------|------|
| 📝 未着手 | 13 |
| 🔄 進行中 | 0 |
| ✅ 完了 | 0 |
| ❌ ブロック | 0 |

---

## 備考

- Phase 3.2（確認ダイアログ）が完了していることが前提
- 確認ダイアログの既存実装を拡張する形で実装
- 設定変更は即座に反映（アプリ再起動不要）
