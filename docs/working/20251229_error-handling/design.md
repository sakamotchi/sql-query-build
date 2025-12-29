# 設計書: エラーハンドリング

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend (Nuxt)                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              QueryBuilderLayout.vue                          │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │              SqlPreview.vue                            │  │    │
│  │  │  ┌─────────────────────────────────────────────────┐  │  │    │
│  │  │  │  エラー行ハイライト（赤背景）                     │  │  │    │
│  │  │  │  エラー箇所波線下線                              │  │  │    │
│  │  │  └─────────────────────────────────────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │              ResultPanel.vue                           │  │    │
│  │  │  ┌─────────────────────────────────────────────────┐  │  │    │
│  │  │  │      QueryErrorDisplay.vue                       │  │  │    │
│  │  │  │  ┌──────────────────────────────────────────┐   │  │  │    │
│  │  │  │  │ [アイコン] エラーメッセージ              │   │  │  │    │
│  │  │  │  │                                          │   │  │  │    │
│  │  │  │  │ ErrorHint.vue                           │   │  │  │    │
│  │  │  │  │ [対処法・ヒント]                         │   │  │  │    │
│  │  │  │  └──────────────────────────────────────────┘   │  │  │    │
│  │  │  └─────────────────────────────────────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                            │                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               error-messages.ts                              │    │
│  │        (エラーコード → 日本語メッセージ変換)                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            │ invoke("execute_query", {...})
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Tauri Backend (Rust)                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │           QueryExecutor.execute()                            │    │
│  │                      │                                       │    │
│  │                      ▼                                       │    │
│  │         map_error() / parse_error_position()                 │    │
│  │                      │                                       │    │
│  │                      ▼                                       │    │
│  │            QueryError (code, message, details)               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## データ構造

### Rust側 エラー型定義（拡充）

```rust
// src-tauri/src/models/query_result.rs

/// クエリエラー
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryError {
    /// エラーコード
    pub code: QueryErrorCode,
    /// エラーメッセージ（DB由来のオリジナル）
    pub message: String,
    /// 詳細情報（SQL位置など）
    pub details: Option<QueryErrorDetails>,
    /// DBネイティブのエラーコード（PostgreSQL: SQLSTATE等）
    pub native_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryErrorCode {
    // 接続関連
    ConnectionFailed,
    ConnectionTimeout,
    AuthenticationFailed,

    // クエリ実行関連
    QueryTimeout,
    QueryCancelled,

    // SQL構文関連
    SyntaxError,

    // 権限関連
    PermissionDenied,

    // オブジェクト関連
    TableNotFound,
    ColumnNotFound,
    SchemaNotFound,
    DatabaseNotFound,

    // 制約関連
    UniqueViolation,
    ForeignKeyViolation,
    CheckViolation,
    NotNullViolation,

    // データ関連
    DataTruncation,
    DivisionByZero,
    InvalidDataType,

    // その他
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryErrorDetails {
    /// エラー位置（行番号、1始まり）
    pub line: Option<u32>,
    /// エラー位置（列番号、1始まり）
    pub column: Option<u32>,
    /// エラー発生箇所のSQL抜粋
    pub sql_snippet: Option<String>,
    /// エラー発生箇所の文字位置（SQL全体での位置）
    pub position: Option<u32>,
    /// 問題のあるオブジェクト名（テーブル名、カラム名等）
    pub object_name: Option<String>,
    /// 追加のコンテキスト情報
    pub context: Option<String>,
}
```

### PostgreSQLエラーマッピング

