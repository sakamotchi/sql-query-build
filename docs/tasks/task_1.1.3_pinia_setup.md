# タスク 1.1.3: Pinia ストア設定

**WBS参照**: フェーズ1.1 プロジェクト環境構築
**タスクID**: 1.1.3
**工数**: 0.5日
**依存関係**: 1.1.1 (Tauri + Vue.js プロジェクト初期化)
**作業日**: 2025年10月5日

---

## 📋 タスク概要

Vue 3 + TypeScript環境にPinia状態管理ライブラリを導入し、アプリケーション全体で使用できる状態管理の基盤を構築します。

### 目的
- アプリケーション全体で共有する状態を管理するための仕組みを導入
- TypeScriptの型安全性を活かした状態管理を実現
- 今後実装する接続管理、テーマ管理、クエリ管理などのストアの基盤を準備

### 完了条件
- ✅ Piniaがインストールされ、プロジェクトに統合されている
- ✅ サンプルストアが動作し、状態管理が正常に機能する
- ✅ TypeScriptの型推論が正しく動作する
- ✅ ストアの基本的な使い方が理解できるサンプルコードが実装されている

---

## 🔧 技術スタック

| 項目 | 技術 | バージョン |
|------|------|-----------|
| 状態管理 | Pinia | ^2.x |
| フレームワーク | Vue 3 | ^3.5.13 |
| 言語 | TypeScript | ~5.6.2 |
| ビルドツール | Vite | ^6.0.3 |

---

## 📁 ディレクトリ構造

```
src/
├── stores/
│   ├── index.ts          # ストアのエクスポート（将来的な拡張用）
│   └── counter.ts        # サンプルストア（動作確認用）
├── main.ts               # Pinia初期化を追加
└── App.vue               # 動作確認用コード追加
```

---

## 🚀 実装手順

### 1. パッケージインストール

```bash
npm install pinia
```

**期待される結果**:
- `package.json`に`pinia`が追加される
- `node_modules`にパッケージがインストールされる

---

### 2. Pinia初期設定 (`src/main.ts`)

```typescript
import { createApp } from "vue";
import { createPinia } from 'pinia';  // 追加
import App from "./App.vue";

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
})

const pinia = createPinia();  // 追加

createApp(App)
  .use(vuetify)
  .use(pinia)  // 追加
  .mount("#app");
```

**変更点**:
- `createPinia`をインポート
- Piniaインスタンスを作成
- アプリケーションに`.use(pinia)`でプラグインとして登録

---

### 3. サンプルストア作成 (`src/stores/counter.ts`)

Composition API スタイルでストアを作成します。

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * カウンターストア（サンプル）
 * Pinia動作確認用のシンプルなカウンター実装
 */
export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0);
  const lastUpdated = ref<Date | null>(null);

  // Getters
  const doubleCount = computed(() => count.value * 2);
  const isEven = computed(() => count.value % 2 === 0);

  // Actions
  function increment() {
    count.value++;
    lastUpdated.value = new Date();
  }

  function decrement() {
    count.value--;
    lastUpdated.value = new Date();
  }

  function reset() {
    count.value = 0;
    lastUpdated.value = new Date();
  }

  function setCount(value: number) {
    count.value = value;
    lastUpdated.value = new Date();
  }

  return {
    // State
    count,
    lastUpdated,
    // Getters
    doubleCount,
    isEven,
    // Actions
    increment,
    decrement,
    reset,
    setCount,
  };
});
```

**実装のポイント**:
- Composition API スタイル（`() => { ... }`）を使用
- `ref()`でリアクティブなstateを定義
- `computed()`でgettersを定義
- 通常の関数としてactionsを定義
- TypeScriptの型推論が自動的に効く

---

### 4. ストアエクスポート (`src/stores/index.ts`)

将来的な拡張を考慮してエクスポートファイルを作成します。

```typescript
/**
 * ストアの集約エクスポート
 * 全てのストアをここからエクスポートする
 */

export { useCounterStore } from './counter';

// 今後追加されるストア:
// export { useConnectionStore } from './connection';
// export { useThemeStore } from './theme';
// export { useQueryStore } from './query';
// export { useHistoryStore } from './history';
```

**目的**:
- ストアのインポートを統一
- 将来的なストア追加時の拡張性を確保

---

### 5. App.vueでの動作確認

既存の`App.vue`を編集してPiniaの動作を確認します。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useCounterStore } from './stores/counter';

const greetMsg = ref("");
const name = ref("");

// Piniaストアを使用
const counterStore = useCounterStore();

async function greet() {
  greetMsg.value = await invoke("greet", { name: name.value });
}
</script>

<template>
  <main class="container">
    <h1>Welcome to Tauri + Vue</h1>

    <!-- Pinia動作確認セクション -->
    <div class="pinia-test">
      <h2>Pinia Store Test</h2>
      <p>Count: {{ counterStore.count }}</p>
      <p>Double Count: {{ counterStore.doubleCount }}</p>
      <p>Is Even: {{ counterStore.isEven ? 'Yes' : 'No' }}</p>
      <div class="button-group">
        <button @click="counterStore.increment">+1</button>
        <button @click="counterStore.decrement">-1</button>
        <button @click="counterStore.reset">Reset</button>
      </div>
      <p v-if="counterStore.lastUpdated">
        Last updated: {{ counterStore.lastUpdated.toLocaleString() }}
      </p>
    </div>

    <hr />

    <!-- 既存のTauriテストセクション -->
    <div class="row">
      <a href="https://vite.dev" target="_blank">
        <img src="/vite.svg" class="logo vite" alt="Vite logo" />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>

    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <p>{{ greetMsg }}</p>
  </main>
</template>

<style scoped>
.pinia-test {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 2px solid #42b983;
  border-radius: 8px;
  background-color: rgba(66, 185, 131, 0.1);
}

.pinia-test h2 {
  margin-top: 0;
  color: #42b983;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 1rem 0;
}

hr {
  margin: 2rem 0;
  border: 1px solid #ccc;
}

.logo.vite:hover {
  filter: drop-shadow(0 0 2em #747bff);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #249b73);
}
</style>

<!-- 既存のグローバルスタイルは省略 -->
```

