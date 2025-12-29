# SecuritySettings.vue 実装変更 (改訂版)

## 概要
動的コンポーネントの使用を廃止し、`FromSimpleDialog` と `FromMasterPasswordDialog` をテンプレート内に明示的に配置する。

## 変更後の構成

### Script

```typescript
import { useProviderChangeDialog } from '~/composables/useProviderChangeDialog'
import FromSimpleDialog from '~/components/security/provider-change/FromSimpleDialog.vue'
import FromMasterPasswordDialog from '~/components/security/provider-change/FromMasterPasswordDialog.vue'

// Composableから各ダイアログの開閉フラグとオープン関数を取得
const {
  isFromSimpleDialogOpen,
  isFromMasterPasswordDialogOpen,
  openChangeDialog
} = useProviderChangeDialog()

// updateProvider関数は openChangeDialog を呼ぶだけでよい
const updateProvider = (provider: SecurityProvider) => {
  // ... 省略 (既存のチェック処理) ...
  openChangeDialog(provider)
}
```

### Template

```vue
<template>
  <div class="space-y-6">
    <!-- 既存のUI要素 (UCardなど) -->
    <!-- ... -->

    <!-- USelectのイベントハンドラ -->
    <USelect
      @update:model-value="updateProvider"
      ...
    />

    <!-- ダイアログ定義 (テンプレート末尾などに配置) -->
    
    <!-- Simple -> Master Password 変更ダイアログ -->
    <FromSimpleDialog
      v-if="isFromSimpleDialogOpen"
      v-model:open="isFromSimpleDialogOpen"
      target-provider="master-password"
    />

    <!-- Master Password -> Simple 変更ダイアログ -->
    <FromMasterPasswordDialog
      v-if="isFromMasterPasswordDialogOpen"
      v-model:open="isFromMasterPasswordDialogOpen"
      target-provider="simple"
    />
    
    <!-- MasterPasswordSetupDialog (既存) -->
    <MasterPasswordSetupDialog ... />
  </div>
</template>
```

## ポイント

1. **明示的な配置**: `v-if` を使って、必要なダイアログのみをレンダリングする。
2. **Propsの固定**: `target-provider` は各ダイアログの使用目的が決まっているため、固定値（リテラル）で渡すことができる。これにより型安全性が保証される。
3. **v-model**: 各ダイアログの `open` propに対して、Composableから提供された `ref` を直接バインドする。

## 注意点
- 将来 Keychain 対応などでダイアログが増えた場合、ここに `<FromSimpleToKeychainDialog ... />` のように追加していくことになる。
- ダイアログの数が増えすぎた場合は、`ProviderChangeDialogManager` のようなラッパーコンポーネントへの切り出しを再検討する（現時点では2つなので直接配置で問題ない）。