```rust
// src-tauri/src/database/postgresql_executor.rs

impl PostgresExecutor {
    fn map_error(err: sqlx::Error) -> QueryError {
        match &err {
            sqlx::Error::Database(db_err) => {
                // PostgreSQL SQLSTATE コードでマッピング
                let code = db_err.code().map(|c| c.to_string());
                let (error_code, position) = Self::parse_pg_error(&db_err, code.as_deref());

                QueryError {
                    code: error_code,
                    message: db_err.message().to_string(),
                    details: Some(QueryErrorDetails {
                        line: None,
                        column: None,
                        sql_snippet: None,
                        position,
                        object_name: Self::extract_object_name(&db_err),
                        context: db_err.constraint().map(|s| s.to_string()),
                    }),
                    native_code: code,
                }
            }
            sqlx::Error::ColumnNotFound(col) => QueryError {
                code: QueryErrorCode::ColumnNotFound,
                message: format!("Column not found: {}", col),
                details: Some(QueryErrorDetails {
                    object_name: Some(col.clone()),
                    ..Default::default()
                }),
                native_code: None,
            },
            sqlx::Error::Io(io_err) => QueryError {
                code: QueryErrorCode::ConnectionFailed,
                message: format!("IO error: {}", io_err),
                details: None,
                native_code: None,
            },
            _ => QueryError {
                code: QueryErrorCode::Unknown,
                message: err.to_string(),
                details: None,
                native_code: None,
            },
        }
    }

    fn parse_pg_error(db_err: &dyn sqlx::error::DatabaseError, code: Option<&str>) -> (QueryErrorCode, Option<u32>) {
        let position = Self::extract_position(db_err.message());

        let error_code = match code {
            // Syntax Error Class (42xxx)
            Some(c) if c.starts_with("42601") => QueryErrorCode::SyntaxError,
            Some(c) if c.starts_with("42P01") => QueryErrorCode::TableNotFound,
            Some(c) if c.starts_with("42703") => QueryErrorCode::ColumnNotFound,
            Some(c) if c.starts_with("42501") => QueryErrorCode::PermissionDenied,
            Some(c) if c.starts_with("3D000") => QueryErrorCode::DatabaseNotFound,
            Some(c) if c.starts_with("3F000") => QueryErrorCode::SchemaNotFound,

            // Integrity Constraint Violation (23xxx)
            Some(c) if c.starts_with("23505") => QueryErrorCode::UniqueViolation,
            Some(c) if c.starts_with("23503") => QueryErrorCode::ForeignKeyViolation,
            Some(c) if c.starts_with("23514") => QueryErrorCode::CheckViolation,
            Some(c) if c.starts_with("23502") => QueryErrorCode::NotNullViolation,

            // Data Exception (22xxx)
            Some(c) if c.starts_with("22001") => QueryErrorCode::DataTruncation,
            Some(c) if c.starts_with("22012") => QueryErrorCode::DivisionByZero,
            Some(c) if c.starts_with("22P02") => QueryErrorCode::InvalidDataType,

            // Authentication (28xxx)
            Some(c) if c.starts_with("28") => QueryErrorCode::AuthenticationFailed,

            _ => QueryErrorCode::Unknown,
        };

        (error_code, position)
    }

    /// エラーメッセージから位置情報を抽出
    fn extract_position(message: &str) -> Option<u32> {
        // PostgreSQLは "at character N" という形式で位置を返す
        let pattern = "at character ";
        if let Some(pos) = message.find(pattern) {
            let start = pos + pattern.len();
            let end = message[start..].find(|c: char| !c.is_ascii_digit()).unwrap_or(message.len() - start);
            message[start..start + end].parse().ok()
        } else {
            None
        }
    }

    /// エラーからオブジェクト名を抽出
    fn extract_object_name(db_err: &dyn sqlx::error::DatabaseError) -> Option<String> {
        // テーブル名やカラム名をエラー詳細から取得
        db_err.table().map(|s| s.to_string())
            .or_else(|| db_err.column().map(|s| s.to_string()))
    }
}
```

### フロントエンド型定義（拡充）

