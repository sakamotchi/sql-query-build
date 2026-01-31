# 設計書 - SQLエディタ画面の多言語対応

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
    ↓ useI18n()
i18n Plugin (@nuxtjs/i18n)
    ↓
Locale Files (ja.json / en.json)
```

### 影響範囲

- **フロントエンド**:
  - `app/components/sql-editor/` 配下の全Vueコンポーネント
  - `i18n/locales/ja.json` - 日本語翻訳追加
  - `i18n/locales/en.json` - 英語翻訳追加
- **バックエンド**: 影響なし（Rust側のエラーメッセージは別途対応が必要な場合があるが、今回は対象外）

## 実装方針

### 概要

1. **ロケールファイルへの翻訳キー追加**: 既存の `queryBuilder` や `mutationBuilder` セクションの構造を参考に、`sqlEditor` セクションを追加
2. **コンポーネントの修正**: 各コンポーネントで `useI18n()` を使用し、ハードコード文字列を `$t()` または `t()` に置き換え
3. **動的な文字列処理**: 相対時刻表示などの動的な文字列も多言語対応

### 詳細

#### 1. ロケールファイルの構造設計

既存の `queryBuilder` セクションと同じ階層構造を採用します：

```
sqlEditor/
├── toolbar/           # ツールバー関連
│   ├── execute
│   ├── stop
│   ├── format
│   ├── save
│   ├── togglePanel
│   └── updateDialog/
├── layout/            # レイアウト関連
│   ├── savedPanelTitle
│   └── historyPanelTitle
├── savedPanel/        # 保存クエリパネル
│   ├── search
│   ├── contextMenu/
│   ├── toasts/
│   └── dialogs/
├── historyPanel/      # 履歴パネル
│   ├── search
│   ├── filter
│   ├── status/
│   └── toasts/
├── resultPanel/       # 結果パネル
│   ├── title
│   ├── executionTime
│   ├── rowCount
│   └── export
├── saveDialog/        # 保存ダイアログ
│   ├── title
│   ├── fields/
│   ├── validation/
│   └── toasts/
└── common/            # 共通メッセージ
    └── ...
```

#### 2. 翻訳キーの命名規則

- **キー名**: キャメルケース（例: `executionTime`, `rowCount`）
- **階層**: ドット区切り（例: `sqlEditor.toolbar.execute`）
- **複数形**: 必要に応じて配列またはオブジェクト（例: `toasts.loadSuccess`）

#### 3. コンポーネント修正パターン

各コンポーネントで以下のパターンを適用します：

##### パターン1: 単純な文字列置き換え

```vue
<!-- Before -->
<span>保存クエリ</span>

<!-- After -->
<span>{{ $t('sqlEditor.layout.savedPanelTitle') }}</span>
```

##### パターン2: 動的な値を含む文字列

```vue
<!-- Before -->
<span>実行時間: {{ executionInfo.seconds }}秒</span>

<!-- After -->
<span>{{ $t('sqlEditor.resultPanel.executionTime', { seconds: executionInfo.seconds }) }}</span>
```

ロケールファイル:
```json
{
  "sqlEditor": {
    "resultPanel": {
      "executionTime": "実行時間: {seconds}秒"
    }
  }
}
```

##### パターン3: ボタンラベルと属性

```vue
<!-- Before -->
<UButton label="実行" />

<!-- After -->
<UButton :label="$t('sqlEditor.toolbar.execute')" />
```

##### パターン4: トースト通知

```vue
// Before
toast.add({
  title: 'クエリを更新しました',
  color: 'success',
})

// After
toast.add({
  title: t('sqlEditor.toolbar.updateDialog.toasts.updateSuccess'),
  color: 'success',
})
```

##### パターン5: 相対時刻表示（動的処理が必要）

```typescript
// Before
const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 60_000) return '数秒前'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}分前`
  // ...
}

// After
const { t, locale } = useI18n()

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 60_000) return t('sqlEditor.historyPanel.relativeTime.fewSecondsAgo')
  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000)
    return t('sqlEditor.historyPanel.relativeTime.minutesAgo', { minutes })
  }
  // ...

  // ロケールに応じた日付フォーマット
  return date.toLocaleString(locale.value === 'ja' ? 'ja-JP' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
```