**追加内容**:
- `useCounterStore`をインポート
- Pinia動作確認セクションを追加
- ボタンでカウンター操作を実装
- stateとgettersの表示
- 既存のTauriテストセクションは保持

---

## ✅ テスト手順

### 1. 開発サーバー起動

```bash
npm run dev
```

### 2. 動作確認項目

| # | 確認項目 | 期待される動作 |
|---|---------|--------------|
| 1 | アプリケーション起動 | エラーなく起動する |
| 2 | 初期表示 | Count: 0 が表示される |
| 3 | +1ボタンクリック | カウントが1増加する |
| 4 | -1ボタンクリック | カウントが1減少する |
| 5 | Resetボタンクリック | カウントが0に戻る |
| 6 | Double Count表示 | カウントの2倍の値が表示される |
| 7 | Is Even表示 | 偶数のとき"Yes"、奇数のとき"No" |
| 8 | Last updated表示 | ボタンクリック時に時刻が更新される |
| 9 | TypeScript型推論 | IDEで`counterStore.`入力時に補完が効く |
| 10 | ビルド確認 | `npm run build`でエラーなくビルドできる |

### 3. TypeScript型チェック

```bash
npm run build
```

エラーが出ないことを確認します。

---

## 🎓 Pinia使用ガイド

### ストアの基本的な使い方

#### 1. ストアのインポート

```typescript
import { useCounterStore } from '@/stores/counter';
```

#### 2. コンポーネントで使用

```typescript
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter';

const counterStore = useCounterStore();

// Stateへのアクセス
console.log(counterStore.count);

// Gettersへのアクセス
console.log(counterStore.doubleCount);

// Actionsの実行
counterStore.increment();
</script>
```

#### 3. リアクティビティの保持（分割代入）

```typescript
import { storeToRefs } from 'pinia';

const counterStore = useCounterStore();
// storeToRefsを使用してリアクティビティを保持
const { count, doubleCount } = storeToRefs(counterStore);
// actionsは通常の分割代入でOK
const { increment, decrement } = counterStore;
```

---

## 📚 今後の拡張予定

このタスクで構築したPinia基盤を使って、以下のストアを実装予定:

| ストア名 | 実装予定タスク | 役割 |
|---------|--------------|------|
| `useConnectionStore` | 1.3.5 | データベース接続情報管理 |
| `useThemeStore` | 1.4.5 | 環境別テーマ管理 |
| `useQueryStore` | 1.6.x | クエリビルダー状態管理 |
| `useHistoryStore` | 2.5.x | クエリ履歴管理 |
| `useWindowStore` | 1.5.x | マルチウィンドウ状態管理 |

---

## 🔗 参考リンク

- [Pinia公式ドキュメント](https://pinia.vuejs.org/)
- [Pinia with TypeScript](https://pinia.vuejs.org/cookbook/composing-stores.html)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

---

## 📝 変更ファイル一覧

| ファイルパス | 変更種別 | 説明 |
|------------|---------|------|
| `package.json` | 更新 | pinia依存関係追加 |
| `src/main.ts` | 編集 | Pinia初期化コード追加 |
| `src/stores/` | 新規作成 | ストアディレクトリ |
| `src/stores/index.ts` | 新規作成 | ストアエクスポート |
| `src/stores/counter.ts` | 新規作成 | サンプルストア |
| `src/App.vue` | 編集 | 動作確認コード追加 |

---

## ✅ 完了チェックリスト

- [ ] Piniaパッケージがインストールされている
- [ ] `src/main.ts`にPinia初期化コードが追加されている
- [ ] `src/stores/`ディレクトリが作成されている
- [ ] `src/stores/counter.ts`サンプルストアが実装されている
- [ ] `src/stores/index.ts`エクスポートファイルが作成されている
- [ ] `src/App.vue`で動作確認コードが追加されている
- [ ] `npm run dev`でアプリケーションが起動する
- [ ] カウンター操作が正常に動作する
- [ ] TypeScriptの型推論が正しく動作する
- [ ] `npm run build`でビルドエラーがない

---

## 🏁 完了基準

WBSタスク1.1.3の完了条件:
> 状態管理が動作

**判定**: 上記チェックリストが全て完了し、Piniaストアを使った状態管理が正常に動作すれば完了とする。

---

**作成者**: Claude Code
**最終更新**: 2025年10月5日
