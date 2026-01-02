# 設計書 - UPDATEビルダー

## アーキテクチャ

### 対象コンポーネント

```
Frontend (Vue/Nuxt)
  ├─ UpdatePanel.vue (上パネル)
  │   ├─ UTabs (SET / WHERE)
  │   ├─ SetTab.vue (SET句設定)
  │   │   ├─ カラム選択
  │   │   ├─ 値入力フォーム
  │   │   └─ カラム追加・削除
  │   └─ MutationWhereTab.vue (WHERE条件設定、再利用)
  ├─ mutation-builderストア
  │   ├─ UpdateQueryModel管理
  │   └─ SQL生成・実行制御
  └─ Tauri API (invoke)
      ↓
Rust Backend
  ├─ mutation.rs (SQL生成)
  │   └─ generate_update_sql()
  └─ mutation_commands.rs (Tauriコマンド)
      └─ execute_mutation()
          ↓
Database (PostgreSQL/MySQL/SQLite)
```

### 影響範囲

- **フロントエンド**:
  - 新規: `app/components/mutation-builder/UpdatePanel.vue`
  - 新規: `app/components/mutation-builder/SetTab.vue`
  - 再利用: `app/components/mutation-builder/MutationWhereTab.vue`（既存、必要に応じて拡張）
  - 拡張: `app/stores/mutation-builder.ts`（UPDATE関連のアクション追加）
  - 拡張: `app/types/mutation-query.ts`（UpdateQueryModel追加）

- **バックエンド**:
  - 拡張: `src-tauri/src/query/mutation.rs`（UPDATE SQL生成エンジン追加）
  - 拡張: `src-tauri/src/commands/mutation_commands.rs`（UPDATEコマンド追加）

## 実装方針

### 概要

1. **Phase 8.2（INSERTビルダー）の基盤を活用**: InsertPanelと同様のレイアウト・パターンを踏襲
2. **UpdatePanel.vueの実装**: 上パネルにUPDATE専用の入力UIを実装（タブ構成: SET / WHERE）
3. **MutationWhereTab.vueの再利用**: SELECTビルダーで実装済みのWhereTab構成を流用
4. **Rust側SQL生成**: データベース方言に応じたUPDATE文を生成
5. **WHERE句なし警告**: 全行更新の危険性を強調表示
6. **既存機能との統合**: クエリ保存・履歴、安全機能と連携

### 詳細

1. **UpdatePanel.vueの責務**:
   - テーブル選択UI（TableSelectorコンポーネント再利用）
   - タブ切り替え（SET / WHERE）
   - SetTabとMutationWhereTabのコンテナとして機能
   - mutation-builderストアとの連携

2. **SetTab.vueの責務**:
   - 更新対象カラムの選択（ドロップダウン or チェックボックス）
   - 各カラムの値入力フォーム（型に応じた入力コンポーネント）
   - カラムの追加・削除
   - NULL設定

3. **MutationWhereTab.vueの再利用**:
   - SELECTビルダーで実装済みのWhereTab構成をそのまま再利用
   - mutation-builderストアとの連携部分のみ調整
   - WHERE条件の構築ロジックは変更不要

4. **mutation-builderストアの拡張**:
   - `updateSetClause()`アクション: SET句の更新
   - `updateWhereClause()`アクション: WHERE句の更新
   - `generateUpdateSql()`アクション: Rust側のSQL生成コマンド呼び出し
   - `checkWhereClause()`ゲッター: WHERE句の有無を判定

5. **Rust側SQL生成**:
   - `generate_update_sql()`関数: UpdateQueryModelからUPDATE文を生成
   - データベース方言対応（PostgreSQL/MySQL/SQLite）
   - エスケープ処理（SQLインジェクション対策）

6. **WHERE句なし警告**:
   - WHERE句が空の場合、赤色の警告バナーを表示
   - SQLプレビューにも警告コメントを追加
   - DangerousQueryDialogで確認を求める

## データ構造

### 型定義（TypeScript）

#### UpdateQueryModel（新規）

