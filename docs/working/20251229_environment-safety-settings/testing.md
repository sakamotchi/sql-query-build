# テスト手順書: 環境別安全設定

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.3 環境別安全設定

---

## 1. 手動テスト手順

### 1.1 前提条件

- `npm run tauri:dev`でアプリが起動できること
- Phase 3.1（クエリ種別検出）が完了していること
- Phase 3.2（確認ダイアログ）が完了していること
- 各環境（development/test/staging/production）の接続が登録されていること

---

### 1.2 設定画面表示テスト

| テストID | テスト内容 | 確認方法 | 期待結果 | 結果 |
|---------|----------|---------|---------|------|
| T-1.2.1 | 設定画面から安全設定タブにアクセス | 設定ページ→安全設定タブをクリック | SafetySettingsPanelが表示される | ⬜ |
| T-1.2.2 | 4環境のカードが表示される | 安全設定タブを開く | development/test/staging/productionの4カードが表示 | ⬜ |
| T-1.2.3 | 本番環境に警告が表示される | productionカードを確認 | 黄色の警告アラートが表示されている | ⬜ |
| T-1.2.4 | デフォルト設定値の確認 | 各環境のカードを確認 | 要件定義のデフォルト値と一致 | ⬜ |

---

### 1.3 設定変更テスト

| テストID | テスト内容 | 確認方法 | 期待結果 | 結果 |
|---------|----------|---------|---------|------|
| T-1.3.1 | 確認ダイアログの有効/無効切替 | developmentでスイッチをOFF | 設定が保存される（アプリ再起動後も維持） | ⬜ |
| T-1.3.2 | 確認ダイアログ表示レベル変更 | stagingで「Dangerのみ」に変更 | 設定が保存される | ⬜ |
| T-1.3.3 | カウントダウン秒数変更 | productionで10秒に変更 | 設定が保存される | ⬜ |
| T-1.3.4 | DROP禁止の有効/無効切替 | stagingでONに変更 | 設定が保存される | ⬜ |
| T-1.3.5 | TRUNCATE禁止の有効/無効切替 | stagingでONに変更 | 設定が保存される | ⬜ |
| T-1.3.6 | デフォルトにリセット | 「デフォルトに戻す」ボタンクリック | 確認モーダル表示後、全設定がデフォルトに戻る | ⬜ |

---

### 1.4 設定永続化テスト

| テストID | テスト内容 | 確認方法 | 期待結果 | 結果 |
|---------|----------|---------|---------|------|
| T-1.4.1 | 設定ファイル生成確認 | `~/.sql-query-build/`を確認 | `safety-settings.json`が存在する | ⬜ |
| T-1.4.2 | アプリ再起動後の設定維持 | 設定変更→アプリ再起動→設定画面確認 | 変更した設定が維持されている | ⬜ |
| T-1.4.3 | ファイル削除後のデフォルト復元 | JSONファイル削除→アプリ再起動 | デフォルト設定が表示される | ⬜ |

---

### 1.5 クエリ実行時の安全設定適用テスト

#### 1.5.1 確認ダイアログ表示制御

| テストID | テスト内容 | 確認方法 | 期待結果 | 結果 |
|---------|----------|---------|---------|------|
| T-1.5.1 | 確認ダイアログ無効時 | development環境でダイアログOFF→DELETE実行 | ダイアログなしで実行される | ⬜ |
| T-1.5.2 | Warning以上で表示（UPDATE + WHERE有） | staging環境（閾値:Warning）でUPDATE実行 | 確認ダイアログが表示される | ⬜ |
| T-1.5.3 | Dangerのみで表示（UPDATE + WHERE有） | development環境（閾値:Danger）でUPDATE実行 | ダイアログなしで実行される | ⬜ |
| T-1.5.4 | Dangerのみで表示（DELETE + WHERE無） | development環境（閾値:Danger）でDELETE(WHERE無)実行 | 確認ダイアログが表示される | ⬜ |

#### 1.5.2 カウントダウン秒数

| テストID | テスト内容 | 確認方法 | 期待結果 | 結果 |
|---------|----------|---------|---------|------|
| T-1.5.5 | カウントダウン0秒（無効） | developmentでDELETE(WHERE無)実行 | カウントダウンなしで即座に実行ボタン有効 | ⬜ |
| T-1.5.6 | カウントダウン5秒 | productionでDELETE(WHERE無)実行 | 5秒のカウントダウン後に実行ボタン有効化 | ⬜ |
| T-1.5.7 | カウントダウン表示 | ダイアログ表示中 | 「実行する (5秒待機)」→「実行する (4秒待機)」... | ⬜ |

