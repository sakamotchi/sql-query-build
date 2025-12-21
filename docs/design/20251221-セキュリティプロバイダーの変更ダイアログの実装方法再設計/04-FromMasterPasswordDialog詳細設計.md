# FromMasterPasswordDialog 詳細設計

## 概要
Master Passwordプロバイダーから Simple への移行を担当する専用ダイアログ。

**初期実装スコープ:** Master Password → Simple のみ
**将来実装予定:** Master Password → Keychain

## ファイル
`app/components/security/provider-change/FromMasterPasswordDialog.vue`

## Props (初期実装)

```typescript
interface Props {
  // 初期実装では 'simple' のみサポート
  targetProvider: 'simple'
}
```

## State

```typescript
// ダイアログの開閉状態
const isOpen = defineModel<boolean>('open')

// フェーズ管理
type Phase = 'confirm' | 'authenticate' | 'switching' | 'complete' | 'error'
const currentPhase = ref<Phase>('confirm')

// パスワード入力 (認証用)
const currentPassword = ref('')
const showPassword = ref(false)

// エラー管理
const errorMessage = ref<string | null>(null)

// ローディング状態
const loading = ref(false)
```

## Computed

```typescript
// 次へ進めるかどうかの判定
const canProceed = computed(() => {
  if (currentPhase.value === 'confirm') return true

  if (currentPhase.value === 'authenticate') {
    return !!currentPassword.value
  }

  return false
})

// ボタンラベル
const actionButtonLabel = computed(() => {
  switch (currentPhase.value) {
    case 'confirm': return '続行'
    case 'authenticate': return '認証'
    default: return '次へ'
  }
})
```

## Methods

### nextPhase()
```typescript
/**
 * 次のフェーズへ進む
 * フローはシンプルで線形:
 * confirm → authenticate → switching → complete
 */
async function nextPhase() {
  errorMessage.value = null

  try {
    switch (currentPhase.value) {
      case 'confirm':
        currentPhase.value = 'authenticate'
        break

      case 'authenticate':
        await verifyAndSwitch()
        break
    }
  } catch (error) {
    console.error('[FromMasterPasswordDialog] Error in nextPhase:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '不明なエラーが発生しました'
  }
}
```

### verifyAndSwitch()
```typescript
/**
 * パスワード検証と切り替えを実行
 */
async function verifyAndSwitch() {
  loading.value = true

  try {
    // パスワード検証
    const securityStore = useSecurityStore()
    const success = await securityStore.verifyMasterPassword(currentPassword.value)

    if (!success) {
      errorMessage.value = 'パスワードが正しくありません'
      loading.value = false
      return
    }

    // 検証成功 → 切り替え開始
    currentPhase.value = 'switching'
    await nextTick()
    await switchProvider()
  } catch (error) {
    console.error('[FromMasterPasswordDialog] Error in verifyAndSwitch:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '認証に失敗しました'
  } finally {
    loading.value = false
  }
}
```

### switchProvider()
```typescript
/**
 * プロバイダー切り替えを実行
 */
async function switchProvider() {
  loading.value = true

  try {
    const { switchFromMasterPassword } = useProviderSwitch()

    // 初期実装: Simpleへの切り替えのみ
    await switchFromMasterPassword({
      targetProvider: 'simple',
      currentPassword: currentPassword.value
    })

    currentPhase.value = 'complete'

    // 2秒後にダイアログを閉じる
    setTimeout(() => {
      isOpen.value = false
      reset()
    }, 2000)
  } catch (error) {
    console.error('[FromMasterPasswordDialog] Error switching provider:', error)
    currentPhase.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'プロバイダーの切り替えに失敗しました'
  } finally {
    loading.value = false
  }
}
```

### reset()
```typescript
/**
 * 状態をリセット
 */
function reset() {
  currentPhase.value = 'confirm'
  currentPassword.value = ''
  showPassword.value = false
  errorMessage.value = null
  loading.value = false
}
```

### cancel()
```typescript
/**
 * キャンセル
 */
function cancel() {
  isOpen.value = false
  reset()
}
```

## Template 構造