```typescript
// app/types/query-result.ts

/**
 * クエリエラー
 */
export interface QueryExecuteError {
  /** エラーコード */
  code: QueryErrorCode
  /** エラーメッセージ（DBオリジナル） */
  message: string
  /** 詳細情報 */
  details?: QueryErrorDetails
  /** DBネイティブのエラーコード */
  nativeCode?: string
}

export type QueryErrorCode =
  // 接続関連
  | 'connection_failed'
  | 'connection_timeout'
  | 'authentication_failed'
  // クエリ実行関連
  | 'query_timeout'
  | 'query_cancelled'
  // SQL構文関連
  | 'syntax_error'
  // 権限関連
  | 'permission_denied'
  // オブジェクト関連
  | 'table_not_found'
  | 'column_not_found'
  | 'schema_not_found'
  | 'database_not_found'
  // 制約関連
  | 'unique_violation'
  | 'foreign_key_violation'
  | 'check_violation'
  | 'not_null_violation'
  // データ関連
  | 'data_truncation'
  | 'division_by_zero'
  | 'invalid_data_type'
  // その他
  | 'unknown'

export interface QueryErrorDetails {
  /** エラー位置（行番号、1始まり） */
  line?: number
  /** エラー位置（列番号、1始まり） */
  column?: number
  /** エラー発生箇所のSQL抜粋 */
  sqlSnippet?: string
  /** エラー発生箇所の文字位置 */
  position?: number
  /** 問題のあるオブジェクト名 */
  objectName?: string
  /** 追加のコンテキスト情報 */
  context?: string
}
```

## コンポーネント設計

### QueryErrorDisplay.vue

```vue
<script setup lang="ts">
import type { QueryExecuteError } from '@/types/query-result'
import { getErrorMessage, getErrorHint, getErrorIcon } from '@/utils/error-messages'

const props = defineProps<{
  error: QueryExecuteError
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const errorMessage = computed(() => getErrorMessage(props.error))
const errorHint = computed(() => getErrorHint(props.error))
const errorIcon = computed(() => getErrorIcon(props.error.code))

const showDetails = ref(false)
</script>

<template>
  <div
    class="flex flex-col p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
    role="alert"
    aria-live="assertive"
  >
    <!-- メインエラー表示 -->
    <div class="flex items-start gap-3">
      <UIcon
        :name="errorIcon"
        class="text-2xl text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
      />
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
          {{ errorMessage.title }}
        </h3>
        <p class="mt-1 text-sm text-red-700 dark:text-red-300">
          {{ errorMessage.description }}
        </p>

        <!-- オブジェクト名表示 -->
        <p
          v-if="error.details?.objectName"
          class="mt-1 text-sm text-red-600 dark:text-red-400"
        >
          対象: <code class="px-1 py-0.5 bg-red-100 dark:bg-red-900/50 rounded">{{ error.details.objectName }}</code>
        </p>

        <!-- エラー位置表示 -->
        <p
          v-if="error.details?.line || error.details?.position"
          class="mt-1 text-xs text-red-500 dark:text-red-500"
        >
          <template v-if="error.details?.line">
            行: {{ error.details.line }}
            <template v-if="error.details?.column">, 列: {{ error.details.column }}</template>
          </template>
          <template v-else-if="error.details?.position">
            文字位置: {{ error.details.position }}
          </template>
        </p>
      </div>
    </div>

    <!-- ヒント表示 -->
    <ErrorHint v-if="errorHint" :hint="errorHint" class="mt-3" />

    <!-- 詳細展開 -->
    <div v-if="error.message || error.nativeCode" class="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
      <button
        type="button"
        class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
        @click="showDetails = !showDetails"
      >
        <UIcon :name="showDetails ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" />
        技術的な詳細
      </button>

      <div v-if="showDetails" class="mt-2">
        <pre class="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-x-auto whitespace-pre-wrap">{{ error.message }}</pre>
        <p v-if="error.nativeCode" class="mt-1 text-xs text-red-500">
          エラーコード: {{ error.nativeCode }}
        </p>
      </div>
    </div>

    <!-- リトライボタン -->
    <div class="mt-4 flex gap-2">
      <UButton
        size="sm"
        color="red"
        variant="soft"
        icon="i-heroicons-arrow-path"
        @click="emit('retry')"
      >
        再実行
      </UButton>
    </div>
  </div>
</template>
```