## データ構造

### 翻訳キー構造（ja.json / en.json）

```typescript
interface SqlEditorI18n {
  toolbar: {
    execute: string
    stop: string
    format: string
    save: string
    togglePanel: {
      show: string
      hide: string
    }
    updateDialog: {
      title: string
      description: string
      actions: {
        cancel: string
        saveAsNew: string
        update: string
      }
      toasts: {
        updateSuccess: string
        updateFailed: string
      }
    }
  }
  layout: {
    savedPanelTitle: string
    historyPanelTitle: string
  }
  savedPanel: {
    search: string
    newFolder: string
    tagFilter: string
    currentQuery: string
    contextMenu: {
      folder: {
        newFolder: string
        rename: string
        delete: string
        expandAll: string
        collapseAll: string
      }
      query: {
        load: string
        execute: string
        edit: string
        move: string
        moveToRoot: string
        delete: string
      }
    }
    toasts: {
      loadSuccess: string
      loadFailed: string
      executeFailed: string
      deleteSuccess: string
      deleteFailed: string
      moveSuccess: string
      moveFailed: string
      createFolderSuccess: string
      createFolderFailed: string
      renameFolderSuccess: string
      renameFolderFailed: string
      deleteFolderSuccess: string
      deleteFolderFailed: string
      folderNotEmpty: string
      folderDuplicate: string
    }
    dialogs: {
      confirmLoad: {
        title: string
        description: string
        confirmLabel: string
      }
      deleteQuery: {
        title: string
        description: string
        confirmLabel: string
      }
      deleteFolder: {
        title: string
        description: string
        confirmLabel: string
      }
    }
  }
  historyPanel: {
    search: string
    filterSuccessOnly: string
    empty: string
    status: {
      success: string
      failure: string
    }
    relativeTime: {
      fewSecondsAgo: string
      minutesAgo: string
      today: string
    }
    toasts: {
      loadSuccess: string
      loadFailed: string
      reExecuteStart: string
      reExecuteSuccess: string
      reExecuteFailed: string
      deleteSuccess: string
      deleteFailed: string
    }
    dialogs: {
      confirmLoad: {
        title: string
        description: string
        confirmLabel: string
      }
      deleteHistory: {
        title: string
        description: string
        confirmLabel: string
      }
    }
  }
  resultPanel: {
    title: string
    executionTime: string
    rowCount: {
      select: string
      mutation: string
    }
    export: string
    executing: string
    executePrompt: string
    errorPosition: string
  }
  saveDialog: {
    title: {
      create: string
      edit: string
    }
    description: {
      create: string
      edit: string
    }
    fields: {
      queryName: {
        label: string
        placeholder: string
      }
      description: {
        label: string
        placeholder: string
        hint: string
      }
      tags: {
        label: string
        placeholder: string
        hint: string
      }
      folder: {
        label: string
        hint: string
        rootOption: string
        searchPlaceholder: string
      }
    }
    validation: {
      nameRequired: string
      nameLength: string
      descriptionLength: string
    }
    actions: {
      cancel: string
      save: string
    }
    toasts: {
      noConnection: string
      noConnectionDesc: string
      sqlEmpty: string
      sqlEmptyDesc: string
      saveSuccess: string
      saveFailed: string
      updateSuccess: string
      updateFailed: string
    }
  }
  tabs: {
    // EditorTabs.vue の翻訳キー（必要に応じて追加）
  }
}
```

## 翻訳キーの詳細定義

### ja.json への追加内容

