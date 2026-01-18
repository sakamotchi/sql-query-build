# 追加テスト推奨リスト - SQLエディタウィンドウ基盤

## 概要

Phase 1の実装に対して、以下の単体テストを追加することを推奨します。

## フロントエンド（TypeScript）テスト

### すでに実装済み ✅

[app/api/window.test.ts](../../../app/api/window.test.ts)

- ✅ `openSqlEditor` が正しい引数で `open_sql_editor_window` コマンドを呼び出すこと
- ✅ `openSqlEditor` がエラーをハンドリングすること
- ✅ 本番環境で正しいタイトル（警告記号付き）が返されること
- ✅ エラー時にコンソールログが出力されること

### 追加推奨テスト

以下のテストケースを追加することで、より堅牢なテストカバレッジが得られます：

#### 1. 複数環境のタイトルフォーマット検証

```typescript
describe('windowApi.openSqlEditor - environment handling', () => {
  it('should format title correctly for test environment', async () => {
    const mockWindowInfo = {
      label: 'sql_editor_test-123',
      title: '[テスト] TestDB - SQLエディタ',
      windowType: 'sql_editor',
      connectionId: 'test-123',
      focused: true,
      visible: true,
    }

    vi.mocked(invoke).mockResolvedValue(mockWindowInfo)

    const result = await windowApi.openSqlEditor(
      'test-123',
      'TestDB',
      'test',
    )

    expect(result.title).toContain('[テスト]')
  })

  it('should format title correctly for staging environment', async () => {
    const mockWindowInfo = {
      label: 'sql_editor_staging-123',
      title: '[ステージング] StagingDB - SQLエディタ',
      windowType: 'sql_editor',
      connectionId: 'staging-123',
      focused: true,
      visible: true,
    }

    vi.mocked(invoke).mockResolvedValue(mockWindowInfo)

    const result = await windowApi.openSqlEditor(
      'staging-123',
      'StagingDB',
      'staging',
    )

    expect(result.title).toContain('[ステージング]')
  })
})
```

#### 2. 特殊文字を含む接続名のテスト

```typescript
it('should handle connection names with special characters', async () => {
  const mockWindowInfo = {
    label: 'sql_editor_special-123',
    title: '[開発] 🐘PostgreSQL本番🔥 - SQLエディタ',
    windowType: 'sql_editor',
    connectionId: 'special-123',
    focused: true,
    visible: true,
  }

  vi.mocked(invoke).mockResolvedValue(mockWindowInfo)

  const result = await windowApi.openSqlEditor(
    'special-123',
    '🐘PostgreSQL本番🔥',
    'development',
  )

  expect(result.title).toContain('🐘PostgreSQL本番🔥')
})
```

#### 3. 空文字・null値のハンドリング

```typescript
it('should handle empty connection name gracefully', async () => {
  const mockWindowInfo = {
    label: 'sql_editor_empty-123',
    title: '[開発]  - SQLエディタ',
    windowType: 'sql_editor',
    connectionId: 'empty-123',
    focused: true,
    visible: true,
  }

  vi.mocked(invoke).mockResolvedValue(mockWindowInfo)

  const result = await windowApi.openSqlEditor(
    'empty-123',
    '',
    'development',
  )

  expect(result).toEqual(mockWindowInfo)
})
```

---

## バックエンド（Rust）テスト

### すでに実装済み ✅

[src-tauri/src/services/window_manager.rs:466-490](../../../src-tauri/src/services/window_manager.rs)

- ✅ SQLエディタのウィンドウラベル形式が `sql_editor_{connection_id}` であること
- ✅ 開発環境のウィンドウタイトル形式が正しいこと
- ✅ 本番環境のウィンドウタイトル形式が正しいこと（警告記号付き）

### 追加推奨テスト

[src-tauri/tests/window_manager_tests.rs](../../../src-tauri/tests/window_manager_tests.rs) にサンプルコードを記載しています。

以下のテストを `src-tauri/src/services/window_manager.rs` の `#[cfg(test)]` セクションに追加することを推奨します：

#### 1. 全環境のタイトルフォーマット検証

```rust
#[test]
fn test_sql_editor_title_format_test() {
    let title = format_sql_editor_title("PostgreSQLテスト", "test");
    assert_eq!(title, "[テスト] PostgreSQLテスト - SQLエディタ");
}

#[test]
fn test_sql_editor_title_format_staging() {
    let title = format_sql_editor_title("PostgreSQLステージング", "staging");
    assert_eq!(title, "[ステージング] PostgreSQLステージング - SQLエディタ");
}

#[test]
fn test_sql_editor_title_format_custom_environment() {
    // カスタム環境名はそのまま表示される
    let title = format_sql_editor_title("PostgreSQL", "custom-env");
    assert_eq!(title, "[custom-env] PostgreSQL - SQLエディタ");
}
```

#### 2. ウィンドウラベル生成のバリエーション

