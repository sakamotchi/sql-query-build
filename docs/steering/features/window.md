# ウィンドウ管理機能 詳細仕様

**バージョン**: 1.0
**作成日**: 2025年12月29日
**状態**: ✅ 完了（Phase 1.5）

---

## 1. 機能概要

複数のデータベース接続を同時に別ウィンドウで起動し、各ウィンドウの状態を管理する機能。環境ごとの視覚的識別によって誤操作を防止する。

---

## 2. ウィンドウタイプ

### 2.1 タイプ一覧

| タイプ | ラベルパターン | 説明 |
|--------|--------------|------|
| launcher | `main` | ランチャー（メインウィンドウ） |
| query_builder | `query_builder_{connection_id}` | クエリビルダー |
| settings | `settings` | 設定ウィンドウ |

### 2.2 ウィンドウ特性

| タイプ | 複数起動 | 最小サイズ | デフォルトサイズ |
|--------|---------|-----------|----------------|
| launcher | 不可 | 800x600 | 1024x768 |
| query_builder | 可（接続ごと） | 1024x768 | 1280x900 |
| settings | 不可 | 600x400 | 800x600 |

---

## 3. データモデル

### 3.1 WindowInfo（Tauri側）

```typescript
interface WindowInfo {
  label: string           // ウィンドウラベル（識別子）
  title: string           // ウィンドウタイトル
  windowType: WindowType  // ウィンドウタイプ
  connectionId: string | null  // 関連する接続ID
  focused: boolean        // フォーカス状態
  visible: boolean        // 表示状態
}
```

### 3.2 WindowContext（フロントエンド側）

```typescript
interface WindowContext {
  windowLabel: string       // Tauriウィンドウラベル
  windowType: WindowType    // ウィンドウタイプ
  connectionId?: string     // 関連する接続ID
  environment?: Environment // 環境タイプ
}
```

### 3.3 WindowState（永続化用）

```typescript
interface WindowState {
  id: string              // ウィンドウID
  connectionId: string    // 接続ID
  position: { x: number; y: number }
  size: { width: number; height: number }
  isMaximized: boolean
  createdAt: string
}
```

---

## 4. 環境識別機能

### 4.1 環境色テーマ

| 環境 | Primary色 | Background色 | 説明 |
|------|-----------|--------------|------|
| development | #4CAF50（緑） | #F1F8E9 | 安全な作業環境 |
| test | #2196F3（青） | #E3F2FD | 検証環境 |
| staging | #FF9800（オレンジ） | #FFF3E0 | 注意が必要な環境 |
| production | #F44336（赤） | #FFEBEE | 危険環境 |

### 4.2 視覚的識別要素

| 要素 | 説明 |
|------|------|
| ヘッダーバー | 環境色でヘッダー背景を着色 |
| ウィンドウタイトル | 「[環境名] 接続名」形式 |
| 環境バッジ | 環境タイプのラベル表示 |
| 警告バナー | 本番環境では常時表示 |

### 4.3 本番環境の特別対応

- 常時警告バナー表示
- 赤色の強調表示
- UPDATE/DELETE時の追加確認（Phase 3で実装予定）
- 実行ボタンの遅延有効化（Phase 3で実装予定）

---

## 5. ウィンドウ状態管理

### 5.1 保存される状態

- ウィンドウ位置（x, y座標）
- ウィンドウサイズ（width, height）
- 最大化状態
- 関連する接続ID

### 5.2 状態復元タイミング

- アプリ起動時（設定で有効の場合）
- 接続クリック時（既存ウィンドウがあれば再表示）

---

## 6. API仕様

### 6.1 Tauri Commands

#### open_query_builder_window
クエリビルダーウィンドウを開く。

```rust
#[tauri::command]
async fn open_query_builder_window(
    app_handle: tauri::AppHandle,
    connection_id: String
) -> Result<WindowInfo, WindowError>
```

#### get_all_windows
全ウィンドウ情報を取得する。

```rust
#[tauri::command]
async fn get_all_windows(app_handle: tauri::AppHandle) -> Result<Vec<WindowInfo>, WindowError>
```

#### get_window_context
現在のウィンドウコンテキストを取得する。

```rust
#[tauri::command]
async fn get_window_context(
    window: tauri::Window
) -> Result<WindowContext, WindowError>
```

#### save_window_state
ウィンドウ状態を保存する。

```rust
#[tauri::command]
async fn save_window_state(
    window: tauri::Window,
    state: WindowState
) -> Result<(), WindowError>
```

---

## 7. 関連コンポーネント

### 7.1 フロントエンド

| コンポーネント | パス | 説明 |
|--------------|------|------|
| EnvironmentHeader | `components/common/EnvironmentHeader.vue` | 環境識別ヘッダー |
| EnvironmentBadge | `components/common/EnvironmentBadge.vue` | 環境バッジ |
| EnvironmentIndicator | `components/common/EnvironmentIndicator.vue` | 環境インジケーター |
| EnvironmentWarningBanner | `components/common/EnvironmentWarningBanner.vue` | 警告バナー |

### 7.2 バックエンド

| モジュール | パス | 説明 |
|-----------|------|------|
| commands/window.rs | ウィンドウコマンド |
| services/window_manager.rs | ウィンドウ管理サービス |
| storage/window_state.rs | ウィンドウ状態永続化 |
| models/window.rs | ウィンドウ関連型定義 |

### 7.3 ストア・Composables

| 名前 | パス | 説明 |
|------|------|------|
| windowStore | `stores/window.ts` | ウィンドウ状態管理 |
| useWindow | `composables/useWindow.ts` | ウィンドウ操作hooks |
| useEnvironment | `composables/useEnvironment.ts` | 環境情報hooks |

---

## 8. ウィンドウ間通信

### 8.1 概要

Tauriのイベントシステムを使用してウィンドウ間でデータを共有。

### 8.2 主要イベント

| イベント | 説明 |
|---------|------|
| `connection-updated` | 接続情報が更新された |
| `connection-deleted` | 接続が削除された |
| `settings-changed` | 設定が変更された |

---

## 9. 状態永続化

### 9.1 保存先

```
~/.sql-query-build/
└── window-states.json
```

### 9.2 ファイル形式

```json
{
  "version": 1,
  "states": {
    "query_builder_uuid-1": {
      "connectionId": "uuid-1",
      "position": { "x": 100, "y": 100 },
      "size": { "width": 1280, "height": 900 },
      "isMaximized": false,
      "createdAt": "2025-12-29T10:00:00Z"
    }
  }
}
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-12-29 | 1.0 | 初版作成 |