```json
{
  "sqlEditor": {
    "toolbar": {
      "execute": "実行",
      "stop": "停止",
      "format": "整形",
      "save": "保存",
      "togglePanel": {
        "show": "パネルを表示",
        "hide": "パネルを非表示"
      },
      "updateDialog": {
        "title": "クエリを更新しますか?",
        "description": "保存済みのクエリを更新するか、新しいクエリとして保存するか選択してください",
        "currentQuery": "現在のクエリ: {name}",
        "currentQueryDesc": "このクエリの内容を上書き更新します",
        "actions": {
          "cancel": "キャンセル",
          "saveAsNew": "新規保存",
          "update": "更新"
        },
        "toasts": {
          "updateSuccess": "クエリを更新しました",
          "updateFailed": "クエリの更新に失敗しました"
        }
      }
    },
    "layout": {
      "savedPanelTitle": "保存クエリ",
      "historyPanelTitle": "実行履歴"
    },
    "savedPanel": {
      "search": "クエリを検索...",
      "newFolder": "新規フォルダ",
      "tagFilter": "タグフィルタ:",
      "currentQuery": "読み込み中のクエリ",
      "contextMenu": {
        "folder": {
          "newFolder": "新規フォルダ",
          "rename": "名前変更",
          "delete": "削除",
          "expandAll": "すべて展開",
          "collapseAll": "すべて折りたたみ"
        },
        "query": {
          "load": "読み込み",
          "execute": "実行",
          "edit": "編集",
          "move": "移動",
          "moveToRoot": "ルートに移動",
          "delete": "削除"
        }
      },
      "toasts": {
        "loadSuccess": "「{name}」を読み込みました",
        "loadFailed": "クエリの読み込みに失敗しました",
        "loadFailedDesc": "時間をおいて再度お試しください",
        "executeFailed": "クエリの実行に失敗しました",
        "executeFailedDesc": "時間をおいて再度お試しください",
        "deleteSuccess": "クエリを削除しました",
        "deleteFailed": "クエリの削除に失敗しました",
        "moveSuccess": "クエリを移動しました",
        "moveFailed": "クエリの移動に失敗しました",
        "createFolderSuccess": "フォルダを作成しました",
        "createFolderFailed": "フォルダを作成できませんでした",
        "renameFolderSuccess": "フォルダ名を変更しました",
        "renameFolderFailed": "フォルダ名の変更に失敗しました",
        "deleteFolderSuccess": "フォルダを削除しました",
        "deleteFolderFailed": "フォルダの削除に失敗しました",
        "folderNotEmpty": "フォルダを削除できません",
        "folderNotEmptyDesc": "フォルダ内に{count}件のクエリが含まれています",
        "folderDuplicate": "フォルダ名が重複しています",
        "folderDuplicateDesc": "「{path}」は既に存在します"
      },
      "dialogs": {
        "confirmLoad": {
          "title": "未保存の変更があります",
          "description": "現在の編集内容は失われます。続行しますか?",
          "confirmLabel": "読み込み"
        },
        "deleteQuery": {
          "title": "保存クエリを削除しますか?",
          "description": "「{name}」は元に戻せません。",
          "confirmLabel": "削除"
        },
        "deleteFolder": {
          "title": "フォルダを削除しますか?",
          "description": "「{path}」を削除します。",
          "confirmLabel": "削除"
        }
      }
    },
    "historyPanel": {
      "search": "履歴を検索...",
      "filterSuccessOnly": "成功のみ表示",
      "empty": "履歴がありません",
      "status": {
        "success": "成功",
        "failure": "失敗"
      },
      "relativeTime": {
        "fewSecondsAgo": "数秒前",
        "minutesAgo": "{minutes}分前",
        "today": "今日 {time}"
      },
      "executionTime": "{ms}ms",
      "executionTimeSeconds": "{seconds}秒",
      "toasts": {
        "loadSuccess": "履歴を読み込みました",
        "loadFailed": "履歴の読み込みに失敗しました",
        "reExecuteStart": "履歴を再実行しています",
        "reExecuteSuccess": "履歴を再実行しました",
        "reExecuteFailed": "履歴の再実行に失敗しました",
        "deleteSuccess": "履歴を削除しました",
        "deleteFailed": "履歴の削除に失敗しました"
      },
      "dialogs": {
        "confirmLoad": {
          "title": "未保存の変更があります",
          "description": "現在の編集内容は失われます。続行しますか?",
          "confirmLabel": "読み込み"
        },
        "deleteHistory": {
          "title": "履歴を削除しますか?",
          "description": "この履歴は元に戻せません。",
          "confirmLabel": "削除"
        }
      }
    },
    "resultPanel": {
      "title": "結果",
      "executionTime": "実行時間: {seconds}秒",
      "rowCount": {
        "select": "取得件数: {count}件",
        "mutation": "影響行数: {count}行"
      },
      "export": "エクスポート",
      "executing": "実行中...",
      "executePrompt": "クエリを実行してください",
      "errorPosition": "エラー位置: {line}行 {column}列",
      "errorPositionLine": "エラー位置: {line}行"
    },
    "saveDialog": {
      "title": {
        "create": "クエリを保存",
        "edit": "保存クエリを編集"
      },
      "description": {
        "create": "名前・説明・タグを入力してください",
        "edit": "SQL本文は変更できません"
      },
      "fields": {
        "queryName": {
          "label": "クエリ名",
          "placeholder": "例: 全ユーザー一覧"
        },
        "description": {
          "label": "説明",
          "placeholder": "このクエリの用途を説明...",
          "hint": "任意"
        },
        "tags": {
          "label": "タグ",
          "placeholder": "例: admin, report",
          "hint": "カンマ区切りで入力"
        },
        "folder": {
          "label": "保存先フォルダ",
          "hint": "任意",
          "rootOption": "ルート(フォルダなし)",
          "searchPlaceholder": "フォルダを検索..."
        }
      },
      "validation": {
        "nameRequired": "クエリ名は必須です",
        "nameLength": "クエリ名は100文字以内で入力してください",
        "descriptionLength": "説明は500文字以内で入力してください"
      },
      "actions": {
        "cancel": "キャンセル",
        "save": "保存"
      },
      "toasts": {
        "noConnection": "接続情報が見つかりません",
        "noConnectionDesc": "接続を選択してから保存してください",
        "sqlEmpty": "SQLが空です",
        "sqlEmptyDesc": "保存するSQLを入力してください",
        "saveSuccess": "クエリを保存しました",
        "saveFailed": "クエリの保存に失敗しました",
        "saveFailedDesc": "入力内容を確認してください",
        "updateSuccess": "クエリ情報を更新しました",
        "updateFailed": "クエリ情報の更新に失敗しました"
      }
    }
  }
}
```