### ErrorHint.vue

```vue
<script setup lang="ts">
import type { ErrorHint } from '@/utils/error-messages'

defineProps<{
  hint: ErrorHint
}>()
</script>

<template>
  <div class="flex items-start gap-2 p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
    <UIcon
      name="i-heroicons-light-bulb"
      class="text-lg text-amber-500 dark:text-amber-400 flex-shrink-0"
    />
    <div>
      <p class="text-sm text-amber-800 dark:text-amber-200 font-medium">
        {{ hint.title }}
      </p>
      <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
        {{ hint.suggestion }}
      </p>
      <ul v-if="hint.examples?.length" class="mt-2 text-xs text-amber-600 dark:text-amber-400 list-disc list-inside">
        <li v-for="example in hint.examples" :key="example">{{ example }}</li>
      </ul>
    </div>
  </div>
</template>
```

### SqlPreview.vue（エラーハイライト追加）

```vue
<script setup lang="ts">
import type { QueryErrorDetails } from '@/types/query-result'

const props = defineProps<{
  sql: string
  errorDetails?: QueryErrorDetails | null
}>()

// SQLを行に分割
const sqlLines = computed(() => props.sql.split('\n'))

// エラー行を取得（位置から計算）
const errorLine = computed(() => {
  if (!props.errorDetails) return null

  // 行番号が直接指定されている場合
  if (props.errorDetails.line) {
    return props.errorDetails.line
  }

  // 文字位置から行番号を計算
  if (props.errorDetails.position) {
    let charCount = 0
    for (let i = 0; i < sqlLines.value.length; i++) {
      charCount += sqlLines.value[i].length + 1 // +1 for newline
      if (charCount >= props.errorDetails.position) {
        return i + 1
      }
    }
  }

  return null
})

// エラー列を取得
const errorColumn = computed(() => {
  if (!props.errorDetails) return null

  if (props.errorDetails.column) {
    return props.errorDetails.column
  }

  if (props.errorDetails.position && errorLine.value) {
    // 文字位置から列番号を計算
    let charCount = 0
    for (let i = 0; i < errorLine.value - 1; i++) {
      charCount += sqlLines.value[i].length + 1
    }
    return props.errorDetails.position - charCount
  }

  return null
})
</script>

<template>
  <div class="font-mono text-sm overflow-x-auto">
    <div
      v-for="(line, index) in sqlLines"
      :key="index"
      class="flex"
      :class="{
        'bg-red-100 dark:bg-red-900/30': errorLine === index + 1,
      }"
    >
      <!-- 行番号 -->
      <span
        class="w-8 text-right pr-2 text-gray-400 dark:text-gray-600 select-none flex-shrink-0"
        :class="{
          'text-red-500 dark:text-red-400': errorLine === index + 1,
        }"
      >
        {{ index + 1 }}
      </span>
      <!-- SQL行 -->
      <span class="flex-1 whitespace-pre">
        <template v-if="errorLine === index + 1 && errorColumn">
          <!-- エラー位置前 -->
          {{ line.substring(0, errorColumn - 1) }}
          <!-- エラー位置（波線下線） -->
          <span
            class="underline decoration-wavy decoration-red-500 bg-red-200 dark:bg-red-800/50"
            :title="errorDetails?.sqlSnippet"
          >{{ line.substring(errorColumn - 1) || ' ' }}</span>
        </template>
        <template v-else>
          {{ line }}
        </template>
      </span>
    </div>

    <!-- エラーインジケーター -->
    <div
      v-if="errorLine && errorColumn"
      class="flex items-center gap-1 mt-2 text-xs text-red-500"
    >
      <UIcon name="i-heroicons-exclamation-triangle" />
      <span>エラー位置: {{ errorLine }}行目, {{ errorColumn }}列目</span>
    </div>
  </div>
</template>
```

