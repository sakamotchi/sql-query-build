# 設計書: 8.5 安全機能統合

## ⚠️ 重要: 主要機能は既に実装済みです

8.5.1〜8.5.3および8.5.5は**既に実装済み**です。詳細は [README.md](./README.md) を参照してください。

## アーキテクチャ概要

mutation-builder（データ変更クエリビルダー）は既にPhase 3, 4.3, 8.1-8.4で安全機能と統合されています。
DangerousQueryDialogは既にINSERT/UPDATE/DELETEに対応しており、各クエリ種別に応じた
適切な警告レベルが設定されています。また、mutation-builderでもクエリ履歴・保存機能が
動作しています。

8.5では、**既存実装の動作確認とテスト**のみを実施します。

### システム構成図

```
┌────────────────────────────────────────────────────────────┐
│ MutationBuilderToolbar                                     │
│ - INSERT/UPDATE/DELETEタブ切り替え                         │
│ - 実行ボタン → executeQuery() → 警告チェック               │
└────────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────┐
│ mutation-builderストア                                      │
│ - analyzeQuery() → QueryAnalysisResult                     │
│ - hasWhereConditions computed                              │
│ - executeQuery() → DangerousQueryDialog表示判定            │
└────────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────┐
│ DangerousQueryDialog（既存拡張）                            │
│ - INSERT: info（通常確認）                                 │
│ - UPDATE（WHERE有）: warning（注意）                        │
│ - UPDATE（WHERE無）: danger（全行更新警告）                 │
│ - DELETE（WHERE有）: warning（注意）                        │
│ - DELETE（WHERE無）: danger（全行削除警告）                 │
└────────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────┐
│ クエリ実行 → query-historyストアに記録                      │
└────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### 既存コンポーネントの拡張

#### 1. DangerousQueryDialog.vue

既存のDangerousQueryDialogを拡張し、mutation-builder用の警告メッセージに対応します。

**拡張内容:**
- INSERT/UPDATE/DELETEに対応した警告メッセージ
- クエリ種別に応じた適切なアイコン・色
- WHERE句の有無に応じた警告レベル設定

**変更点:**
- propsに`queryType`を追加（既存の`analysisResult.queryType`を使用）
- 警告メッセージをクエリ種別に応じて動的に生成
- INSERT用の警告メッセージを追加

**実装例:**

```vue
<script setup lang="ts">
import type { QueryAnalysisResult } from '@/types/query-analysis'

const props = defineProps<{
  analysisResult: QueryAnalysisResult
  sql: string
  countdownSeconds: number
}>()

// 警告メッセージをクエリ種別に応じて動的に生成
const warningTitle = computed(() => {
  switch (props.analysisResult.queryType) {
    case 'insert':
      return 'データを挿入します'
    case 'update':
      return props.analysisResult.hasWhereClause
        ? 'データを更新します'
        : '全行を更新します'
    case 'delete':
      return props.analysisResult.hasWhereClause
        ? 'データを削除します'
        : '全行を削除します'
    default:
      return '危険なクエリの実行確認'
  }
})