### en.json への追加内容

```json
{
  "sqlEditor": {
    "toolbar": {
      "execute": "Execute",
      "stop": "Stop",
      "format": "Format",
      "save": "Save",
      "togglePanel": {
        "show": "Show Panel",
        "hide": "Hide Panel"
      },
      "updateDialog": {
        "title": "Update Query?",
        "description": "Choose whether to update the saved query or save as a new query",
        "currentQuery": "Current Query: {name}",
        "currentQueryDesc": "This will overwrite the query",
        "actions": {
          "cancel": "Cancel",
          "saveAsNew": "Save as New",
          "update": "Update"
        },
        "toasts": {
          "updateSuccess": "Query updated successfully",
          "updateFailed": "Failed to update query"
        }
      }
    },
    "layout": {
      "savedPanelTitle": "Saved Queries",
      "historyPanelTitle": "Execution History"
    },
    "savedPanel": {
      "search": "Search queries...",
      "newFolder": "New Folder",
      "tagFilter": "Tag Filter:",
      "currentQuery": "Current Query",
      "contextMenu": {
        "folder": {
          "newFolder": "New Folder",
          "rename": "Rename",
          "delete": "Delete",
          "expandAll": "Expand All",
          "collapseAll": "Collapse All"
        },
        "query": {
          "load": "Load",
          "execute": "Execute",
          "edit": "Edit",
          "move": "Move",
          "moveToRoot": "Move to Root",
          "delete": "Delete"
        }
      },
      "toasts": {
        "loadSuccess": "Loaded \"{name}\"",
        "loadFailed": "Failed to load query",
        "loadFailedDesc": "Please try again later",
        "executeFailed": "Failed to execute query",
        "executeFailedDesc": "Please try again later",
        "deleteSuccess": "Query deleted successfully",
        "deleteFailed": "Failed to delete query",
        "moveSuccess": "Query moved successfully",
        "moveFailed": "Failed to move query",
        "createFolderSuccess": "Folder created successfully",
        "createFolderFailed": "Failed to create folder",
        "renameFolderSuccess": "Folder renamed successfully",
        "renameFolderFailed": "Failed to rename folder",
        "deleteFolderSuccess": "Folder deleted successfully",
        "deleteFolderFailed": "Failed to delete folder",
        "folderNotEmpty": "Cannot delete folder",
        "folderNotEmptyDesc": "Folder contains {count} queries",
        "folderDuplicate": "Folder name already exists",
        "folderDuplicateDesc": "\"{path}\" already exists"
      },
      "dialogs": {
        "confirmLoad": {
          "title": "Unsaved Changes",
          "description": "Your current changes will be lost. Continue?",
          "confirmLabel": "Load"
        },
        "deleteQuery": {
          "title": "Delete Query?",
          "description": "\"{name}\" cannot be recovered.",
          "confirmLabel": "Delete"
        },
        "deleteFolder": {
          "title": "Delete Folder?",
          "description": "Delete \"{path}\".",
          "confirmLabel": "Delete"
        }
      }
    },
    "historyPanel": {
      "search": "Search history...",
      "filterSuccessOnly": "Success only",
      "empty": "No history",
      "status": {
        "success": "Success",
        "failure": "Failure"
      },
      "relativeTime": {
        "fewSecondsAgo": "A few seconds ago",
        "minutesAgo": "{minutes} min ago",
        "today": "Today {time}"
      },
      "executionTime": "{ms}ms",
      "executionTimeSeconds": "{seconds}s",
      "toasts": {
        "loadSuccess": "History loaded successfully",
        "loadFailed": "Failed to load history",
        "reExecuteStart": "Re-executing history",
        "reExecuteSuccess": "History re-executed successfully",
        "reExecuteFailed": "Failed to re-execute history",
        "deleteSuccess": "History deleted successfully",
        "deleteFailed": "Failed to delete history"
      },
      "dialogs": {
        "confirmLoad": {
          "title": "Unsaved Changes",
          "description": "Your current changes will be lost. Continue?",
          "confirmLabel": "Load"
        },
        "deleteHistory": {
          "title": "Delete History?",
          "description": "This history cannot be recovered.",
          "confirmLabel": "Delete"
        }
      }
    },
    "resultPanel": {
      "title": "Result",
      "executionTime": "Execution Time: {seconds}s",
      "rowCount": {
        "select": "Rows: {count}",
        "mutation": "Affected Rows: {count}"
      },
      "export": "Export",
      "executing": "Executing...",
      "executePrompt": "Please execute a query",
      "errorPosition": "Error at line {line}, column {column}",
      "errorPositionLine": "Error at line {line}"
    },
    "saveDialog": {
      "title": {
        "create": "Save Query",
        "edit": "Edit Saved Query"
      },
      "description": {
        "create": "Enter name, description, and tags",
        "edit": "SQL content cannot be changed"
      },
      "fields": {
        "queryName": {
          "label": "Query Name",
          "placeholder": "Ex: Get All Users"
        },
        "description": {
          "label": "Description",
          "placeholder": "Describe the purpose of this query...",
          "hint": "Optional"
        },
        "tags": {
          "label": "Tags",
          "placeholder": "Ex: admin, report",
          "hint": "Comma-separated"
        },
        "folder": {
          "label": "Folder",
          "hint": "Optional",
          "rootOption": "Root (No folder)",
          "searchPlaceholder": "Search folders..."
        }
      },
      "validation": {
        "nameRequired": "Query name is required",
        "nameLength": "Query name must be within 100 characters",
        "descriptionLength": "Description must be within 500 characters"
      },
      "actions": {
        "cancel": "Cancel",
        "save": "Save"
      },
      "toasts": {
        "noConnection": "Connection not found",
        "noConnectionDesc": "Please select a connection before saving",
        "sqlEmpty": "SQL is empty",
        "sqlEmptyDesc": "Please enter SQL to save",
        "saveSuccess": "Query saved successfully",
        "saveFailed": "Failed to save query",
        "saveFailedDesc": "Please check your input",
        "updateSuccess": "Query information updated successfully",
        "updateFailed": "Failed to update query information"
      }
    }
  }
}
```