### ResultPanel.vue（エラー表示拡充）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useQueryBuilderStore } from '@/stores/query-builder'
import ResultTable from './result/ResultTable.vue'
import ResultPagination from './result/ResultPagination.vue'
import QueryErrorDisplay from './error/QueryErrorDisplay.vue'

const store = useQueryBuilderStore()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 計算プロパティ
const hasResult = computed(() => store.queryResult !== null)
const hasError = computed(() => store.queryError !== null)
const isLoading = computed(() => store.isExecuting)
const executionInfo = computed(() => {
  if (!store.queryResult) return null
  return {
    rowCount: store.queryResult.rowCount,
    executionTimeMs: store.queryResult.executionTimeMs,
  }
})

// リトライ処理
async function handleRetry() {
  await store.executeQuery()
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon
          :name="hasError ? 'i-heroicons-exclamation-circle' : 'i-heroicons-table-cells'"
          class="text-lg"
          :class="hasError ? 'text-red-500' : ''"
        />
        <span class="text-sm font-medium">
          {{ hasError ? 'エラー' : '実行結果' }}
        </span>
        <!-- 実行情報 -->
        <template v-if="executionInfo && !hasError">
          <span class="text-xs text-gray-500">
            {{ executionInfo.rowCount }}行
          </span>
          <span class="text-xs text-gray-400">
            ({{ executionInfo.executionTimeMs }}ms)
          </span>
        </template>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="xs"
          color="gray"
          variant="ghost"
          title="エクスポート"
          :disabled="!hasResult || hasError"
        />
        <UButton
          icon="i-heroicons-x-mark"
          size="xs"
          color="gray"
          variant="ghost"
          title="閉じる"
          @click="emit('close')"
        />
      </div>
    </div>

    <!-- コンテンツ -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- ローディング -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
        <span class="ml-2 text-gray-500">実行中...</span>
      </div>

      <!-- エラー表示 -->
      <div v-else-if="hasError" class="flex-1 overflow-auto p-4">
        <QueryErrorDisplay
          :error="store.queryError!"
          @retry="handleRetry"
        />
      </div>

      <!-- 結果なし -->
      <div v-else-if="!hasResult" class="flex-1 flex flex-col items-center justify-center">
        <UIcon name="i-heroicons-table-cells" class="text-4xl text-gray-400" />
        <p class="text-gray-500 dark:text-gray-400 mt-2">クエリを実行してください</p>
      </div>

      <!-- 結果表示 -->
      <template v-else>
        <div class="flex-1 overflow-auto">
          <ResultTable
            :columns="store.queryResult!.columns"
            :rows="store.paginatedRows"
          />
        </div>
        <div class="border-t border-gray-200 dark:border-gray-800">
          <ResultPagination
            :current-page="store.currentPage"
            :page-size="store.pageSize"
            :total-rows="store.queryResult!.rowCount"
            @page-change="store.setCurrentPage"
            @page-size-change="store.setPageSize"
          />
        </div>
      </template>
    </div>
  </div>
</template>
```

## エラーメッセージマッピング

```typescript
// app/utils/error-messages.ts

import type { QueryExecuteError, QueryErrorCode } from '@/types/query-result'

export interface ErrorMessage {
  title: string
  description: string
}

export interface ErrorHint {
  title: string
  suggestion: string
  examples?: string[]
}

const ERROR_MESSAGES: Record<QueryErrorCode, ErrorMessage> = {
  // 接続関連
  connection_failed: {
    title: '接続エラー',
    description: 'データベースへの接続に失敗しました。',
  },
  connection_timeout: {
    title: '接続タイムアウト',
    description: 'データベースへの接続がタイムアウトしました。',
  },
  authentication_failed: {
    title: '認証エラー',
    description: 'ユーザー名またはパスワードが正しくありません。',
  },

  // クエリ実行関連
  query_timeout: {
    title: 'クエリタイムアウト',
    description: 'クエリの実行がタイムアウトしました。',
  },
  query_cancelled: {
    title: 'クエリキャンセル',
    description: 'クエリの実行がキャンセルされました。',
  },

  // SQL構文関連
  syntax_error: {
    title: 'SQL構文エラー',
    description: 'SQLの構文に誤りがあります。',
  },

  // 権限関連
  permission_denied: {
    title: '権限エラー',
    description: 'この操作を実行する権限がありません。',
  },

  // オブジェクト関連
  table_not_found: {
    title: 'テーブルが見つかりません',
    description: '指定されたテーブルが存在しません。',
  },
  column_not_found: {
    title: 'カラムが見つかりません',
    description: '指定されたカラムが存在しません。',
  },
  schema_not_found: {
    title: 'スキーマが見つかりません',
    description: '指定されたスキーマが存在しません。',
  },
  database_not_found: {
    title: 'データベースが見つかりません',
    description: '指定されたデータベースが存在しません。',
  },

  // 制約関連
  unique_violation: {
    title: '一意制約違反',
    description: '重複する値を挿入しようとしました。',
  },
  foreign_key_violation: {
    title: '外部キー制約違反',
    description: '参照先のレコードが存在しません。',
  },
  check_violation: {
    title: 'CHECK制約違反',
    description: 'CHECK制約の条件を満たしていません。',
  },
  not_null_violation: {
    title: 'NOT NULL制約違反',
    description: 'NULL値を許可しないカラムにNULLを挿入しようとしました。',
  },

  // データ関連
  data_truncation: {
    title: 'データ切り捨て',
    description: '値がカラムのサイズを超えています。',
  },
  division_by_zero: {
    title: 'ゼロ除算エラー',
    description: '0で除算することはできません。',
  },
  invalid_data_type: {
    title: 'データ型エラー',
    description: '値のデータ型が不正です。',
  },

  // その他
  unknown: {
    title: '予期しないエラー',
    description: '予期しないエラーが発生しました。',
  },
}

const ERROR_HINTS: Partial<Record<QueryErrorCode, ErrorHint>> = {
  syntax_error: {
    title: '構文を確認してください',
    suggestion: 'SQLの構文を確認し、キーワードのスペルや括弧の対応をチェックしてください。',
    examples: [
      'カンマやセミコロンが正しい位置にあるか確認',
      '予約語を識別子として使用していないか確認',
      '文字列リテラルのクォートが閉じているか確認',
    ],
  },
  table_not_found: {
    title: 'テーブル名を確認してください',
    suggestion: 'テーブル名のスペルやスキーマ名を確認してください。',
    examples: [
      'テーブル名の大文字小文字を確認',
      'スキーマ名を指定して再試行（例: schema_name.table_name）',
      'データベースツリーでテーブル名を確認',
    ],
  },
  column_not_found: {
    title: 'カラム名を確認してください',
    suggestion: 'カラム名のスペルを確認するか、テーブルのスキーマを確認してください。',
    examples: [
      'カラム名の大文字小文字を確認',
      'テーブルエイリアスを使用している場合は正しく指定されているか確認',
    ],
  },
  permission_denied: {
    title: '権限を確認してください',
    suggestion: 'データベース管理者に必要な権限を付与してもらってください。',
  },
  query_timeout: {
    title: 'クエリを最適化してください',
    suggestion: 'クエリの実行時間を短縮するか、タイムアウト時間を延長してください。',
    examples: [
      'WHERE句でデータを絞り込む',
      'インデックスを活用する',
      'LIMIT句で取得件数を制限する',
    ],
  },
  unique_violation: {
    title: '重複データを確認してください',
    suggestion: '挿入または更新しようとしている値がすでに存在します。',
    examples: [
      '既存データを確認して重複を避ける',
      'ON CONFLICT句を使用して重複時の処理を指定',
    ],
  },
  foreign_key_violation: {
    title: '参照先データを確認してください',
    suggestion: '参照先のテーブルに対応するレコードが存在するか確認してください。',
  },
  not_null_violation: {
    title: '必須項目を入力してください',
    suggestion: 'NOT NULL制約のあるカラムには値を指定する必要があります。',
  },
}

const ERROR_ICONS: Record<QueryErrorCode, string> = {
  connection_failed: 'i-heroicons-signal-slash',
  connection_timeout: 'i-heroicons-clock',
  authentication_failed: 'i-heroicons-lock-closed',
  query_timeout: 'i-heroicons-clock',
  query_cancelled: 'i-heroicons-x-circle',
  syntax_error: 'i-heroicons-code-bracket',
  permission_denied: 'i-heroicons-shield-exclamation',
  table_not_found: 'i-heroicons-table-cells',
  column_not_found: 'i-heroicons-view-columns',
  schema_not_found: 'i-heroicons-folder',
  database_not_found: 'i-heroicons-circle-stack',
  unique_violation: 'i-heroicons-document-duplicate',
  foreign_key_violation: 'i-heroicons-link',
  check_violation: 'i-heroicons-check-circle',
  not_null_violation: 'i-heroicons-exclamation-triangle',
  data_truncation: 'i-heroicons-scissors',
  division_by_zero: 'i-heroicons-calculator',
  invalid_data_type: 'i-heroicons-variable',
  unknown: 'i-heroicons-exclamation-circle',
}

export function getErrorMessage(error: QueryExecuteError): ErrorMessage {
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.unknown
}

export function getErrorHint(error: QueryExecuteError): ErrorHint | null {
  return ERROR_HINTS[error.code] || null
}

export function getErrorIcon(code: QueryErrorCode): string {
  return ERROR_ICONS[code] || ERROR_ICONS.unknown
}
```

## ストア拡張

```typescript
// app/stores/query-builder.ts 追加分

interface QueryBuilderState {
  // 既存の状態...

  /** クエリ実行エラー（構造化） */
  queryError: QueryExecuteError | null
}

// アクション追加
actions: {
  async executeQuery() {
    // 既存の処理...

    try {
      // 実行処理...
      this.queryError = null
    } catch (error) {
      this.queryError = this.parseQueryError(error)
      this.error = this.queryError.message
    }
  },

  /**
   * エラーをパース
   */
  parseQueryError(error: unknown): QueryExecuteError {
    if (typeof error === 'string') {
      try {
        return JSON.parse(error) as QueryExecuteError
      } catch {
        return {
          code: 'unknown',
          message: error,
        }
      }
    }

    if (error instanceof Error) {
      return {
        code: 'unknown',
        message: error.message,
      }
    }

    return {
      code: 'unknown',
      message: 'Unknown error',
    }
  },

  /**
   * エラーをクリア
   */
  clearError() {
    this.queryError = null
    this.error = null
  },
}
```

## ファイル構成

```
app/
├── api/
│   └── query.ts              # 既存
├── types/
│   └── query-result.ts       # エラー型拡充
├── utils/
│   └── error-messages.ts     # 新規: エラーメッセージマッピング
├── stores/
│   └── query-builder.ts      # queryError状態追加
└── components/
    └── query-builder/
        ├── ResultPanel.vue   # エラー表示拡充
        ├── SqlPreview.vue    # エラーハイライト追加
        └── error/
            ├── QueryErrorDisplay.vue  # 新規
            └── ErrorHint.vue          # 新規

src-tauri/src/
├── models/
│   └── query_result.rs       # QueryError拡充
└── database/
    ├── postgresql_executor.rs  # エラーマッピング強化
    ├── mysql_executor.rs       # エラーマッピング強化
    └── sqlite_executor.rs      # エラーマッピング強化
```

## テストコード

### コンポーネントテスト

```typescript
// app/components/query-builder/error/__tests__/QueryErrorDisplay.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryErrorDisplay from '../QueryErrorDisplay.vue'

describe('QueryErrorDisplay', () => {
  const syntaxError = {
    code: 'syntax_error' as const,
    message: 'syntax error at or near "SELEC"',
    details: {
      line: 1,
      column: 1,
      position: 1,
    },
  }

  it('renders error message correctly', () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: { error: syntaxError },
    })

    expect(wrapper.text()).toContain('SQL構文エラー')
    expect(wrapper.text()).toContain('SQLの構文に誤りがあります')
  })

  it('shows error position when available', () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: { error: syntaxError },
    })

    expect(wrapper.text()).toContain('行: 1')
    expect(wrapper.text()).toContain('列: 1')
  })

  it('shows hint for syntax errors', () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: { error: syntaxError },
    })

    expect(wrapper.text()).toContain('構文を確認してください')
  })

  it('emits retry event when button clicked', async () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: { error: syntaxError },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('toggles details section', async () => {
    const wrapper = mount(QueryErrorDisplay, {
      props: { error: syntaxError },
    })

    const detailsButton = wrapper.find('button:contains("技術的な詳細")')
    await detailsButton.trigger('click')

    expect(wrapper.text()).toContain(syntaxError.message)
  })
})
```

### ユーティリティテスト

```typescript
// app/utils/__tests__/error-messages.spec.ts
import { describe, it, expect } from 'vitest'
import { getErrorMessage, getErrorHint, getErrorIcon } from '../error-messages'

