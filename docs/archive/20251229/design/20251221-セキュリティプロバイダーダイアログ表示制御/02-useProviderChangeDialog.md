# useProviderChangeDialog 設計 (改訂版)

## 概要
動的コンポーネントの算出ロジックを廃止し、各ダイアログの表示状態（フラグ）を管理するシンプルな状態管理ロジックに変更する。

## インターフェース

```typescript
interface UseProviderChangeDialogReturn {
  // 各ダイアログの表示状態
  isFromSimpleDialogOpen: Ref<boolean>
  isFromMasterPasswordDialogOpen: Ref<boolean>
  
  // 操作メソッド
  openChangeDialog: (to: SecurityProvider) => void
  closeAllDialogs: () => void
}
```

## 実装ロジック

### State
```typescript
const isFromSimpleDialogOpen = ref(false)
const isFromMasterPasswordDialogOpen = ref(false)
```

### Methods

#### openChangeDialog(to: SecurityProvider)
現在のプロバイダーと移行先プロバイダー（`to`）の組み合わせを判定し、適切なフラグを `true` にする。

1. **現在のプロバイダー取得**: `securityStore.currentProvider`
2. **バリデーション**:
   - 現在のプロバイダーが取得できない場合はエラーログ。
   - `current === to` の場合は警告ログ。
3. **分岐ロジック**:
   - `current='simple'` AND `to='master-password'`
     -> `isFromSimpleDialogOpen.value = true`
   - `current='master-password'` AND `to='simple'`
     -> `isFromMasterPasswordDialogOpen.value = true`
   - その他（未実装の組み合わせ）
     -> 警告ログを出力し何もしない。

#### closeAllDialogs()
全てのフラグを `false` にする。
（基本的には `v-model:open` で個別に閉じられるが、リセット用として用意）

## コード例

```typescript
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSecurityStore } from '~/stores/security'
import type { SecurityProvider } from '~/types'

export function useProviderChangeDialog() {
  const securityStore = useSecurityStore()
  const { currentProvider } = storeToRefs(securityStore)

  // 各ダイアログの表示状態
  const isFromSimpleDialogOpen = ref(false)
  const isFromMasterPasswordDialogOpen = ref(false)

  /**
   * ダイアログを開く
   */
  function openChangeDialog(to: SecurityProvider) {
    if (!currentProvider.value) {
      console.error('現在のプロバイダーが取得できません')
      return
    }

    if (currentProvider.value === to) {
      console.warn('既に同じプロバイダーです')
      return
    }

    // Simple -> Master Password
    if (currentProvider.value === 'simple' && to === 'master-password') {
      isFromSimpleDialogOpen.value = true
      return
    }

    // Master Password -> Simple
    if (currentProvider.value === 'master-password' && to === 'simple') {
      isFromMasterPasswordDialogOpen.value = true
      return
    }

    // 将来の拡張: Keychainなど
    console.warn(`未実装の移行パターンです: ${currentProvider.value} -> ${to}`)
  }

  /**
   * 全てのダイアログを閉じる
   */
  function closeAllDialogs() {
    isFromSimpleDialogOpen.value = false
    isFromMasterPasswordDialogOpen.value = false
  }

  return {
    isFromSimpleDialogOpen,
    isFromMasterPasswordDialogOpen,
    openChangeDialog,
    closeAllDialogs
  }
}
```

## 以前の実装との比較

| 項目 | 旧実装 (動的コンポーネント版) | 新実装 (フラグ制御版) |
|------|-----------------------------|---------------------|
| 状態管理 | `isOpen`, `targetProvider` | `isFromSimpleDialogOpen`, `isFromMasterPasswordDialogOpen` |
| 戻り値 | `dialogComponent` (Component), `targetProviderTyped` | なし (親で直接コンポーネント使用) |
| 複雑度 | 高 (Computedによる動的決定) | 低 (単純な条件分岐) |
| 拡張性 | 新しいパターン追加時にswitch文修正 | 新しいパターン追加時にif文とref追加 |