## 実装詳細

### 修正対象コンポーネント一覧

| コンポーネント | ハードコード文字列数（概算） | 優先度 |
|--------------|------------------------|--------|
| SqlEditorToolbar.vue | 15箇所 | 高 |
| SqlEditorSavedPanel.vue | 40箇所以上 | 高 |
| SqlEditorHistoryPanel.vue | 20箇所以上 | 高 |
| SqlEditorSaveDialog.vue | 15箇所 | 高 |
| SqlEditorResultPanel.vue | 10箇所 | 中 |
| SqlEditorLayout.vue | 2箇所 | 中 |
| EditorTabs.vue | 調査中 | 低 |

### コンポーネント別実装方針

#### 1. SqlEditorToolbar.vue

**修正箇所**:
- ボタンラベル: `label="実行"` → `:label="$t('sqlEditor.toolbar.execute')"`
- ツールチップ: `title="パネルを非表示"` → `:title="isLeftPanelVisible ? $t('sqlEditor.toolbar.togglePanel.hide') : $t('sqlEditor.toolbar.togglePanel.show')"`
- ダイアログタイトル: `title="クエリを更新しますか?"` → `:title="$t('sqlEditor.toolbar.updateDialog.title')"`
- トースト: `title: 'クエリを更新しました'` → `title: t('sqlEditor.toolbar.updateDialog.toasts.updateSuccess')`

