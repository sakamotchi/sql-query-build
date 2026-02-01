# 設計書 - SQLエディタウィンドウ基盤構築

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
├── pages/sql-editor.vue (新規作成)
├── components/connection/ConnectionCard.vue (更新)
├── pages/index.vue (更新)
├── api/window.ts (更新)
└── types/index.ts (更新)
    ↓ invoke('open_sql_editor_window')
Tauri API
    ↓
Rust Backend
├── models/window.rs (更新)
├── services/window_manager.rs (更新)
└── commands/window.rs (更新)
```

### 影響範囲

- **フロントエンド**:
  - 型定義の拡張（`WindowType`）
  - ウィンドウAPI関数の追加（`openSqlEditor()`）
  - SQLエディタページの新規作成
  - 接続カードUIの更新（エディタボタン追加）
  - ランチャーイベントハンドラーの追加
- **バックエンド**:
  - `WindowType` enumの拡張（`SqlEditor` バリアント追加）
  - ウィンドウマネージャーサービスの拡張（`open_sql_editor_window` 関数追加）
  - Tauriコマンドの追加

## 実装方針

### 概要

既存のクエリビルダー・ミューテーションビルダーのウィンドウ管理パターンを踏襲し、SQLエディタを第3のウィンドウタイプとして追加する。Phase 1では空のページを表示するのみとし、Phase 2以降でエディタUIを段階的に実装する。

### 詳細

1. **型定義の拡張（フロントエンド・バックエンド）**
   - `WindowType` に `'sql_editor'`（フロントエンド）および `SqlEditor`（Rust）を追加
   - 既存のクエリビルダー・ミューテーションビルダーと同等の扱いとする

2. **Rust側ウィンドウマネージャーの拡張**
   - `open_sql_editor_window()` 関数を実装
   - ウィンドウラベル形式: `sql_editor_{connection_id}`
   - ウィンドウタイトル形式: `[{environment}] {connection_name} - SQLエディタ` (本番は`⚠️`追加)
   - 重複防止ロジック: 同一接続IDの既存ウィンドウがある場合はフォーカス

3. **フロントエンドAPI関数の追加**
   - `windowApi.openSqlEditor(connectionId, connectionName, environment)` を実装
   - 既存の `openQueryBuilder` と同じシグネチャ・エラーハンドリングパターンを使用

4. **SQLエディタページの作成**
   - `app/pages/sql-editor.vue` を新規作成
   - Nuxt 4のページ規約に従い、Composition API形式で実装
   - ウィンドウコンテキスト（接続ID、環境情報）を取得
   - `EnvironmentHeader` コンポーネントで環境識別ヘッダーを表示
   - Phase 1では「SQLエディタ（準備中）」のプレースホルダーを表示

5. **接続カードへのボタン追加**
   - `ConnectionCard.vue` に「エディタ」ボタンを追加
   - アイコン: `i-heroicons-code-bracket`
   - クリックイベント: `@click="$emit('open-sql-editor', connection.id)"`

6. **ランチャーのイベントハンドラー追加**
   - `index.vue` に `handleOpenSqlEditor` 関数を追加
   - `ConnectionCard` からの `@open-sql-editor` イベントを受け取り、`windowApi.openSqlEditor()` を呼び出す

## データ構造

### 型定義（TypeScript）

```typescript
// app/types/index.ts

/**
 * ウィンドウの種類
 * - launcher: ランチャー（メインウィンドウ）
 * - query_builder: クエリビルダー
 * - mutation_builder: ミューテーションビルダー
 * - sql_editor: SQLエディタ（新規追加）
 * - settings: 設定ウィンドウ
 */
export type WindowType =
  | 'launcher'
  | 'query_builder'
  | 'mutation_builder'
  | 'sql_editor'  // ← 追加
  | 'settings'

// WindowInfo, WindowState, WindowContext は変更なし
```

### 型定義（Rust）

```rust
// src-tauri/src/models/window.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WindowType {
    Launcher,
    QueryBuilder,
    MutationBuilder,
    SqlEditor,  // ← 追加
    Settings,
}

// WindowInfo, WindowStateは変更なし
```

## API設計

### Tauriコマンド

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `open_sql_editor_window` | `connection_id: String`<br>`connection_name: String`<br>`environment: String` | `Result<WindowInfo, String>` | SQLエディタウィンドウを開く。既存ウィンドウがあればフォーカス。 |

### Rust実装（サービス層）

```rust
// src-tauri/src/services/window_manager.rs