```typescript
// app/types/mutation-query.ts
export interface UpdateQueryModel {
  type: 'UPDATE'
  table: string
  setClause: Record<string, {
    value: any
    isNull: boolean
  }>
  whereClause: WhereCondition[]
}

// WhereCondition は既存の型定義を再利用
export interface WhereCondition {
  column: string
  operator: string
  value: any
  logicalOperator?: 'AND' | 'OR'
}
```

#### SetColumnConfig（SetTab内部で使用）

```typescript
// SetTab.vue内部の型定義
interface SetColumnConfig {
  columnName: string
  dataType: string
  isNullable: boolean
  value: any
  isNull: boolean
}
```

### 型定義（Rust）

```rust
// src-tauri/src/query/mutation.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateQueryModel {
    #[serde(rename = "type")]
    pub query_type: String,  // "UPDATE"
    pub table: String,
    pub set_clause: serde_json::Value,  // Record<string, { value: any, isNull: boolean }>
    pub where_clause: Vec<WhereCondition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhereCondition {
    pub column: String,
    pub operator: String,
    pub value: serde_json::Value,
    pub logical_operator: Option<String>,  // "AND" or "OR"
}

#[derive(Debug, Clone)]
pub struct UpdateSqlResult {
    pub sql: String,
    pub has_where_clause: bool,
}
```

## API設計

### Tauriコマンド

| コマンド名 | 引数 | 戻り値 | 説明 |
|-----------|------|--------|------|
| `generate_update_sql` | `UpdateQueryModel`, `connection_id: String` | `Result<UpdateSqlResult, String>` | UPDATE文を生成（DB方言対応） |
| `execute_mutation` | `sql: String`, `connection_id: String` | `Result<MutationResult, String>` | UPDATE実行（既存） |

### SQL生成ロジック

```rust
// src-tauri/src/query/mutation.rs
pub fn generate_update_sql(
    model: &UpdateQueryModel,
    dialect: &DatabaseDialect,
) -> Result<UpdateSqlResult, String> {
    // 1. テーブル名のエスケープ
    let table_name = dialect.escape_identifier(&model.table);

    // 2. SET句の生成
    let set_clause_obj = model.set_clause.as_object()
        .ok_or("Invalid set_clause format")?;

    let set_items = set_clause_obj.iter()
        .map(|(column, config)| {
            let column_name = dialect.escape_identifier(column);
            let is_null = config.get("isNull")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            let value_str = if is_null {
                "NULL".to_string()
            } else {
                let value = config.get("value")
                    .ok_or("Missing value in set_clause")?;
                dialect.format_value(value)
            };

            Ok(format!("{} = {}", column_name, value_str))
        })
        .collect::<Result<Vec<_>, String>>()?
        .join(", ");

    // 3. WHERE句の生成
    let has_where_clause = !model.where_clause.is_empty();
    let where_clause = if has_where_clause {
        let conditions = model.where_clause.iter()
            .enumerate()
            .map(|(i, cond)| {
                let column = dialect.escape_identifier(&cond.column);
                let value = dialect.format_value(&cond.value);
                let condition = format!("{} {} {}", column, cond.operator, value);

                if i > 0 {
                    let op = cond.logical_operator.as_deref().unwrap_or("AND");
                    format!("{} {}", op, condition)
                } else {
                    condition
                }
            })
            .collect::<Vec<_>>()
            .join(" ");

        format!(" WHERE {}", conditions)
    } else {
        String::new()
    };

    // 4. UPDATE文の組み立て
    let sql = format!(
        "UPDATE {} SET {}{}",
        table_name, set_items, where_clause
    );

    Ok(UpdateSqlResult {
        sql,
        has_where_clause,
    })
}
```

## UI設計

### 画面構成