```vue
<template>
  <UModal
    v-model:open="isOpen"
    title="セキュリティプロバイダーの変更"
    description="プロバイダーを変更します。既存の接続情報は新しいプロバイダーで再暗号化されます。"
    :prevent-close="currentPhase === 'switching'"
  >
    <template #body>
      <div class="space-y-5">
        <!-- 確認フェーズ -->
        <div v-if="currentPhase === 'confirm'" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <ProviderCard provider="master-password" variant="current" />
            <ProviderCard :provider="targetProvider" variant="target" />
          </div>

          <UAlert color="amber" variant="soft" icon="i-heroicons-exclamation-triangle">
            <template #title>重要な注意事項</template>
            <ul class="text-sm space-y-1 mt-2 list-disc list-inside">
              <li>変更中は接続情報にアクセスできません</li>
              <li>処理中にアプリを終了しないでください</li>
              <li>失敗時は元のプロバイダーに自動的に戻ります</li>
            </ul>
          </UAlert>
        </div>

        <!-- 認証フェーズ -->
        <div v-if="currentPhase === 'authenticate'" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            現在のマスターパスワードで認証してください。
          </p>

          <UFormField label="マスターパスワード" required>
            <UInput
              v-model="currentPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="パスワードを入力"
              autocomplete="current-password"
              @keyup.enter="canProceed && nextPhase()"
            />
          </UFormField>

          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700 dark:text-gray-200">パスワードを表示</span>
            <USwitch v-model="showPassword" />
          </div>
        </div>

        <!-- 切り替え中フェーズ -->
        <div v-if="currentPhase === 'switching'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin" />
            <p class="text-lg font-medium mt-4">プロバイダーを切り替え中...</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              接続情報を再暗号化しています。しばらくお待ちください。
            </p>
          </div>
        </div>

        <!-- 完了フェーズ -->
        <div v-if="currentPhase === 'complete'" class="space-y-4">
          <div class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-emerald-500" />
            <p class="text-lg font-medium mt-4">切り替え完了</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              プロバイダーが正常に変更されました。
            </p>
          </div>
        </div>

        <!-- エラーフェーズ -->
        <div v-if="currentPhase === 'error'" class="space-y-4">
          <UAlert color="red" variant="soft" icon="i-heroicons-x-circle">
            <template #title>エラーが発生しました</template>
            <p class="text-sm mt-2">{{ errorMessage }}</p>
          </UAlert>
        </div>

        <!-- インラインエラー表示 -->
        <UAlert
          v-if="errorMessage && currentPhase !== 'error'"
          color="red"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
        >
          {{ errorMessage }}
        </UAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton
          v-if="currentPhase !== 'switching' && currentPhase !== 'complete'"
          variant="outline"
          color="gray"
          :disabled="currentPhase === 'switching'"
          @click="cancel"
        >
          キャンセル
        </UButton>
        <UButton
          v-if="currentPhase === 'error'"
          color="primary"
          @click="reset"
        >
          やり直す
        </UButton>
        <UButton
          v-if="['confirm', 'authenticate'].includes(currentPhase)"
          color="primary"
          :loading="loading"
          :disabled="!canProceed || loading"
          @click="nextPhase"
        >
          {{ actionButtonLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
```

## フロー図

```
[confirm]
    |
    v
[authenticate] ←---- パスワード検証
    |
    v
[switching]
    |
    v
[complete]
    |
    v
ダイアログ閉じる

※ エラー時は[error]へ遷移
```

## バリデーションルール

### confirm フェーズ
- 常に進行可能

### authenticate フェーズ
- パスワードが入力されている(`!!currentPassword.value`)
- Enterキーでも次へ進める(`@keyup.enter`)

## エラーハンドリング

### パスワード検証エラー
- `verifyMasterPassword()` が false を返す場合
- `errorMessage` に「パスワードが正しくありません」を設定
- `currentPhase` は `authenticate` のまま(再入力可能)

### バックエンドエラー
- `switchProvider()` 実行中のエラー
- `currentPhase` を `'error'` に設定
- エラーフェーズでは「やり直す」ボタンを表示

## 特徴的な実装

### 1. 認証とプロバイダー切り替えの統合
`verifyAndSwitch()` メソッドで以下を連続実行:
1. パスワード検証
2. 検証成功時、`switching` フェーズへ遷移
3. `switchProvider()` 実行

これにより、認証成功後に自動的に切り替え処理が開始される。

### 2. Enterキー対応
```vue
<UInput
  @keyup.enter="canProceed && nextPhase()"
/>
```
パスワード入力後、Enterキーで次へ進める。

## テストケース (初期実装)

### 1. Master Password → Simple (正常系)
1. confirm フェーズで「続行」をクリック → authenticate へ
2. パスワード未入力 → ボタン無効化
3. 間違ったパスワード入力 → エラーメッセージ表示、authenticate のまま
4. 正しいパスワード入力 → 自動的に switching → complete → ダイアログ閉じる

### 2. Enterキー操作
1. authenticate フェーズでパスワード入力
2. Enterキー押下 → 次へ進む

### 3. エラーハンドリング
1. パスワード検証エラー → エラーメッセージ表示、authenticate のまま
2. バックエンドエラー発生 → error フェーズへ
3. 「やり直す」クリック → confirm フェーズへリセット

### 4. キャンセル処理
1. 各フェーズで「キャンセル」クリック → ダイアログ閉じる
2. 状態がリセットされる

## FromSimpleDialog との違い (初期実装)

| 項目 | FromSimpleDialog | FromMasterPasswordDialog |
|------|------------------|-------------------------|
| 移行パターン | Simple → Master Password | Master Password → Simple |
| 認証フェーズ | なし | あり(必須) |
| 初期化フェーズ | あり(マスターパスワード設定) | なし |
| フェーズ数 | 5 | 5 |
| パスワード入力 | 新しいパスワード | 現在のパスワード |
| 主な分岐 | なし(線形フロー) | 認証成功/失敗 |
| Enterキー対応 | なし | あり |

## 将来の拡張 (Keychain対応時)

Keychain対応時は以下の変更が必要:

1. **Props の拡張**
   ```typescript
   interface Props {
     targetProvider: 'simple' | 'keychain'
   }
   ```

2. **switchProvider の条件分岐**
   ```typescript
   await switchFromMasterPassword({
     targetProvider: props.targetProvider,
     currentPassword: currentPassword.value
   })
   ```

3. **テンプレートの更新**
   - ProviderCardの`provider`属性を動的に
   ```vue
   <ProviderCard :provider="targetProvider" variant="target" />
   ```
