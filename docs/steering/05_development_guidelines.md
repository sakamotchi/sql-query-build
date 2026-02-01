# 開発ガイドライン

**バージョン**: 1.1
**作成日**: 2025年12月29日
**最終更新**: 2026年1月31日

---

## 1. 開発環境セットアップ

### 1.1 必要なツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 18.x以上 | フロントエンド実行環境 |
| npm | 9.x以上 | パッケージ管理 |
| Rust | 1.70以上 | バックエンド開発 |
| Tauri CLI | 2.x | Tauriアプリ開発 |

### 1.2 初期セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-repo/sql-query-build.git
cd sql-query-build

# npm依存関係をインストール
npm install

# Rust依存関係は初回ビルド時に自動インストール
```

### 1.3 開発コマンド

```bash
# Tauriアプリを起動（推奨）
npm run tauri:dev

# フロントエンドのみ起動（Tauri API使用不可）
npm run dev

# TypeScript型チェック
npm run typecheck

# テスト実行（watchモード）
npm run test

# テスト実行（一回のみ）
npm run test:run

# 本番ビルド
npm run tauri:build
```

---

## 2. コーディング規約

### 2.1 TypeScript / Vue

#### 2.1.1 基本ルール

```typescript
// ✅ Good: 明示的な型定義
const connectionId: string = 'uuid-123'
function getConnection(id: string): Connection | undefined {
  // ...
}

// ❌ Bad: any型の使用
const data: any = response.data

// ✅ Good: 型推論が明らかな場合は省略可
const count = 0  // number
const items = [] as Connection[]
```

#### 2.1.2 インポート順序

```typescript
// 1. Vue / Nuxt / フレームワーク
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

// 2. 外部ライブラリ
import { invoke } from '@tauri-apps/api/core'

// 3. 内部モジュール（相対パス）
import { useConnectionStore } from '~/stores/connection'
import type { Connection } from '~/types'

// 4. コンポーネント
import ConnectionCard from '~/components/connection/ConnectionCard.vue'
```

#### 2.1.3 Vue Composition API

```vue
<script setup lang="ts">
// Props定義
interface Props {
  connectionId: string
  disabled?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

// Emits定義
interface Emits {
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
}
const emit = defineEmits<Emits>()

// リアクティブ状態
const isLoading = ref(false)
const connection = ref<Connection | null>(null)

// 算出プロパティ
const displayName = computed(() => {
  return connection.value?.name ?? 'Unknown'
})

// メソッド
async function loadConnection() {
  isLoading.value = true
  try {
    connection.value = await fetchConnection(props.connectionId)
  } finally {
    isLoading.value = false
  }
}

// ライフサイクル
onMounted(() => {
  loadConnection()
})
</script>
```

#### 2.1.4 エラーハンドリング

```typescript
// ✅ Good: try-catchで適切にハンドリング
async function executeQuery() {
  try {
    const result = await invoke('execute_query', { query })
    return result
  } catch (error) {
    if (error instanceof Error) {
      toast.error(`クエリ実行エラー: ${error.message}`)
    }
    throw error
  }
}

// ✅ Good: 型ガードを使用
function isConnectionError(error: unknown): error is ConnectionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}
```

### 2.2 Rust

#### 2.2.1 基本ルール

```rust
// ✅ Good: Result型でエラーハンドリング
pub async fn get_connection(id: &str) -> Result<Connection, ConnectionError> {
    let connection = storage
        .get(id)
        .ok_or(ConnectionError::NotFound(id.to_string()))?;
    Ok(connection)
}