const warningDescription = computed(() => {
  switch (props.analysisResult.queryType) {
    case 'insert':
      return 'テーブルに新しいデータを挿入します。よろしいですか?'
    case 'update':
      return props.analysisResult.hasWhereClause
        ? '選択した行のデータを更新します。よろしいですか?'
        : 'WHERE句がないため、テーブルの全行が更新されます。本当に実行しますか?'
    case 'delete':
      return props.analysisResult.hasWhereClause
        ? '選択した行を削除します。よろしいですか?'
        : 'WHERE句がないため、テーブルの全行が削除されます。本当に実行しますか?'
    default:
      return 'このクエリを実行しますか?'
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="warningTitle"
    :ui="{ width: 'max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- 危険度バッジ -->
        <div class="flex items-center gap-2">
          <UBadge :color="riskColor" size="lg" class="uppercase">
            <UIcon :name="riskIcon" class="mr-1" />
            {{ riskLabel }}
          </UBadge>
          <span class="text-sm text-neutral-500">
            {{ analysisResult.queryType.toUpperCase() }} クエリ
          </span>
        </div>

        <!-- 警告メッセージ -->
        <UAlert
          :color="riskColor"
          variant="soft"
          :icon="riskIcon"
        >
          <template #title>{{ warningDescription }}</template>
        </UAlert>

        <!-- リスクファクター -->
        <UAlert
          v-if="analysisResult.riskFactors.length > 0"
          :color="riskColor"
          variant="soft"
          :icon="riskIcon"
        >
          <template #title>警告</template>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="factor in analysisResult.riskFactors" :key="factor.code">
              {{ factor.message }}
            </li>
          </ul>
        </UAlert>

        <!-- 影響を受けるテーブル -->
        <div v-if="analysisResult.affectedTables.length > 0">
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            影響を受けるテーブル:
          </p>
          <ul class="list-disc list-inside mt-2 space-y-1">
            <li
              v-for="table in analysisResult.affectedTables"
              :key="table"
              class="text-sm font-mono"
            >
              {{ table }}
            </li>
          </ul>
        </div>

        <!-- SQL プレビュー -->
        <div>
          <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            実行されるSQL:
          </p>
          <pre
            class="bg-neutral-100 dark:bg-neutral-800 p-3 rounded text-sm overflow-x-auto"
          ><code>{{ sql }}</code></pre>
        </div>

        <!-- dangerレベルの場合、確認チェックボックス -->
        <UCheckbox
          v-if="analysisResult.riskLevel === 'danger'"
          v-model="confirmed"
          label="上記の内容を理解し、実行することを確認しました"
          color="red"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          color="neutral"
          variant="outline"
          @click="handleCancel"
        >
          キャンセル
        </UButton>
        <UButton
          :color="riskColor"
          :disabled="!canExecute"
          @click="handleConfirm"
        >
          {{ executeButtonLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

**注**: 実装の詳細は既存のDangerousQueryDialog.vueを参照してください。

## ストア設計（mutation-builder.ts）

### 追加する算出プロパティ

```typescript
// app/stores/mutation-builder.ts

export const useMutationBuilderStore = defineStore('mutation-builder', () => {
  // ... 既存の状態 ...

  // WHERE句の有無を判定
  const hasWhereConditions = computed(() => {
    if (mutationType.value === 'INSERT') {
      return false // INSERTはWHERE句を持たない
    }
    return queryModel.value.whereConditions && queryModel.value.whereConditions.length > 0
  })

  // クエリ分析結果を生成
  const analysisResult = computed<QueryAnalysisResult>(() => {
    const queryType = mutationType.value.toLowerCase() as QueryType

    // 警告レベルの判定
    let riskLevel: RiskLevel
    const riskFactors: RiskFactor[] = []

    switch (queryType) {
      case 'insert':
        riskLevel = 'safe' // 通常の確認
        break

      case 'update':
        if (hasWhereConditions.value) {
          riskLevel = 'warning' // 注意が必要
        } else {
          riskLevel = 'danger' // 全行更新の危険性
          riskFactors.push({
            code: 'UPDATE_WITHOUT_WHERE',
            message: 'WHERE句がないため、テーブルの全行が更新されます'
          })
        }
        break

      case 'delete':
        if (hasWhereConditions.value) {
          riskLevel = 'warning' // 注意が必要
        } else {
          riskLevel = 'danger' // 全行削除の危険性
          riskFactors.push({
            code: 'DELETE_WITHOUT_WHERE',
            message: 'WHERE句がないため、テーブルの全行が削除されます'
          })
        }
        break

      default:
        riskLevel = 'safe'
    }

    return {
      queryType,
      riskLevel,
      riskFactors,
      affectedTables: selectedTable.value ? [selectedTable.value] : [],
      hasWhereClause: hasWhereConditions.value
    }
  })

  return {
    // ... 既存の戻り値 ...
    hasWhereConditions,
    analysisResult
  }
})
```

### 実行時の警告ダイアログ表示ロジック

```typescript
// app/components/mutation-builder/MutationBuilderToolbar.vue

const store = useMutationBuilderStore()
const { safetyConfig } = storeToRefs(useSafetySettingsStore())

const showConfirmDialog = ref(false)

const handleExecute = async () => {
  // 安全設定チェック
  const analysis = store.analysisResult

  // 警告が必要な場合
  if (
    (analysis.riskLevel === 'warning' && safetyConfig.value.confirmationEnabled) ||
    (analysis.riskLevel === 'danger' && safetyConfig.value.confirmationEnabled)
  ) {
    showConfirmDialog.value = true
    return
  }

  // 警告不要な場合は直接実行
  await store.executeQuery()
}

const handleConfirm = async () => {
  showConfirmDialog.value = false
  await store.executeQuery()
}

const handleCancel = () => {
  showConfirmDialog.value = false
}
```

## Rust バックエンド設計

### クエリ分析機能（オプション）

Rustバックエンドでクエリ分析を行う場合は、既存の`analyze_query`コマンドを拡張します。
ただし、フロントエンドで簡易的に判定できる場合は、Rustバックエンドの拡張は不要です。

```rust
// src-tauri/src/query/analyzer.rs

pub fn analyze_mutation_query(
    sql: &str,
    query_type: &str,
    has_where: bool,
) -> QueryAnalysisResult {
    let mut risk_factors = Vec::new();

    let risk_level = match query_type.to_lowercase().as_str() {
        "insert" => RiskLevel::Safe,
        "update" => {
            if has_where {
                RiskLevel::Warning
            } else {
                risk_factors.push(RiskFactor {
                    code: "UPDATE_WITHOUT_WHERE".to_string(),
                    message: "WHERE句がないため、テーブルの全行が更新されます".to_string(),
                });
                RiskLevel::Danger
            }
        }
        "delete" => {
            if has_where {
                RiskLevel::Warning
            } else {
                risk_factors.push(RiskFactor {
                    code: "DELETE_WITHOUT_WHERE".to_string(),
                    message: "WHERE句がないため、テーブルの全行が削除されます".to_string(),
                });
                RiskLevel::Danger
            }
        }
        _ => RiskLevel::Safe,
    };

    QueryAnalysisResult {
        query_type: query_type.to_string(),
        risk_level,
        risk_factors,
        affected_tables: extract_tables_from_sql(sql),
        has_where_clause: has_where,
    }
}
```

**注**: この機能はオプションです。フロントエンドで判定できる場合は実装不要です。

## クエリ履歴・保存機能の動作確認

**注**: クエリ履歴・保存機能は既に実装済み（Phase 4.3）です。

### 既存実装の確認

#### クエリ履歴

`app/stores/query-history.ts`の`loadToBuilder()`メソッドは、既にmutation-builderに対応しています:

```typescript
// app/stores/query-history.ts（既存実装）

async function loadToBuilder(id: string): Promise<QueryHistory | null> {
  const history = await loadHistory(id)
  if (history) {
    if (history.query && typeof history.query === 'object' && 'mutationType' in history.query) {
      // mutation-builderストアに状態を復元
      const { useMutationBuilderStore } = await import('./mutation-builder')
      const mutationBuilderStore = useMutationBuilderStore()
      mutationBuilderStore.loadState(history.query as SerializableMutationState)
    } else {
      // query-builderストアに状態を復元
      const { useQueryBuilderStore } = await import('./query-builder')
      const queryBuilderStore = useQueryBuilderStore()
      queryBuilderStore.$patch(history.query)
    }
  }
  return history
}
```

#### クエリ保存

`app/stores/saved-query.ts`の`saveCurrentQuery()`メソッドも、既にmutation-builderに対応しています。

### 動作確認のみ実施

8.5では、以下の動作確認のみを実施します:

1. ✅ INSERT/UPDATE/DELETE実行時にクエリ履歴に記録されることを確認
2. ✅ 履歴からmutation-builderにクエリを読み込めることを確認
3. ✅ mutation-builderでクエリを保存できることを確認
4. ✅ 保存したクエリをmutation-builderで読み込めることを確認

新規実装は不要です。

## 安全機能設計

### 警告レベル設定

#### カウントダウン秒数

```typescript
// app/components/mutation-builder/MutationBuilderToolbar.vue

const countdownSeconds = computed(() => {
  const analysis = store.analysisResult

  switch (analysis.riskLevel) {
    case 'danger':
      return 5 // 5秒カウントダウン
    case 'warning':
      return 3 // 3秒カウントダウン
    default:
      return 0 // カウントダウンなし
  }
})
```

### 安全設定との連携

既存の`safety-settings`ストアと連携し、環境別の安全設定に従います。

```typescript
// app/stores/safety-settings.ts（既存）

export interface SafetyConfig {
  environment: 'development' | 'production'
  confirmationEnabled: boolean
  dangerousQueryTypes: QueryType[]
}

// mutation-builderでの使用例
const { safetyConfig } = storeToRefs(useSafetySettingsStore())

const shouldShowDialog = computed(() => {
  if (!safetyConfig.value.confirmationEnabled) {
    return false
  }

  const analysis = store.analysisResult
  return analysis.riskLevel === 'warning' || analysis.riskLevel === 'danger'
})
```

## データフロー

### クエリ実行の流れ

```
1. ユーザーが実行ボタンをクリック
   ↓
2. MutationBuilderToolbarのhandleExecute()が呼ばれる
   ↓
3. mutation-builderストアのanalysisResultを取得
   ↓ (riskLevel === 'warning' || 'danger')
4. DangerousQueryDialogを表示
   ↓ (ユーザーが確認)
5. handleConfirm()が呼ばれる
   ↓
6. mutation-builderストアのexecuteQuery()を実行
   ↓
7. Rust側のexecute_mutation_queryが呼び出される
   ↓
8. クエリ実行結果を取得
   ↓
9. query-historyストアに記録
   ↓
10. 結果パネルに影響行数を表示
```

### クエリ保存の流れ

```
1. ユーザーが保存ボタンをクリック
   ↓
2. SaveQueryDialogを表示
   ↓
3. クエリ名・説明を入力
   ↓
4. mutation-builderストアのsaveQuery()を実行
   ↓
5. saved-queriesストアに保存
   ↓
6. 保存完了トーストを表示
```

## エラーハンドリング

### フロントエンド

1. **WHERE句判定エラー**
   - queryModel.whereConditionsがundefinedの場合、空配列として扱う
   - hasWhereConditions computed で安全に判定

2. **クエリ実行エラー**
   - エラーダイアログを表示
   - エラーメッセージとSQLを表示
   - クエリ履歴にエラー情報を記録

3. **保存エラー**
   - エラートーストを表示
   - エラー内容をログに記録

### バックエンド（Rust）

1. **クエリ分析エラー**
   - 無効なSQLの場合、`Err("Invalid SQL")`を返す
   - フロントエンドでエラーハンドリング

2. **クエリ実行エラー**
   - データベースエラーをそのまま返す
   - エラーメッセージをログに記録

## パフォーマンス考慮事項

### WHERE句チェックのパフォーマンス

- computed プロパティで即座に判定（1ms以内）
- queryModel.whereConditionsの配列長チェックのみ

### 警告ダイアログ表示のパフォーマンス

- 警告メッセージは computed で事前計算（10ms以内）
- ダイアログの表示は即座に行われる（200ms以内）

### クエリ履歴記録のパフォーマンス

- 非同期で記録（クエリ実行結果を待たない）
- Rustバックエンドに記録依頼（100ms以内）

## テスト設計

### コンポーネントテスト（Vue）

#### DangerousQueryDialog.vueテスト（既存拡張）

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DangerousQueryDialog from '@/components/query-builder/dialog/DangerousQueryDialog.vue'

describe('DangerousQueryDialog.vue - mutation-builder対応', () => {
  it('INSERT実行時にinfoレベルの確認ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'insert',
          riskLevel: 'safe',
          riskFactors: [],
          affectedTables: ['users'],
          hasWhereClause: false
        },
        sql: 'INSERT INTO users (name) VALUES (\'Alice\')',
        countdownSeconds: 0
      }
    })

    expect(wrapper.text()).toContain('データを挿入します')
  })

  it('UPDATE（WHERE無）実行時にdangerレベルの警告ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'update',
          riskLevel: 'danger',
          riskFactors: [
            {
              code: 'UPDATE_WITHOUT_WHERE',
              message: 'WHERE句がないため、テーブルの全行が更新されます'
            }
          ],
          affectedTables: ['users'],
          hasWhereClause: false
        },
        sql: 'UPDATE users SET age = 30',
        countdownSeconds: 5
      }
    })

    expect(wrapper.text()).toContain('全行を更新します')
    expect(wrapper.text()).toContain('WHERE句がないため、テーブルの全行が更新されます')
  })

  it('DELETE（WHERE無）実行時にdangerレベルの警告ダイアログが表示される', () => {
    const wrapper = mount(DangerousQueryDialog, {
      props: {
        open: true,
        analysisResult: {
          queryType: 'delete',
          riskLevel: 'danger',
          riskFactors: [
            {
              code: 'DELETE_WITHOUT_WHERE',
              message: 'WHERE句がないため、テーブルの全行が削除されます'
            }
          ],
          affectedTables: ['users'],
          hasWhereClause: false
        },
        sql: 'DELETE FROM users',
        countdownSeconds: 5
      }
    })

    expect(wrapper.text()).toContain('全行を削除します')
    expect(wrapper.text()).toContain('WHERE句がないため、テーブルの全行が削除されます')
  })
})
```

#### mutation-builderストアテスト

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMutationBuilderStore } from '@/stores/mutation-builder'

describe('mutation-builderストア - 安全機能統合', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('INSERT時のanalysisResultがsafeレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('INSERT')

    expect(store.analysisResult.queryType).toBe('insert')
    expect(store.analysisResult.riskLevel).toBe('safe')
  })

  it('UPDATE（WHERE有）時のanalysisResultがwarningレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')
    store.addWhereCondition({
      id: '1',
      type: 'condition',
      column: { tableId: 'users', columnName: 'id' },
      operator: '=',
      value: '1',
      isValid: true
    })

    expect(store.analysisResult.queryType).toBe('update')
    expect(store.analysisResult.riskLevel).toBe('warning')
    expect(store.analysisResult.hasWhereClause).toBe(true)
  })

  it('UPDATE（WHERE無）時のanalysisResultがdangerレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('UPDATE')

    expect(store.analysisResult.queryType).toBe('update')
    expect(store.analysisResult.riskLevel).toBe('danger')
    expect(store.analysisResult.hasWhereClause).toBe(false)
    expect(store.analysisResult.riskFactors).toHaveLength(1)
    expect(store.analysisResult.riskFactors[0].code).toBe('UPDATE_WITHOUT_WHERE')
  })

  it('DELETE（WHERE無）時のanalysisResultがdangerレベルになる', () => {
    const store = useMutationBuilderStore()
    store.setMutationType('DELETE')

    expect(store.analysisResult.queryType).toBe('delete')
    expect(store.analysisResult.riskLevel).toBe('danger')
    expect(store.analysisResult.hasWhereClause).toBe(false)
    expect(store.analysisResult.riskFactors).toHaveLength(1)
    expect(store.analysisResult.riskFactors[0].code).toBe('DELETE_WITHOUT_WHERE')
  })
})
```