```
┌───────────────────────────────────────────────────────┐
│ [データ変更] [実行] [保存] [履歴]        <- Toolbar   │
├───────────────────────────────────────────────────────┤
│ テーブル: [▼ public.users 🔍]                         │ ← セレクトボックス（検索可）
├───────────────────────────────────────────────────────┤
│ ┌─ UPDATE設定 ────────────────────────────────────┐  │
│ │ [●SET] [WHERE]                    <- タブ切り替え│  │
│ ├─────────────────────────────────────────────────┤  │
│ │ ┌─ SET句 ────────────────────────────────────┐ │  │
│ │ │ 更新するカラム:                             │ │  │
│ │ │                                             │ │  │
│ │ │ ┌── カラム1 ─────────────────────[削除] ┐  │ │  │ ← 上パネル (60-70%)
│ │ │ │ name (VARCHAR)                         │  │ │  │   SET/WHEREタブ
│ │ │ │   [入力欄: Alice_______________] [ ] NULL│ │ │
│ │ │ └────────────────────────────────────────┘  │ │  │
│ │ │ ┌── カラム2 ─────────────────────[削除] ┐  │ │  │
│ │ │ │ email (VARCHAR)                        │  │ │  │
│ │ │ │   [入力欄: alice@example.com__] [ ] NULL│ │ │
│ │ │ └────────────────────────────────────────┘  │ │  │
│ │ │ [+ カラムを追加]                            │ │  │
│ │ └─────────────────────────────────────────────┘ │  │
│ └─────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────┤ ← リサイズ可能
│ ┌─ SQLプレビュー ─────────────────────────────────┐  │
│ │ ⚠️  警告: WHERE句がありません。全行が更新されます  │  │ ← 警告バナー（WHERE句なしの場合）
│ │                                                  │  │
│ │ UPDATE public.users                              │  │ ← 下パネル (30-40%)
│ │ SET name = 'Alice', email = 'alice@example.com'  │  │   SQLプレビュー
│ │                                                  │  │
│ │                                  [📋 コピー]      │  │
│ └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### WHEREタブの画面（MutationWhereTab.vue再利用）

```
┌─────────────────────────────────────────────────────┐
│ [SET] [●WHERE]                    <- タブ切り替え   │
├─────────────────────────────────────────────────────┤
│ ┌─ WHERE条件 ──────────────────────────────────┐  │
│ │ ┌── 条件1 ────────────────────────[削除] ┐   │  │
│ │ │ [▼ id      ] [▼ =  ] [入力: 1_____]     │   │  │
│ │ └─────────────────────────────────────────┘   │  │
│ │ [▼ AND]                                        │  │
│ │ ┌── 条件2 ────────────────────────[削除] ┐   │  │
│ │ │ [▼ is_active] [▼ = ] [✓] true           │   │  │
│ │ └─────────────────────────────────────────┘   │  │
│ │ [+ 条件を追加]                                 │  │
│ └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### コンポーネント構成

```
MutationBuilderLayout.vue (上下分割レイアウト)
  ├─ MutationBuilderToolbar.vue (ツールバー)
  │   └─ INSERT/UPDATE/DELETEタブ + 実行・保存・履歴ボタン
  │
  ├─ TableSelector.vue (テーブルセレクトボックス、既存)
  │
  ├─ 上パネル (flex-1、リサイズ可能)
  │   └─ UpdatePanel.vue (新規)
  │       └─ UTabs (SET / WHERE)
  │           ├─ SetTab.vue (新規)
  │           │   └─ SetColumnField.vue (v-for="column in setColumns")
  │           │       ├─ カラム名・型情報表示
  │           │       ├─ 型に応じた入力コンポーネント
  │           │       │   ├─ UInput（VARCHAR, INT等）
  │           │       │   ├─ UCheckbox（BOOLEAN）
  │           │       │   ├─ UTextarea（TEXT）
  │           │       │   └─ その他（将来拡張）
  │           │       ├─ NULLチェックボックス
  │           │       └─ 削除ボタン
  │           │
  │           └─ MutationWhereTab.vue (既存を再利用)
  │               └─ WhereConditionRow.vue (v-for="condition in whereConditions")
  │
  └─ 下パネル (固定高さまたはリサイズ可能)
      └─ SqlPreviewPanel.vue (既存)
          ├─ WHERE句なし警告バナー（条件付き表示）
          ├─ SQLシンタックスハイライト表示
          └─ [📋 コピー] ボタン
```

### コンポーネント詳細設計

#### UpdatePanel.vue

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import SetTab from './SetTab.vue'
import MutationWhereTab from './MutationWhereTab.vue'

const mutationStore = useMutationBuilderStore()

const activeTab = ref<'SET' | 'WHERE'>('SET')

const tabs = [
  { key: 'SET', label: 'SET' },
  { key: 'WHERE', label: 'WHERE' }
]
</script>