```rust
#[test]
fn test_sql_editor_label_without_connection() {
    let manager = WindowManager::new();
    let label = manager.generate_window_label(&WindowType::SqlEditor, &None);
    assert!(label.starts_with("sql_editor_"));
    // UUIDが付与されているので、長さをチェック
    assert!(label.len() > "sql_editor_".len());
}

#[test]
fn test_window_label_generation_for_different_types() {
    let manager = WindowManager::new();
    let connection_id = Some("test-123".to_string());

    let query_builder_label =
        manager.generate_window_label(&WindowType::QueryBuilder, &connection_id);
    let mutation_builder_label =
        manager.generate_window_label(&WindowType::MutationBuilder, &connection_id);
    let sql_editor_label = manager.generate_window_label(&WindowType::SqlEditor, &connection_id);

    assert_eq!(query_builder_label, "query-builder-test-123");
    assert_eq!(mutation_builder_label, "mutation-builder-test-123");
    assert_eq!(sql_editor_label, "sql_editor_test-123");

    // 各ウィンドウタイプでラベルが異なることを確認
    assert_ne!(query_builder_label, sql_editor_label);
    assert_ne!(mutation_builder_label, sql_editor_label);
}
```

#### 3. WindowStateの初期化テスト

```rust
#[test]
fn test_window_state_creation() {
    let state = WindowState::new(WindowType::SqlEditor, Some("conn-123".to_string()));

    assert_eq!(state.window_type, WindowType::SqlEditor);
    assert_eq!(state.connection_id, Some("conn-123".to_string()));
    assert_eq!(state.width, 1200);
    assert_eq!(state.height, 800);
    assert!(!state.maximized);
    assert!(!state.minimized);
    assert!(!state.fullscreen);
    assert!(!state.id.is_empty());
    assert!(!state.created_at.is_empty());
    assert_eq!(state.created_at, state.updated_at);
}
```

#### 4. 特殊文字のハンドリング

```rust
#[test]
fn test_sql_editor_title_with_special_characters() {
    // 日本語・絵文字を含む接続名のテスト
    let title = format_sql_editor_title("🐘PostgreSQL本番🔥", "production");
    assert_eq!(title, "[本番] 🐘PostgreSQL本番🔥 - SQLエディタ ⚠️");
}

#[test]
fn test_sql_editor_title_with_empty_connection_name() {
    let title = format_sql_editor_title("", "development");
    assert_eq!(title, "[開発]  - SQLエディタ");
}
```

#### 5. ランチャー・設定ウィンドウのラベル確認

```rust
#[test]
fn test_launcher_and_settings_labels() {
    let manager = WindowManager::new();

    let launcher_label = manager.generate_window_label(&WindowType::Launcher, &None);
    let settings_label = manager.generate_window_label(&WindowType::Settings, &None);

    assert_eq!(launcher_label, "launcher");
    assert_eq!(settings_label, "settings");
}
```

---

## 統合テスト（推奨）

Phase 1では統合テストは必須ではありませんが、以下のようなE2Eテストを追加すると、より堅牢性が高まります：

### Tauriアプリの統合テスト

```rust
// src-tauri/tests/integration_test.rs

#[cfg(test)]
mod integration_tests {
    use tauri::test::{mock_builder, MockRuntime};

    #[test]
    fn test_open_sql_editor_window_integration() {
        // Tauriアプリのモック環境でテスト
        // 注: Tauri 2.xの統合テストAPIを使用
        // 実際のウィンドウ作成・フォーカス動作を検証
    }
}
```

---

## テストカバレッジの目標

| カテゴリ | 現在 | 目標 |
|---------|------|------|
| フロントエンドAPI | 基本ケース | 80%以上 |
| Rustウィンドウマネージャー | 基本ケース | 90%以上 |
| エッジケース | 未実装 | 主要エッジケースをカバー |

---

## テスト実行コマンド

### フロントエンド

```bash
# 全テスト実行（watchモード）
npm run test

# 全テスト実行（一回のみ）
npm run test:run

# カバレッジ表示
npm run test:run -- --coverage
```

### バックエンド

```bash
# Rustテスト実行
cargo test --manifest-path=src-tauri/Cargo.toml

# 特定のテストのみ実行
cargo test --manifest-path=src-tauri/Cargo.toml sql_editor

# 詳細出力
cargo test --manifest-path=src-tauri/Cargo.toml -- --nocapture
```

---

## 優先度

### 高優先度（Phase 1完了前に実装推奨）

- ✅ 本番環境のタイトルフォーマット検証（実装済み）
- ✅ エラーハンドリングのログ出力確認（実装済み）
- [ ] 全環境（development, test, staging, production）のタイトルフォーマット検証
- [ ] ウィンドウラベル生成の異なるタイプ間での一意性確認

### 中優先度（Phase 2開始前に実装推奨）

- [ ] 特殊文字（絵文字、日本語）を含む接続名のハンドリング
- [ ] 空文字・null値のハンドリング
- [ ] WindowStateの初期化テスト

### 低優先度（Phase 2以降で実装）

- [ ] 統合テスト（E2E）
- [ ] パフォーマンステスト（ウィンドウ起動速度）
- [ ] メモリリークテスト

---

## まとめ

現在の実装は基本的なテストケースをカバーしていますが、以下の追加テストを実装することで、より堅牢な品質を確保できます：

1. **全環境のタイトルフォーマット検証**（高優先度）
2. **ウィンドウラベル生成の一意性確認**（高優先度）
3. **特殊文字のハンドリング**（中優先度）
4. **WindowStateの初期化テスト**（中優先度）

これらのテストは、Phase 1の動作確認（P1-7）の一環として、手動テストと併せて実施することを推奨します。