**注意事項**:
- `<script setup>` で `const { t } = useI18n()` を追加
- トースト内では `$t()` ではなく `t()` を使用

#### 2. SqlEditorSavedPanel.vue

**修正箇所**:
- プレースホルダー: `placeholder="クエリを検索..."` → `:placeholder="$t('sqlEditor.savedPanel.search')"`
- コンテキストメニュー項目: 文字列を全て翻訳キーに置き換え
- トースト通知: 全てのメッセージを翻訳キーに置き換え
- ダイアログ: タイトル、説明、ボタンラベルを翻訳キーに置き換え

**注意事項**:
- 動的な値（クエリ名、パス等）は `{name}`, `{path}` などのプレースホルダーを使用
- 例: `t('sqlEditor.savedPanel.toasts.loadSuccess', { name: query.name })`

#### 3. SqlEditorHistoryPanel.vue

**修正箇所**:
- 相対時刻表示の関数を多言語対応
- ステータス表示（成功/失敗）を翻訳キーに置き換え
- 日付フォーマットを `locale.value` に応じて切り替え

**相対時刻表示の実装例**:

```typescript
const { t, locale } = useI18n()

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 60_000) return t('sqlEditor.historyPanel.relativeTime.fewSecondsAgo')
  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000)
    return t('sqlEditor.historyPanel.relativeTime.minutesAgo', { minutes })
  }

  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    const time = date.toLocaleTimeString(locale.value === 'ja' ? 'ja-JP' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return t('sqlEditor.historyPanel.relativeTime.today', { time })
  }

  return date.toLocaleString(locale.value === 'ja' ? 'ja-JP' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
```

#### 4. SqlEditorSaveDialog.vue

**修正箇所**:
- ダイアログタイトル: `isEditMode` に応じた条件分岐
- フォームラベル: 全てのラベル、プレースホルダー、ヒントを翻訳キーに置き換え
- バリデーションエラー: エラーメッセージを翻訳キーに置き換え

**バリデーション実装例**:

```typescript
const { t } = useI18n()

const validate = (formState: typeof state.value): FormError[] => {
  const errors: FormError[] = []

  if (!formState.name || formState.name.trim().length === 0) {
    errors.push({
      path: 'name',
      message: t('sqlEditor.saveDialog.validation.nameRequired'),
    })
  } else if (formState.name.length > 100) {
    errors.push({
      path: 'name',
      message: t('sqlEditor.saveDialog.validation.nameLength'),
    })
  }

  // ...

  return errors
}
```

#### 5. SqlEditorResultPanel.vue

**修正箇所**:
- パネルタイトル、ステータスメッセージ
- 実行時間、行数表示（SELECT/Mutation で異なるメッセージ）
- エラーメッセージ表示

**条件分岐の実装例**:

```vue
<template v-if="isSelectResult">
  {{ $t('sqlEditor.resultPanel.rowCount.select', { count: executionInfo.rowCount }) }}
</template>
<template v-else>
  {{ $t('sqlEditor.resultPanel.rowCount.mutation', { count: executionInfo.rowCount }) }}
</template>
```

#### 6. SqlEditorLayout.vue

**修正箇所**:
- 保存クエリパネルタイトル
- 実行履歴パネルタイトル