pub async fn open_sql_editor_window(
    app_handle: &AppHandle,
    connection_id: String,
    connection_name: String,
    environment: String,
) -> Result<WindowInfo, String> {
    let label = format!("sql_editor_{}", connection_id);

    // 既存ウィンドウがあればフォーカス
    if let Some(window) = app_handle.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(get_window_info(&window)?);
    }

    // ウィンドウタイトルの生成（本番環境は警告記号追加）
    let title = if environment == "production" {
        format!("[本番] {} - SQLエディタ ⚠️", connection_name)
    } else {
        format!("[{}] {} - SQLエディタ", environment, connection_name)
    };

    // 新規ウィンドウ作成
    let window = WebviewWindowBuilder::new(
        app_handle,
        &label,
        WebviewUrl::App("/sql-editor".into())
    )
    .title(&title)
    .inner_size(1280.0, 900.0)
    .min_inner_size(1024.0, 768.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(get_window_info(&window)?)
}
```

### Rust実装（コマンド層）

```rust
// src-tauri/src/commands/window.rs

#[tauri::command]
pub async fn open_sql_editor_window(
    app_handle: tauri::AppHandle,
    connection_id: String,
    connection_name: String,
    environment: String,
) -> Result<WindowInfo, String> {
    window_manager::open_sql_editor_window(
        &app_handle,
        connection_id,
        connection_name,
        environment
    ).await
}
```

### フロントエンドAPI実装

```typescript
// app/api/window.ts

export const windowApi = {
  // 既存の関数...

  /**
   * SQLエディタウィンドウを開く
   */
  async openSqlEditor(
    connectionId: string,
    connectionName: string,
    environment: string,
  ): Promise<WindowInfo> {
    return invoke('open_sql_editor_window', {
      connectionId,
      connectionName,
      environment,
    })
  },
}
```

## UI設計

### 画面構成

#### SQLエディタページ（Phase 1: 空ページ）

```
┌─────────────────────────────────────────────────────┐
│  [開発] PostgreSQL本番 - SQLエディタ                 │ ← ウィンドウタイトル
├─────────────────────────────────────────────────────┤
│  EnvironmentHeader (緑色背景 for development)        │
├─────────────────────────────────────────────────────┤
│                                                      │
│           SQLエディタ（準備中）                       │
│                                                      │
│     Phase 2でエディタUIを実装予定                     │
│                                                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### 接続カード（ボタン追加）

```
┌─────────────────────────────────────┐
│  PostgreSQL本番                      │
│  localhost:5432                     │
│                                     │
│  [クエリビルダー] [ミューテーション] [エディタ] ← 新規追加
└─────────────────────────────────────┘
```

### コンポーネント構成

#### SQLエディタページ (`app/pages/sql-editor.vue`)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWindowContext } from '~/composables/useWindowContext'
import { useConnectionStore } from '~/stores/connection'
import type { Connection } from '~/types'

// ウィンドウコンテキストを取得
const { windowContext, loading: contextLoading } = useWindowContext()
const connectionStore = useConnectionStore()

// 接続情報を取得
const connection = ref<Connection | null>(null)

onMounted(async () => {
  if (windowContext.value?.connectionId) {
    connection.value = await connectionStore.getConnection(windowContext.value.connectionId)
  }
})
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- 環境識別ヘッダー -->
    <EnvironmentHeader
      v-if="connection"
      :connection="connection"
    />

    <!-- メインコンテンツ（Phase 1: プレースホルダー） -->
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-heroicons-code-bracket" class="text-6xl text-gray-400 mb-4" />
        <h2 class="text-2xl font-bold text-gray-700 mb-2">
          SQLエディタ（準備中）
        </h2>
        <p class="text-gray-500">
          Phase 2でエディタUIを実装予定
        </p>
      </div>
    </div>
  </div>
</template>
```

#### 接続カード更新 (`app/components/connection/ConnectionCard.vue`)

```vue
<script setup lang="ts">
// 既存のコード...

// イベント定義
const emit = defineEmits<{
  'open-query-builder': [id: string]
  'open-mutation-builder': [id: string]
  'open-sql-editor': [id: string]  // ← 追加
  'edit': [id: string]
  'delete': [id: string]
}>()

// ハンドラー追加
const handleOpenSqlEditor = () => {
  emit('open-sql-editor', props.connection.id)
}
</script>

<template>
  <!-- 既存のカードUI... -->

  <div class="flex gap-2 mt-4">
    <UButton
      icon="i-heroicons-table-cells"
      label="クエリビルダー"
      @click="emit('open-query-builder', connection.id)"
    />
    <UButton
      icon="i-heroicons-pencil-square"
      label="ミューテーション"
      @click="emit('open-mutation-builder', connection.id)"
    />
    <UButton
      icon="i-heroicons-code-bracket"
      label="エディタ"
      @click="handleOpenSqlEditor"
    />
  </div>
</template>
```

#### ランチャー更新 (`app/pages/index.vue`)

```vue
<script setup lang="ts">
import { windowApi } from '~/api/window'
import { useConnectionStore } from '~/stores/connection'

const connectionStore = useConnectionStore()

// 既存のハンドラー...

// SQLエディタ起動ハンドラー（新規追加）
const handleOpenSqlEditor = async (connectionId: string) => {
  try {
    const connection = await connectionStore.getConnection(connectionId)
    if (!connection) {
      throw new Error('接続が見つかりません')
    }

    await windowApi.openSqlEditor(
      connection.id,
      connection.name,
      connection.environment
    )
  } catch (error) {
    console.error('SQLエディタウィンドウの起動に失敗しました:', error)
    // エラートースト表示（既存パターン）
    toast.add({
      title: 'エラー',
      description: 'SQLエディタウィンドウの起動に失敗しました',
      color: 'red'
    })
  }
}
</script>

