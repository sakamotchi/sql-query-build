# セキュリティプロバイダーダイアログ表示制御の簡素化

## 1. 背景と目的
現在の実装では、動的コンポーネント (`<component :is="...">`) と複雑な型計算を含む Composable を使用してダイアログを切り替えている。
しかし、以下の問題が発生している可能性がある：
- デバッグの難易度が高い（動的コンポーネントの状態が見えにくい）
- 型定義が複雑（`targetProviderTyped` など）
- 親コンポーネントのテンプレートが直感的でない

これらを解消するため、**「各ダイアログコンポーネントを親コンポーネントに直接配置し、フラグで表示制御を行う（案2）」** アプローチへ変更する。

## 2. 変更方針

### 現状（Before）
```vue
<component
  :is="dialogComponent"
  v-if="dialogComponent && targetProviderTyped"
  v-model:open="isOpen"
  :target-provider="targetProviderTyped"
/>
```

### 変更後（After）
```vue
<FromSimpleDialog
  v-if="isFromSimpleDialogOpen"
  v-model:open="isFromSimpleDialogOpen"
  target-provider="master-password"
/>

<FromMasterPasswordDialog
  v-if="isFromMasterPasswordDialogOpen"
  v-model:open="isFromMasterPasswordDialogOpen"
  target-provider="simple"
/>
```

## 3. メリット
1. **可読性向上**: どのダイアログがいつ表示されるかがテンプレート上で明白。
2. **型安全性向上**: 各コンポーネントにリテラル型でPropsを渡せるため、無理なキャストが不要。
3. **デバッグ容易性**: Vue DevTools等で各ダイアログの状態（`isOpen`）を個別に確認できる。
4. **不具合解消**: 動的コンポーネントの切り替え時に発生していた可能性のあるライフサイクルの問題（アンマウントタイミングなど）を排除できる。

## 4. 影響範囲
- `app/composables/useProviderChangeDialog.ts`: ロジックを大幅に簡素化。
- `app/components/settings/SecuritySettings.vue`: テンプレートの書き換え。
- 各ダイアログコンポーネント自体への変更はなし。