<template>
  <div class="update-panel">
    <UTabs v-model="activeTab" :items="tabs">
      <template #SET>
        <SetTab />
      </template>
      <template #WHERE>
        <MutationWhereTab />
      </template>
    </UTabs>
  </div>
</template>
```

#### SetTab.vue（新規コンポーネント）

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutationBuilderStore } from '@/stores/mutation-builder'
import { useDatabaseStructureStore } from '@/stores/database-structure'
import type { Column } from '@/types/database-structure'
import SetColumnField from './SetColumnField.vue'

const mutationStore = useMutationBuilderStore()
const dbStructureStore = useDatabaseStructureStore()

// 選択中のテーブルのカラム情報
const availableColumns = computed<Column[]>(() => {
  if (!mutationStore.selectedTable) return []
  return dbStructureStore.getTableColumns(mutationStore.selectedTable)
})

// SET句に追加されたカラム
const setColumns = ref<Array<{
  id: string
  column: Column
  value: any
  isNull: boolean
}>>([])

// カラム追加用のドロップダウン選択肢
const columnsForAdd = computed(() => {
  const usedColumnNames = setColumns.value.map(sc => sc.column.name)
  return availableColumns.value.filter(col => !usedColumnNames.includes(col.name))
})

function addColumn(column: Column) {
  setColumns.value.push({
    id: crypto.randomUUID(),
    column,
    value: getDefaultValue(column),
    isNull: false
  })
  updateQueryModel()
}

function removeColumn(id: string) {
  setColumns.value = setColumns.value.filter(sc => sc.id !== id)
  updateQueryModel()
}

function updateQueryModel() {
  const setClause: Record<string, { value: any; isNull: boolean }> = {}
  setColumns.value.forEach(sc => {
    setClause[sc.column.name] = {
      value: sc.value,
      isNull: sc.isNull
    }
  })
  mutationStore.updateSetClause(setClause)
}

function getDefaultValue(column: Column): any {
  const dataType = column.data_type.toUpperCase()
  if (dataType.includes('BOOL')) return false
  if (dataType.includes('INT') || dataType.includes('NUMERIC')) return 0
  return ''
}
</script>

<template>
  <div class="set-tab">
    <div class="set-columns">
      <p class="text-sm text-gray-600 mb-4">更新するカラム:</p>

      <!-- 追加済みカラム一覧 -->
      <div v-for="sc in setColumns" :key="sc.id" class="set-column-item mb-4">
        <SetColumnField
          :column="sc.column"
          v-model:value="sc.value"
          v-model:is-null="sc.isNull"
          @remove="removeColumn(sc.id)"
        />
      </div>

      <!-- カラム追加ドロップダウン -->
      <USelectMenu
        v-if="columnsForAdd.length > 0"
        :items="columnsForAdd"
        value-attribute="name"
        option-attribute="name"
        placeholder="+ カラムを追加"
        @update:model-value="addColumn"
      >
        <template #label>
          <UButton
            icon="i-heroicons-plus"
            label="カラムを追加"
            variant="outline"
            size="sm"
          />
        </template>
      </USelectMenu>

      <UAlert
        v-if="setColumns.length === 0"
        color="amber"
        icon="i-heroicons-exclamation-triangle"
        title="カラムが選択されていません"
        description="少なくとも1つのカラムを選択してください"
      />
    </div>
  </div>
</template>
```

#### SetColumnField.vue（新規コンポーネント）

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDate, Time, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { Column } from '@/types/database-structure'

const df = new DateFormatter('ja-JP', { dateStyle: 'short' })

interface Props {
  column: Column
  value: any
  isNull: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:value': [value: any]
  'update:isNull': [isNull: boolean]
  'remove': []
}>()