// ✅ Good: 構造体のデフォルト実装
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct QueryOptions {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}
```

#### 2.2.2 エラー定義

```rust
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum ConnectionError {
    #[error("Connection not found: {0}")]
    NotFound(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}
```

#### 2.2.3 Tauriコマンド

```rust
#[tauri::command]
pub async fn get_connections(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Connection>, AppError> {
    let connections = state
        .connection_service
        .lock()
        .await
        .get_all()
        .await?;
    Ok(connections)
}
```

### 2.3 CSS / Tailwind

#### 2.3.1 クラス順序

```vue
<template>
  <!-- 順序: レイアウト → サイズ → 余白 → 装飾 → テキスト → 状態 -->
  <div
    class="flex items-center justify-between
           w-full h-12
           px-4 py-2 mb-2
           bg-white dark:bg-gray-800 rounded-lg shadow
           text-sm text-gray-900 dark:text-gray-100
           hover:bg-gray-50 transition-colors"
  >
    <!-- content -->
  </div>
</template>
```

#### 2.3.2 カスタムスタイルの使用

```vue
<style scoped>
/* Tailwindで表現できない場合のみカスタムCSS */
.query-builder-layout {
  display: grid;
  grid-template-columns: var(--left-panel-width) 1fr var(--right-panel-width);
}
</style>
```

### 2.4 多言語対応（i18n）

#### 2.4.1 基本方針

**重要**: 全てのUI表示文字列は多言語対応が必須です。

- **ハードコード禁止**: 日本語・英語を問わず、文字列のハードコードは禁止
- **翻訳キーで管理**: `i18n/locales/` のロケールファイルで全ての文字列を管理
- **リアクティブ**: 言語切り替え時に即座に表示が更新される実装を行う
- **現在対応言語**: 日本語（ja）、English（en）

#### 2.4.2 必須チェックリスト

新規コンポーネント作成時、および既存コンポーネント修正時は以下を確認：

**開発時**:
- [ ] コンポーネント内にハードコードされた文字列がない（日本語・英語問わず）
- [ ] `useI18n()` を使用して翻訳関数を取得している
- [ ] テンプレート内では `$t('翻訳キー')` を使用
- [ ] スクリプト内（トースト、ダイアログ等）では `t('翻訳キー')` を使用
- [ ] 動的な値はプレースホルダーで対応（例: `{name}`, `{count}`）
- [ ] ロケールファイル（ja.json, en.json）に対応するキーが存在する

**テスト時**:
- [ ] 日本語環境で動作確認を実施
- [ ] 英語環境で動作確認を実施
- [ ] 言語切り替え時にリアクティブに更新されることを確認

#### 2.4.3 実装パターン

##### パターン1: 静的な文字列

```vue
<script setup lang="ts">
// ❌ Bad: ハードコードされた文字列
const title = '接続一覧'

// ✅ Good: 翻訳キーを使用
const { t } = useI18n()
const title = computed(() => t('launcher.title'))
</script>

<template>
  <!-- ❌ Bad: ハードコードされた文字列 -->
  <h1>接続一覧</h1>

  <!-- ✅ Good: 翻訳キーを使用 -->
  <h1>{{ $t('launcher.title') }}</h1>
</template>
```

##### パターン2: 動的な値を含む文字列

```vue
<script setup lang="ts">
const { t } = useI18n()

// ✅ Good: プレースホルダーを使用
const message = computed(() =>
  t('launcher.stats', { count: connections.value.length })
)
</script>

<template>
  <!-- ✅ Good: プレースホルダーを使用 -->
  <p>{{ $t('launcher.stats', { count: connections.length }) }}</p>
</template>
```

ロケールファイル:
```json
{
  "launcher": {
    "stats": "{count}件の接続"
  }
}
```

##### パターン3: ボタンやフォーム要素

```vue
<template>
  <!-- ❌ Bad: ハードコード -->
  <UButton label="保存" />

  <!-- ✅ Good: 翻訳キー -->
  <UButton :label="$t('common.save')" />

  <!-- ❌ Bad: プレースホルダーもハードコード -->
  <UInput placeholder="接続名を入力..." />

  <!-- ✅ Good: プレースホルダーも翻訳キー -->
  <UInput :placeholder="$t('connection.form.fields.namePlaceholder')" />
</template>
```

##### パターン4: トースト通知

```typescript
// ❌ Bad: ハードコード
toast.add({
  title: '保存しました',
  description: '接続情報を保存しました',
  color: 'success',
})

// ✅ Good: 翻訳キーを使用
const { t } = useI18n()

toast.add({
  title: t('connection.form.messages.saveSuccess'),
  description: t('connection.form.messages.saveSuccessDesc'),
  color: 'success',
})
```

##### パターン5: 条件分岐を含む文字列

```vue
<script setup lang="ts">
const { t } = useI18n()

// ✅ Good: 条件ごとに異なる翻訳キーを使用
const buttonLabel = computed(() =>
  isEditMode.value
    ? t('connection.form.title.edit')
    : t('connection.form.title.new')
)
</script>

<template>
  <!-- ✅ Good: テンプレートでも条件分岐 -->
  <h2>{{ isEditMode ? $t('connection.form.title.edit') : $t('connection.form.title.new') }}</h2>
</template>
```

##### パターン6: 相対時刻・日付表示

```typescript
const { t, locale } = useI18n()

// ✅ Good: 相対時刻は翻訳キーで管理
function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 60_000) return t('common.relativeTime.fewSecondsAgo')
  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000)
    return t('common.relativeTime.minutesAgo', { minutes })
  }

  // ✅ Good: ロケールに応じた日付フォーマット
  return date.toLocaleString(locale.value === 'ja' ? 'ja-JP' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
```

#### 2.4.4 翻訳キーの命名規則

##### 階層構造

```
{画面名}/
├── {機能名}/
│   ├── {要素名}
│   └── {サブ機能}/
│       └── {要素名}
└── common/          # 画面内の共通要素
```

##### 命名パターン

| 要素 | キー名 | 例 |
|------|--------|-----|
| ページタイトル | `title` | `launcher.title` |
| ボタンラベル | 動詞 | `toolbar.execute`, `toolbar.save` |
| フォームラベル | `fields.{項目名}.label` | `connection.form.fields.name.label` |
| プレースホルダー | `fields.{項目名}.placeholder` | `connection.form.fields.namePlaceholder` |
| エラーメッセージ | `validation.{項目名}{エラー種別}` | `connection.form.validation.nameRequired` |
| トースト通知 | `toasts.{アクション}{結果}` | `connection.form.toasts.saveSuccess` |
| ダイアログ | `dialogs.{ダイアログ名}.{要素}` | `launcher.dialogs.delete.title` |

##### 良い例・悪い例

```json
{
  // ✅ Good: 階層構造が明確
  "connection": {
    "form": {
      "fields": {
        "name": {
          "label": "接続名",
          "placeholder": "例: 開発用MySQL"
        }
      },
      "validation": {
        "nameRequired": "接続名は必須です",
        "nameLength": "接続名は200文字以内で入力してください"
      },
      "toasts": {
        "saveSuccess": "接続を保存しました",
        "saveFailed": "接続の保存に失敗しました"
      }
    }
  },

  // ❌ Bad: フラットで分かりにくい
  "connectionNameLabel": "接続名",
  "connectionNamePlaceholder": "例: 開発用MySQL",
  "connectionNameRequired": "接続名は必須です"
}
```

#### 2.4.5 ロケールファイルの管理

##### ファイル構造

```
i18n/locales/
├── ja.json          # 日本語翻訳
└── en.json          # 英語翻訳
```

##### 追加・更新手順

1. **両方のファイルに同時に追加**: `ja.json` と `en.json` の両方に同じキーを追加
2. **キー構造を統一**: 既存のセクションと同じ階層構造を使用
3. **プレースホルダーを統一**: `{name}`, `{count}` などのプレースホルダー名を両言語で統一
4. **動作確認**: 両言語で表示を確認

##### 翻訳品質の基準

| 基準 | 説明 |
|------|------|
| 正確性 | 日本語の意味を正確に英訳 |
| 自然さ | 直訳ではなく自然な英語表現 |
| 一貫性 | 用語の使用を統一（例: "Query" の統一使用） |
| 簡潔性 | UI表示に適した簡潔な表現 |

#### 2.4.6 よくある間違いと対策

##### 間違い1: バリデーションメッセージのハードコード

```typescript
// ❌ Bad
const validate = (state: FormState): FormError[] => {
  const errors: FormError[] = []
  if (!state.name) {
    errors.push({ path: 'name', message: '接続名は必須です' })
  }
  return errors
}

// ✅ Good
const { t } = useI18n()

const validate = (state: FormState): FormError[] => {
  const errors: FormError[] = []
  if (!state.name) {
    errors.push({
      path: 'name',
      message: t('connection.form.validation.nameRequired')
    })
  }
  return errors
}
```

##### 間違い2: 文字列連結での動的メッセージ

```typescript
// ❌ Bad: 文字列連結
const message = `${count}件の接続`

// ✅ Good: プレースホルダーを使用
const message = t('launcher.stats', { count })
```

##### 間違い3: 日付フォーマットのハードコード

```typescript
// ❌ Bad: 固定フォーマット
const formattedDate = `${month}月${day}日`

// ✅ Good: ロケールに応じたフォーマット
const { locale } = useI18n()
const formattedDate = date.toLocaleDateString(
  locale.value === 'ja' ? 'ja-JP' : 'en-US'
)
```

#### 2.4.7 レビュー時のチェックポイント

コードレビュー時は以下を確認：

- [ ] ハードコードされた文字列がないか（日本語・英語問わず）
- [ ] 翻訳キーが `ja.json` と `en.json` の両方に存在するか
- [ ] プレースホルダーが正しく使用されているか
- [ ] 条件分岐が適切に翻訳キーで管理されているか
- [ ] 日付・時刻表示がロケールに対応しているか
- [ ] エラーメッセージも多言語対応されているか

---

## 3. コードレビュー手順

### 3.1 レビュー対象

| 対象 | 必須レビュー |
|------|------------|
| 新機能追加 | ○ |
| バグ修正 | ○ |
| リファクタリング | ○ |
| ドキュメント更新 | △（重要な変更のみ） |
| 設定ファイル変更 | ○ |

### 3.2 レビュー観点

#### 機能面
- [ ] 要件を満たしているか
- [ ] エッジケースが考慮されているか
- [ ] エラーハンドリングが適切か

#### コード品質
- [ ] 命名が適切か
- [ ] 重複コードがないか
- [ ] 複雑すぎないか（関数は50行以内を目安）

#### セキュリティ
- [ ] 入力値の検証が適切か
- [ ] 機密情報がログに出力されていないか
- [ ] SQLインジェクション対策がされているか

#### パフォーマンス
- [ ] 不要な再レンダリングがないか
- [ ] N+1クエリがないか
- [ ] メモリリークの可能性がないか

### 3.3 PRテンプレート

```markdown
## 概要
<!-- 変更の概要を記載 -->

## 変更内容
- [ ] 機能追加
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント

## 詳細
<!-- 詳細な説明 -->

## テスト
<!-- テスト方法・確認項目 -->

## スクリーンショット
<!-- UI変更がある場合 -->

## チェックリスト
- [ ] 型チェックが通る (`npm run typecheck`)
- [ ] テストが通る (`npm run test:run`)
- [ ] ドキュメントを更新した（必要な場合）
```

---

## 4. テスト戦略

### 4.1 テスト種類

| 種類 | ツール | 対象 | カバレッジ目標 |
|------|--------|------|--------------|
| ユニットテスト | Vitest | 関数、Composable | 80% |
| コンポーネントテスト | Vitest + Vue Test Utils | Vueコンポーネント | 60% |
| 統合テスト | Vitest | ストア、API連携 | 50% |
| Rustユニットテスト | Cargo test | Rust関数 | 70% |

### 4.2 テストファイル配置

```
tests/
├── unit/                     # ユニットテスト
│   ├── utils/
│   │   └── query-converter.test.ts
│   └── composables/
│       └── useEnvironment.test.ts
│
├── components/               # コンポーネントテスト
│   └── ConnectionCard.test.ts
│
└── integration/              # 統合テスト
    └── connection-flow.test.ts
```

### 4.3 テスト命名規則

```typescript
describe('ConnectionCard', () => {
  describe('表示', () => {
    it('接続名が正しく表示される', () => {
      // ...
    })

    it('環境バッジが正しい色で表示される', () => {
      // ...
    })
  })

  describe('操作', () => {
    it('クリックで接続イベントが発火する', () => {
      // ...
    })
  })
})
```

### 4.4 テスト記述パターン

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionCard from '~/components/connection/ConnectionCard.vue'

describe('ConnectionCard', () => {
  const mockConnection = {
    id: 'test-1',
    name: 'Test DB',
    type: 'postgresql',
    environment: 'development',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('接続名が表示される', () => {
    const wrapper = mount(ConnectionCard, {
      props: { connection: mockConnection },
    })

    expect(wrapper.text()).toContain('Test DB')
  })

  it('接続ボタンクリックでイベントが発火する', async () => {
    const wrapper = mount(ConnectionCard, {
      props: { connection: mockConnection },
    })

    await wrapper.find('[data-testid="connect-button"]').trigger('click')

    expect(wrapper.emitted('connect')).toHaveLength(1)
    expect(wrapper.emitted('connect')[0]).toEqual(['test-1'])
  })
})
```

---

## 5. ドキュメント管理

### 5.1 ドキュメント種類

| 種類 | 場所 | 更新タイミング |
|------|------|--------------|
| プロダクト要件 | `docs/01_product_requirements.md` | 要件変更時 |
| 機能設計 | `docs/02_functional_design.md` | 機能追加・変更時 |
| 技術仕様 | `docs/03_architecture_specifications.md` | アーキテクチャ変更時 |
| コード内コメント | ソースコード内 | コード変更時 |
| CLAUDE.md | ルート | プロジェクト構成変更時 |

### 5.2 コード内コメント規則

```typescript
/**
 * 接続情報を取得する
 *
 * @param id - 接続ID（UUID形式）
 * @returns 接続情報。存在しない場合はundefined
 * @throws {ConnectionError} データ取得に失敗した場合
 *
 * @example
 * ```ts
 * const connection = await getConnection('uuid-123')
 * if (connection) {
 *   console.log(connection.name)
 * }
 * ```
 */
async function getConnection(id: string): Promise<Connection | undefined> {
  // 実装
}
```

### 5.3 TODOコメント

```typescript
// TODO: Phase 2でクエリ実行機能を実装
// TODO(username): 特定の人に割り当てる場合
// FIXME: 既知の問題で修正が必要
// HACK: 一時的な回避策（後で改善が必要）
```

---

## 6. Git運用ルール

### 6.1 コミット粒度

- 1コミット = 1つの論理的な変更
- 動作する状態でコミット
- 大きな変更は複数のコミットに分割

### 6.2 コミットメッセージ

```
[type] 概要（50文字以内）

本文（任意、72文字で改行）

関連Issue: #123
```

### 6.3 PR作成ルール

- PRは小さく（300行以内を目安）
- 1PRで1つの機能・修正
- レビュアーが理解しやすい説明を記載

---

## 7. セキュリティガイドライン

### 7.1 機密情報の取り扱い

```typescript
// ❌ Bad: パスワードをログに出力
console.log(`Connection: ${username}:${password}@${host}`)

// ✅ Good: 機密情報をマスク
console.log(`Connection: ${username}:****@${host}`)
```

### 7.2 入力値の検証

```typescript
// ✅ Good: 入力値を検証
function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}
```

### 7.3 SQLインジェクション対策

```rust
// ✅ Good: パラメータ化クエリを使用
let result = sqlx::query("SELECT * FROM users WHERE id = $1")
    .bind(user_id)
    .fetch_one(&pool)
    .await?;

// ❌ Bad: 文字列連結
let query = format!("SELECT * FROM users WHERE id = '{}'", user_id);
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|----------|---------|--------|
| 2026-01-31 | 1.1 | 多言語対応（i18n）のルールセクション追加（2.4） | - |
| 2025-12-29 | 1.0 | 初版作成 | - |