### E2Eテスト

1. **INSERT実行時の確認ダイアログ**
   - INSERT実行 → infoレベルダイアログ表示 → 確認 → 実行成功

2. **UPDATE（WHERE無）実行時の最重要警告**
   - UPDATE（WHERE無）実行 → dangerレベルダイアログ表示 → カウントダウン → チェックボックスオン → 実行成功

3. **DELETE（WHERE無）実行時の最重要警告**
   - DELETE（WHERE無）実行 → dangerレベルダイアログ表示 → カウントダウン → チェックボックスオン → 実行成功

4. **クエリ履歴記録**
   - INSERT/UPDATE/DELETE実行 → 履歴に記録 → 履歴を開いて確認

## マイグレーション/デプロイ

### 既存データへの影響

なし（新機能追加のみ）

### 設定変更

なし（既存の安全設定を再利用）

### データベーススキーマ変更

なし

## セキュリティ考慮事項

### SQLインジェクション対策

- Rust側で識別子をエスケープ（既存実装）
- 値はプレースホルダーを使用（既存実装）

### 権限チェック

- データベース側の権限チェックに依存
- INSERT/UPDATE/DELETE権限がない場合、実行時にエラーが返される

### 監査ログ

- 実行したINSERT/UPDATE/DELETEは履歴に記録される
- WHERE句の有無も記録される（Phase 9で監査ログ機能を実装予定）

## 将来の拡張性

### Phase 1（本実装）

- DangerousQueryDialog拡張
- WHERE句なし検出ロジック
- 警告レベル設定
- クエリ履歴・保存機能

### Phase 2（将来対応）

- 影響行数プレビュー機能（EXPLAIN結果）
- トランザクション管理
- ロールバック機能

### Phase 3（将来対応）

- 監査ログ機能（Phase 9）
- 実行履歴のエクスポート
- クエリ実行の承認フロー