// カラムの型に応じた入力コンポーネントの判定
const inputType = computed(() => {
  const dataType = props.column.data_type.toUpperCase()

  if (dataType.includes('BOOL')) return 'checkbox'
  if (dataType.includes('TEXT')) return 'textarea'
  if (dataType.includes('UUID')) return 'uuid'

  // 日時型 (Timestamp/Datetime) - DATE/TIMEより先にチェック
  if (dataType.includes('TIMESTAMP') || dataType.includes('DATETIME')) {
    return 'datetime-local'
  }
  // 日付型（Timeを含まない）
  if (dataType.includes('DATE') && !dataType.includes('TIME')) {
    return 'date'
  }
  // 時刻型（Dateを含まない）
  if (dataType.includes('TIME') && !dataType.includes('DATE')) {
    return 'time'
  }

  if (
    dataType.includes('INT') ||
    dataType.includes('NUMERIC') ||
    dataType.includes('DECIMAL') ||
    dataType.includes('FLOAT') ||
    dataType.includes('DOUBLE') ||
    dataType.includes('REAL')
  ) {
    return 'number'
  }

  return 'text'
})

// 入力無効化条件
const isDisabled = computed(() => props.isNull)

// --- Date Type Handling ---
const dateValue = computed({
  get: () => {
    if (inputType.value !== 'date' || !props.value) return undefined
    const parts = props.value.split('-')
    if (parts.length === 3) {
      return new CalendarDate(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]))
    }
    return undefined
  },
  set: (v: any) => {
    emit('update:value', v ? v.toString() : '')
  }
})

// --- Timestamp/Datetime Handling ---
const timestampDate = ref<CalendarDate | undefined>()
const timestampTime = ref<Time | undefined>()

watch(() => props.value, (newVal) => {
  if (inputType.value !== 'datetime-local') return
  if (!newVal) {
    timestampDate.value = undefined
    timestampTime.value = undefined
    return
  }
  const [d, t] = newVal.split(' ')
  if (d) {
    const dParts = d.split('-')
    if (dParts.length === 3) {
      timestampDate.value = new CalendarDate(parseInt(dParts[0]), parseInt(dParts[1]), parseInt(dParts[2]))
    }
  }
  if (t) {
    const tParts = t.split(':')
    if (tParts.length >= 2) {
      timestampTime.value = new Time(parseInt(tParts[0]), parseInt(tParts[1]), parseInt(tParts[2] || '0'))
    }
  }
}, { immediate: true })

const updateTimestamp = () => {
  if (timestampDate.value) {
    const dStr = timestampDate.value.toString()
    const tStr = timestampTime.value?.toString() || '00:00:00'
    emit('update:value', `${dStr} ${tStr}`)
  } else {
    emit('update:value', '')
  }
}

// --- UUID Handling ---
const generateUuid = () => {
  emit('update:value', crypto.randomUUID())
}
</script>

<template>
  <div class="set-column-field border rounded-lg p-4">
    <div class="flex items-center justify-between mb-2">
      <div>
        <span class="font-semibold">{{ column.name }}</span>
        <span class="text-sm text-gray-500 ml-2">({{ column.data_type }})</span>
      </div>
      <UButton
        icon="i-heroicons-trash"
        color="red"
        variant="ghost"
        size="xs"
        @click="emit('remove')"
      />
    </div>

    <div class="space-y-2">
      <!-- 日付型 (DATE) -->
      <template v-if="inputType === 'date'">
        <ClientOnly>
          <UPopover :popper="{ placement: 'bottom-start' }">
            <UButton
              icon="i-heroicons-calendar-days-20-solid"
              color="white"
              variant="outline"
              :label="dateValue ? formatDate(dateValue) : '日付を選択'"
              class="w-full justify-start"
              :disabled="isDisabled"
            />
            <template #content>
              <UCalendar v-model="dateValue" class="p-2" />
            </template>
          </UPopover>
        </ClientOnly>
      </template>

      <!-- 日時型 (TIMESTAMP/DATETIME) -->
      <template v-else-if="inputType === 'datetime-local'">
        <ClientOnly>
          <UPopover :popper="{ placement: 'bottom-start' }">
            <UButton
              icon="i-heroicons-calendar-days-20-solid"
              color="white"
              variant="outline"
              :label="timestampDate ? formatDateTime(timestampDate, timestampTime) : '日時を選択'"
              class="w-full justify-start"
              :disabled="isDisabled"
            />
            <template #content>
              <div class="p-2 flex flex-col gap-2">
                <UCalendar v-model="timestampDate" />
                <UInputTime v-model="timestampTime" granularity="second" />
              </div>
            </template>
          </UPopover>
        </ClientOnly>
      </template>

      <!-- UUID型 -->
      <template v-else-if="inputType === 'uuid'">
        <div class="flex gap-2">
          <UInput
            :model-value="value"
            :disabled="isDisabled"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            class="flex-1"
            @update:model-value="emit('update:value', $event)"
          />
          <UButton
            icon="i-heroicons-sparkles"
            color="primary"
            variant="outline"
            :disabled="isDisabled"
            @click="generateUuid"
          >
            生成
          </UButton>
        </div>
      </template>

      <!-- 数値入力 -->
      <UInput
        v-else-if="inputType === 'number'"
        :model-value="value"
        type="number"
        :disabled="isDisabled"
        @update:model-value="emit('update:value', $event)"
      />

      <!-- テキストエリア -->
      <UTextarea
        v-else-if="inputType === 'textarea'"
        :model-value="value"
        :disabled="isDisabled"
        :rows="3"
        @update:model-value="emit('update:value', $event)"
      />

      <!-- チェックボックス -->
      <UCheckbox
        v-else-if="inputType === 'checkbox'"
        :model-value="Boolean(value)"
        label="TRUE"
        :disabled="isDisabled"
        @update:model-value="emit('update:value', $event)"
      />

      <!-- テキスト入力（デフォルト） -->
      <UInput
        v-else
        :model-value="value"
        :disabled="isDisabled"
        @update:model-value="emit('update:value', $event)"
      />

      <!-- NULLチェックボックス -->
      <UCheckbox
        v-if="column.is_nullable"
        :model-value="isNull"
        label="NULL"
        @update:model-value="emit('update:isNull', $event)"
      />
    </div>
  </div>