#### 1.5.3 DROP/TRUNCATE禁止

| テストID | テスト内容 | 確認方法 | 期待結果 | 結果 |
|---------|----------|---------|---------|------|
| T-1.5.8 | DROP禁止時の実行ブロック | production(DROP禁止ON)でDROP実行 | 実行がブロックされ、エラーメッセージ表示 | ⬜ |
| T-1.5.9 | DROP許可時の実行 | development(DROP禁止OFF)でDROP実行 | 確認ダイアログ後に実行可能 | ⬜ |
| T-1.5.10 | TRUNCATE禁止時の実行ブロック | production(TRUNCATE禁止ON)でTRUNCATE実行 | 実行がブロックされ、エラーメッセージ表示 | ⬜ |
| T-1.5.11 | TRUNCATE許可時の実行 | staging(TRUNCATE禁止OFF)でTRUNCATE実行 | 確認ダイアログ後に実行可能 | ⬜ |

---

### 1.6 エラーケーステスト

| テストID | テスト内容 | 確認方法 | 期待結果 | 結果 |
|---------|----------|---------|---------|------|
| T-1.6.1 | 設定ファイル読み取り権限なし | ファイルのパーミッションを変更 | エラー表示、デフォルト設定で動作 | ⬜ |
| T-1.6.2 | 不正なJSON形式 | JSONファイルを壊す | エラー表示、デフォルト設定で動作 | ⬜ |

---

## 2. 自動テスト

### 2.1 Rustテスト

**実行コマンド**: `cd src-tauri && cargo test`

| テストケース | 説明 | ファイル |
|------------|------|---------|
| test_default_settings | デフォルト設定の正当性確認 | safety_settings_test.rs |
| test_save_and_load | 設定の保存と読み込み | safety_config_test.rs |
| test_update_environment | 環境別設定の更新 | safety_config_test.rs |
| test_reset_to_default | リセット機能 | safety_config_test.rs |

### 2.2 フロントエンドテスト

**実行コマンド**: `npm run test:run`

| テストケース | 説明 | ファイル |
|------------|------|---------|
| 初期状態はデフォルト設定 | ストア初期化確認 | safety.spec.ts |
| 環境別設定を取得できる | getConfigForEnvironment確認 | safety.spec.ts |
| 設定更新が反映される | updateEnvironmentConfig確認 | safety.spec.ts |
| 本番環境警告表示 | productionでの警告確認 | EnvironmentSafetyCard.spec.ts |
| 設定変更の自動保存 | デバウンス付き保存確認 | EnvironmentSafetyCard.spec.ts |

---

## 3. テストデータ

### 3.1 テスト用SQL

```sql
-- Safe（ダイアログなし）
SELECT * FROM users

-- Warning（UPDATE with WHERE）
UPDATE users SET name = 'test' WHERE id = 1

-- Danger（DELETE without WHERE）
DELETE FROM users

-- Danger（DROP TABLE）
DROP TABLE users

-- Danger（TRUNCATE）
TRUNCATE TABLE users
```

### 3.2 テスト用接続設定

| 環境 | 接続名 | 目的 |
|------|--------|------|
| development | Dev DB | 確認ダイアログ閾値Danger、カウントダウン0秒のテスト |
| staging | Staging DB | 確認ダイアログ閾値Warning、カウントダウン3秒のテスト |
| production | Prod DB | DROP/TRUNCATE禁止、カウントダウン5秒のテスト |

---

## 4. テスト完了基準

- [ ] すべての手動テスト項目がパス（T-1.2.1 〜 T-1.6.2）
- [ ] `cargo test`がすべてパス
- [ ] `npm run test:run`がすべてパス
- [ ] 設定変更が即座に反映される（再起動不要）
- [ ] アプリ再起動後も設定が維持される
- [ ] 本番環境でDROP/TRUNCATEがデフォルトで禁止されている

---

## 5. 既知の制限事項

- 設定ファイルの手動編集は推奨しない（UIから変更すること）
- カウントダウン秒数は0〜10秒の範囲に制限
- 確認ダイアログ無効時でもDROP/TRUNCATE禁止は有効