describe('error-messages', () => {
  describe('getErrorMessage', () => {
    it('returns correct message for syntax_error', () => {
      const result = getErrorMessage({ code: 'syntax_error', message: 'test' })
      expect(result.title).toBe('SQL構文エラー')
    })

    it('returns unknown message for undefined code', () => {
      const result = getErrorMessage({ code: 'unknown', message: 'test' })
      expect(result.title).toBe('予期しないエラー')
    })
  })

  describe('getErrorHint', () => {
    it('returns hint for syntax_error', () => {
      const result = getErrorHint({ code: 'syntax_error', message: 'test' })
      expect(result).not.toBeNull()
      expect(result?.title).toContain('構文を確認')
    })

    it('returns null for errors without hints', () => {
      const result = getErrorHint({ code: 'unknown', message: 'test' })
      expect(result).toBeNull()
    })
  })

  describe('getErrorIcon', () => {
    it('returns correct icon for each error code', () => {
      expect(getErrorIcon('syntax_error')).toBe('i-heroicons-code-bracket')
      expect(getErrorIcon('table_not_found')).toBe('i-heroicons-table-cells')
      expect(getErrorIcon('permission_denied')).toBe('i-heroicons-shield-exclamation')
    })
  })
})
```

## UI/UX考慮事項

### エラー表示のデザイン

- 赤系の背景色でエラーを視覚的に明示
- アイコンでエラー種別を即座に判別可能に
- 技術的な詳細は折りたたみで非表示（必要時に展開）

### ヒント表示

- 黄色系の背景色でヒントを目立たせる
- 具体的な対処法を提示
- 例を挙げて分かりやすく説明

### 構文エラーハイライト

- エラー行を赤背景でハイライト
- エラー箇所に波線下線を表示
- エラー位置（行・列）を表示

### アクセシビリティ

- `aria-live="assertive"`でエラーを通知
- エラーアイコンに適切な`title`属性
- 色だけでなくアイコンや文字でも情報を伝達

## 依存関係

### 前提条件

- Phase 2.1 クエリ実行基盤（Rust）が完成していること
- Phase 2.2 結果表示UIが完成していること

### 外部依存

- Nuxt UI v4（UButton, UIcon）
- Pinia（状態管理）