</template>
```

## テストコード

### ユニットテスト例（TypeScript）

```typescript
// tests/components/mutation-builder/UpdatePanel.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UpdatePanel from '@/components/mutation-builder/UpdatePanel.vue'

describe('UpdatePanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初期状態でSETタブとWHEREタブが表示される', () => {
    const wrapper = mount(UpdatePanel)
    expect(wrapper.text()).toContain('SET')
    expect(wrapper.text()).toContain('WHERE')
  })

  it('SETタブが初期表示される', () => {
    const wrapper = mount(UpdatePanel)
    const setTab = wrapper.findComponent({ name: 'SetTab' })
    expect(setTab.exists()).toBe(true)
  })
})
```

```typescript
// tests/components/mutation-builder/SetTab.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SetTab from '@/components/mutation-builder/SetTab.vue'

describe('SetTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('カラム追加ボタンが表示される', () => {
    const wrapper = mount(SetTab)
    expect(wrapper.text()).toContain('カラムを追加')
  })

  it('カラムが未選択の場合、警告が表示される', () => {
    const wrapper = mount(SetTab)
    expect(wrapper.text()).toContain('カラムが選択されていません')
  })

  it('カラム追加後、削除ボタンが表示される', async () => {
    const wrapper = mount(SetTab)
    // カラム追加操作のシミュレーション
    // （実際のテストでは、モックデータを使用）
  })
})
```

### Rustテスト例

```rust
// src-tauri/src/query/mutation.rs
#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::dialect::{DatabaseDialect, PostgresDialect};

    #[test]
    fn test_generate_update_sql_with_where() {
        let model = UpdateQueryModel {
            query_type: "UPDATE".to_string(),
            table: "users".to_string(),
            set_clause: serde_json::json!({
                "name": { "value": "Alice", "isNull": false },
                "email": { "value": "alice@example.com", "isNull": false }
            }),
            where_clause: vec![WhereCondition {
                column: "id".to_string(),
                operator: "=".to_string(),
                value: serde_json::json!(1),
                logical_operator: None,
            }],
        };

        let dialect = PostgresDialect::default();
        let result = generate_update_sql(&model, &dialect).unwrap();

        assert!(result.sql.contains("UPDATE \"users\""));
        assert!(result.sql.contains("SET \"name\" = 'Alice'"));
        assert!(result.sql.contains("\"email\" = 'alice@example.com'"));
        assert!(result.sql.contains("WHERE \"id\" = 1"));
        assert_eq!(result.has_where_clause, true);
    }

    #[test]
    fn test_generate_update_sql_without_where() {
        let model = UpdateQueryModel {
            query_type: "UPDATE".to_string(),
            table: "users".to_string(),
            set_clause: serde_json::json!({
                "is_active": { "value": true, "isNull": false }
            }),
            where_clause: vec![],
        };

        let dialect = PostgresDialect::default();
        let result = generate_update_sql(&model, &dialect).unwrap();

        assert!(result.sql.contains("UPDATE \"users\""));
        assert!(result.sql.contains("SET \"is_active\" = true"));
        assert!(!result.sql.contains("WHERE"));
        assert_eq!(result.has_where_clause, false);
    }

    #[test]
    fn test_generate_update_sql_with_null() {
        let model = UpdateQueryModel {
            query_type: "UPDATE".to_string(),
            table: "users".to_string(),
            set_clause: serde_json::json!({
                "email": { "value": null, "isNull": true }
            }),
            where_clause: vec![],
        };

        let dialect = PostgresDialect::default();
        let result = generate_update_sql(&model, &dialect).unwrap();

        assert!(result.sql.contains("SET \"email\" = NULL"));
    }

    #[test]
    fn test_generate_update_sql_multiple_conditions() {
        let model = UpdateQueryModel {
            query_type: "UPDATE".to_string(),
            table: "users".to_string(),
            set_clause: serde_json::json!({
                "is_active": { "value": false, "isNull": false }
            }),
            where_clause: vec![
                WhereCondition {
                    column: "id".to_string(),
                    operator: ">".to_string(),
                    value: serde_json::json!(100),
                    logical_operator: None,
                },
                WhereCondition {
                    column: "created_at".to_string(),
                    operator: "<".to_string(),
                    value: serde_json::json!("2023-01-01"),
                    logical_operator: Some("AND".to_string()),
                },
            ],
        };

        let dialect = PostgresDialect::default();
        let result = generate_update_sql(&model, &dialect).unwrap();

        assert!(result.sql.contains("WHERE \"id\" > 100 AND \"created_at\" < '2023-01-01'"));
        assert_eq!(result.has_where_clause, true);
    }
}
```

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| **タブ構成（SET / WHERE）** | SET句とWHERE句を明確に分離し、UIを整理 | 単一画面にすべて表示（煩雑になる） |
| **MutationWhereTab.vueを再利用** | コードの重複を避け、SELECTビルダーとの一貫性を保つ | UPDATE専用のWHERE UIを新規作成（冗長） |
| **SET句はカラム追加方式** | 必要なカラムのみ更新できる柔軟性を提供 | 全カラムを常に表示（不要なカラムも表示される） |
| **WHERE句なし警告を強調** | 全行更新の危険性をユーザーに明示 | 警告なし（誤操作リスク高） |
| **SQL生成はRust側で実装** | セキュリティ（エスケープ処理）と方言対応を確実に行うため | フロントエンド側でSQL文字列を組み立て（危険） |
| **SetColumnFieldを独立コンポーネント化** | カラムごとに異なる入力UIを提供でき、テストもしやすい | SetTab内にすべて記述（可読性低下） |
| **UpdateSqlResultにhas_where_clause追加** | WHERE句の有無をフロントエンドで判定しやすくする | SQL文字列をパースして判定（複雑） |

## 未解決事項

- [ ] **JOIN句を含むUPDATE**: PostgreSQL/MySQL/SQLiteで構文が異なるため、Phase 8では単一テーブルのUPDATEのみ対応。将来的に検討
- [ ] **サブクエリを使用したUPDATE**: `SET column = (SELECT ...)` 形式のUPDATE。将来的に検討
- [ ] **JSON/ARRAY型の入力UI**: 現時点では文字列入力のみ対応。将来的にJSON Editorなどの高度なUIを検討
- [ ] **外部キー制約のバリデーション**: Phase 8では実装しない。将来的にリレーション先の値を選択できるUIを検討
- [ ] **バリデーション**: NOT NULL制約、UNIQUE制約、CHECK制約などのクライアント側バリデーション（将来実装）
- [ ] **WHERE句プレビュー**: WHERE句で影響を受ける行数を事前に表示する機能（EXPLAIN使用、将来実装）