<template>
  <div>
    <!-- 既存のランチャーUI... -->

    <ConnectionCard
      v-for="connection in connections"
      :key="connection.id"
      :connection="connection"
      @open-query-builder="handleOpenQueryBuilder"
      @open-mutation-builder="handleOpenMutationBuilder"
      @open-sql-editor="handleOpenSqlEditor"
      @edit="handleEdit"
      @delete="handleDelete"
    />
  </div>
</template>
```

## テストコード

### ユニットテスト例（フロントエンド）

```typescript
// app/api/window.test.ts
import { describe, it, expect, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { windowApi } from './window'

vi.mock('@tauri-apps/api/core')

describe('windowApi.openSqlEditor', () => {
  it('should invoke open_sql_editor_window command', async () => {
    const mockWindowInfo = {
      label: 'sql_editor_test-123',
      title: '[開発] TestDB - SQLエディタ',
      windowType: 'sql_editor',
      connectionId: 'test-123',
      focused: true,
      visible: true,
    }

    vi.mocked(invoke).mockResolvedValue(mockWindowInfo)

    const result = await windowApi.openSqlEditor(
      'test-123',
      'TestDB',
      'development'
    )

    expect(invoke).toHaveBeenCalledWith('open_sql_editor_window', {
      connectionId: 'test-123',
      connectionName: 'TestDB',
      environment: 'development',
    })
    expect(result).toEqual(mockWindowInfo)
  })

  it('should handle errors', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Failed to open window'))

    await expect(
      windowApi.openSqlEditor('test-123', 'TestDB', 'development')
    ).rejects.toThrow('Failed to open window')
  })
})
```

### Rustテスト例

```rust
// src-tauri/src/services/window_manager.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_label_format() {
        let connection_id = "test-uuid-123";
        let expected = "sql_editor_test-uuid-123";
        let actual = format!("sql_editor_{}", connection_id);
        assert_eq!(actual, expected);
    }

    #[test]
    fn test_window_title_format_development() {
        let connection_name = "PostgreSQL開発";
        let environment = "development";
        let expected = "[development] PostgreSQL開発 - SQLエディタ";
        let actual = format!("[{}] {} - SQLエディタ", environment, connection_name);
        assert_eq!(actual, expected);
    }

    #[test]
    fn test_window_title_format_production() {
        let connection_name = "PostgreSQL本番";
        let environment = "production";
        let expected = "[本番] PostgreSQL本番 - SQLエディタ ⚠️";
        let actual = format!("[本番] {} - SQLエディタ ⚠️", connection_name);
        assert_eq!(actual, expected);
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| ウィンドウラベル形式を `sql_editor_{connection_id}` とする | 既存の `query_builder_{connection_id}` パターンと一貫性を保つ | `editor_{connection_id}` - より短いが、将来的に他のエディタタイプが追加された場合に曖昧 |
| Phase 1では空ページのみ表示 | エディタライブラリ（CodeMirror等）の統合は時間がかかるため、段階的に実装 | Phase 1でエディタUIまで実装 - スコープが大きくなりすぎる |
| ウィンドウサイズを `1280x900`（最小 `1024x768`）とする | クエリビルダーと同じサイズで、エディタとして十分な作業領域を確保 | より大きいサイズ（1920x1080等） - ユーザーの画面サイズによっては大きすぎる |
| 接続ごとに1ウィンドウまで許可 | 同一接続で複数エディタを開くと接続プール管理が複雑化 | 接続ごとに複数ウィンドウ許可 - タブ機能（Phase 6）で対応予定 |
| 環境ヘッダーを表示 | 既存のクエリビルダーと同じ安全機能を継承 | ヘッダーなし - 環境識別が困難で誤操作リスク増 |

## 未解決事項

- [x] エディタライブラリの選定（Phase 2で検討） - CodeMirror 6を推奨（WBS記載済み）
- [x] クエリ実行機能の設計（Phase 3で検討）
- [x] 保存・履歴機能の設計（Phase 4-5で検討）
- [ ] タブ機能の実装方法（Phase 6で検討） - 複数クエリを同一ウィンドウで編集する場合の状態管理

## Phase 2以降への橋渡し

Phase 1完了後、以下の拡張を段階的に実装：

1. **Phase 2: エディタUI基本構築**
   - `app/components/sql-editor/` 配下にコンポーネント追加
   - CodeMirror 6の統合
   - 構文ハイライト・行番号表示

2. **Phase 3: クエリ実行機能**
   - 既存の `app/api/query.ts` を流用
   - 結果パネルコンポーネントの追加
   - エラー表示機能

3. **Phase 4以降**
   - クエリ保存・履歴機能
   - UX改善（フォーマット、検索・置換等）