これは最も単純な修正です。

## テストコード

### ユニットテスト例（コンポーネント）

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SqlEditorToolbar from '~/components/sql-editor/SqlEditorToolbar.vue'

describe('SqlEditorToolbar - i18n', () => {
  let i18n: ReturnType<typeof createI18n>

  beforeEach(() => {
    i18n = createI18n({
      legacy: false,
      locale: 'ja',
      messages: {
        ja: {
          sqlEditor: {
            toolbar: {
              execute: '実行',
              stop: '停止',
            },
          },
        },
        en: {
          sqlEditor: {
            toolbar: {
              execute: 'Execute',
              stop: 'Stop',
            },
          },
        },
      },
    })
  })

  it('日本語で表示される', () => {
    const wrapper = mount(SqlEditorToolbar, {
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toContain('実行')
    expect(wrapper.text()).toContain('停止')
  })

  it('英語に切り替えると英語で表示される', async () => {
    i18n.global.locale.value = 'en'

    const wrapper = mount(SqlEditorToolbar, {
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toContain('Execute')
    expect(wrapper.text()).toContain('Stop')
  })
})
```

### 相対時刻表示のテスト例

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useI18n } from 'vue-i18n'

// モック設定
vi.mock('vue-i18n', () => ({
  useI18n: vi.fn(),
}))

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.mocked(useI18n).mockReturnValue({
      t: (key: string, params?: Record<string, any>) => {
        const translations: Record<string, string> = {
          'sqlEditor.historyPanel.relativeTime.fewSecondsAgo': '数秒前',
          'sqlEditor.historyPanel.relativeTime.minutesAgo': `${params?.minutes}分前`,
        }
        return translations[key] || key
      },
      locale: { value: 'ja' },
    } as any)
  })

  it('1分以内の場合は「数秒前」と表示される', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 30_000) // 30秒前

    const result = formatRelativeTime(date.toISOString())

    expect(result).toBe('数秒前')
  })

  it('5分前の場合は「5分前」と表示される', () => {
    const now = new Date()
    const date = new Date(now.getTime() - 300_000) // 5分前

    const result = formatRelativeTime(date.toISOString())

    expect(result).toBe('5分前')
  })
})
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| 既存の `queryBuilder` セクションと同じ階層構造を採用 | プロジェクト全体の一貫性を保つため | フラットな構造（すべてのキーを `sqlEditor.xxx` で管理） |
| 相対時刻表示も翻訳キーで管理 | 各言語の自然な表現を提供するため | 日付のみローカライズし、「前」などの文言は固定 |
| トースト通知は `toasts/` サブセクションで管理 | 他のセクションと同じパターンに従う | 各機能の直下に配置（例: `savedPanel.loadSuccess`） |
| ダイアログの文言は `dialogs/` サブセクションで管理 | 他のセクションと同じパターンに従う | モーダルごとに独立したセクションを作成 |
| バリデーションエラーは `validation/` サブセクションで管理 | 既存の `saveQueryDialog` パターンに従う | `errors/` という名前にする |

## 未解決事項

- [ ] EditorTabs.vue の詳細な調査（ハードコード文字列の有無を確認）
- [ ] その他のダイアログコンポーネント（CreateFolderDialog.vue, RenameFolderDialog.vue等）の多言語対応
- [ ] Monaco Editor 自体の UI は外部ライブラリのため対応不可（確認済み）
- [ ] バックエンドから返されるエラーメッセージの多言語対応（Phase 2で検討）

## 実装の順序

1. **ロケールファイルへの翻訳キー追加** (ja.json, en.json)
2. **シンプルなコンポーネントから修正**:
   - SqlEditorLayout.vue（2箇所のみ）
   - SqlEditorResultPanel.vue（比較的少ない）
3. **複雑なコンポーネントの修正**:
   - SqlEditorToolbar.vue
   - SqlEditorSaveDialog.vue
4. **最も複雑なコンポーネントの修正**:
   - SqlEditorSavedPanel.vue（最も多い）
   - SqlEditorHistoryPanel.vue（相対時刻表示の実装が必要）
5. **動作確認とテスト**
6. **ドキュメント更新**

この順序により、シンプルなものから始めて段階的に複雑なものに取り組むことができます。
