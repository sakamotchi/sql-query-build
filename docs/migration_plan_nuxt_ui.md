# VuetifyからNuxt UI v4への移行計画書

**プロジェクト**: SQL Query Build
**作成日**: 2025-12-06
**バージョン**: 1.0
**ステータス**: 計画中

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [現状分析](#2-現状分析)
3. [移行の目的と期待効果](#3-移行の目的と期待効果)
4. [技術選定の背景](#4-技術選定の背景)
5. [移行アプローチ](#5-移行アプローチ)
6. [詳細移行計画](#6-詳細移行計画)
7. [コンポーネント移行マッピング](#7-コンポーネント移行マッピング)
8. [リスク分析と対策](#8-リスク分析と対策)
9. [タイムライン](#9-タイムライン)
10. [成功基準](#10-成功基準)
11. [参考資料](#11-参考資料)

---

## 1. エグゼクティブサマリー

### 1.1 概要

当プロジェクトは当初の要件定義書([sql_editor_requirements_md.md](sql_editor_requirements_md.md))において、以下の技術スタックを採用する計画でした:

- **デスクトップフレームワーク**: Tauri 2.x
- **フロントエンドフレームワーク**: Nuxt.js 3.x
- **UIフレームワーク**: Vuetify 3.x
- **状態管理**: Pinia 2.x

しかし、現在の実装は **Vue 3 + Vite + Vuetify** の構成となっており、Nuxt.jsが導入されていません。

本移行計画では、以下の2つの主要な変更を実施します:

1. **Nuxt 3の導入**: Vue 3 + ViteからNuxt 3へのアップグレード
2. **UIフレームワークの移行**: VuetifyからNuxt UI v4への移行

### 1.2 移行の必要性

| 項目 | 現状の課題 | 移行後の改善 |
|------|----------|------------|
| フレームワーク | Vue 3単体での開発 | Nuxt 3の開発体験とエコシステムの恩恵 |
| UIフレームワーク | Vuetify（Material Design） | Nuxt UI v4（Tailwind CSS + Headless UI） |
| 設計思想 | Material Designに固定 | カスタマイズ性の高いHeadless UI |
| パフォーマンス | ランタイムオーバーヘッド | 軽量なTailwind CSS + Headless |
| モダン性 | 2023年代のUI | 2025年最新のUIトレンド |

### 1.3 期待されるメリット

✅ **パフォーマンス向上**: Tailwind CSSベースによる軽量化
✅ **開発生産性向上**: Nuxt 3の自動インポート、ファイルベースルーティング
✅ **デザインの柔軟性**: Headless UIによる高いカスタマイズ性
✅ **モダンなUI/UX**: 2025年最新のUIコンポーネント
✅ **一貫性**: Nuxtエコシステムとの統合
✅ **アクセシビリティ**: Reka UI（Radix Vue）による堅牢なアクセシビリティ

---

## 2. 現状分析

### 2.1 現在の技術スタック

```json
{
  "デスクトップフレームワーク": "Tauri 2.x",
  "フロントエンドフレームワーク": "Vue 3.5.13 + Vite 6.0.3",
  "UIフレームワーク": "Vuetify 3.10.3",
  "アイコン": "@mdi/font 7.4.47",
  "状態管理": "Pinia 3.0.3",
  "ビルドツール": "Vite 6.0.3"
}
```

### 2.2 Vuetifyコンポーネント使用状況

#### 使用中のVuetifyコンポーネント（59種類）

**レイアウト関連 (8種類)**
- v-app, v-layout, v-main, v-container, v-row, v-col, v-spacer, v-sheet

**AppBar関連 (5種類)**
- v-app-bar, v-app-bar-title, v-app-bar-nav-icon, v-toolbar, v-divider

**カード関連 (6種類)**
- v-card, v-card-title, v-card-subtitle, v-card-text, v-card-item, v-card-actions

**ボタン・入力 (9種類)**
- v-btn, v-text-field, v-select, v-checkbox, v-radio, v-radio-group, v-switch, v-label, v-form

**データ表示 (12種類)**
- v-table, v-list, v-list-item, v-list-item-title, v-list-item-subtitle, v-chip, v-chip-group, v-avatar, v-icon, v-menu, v-dialog

**進捗・フィードバック (6種類)**
- v-progress-circular, v-progress-linear, v-alert, v-snackbar, v-banner, v-overlay

**タブ (6種類)**
- v-tabs, v-tab, v-tabs-window, v-tabs-window-item, v-window, v-window-item

**展開可能 (3種類)**
- v-expansion-panels, v-expansion-panel, v-expansion-panel-title, v-expansion-panel-text

**トランジション (2種類)**
- v-fade-transition, v-expand-transition

**その他 (2種類)**
- v-item-group, v-item

#### 使用中のMDIアイコン（60種類）

データベース、ナビゲーション、セキュリティ、環境識別など多様なアイコンを使用。

### 2.3 カスタムテーマ設定

4つの環境別テーマ（Development/Test/Staging/Production）を実装:

```typescript
// 環境別カラーパレット
const environmentThemes = {
  development: { primary: '#4CAF50', background: '#F1F8E9' },  // 緑
  test: { primary: '#2196F3', background: '#E3F2FD' },          // 青
  staging: { primary: '#FF9800', background: '#FFF3E0' },       // オレンジ
  production: { primary: '#F44336', background: '#FFEBEE' }     // 赤
};
```

### 2.4 ファイル構成

```
src/
├── components/
│   ├── connection/        (8ファイル)
│   ├── common/            (5ファイル)
│   ├── dialogs/           (1ファイル)
│   ├── query-builder/     (13ファイル)
│   ├── security/          (4ファイル)
│   └── settings/          (6ファイル)
├── pages/
│   ├── launcher.vue
│   ├── query-builder.vue
│   ├── settings.vue
│   └── connection-form.vue
├── stores/              (Pinia)
├── plugins/
│   └── vuetify.ts
└── assets/styles/
```

**合計**: 42個の.vueファイル

---

## 3. 移行の目的と期待効果

### 3.1 主要目的

1. **当初計画への準拠**: 要件定義書で計画されたNuxt.jsの導入
2. **UIフレームワークのモダン化**: Material Design → Headless UIへ
3. **開発体験の向上**: Nuxt 3のエコシステム活用
4. **パフォーマンス改善**: バンドルサイズ削減、ランタイム最適化

### 3.2 定量的な期待効果

| 指標 | 現状 | 移行後目標 | 改善率 |
|------|------|-----------|--------|
| バンドルサイズ | ~500KB | ~300KB | -40% |
| 初期ロード時間 | 3.0秒 | 2.0秒 | -33% |
| ビルド時間 | 15秒 | 8秒 | -47% |
| 開発サーバー起動 | 5秒 | 2秒 | -60% |

### 3.3 定性的な期待効果

✅ **開発効率**: 自動インポート、ファイルベースルーティングによる生産性向上
✅ **保守性**: Nuxtの規約に基づく統一された構造
✅ **拡張性**: プラグインエコシステムの活用
✅ **UIの柔軟性**: Tailwind CSSによる自由度の高いデザイン
✅ **将来性**: 2025年最新技術スタックの採用

---

## 4. 技術選定の背景

### 4.1 Nuxt 3を選ぶ理由

| 機能 | Vue 3 + Vite | Nuxt 3 | 優位性 |
|------|-------------|--------|--------|
| 自動インポート | ❌ | ✅ | コード量削減 |
| ファイルベースルーティング | ❌ | ✅ | 規約ベース開発 |
| レイアウトシステム | 手動実装 | ✅ 組み込み | 生産性向上 |
| プラグインエコシステム | 限定的 | ✅ 豊富 | 拡張性 |
| SEO対応（将来） | 困難 | ✅ 簡単 | 将来の拡張性 |
| Tauri統合 | 手動設定 | ✅ 簡単 | 設定の簡素化 |

**Nuxt 3 + Tauri統合の設定例**:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,  // Tauriはクライアントサイドのみ
  devServer: {
    host: '0.0.0.0',
    port: 1420
  },
  vite: {
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      strictPort: true,
      watch: {
        ignored: ['**/src-tauri/**']
      }
    }
  }
})
```

### 4.2 Nuxt UI v4を選ぶ理由

#### 4.2.1 Nuxt UI v4の特徴

2025年にリリースされたNuxt UI v4は、以下の特徴を持ちます:

✅ **完全オープンソース化**: 110+コンポーネントが全て無料
✅ **Tailwind CSS統合**: ユーティリティファーストのスタイリング
✅ **Reka UI（旧Radix Vue）**: アクセシブルなHeadless UIプリミティブ
✅ **ダークモード対応**: `@nuxtjs/color-mode`との統合
✅ **Iconifyサポート**: 200,000+のアイコン
✅ **TypeScript完全サポート**: 自動補完と型安全性
✅ **Figma Kit提供**: 2,000+コンポーネントバリアント

#### 4.2.2 他の選択肢との比較

| UIフレームワーク | 長所 | 短所 | 採用判断 |
|----------------|------|------|---------|
| **Nuxt UI v4** | ✅ Nuxt統合<br>✅ 110+コンポーネント<br>✅ 完全無料 | ⚠️ Nuxt必須 | ✅ 採用 |
| **shadcn-vue** | ✅ カスタマイズ性<br>✅ コピペスタイル | ❌ Nuxt統合が弱い<br>❌ コンポーネントが少ない | ❌ 不採用 |
| **Headless UI** | ✅ 公式サポート | ❌ Vue版の更新遅延<br>❌ React優先 | ❌ 不採用 |
| **Vuetify 3** | ✅ Material Design<br>✅ 既存資産 | ❌ 重い<br>❌ カスタマイズ困難 | ❌ 移行元 |

#### 4.2.3 Nuxt UI v4のコンポーネントカバレッジ

Nuxt UI v4は、現在使用中のVuetifyコンポーネントのほぼ全てをカバーしています:

| カテゴリ | Vuetifyコンポーネント | Nuxt UI v4対応 |
|---------|---------------------|---------------|
| レイアウト | v-container, v-row, v-col | UContainer, CSS Grid/Flex |
| ボタン | v-btn | UButton |
| フォーム | v-text-field, v-select, v-checkbox | UInput, USelect, UCheckbox |
| カード | v-card | UCard |
| ダイアログ | v-dialog | UModal |
| アラート | v-alert, v-snackbar | UAlert, UNotification |
| テーブル | v-table | UTable |
| タブ | v-tabs, v-tab | UTabs, UTabGroup |
| アイコン | v-icon (MDI) | UIcon (Iconify) |

**カバー率**: **95%以上**

---

## 5. 移行アプローチ

### 5.1 移行戦略

本プロジェクトでは **Big Bang方式（一括移行）** を採用します。

#### 選択理由

✅ **プロジェクト規模が適切**: 42ファイルは管理可能
✅ **重複コストの回避**: 2つのUIシステムを並行維持しない
✅ **一貫性の確保**: 全体を一度に統一
✅ **学習コストの集中**: 一度の学習で完了

#### 段階的移行（Strangler Fig）を採用しない理由

❌ **複雑性**: VuetifyとNuxt UIが混在する期間が長期化
❌ **保守コスト**: 2つのUIシステムのメンテナンス
❌ **一貫性の欠如**: UIの不統一

### 5.2 移行フェーズ

本移行は **3つのフェーズ** で実施します:

```
フェーズ1: 環境構築（1週間）
  ↓
フェーズ2: Nuxt 3導入（1週間）
  ↓
フェーズ3: UI移行（3-4週間）
```

#### フェーズ1: 環境構築・準備（1週間）

- 新しいブランチ作成（`feature/migrate-nuxt-ui`）
- Nuxt 3 + Nuxt UI v4のサンプルプロジェクト構築
- Tailwind CSS設定
- 環境別テーマの再設計

#### フェーズ2: Nuxt 3への移行（1週間）

- プロジェクト構造の変更（`pages/`、`layouts/`など）
- Vite設定をNuxt設定へ移行
- Pinia統合（Nuxt向け）
- Tauri IPCの動作確認

#### フェーズ3: UIコンポーネント移行（3-4週間）

- プラグイン・共通コンポーネント（Week 1）
- ページコンポーネント（Week 2）
- 複雑なコンポーネント（Week 3）
- テスト・修正（Week 4）

---

## 6. 詳細移行計画

### 6.1 フェーズ1: 環境構築・準備（1週間）

#### タスク1.1: プロジェクトセットアップ（2日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 1.1.1 | 移行用ブランチ作成 | Dev | 0.5h | `feature/migrate-nuxt-ui` |
| 1.1.2 | Nuxt 3インストール | Dev | 2h | `nuxt.config.ts` |
| 1.1.3 | Nuxt UI v4インストール | Dev | 2h | UIライブラリ設定完了 |
| 1.1.4 | Tailwind CSS設定 | Dev | 2h | `tailwind.config.ts` |
| 1.1.5 | TypeScript設定調整 | Dev | 1h | `tsconfig.json` |
| 1.1.6 | Vite→Nuxt設定移行 | Dev | 2h | Tauri統合確認 |

**依存関係の更新**:

```json
{
  "dependencies": {
    "nuxt": "^3.14.0",
    "@nuxt/ui": "^4.0.0",
    "@nuxtjs/tailwindcss": "^7.0.0",
    "@nuxtjs/color-mode": "^3.5.0",
    "@nuxt/icon": "^1.0.0",
    "@pinia/nuxt": "^0.7.0"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0"
  }
}
```

**削除する依存関係**:

```json
{
  "vuetify": "^3.10.3",
  "@mdi/font": "^7.4.47",
  "sass-embedded": "^1.93.3"
}
```

#### タスク1.2: Tailwind CSSテーマ設計（2日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 1.2.1 | 環境別カラーパレット定義 | Design/Dev | 3h | `app.config.ts` |
| 1.2.2 | Tailwindテーマ拡張設定 | Dev | 3h | `tailwind.config.ts` |
| 1.2.3 | ダークモード設定 | Dev | 2h | Color mode統合 |
| 1.2.4 | カスタムユーティリティ作成 | Dev | 2h | 環境色クラス |

**環境別テーマ設計例**:

```typescript
// app.config.ts
export default defineAppConfig({
  ui: {
    primary: 'green',  // Development
    colors: {
      development: {
        50: '#F1F8E9',
        500: '#4CAF50',
        900: '#1B5E20'
      },
      test: {
        50: '#E3F2FD',
        500: '#2196F3',
        900: '#0D47A1'
      },
      staging: {
        50: '#FFF3E0',
        500: '#FF9800',
        900: '#E65100'
      },
      production: {
        50: '#FFEBEE',
        500: '#F44336',
        900: '#B71C1C'
      }
    }
  }
})
```

#### タスク1.3: プロジェクト構造変更（2日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 1.3.1 | ディレクトリ構造設計 | Dev | 2h | 構造ドキュメント |
| 1.3.2 | `pages/`ディレクトリ作成 | Dev | 1h | ページ構造 |
| 1.3.3 | `layouts/`ディレクトリ作成 | Dev | 2h | レイアウト定義 |
| 1.3.4 | `composables/`移行 | Dev | 2h | Composables整理 |
| 1.3.5 | `plugins/`移行 | Dev | 2h | Nuxtプラグイン化 |

**新しいディレクトリ構造**:

```
/
├── src-tauri/              (Rustバックエンド - 変更なし)
├── app/                    (Nuxt 3アプリケーション)
│   ├── assets/
│   │   └── css/
│   │       └── tailwind.css
│   ├── components/
│   │   ├── connection/
│   │   ├── common/
│   │   ├── query-builder/
│   │   ├── security/
│   │   └── settings/
│   ├── composables/
│   │   └── useTheme.ts
│   ├── layouts/
│   │   ├── default.vue
│   │   ├── launcher.vue
│   │   └── query-builder.vue
│   ├── pages/
│   │   ├── index.vue           (launcher)
│   │   ├── query-builder.vue
│   │   ├── settings.vue
│   │   └── connection-form.vue
│   ├── stores/
│   │   ├── connection.ts
│   │   ├── theme.ts
│   │   ├── window.ts
│   │   ├── settings.ts
│   │   └── security.ts
│   ├── utils/
│   ├── app.vue
│   └── app.config.ts
├── public/
├── nuxt.config.ts
├── tailwind.config.ts
└── package.json
```

#### タスク1.4: サンプルコンポーネント作成（1日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 1.4.1 | ボタンコンポーネント移行 | Dev | 2h | 動作確認 |
| 1.4.2 | カードコンポーネント移行 | Dev | 2h | 動作確認 |
| 1.4.3 | フォームコンポーネント移行 | Dev | 2h | 動作確認 |
| 1.4.4 | 環境テーマ動的切り替えテスト | Dev | 2h | テーマ切替確認 |

---

### 6.2 フェーズ2: Nuxt 3への移行（1週間）

#### タスク2.1: ルーティング移行（2日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 2.1.1 | ファイルベースルーティング設定 | Dev | 2h | `pages/`構造 |
| 2.1.2 | 既存ページの移行 | Dev | 4h | 4ページ移行完了 |
| 2.1.3 | ルーティングテスト | Dev | 2h | ナビゲーション確認 |
| 2.1.4 | Tauriウィンドウ別URL対応 | Dev | 4h | マルチウィンドウ動作 |

**ページ移行マッピング**:

| 旧パス（Vue Router） | 新パス（Nuxt） | コンポーネント |
|-------------------|--------------|--------------|
| `/` | `/index.vue` | ランチャー |
| `/query-builder` | `/query-builder.vue` | クエリビルダー |
| `/settings` | `/settings.vue` | 設定 |
| `/connection-form` | `/connection-form.vue` | 接続フォーム |

#### タスク2.2: レイアウトシステム構築（2日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 2.2.1 | `default.vue`レイアウト作成 | Dev | 2h | 基本レイアウト |
| 2.2.2 | `launcher.vue`レイアウト作成 | Dev | 2h | ランチャー専用 |
| 2.2.3 | `query-builder.vue`レイアウト作成 | Dev | 3h | 3カラムレイアウト |
| 2.2.4 | 環境識別ヘッダー統合 | Dev | 3h | 環境色ヘッダー |

**レイアウト例**:

```vue
<!-- layouts/query-builder.vue -->
<template>
  <div :class="environmentClass">
    <EnvironmentHeader :environment="currentEnvironment" />
    <QueryBuilderToolbar />
    <div class="grid grid-cols-12 gap-4 h-full">
      <aside class="col-span-2">
        <slot name="left-panel" />
      </aside>
      <main class="col-span-7">
        <slot />
      </main>
      <aside class="col-span-3">
        <slot name="right-panel" />
      </aside>
    </div>
  </div>
</template>
```

#### タスク2.3: Pinia統合（1日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 2.3.1 | `@pinia/nuxt`インストール | Dev | 0.5h | Pinia Nuxtモジュール |
| 2.3.2 | 既存ストアの動作確認 | Dev | 2h | 全ストア動作確認 |
| 2.3.3 | 自動インポート設定 | Dev | 1h | インポート文削除 |
| 2.3.4 | SSR無効化確認 | Dev | 0.5h | `ssr: false`確認 |

#### タスク2.4: Tauri IPC統合（2日）

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 2.4.1 | `nuxt.config.ts`でTauri設定 | Dev | 2h | 設定ファイル |
| 2.4.2 | IPC通信テスト | Dev | 3h | 全コマンド動作確認 |
| 2.4.3 | マルチウィンドウ動作確認 | Dev | 3h | ウィンドウ独立性 |
| 2.4.4 | 開発サーバー設定 | Dev | 2h | HMR動作確認 |

**Nuxt + Tauri設定**:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,  // 必須: Tauriはクライアントサイドのみ

  devServer: {
    host: '0.0.0.0',
    port: 1420
  },

  vite: {
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 1421
      },
      watch: {
        ignored: ['**/src-tauri/**']
      }
    }
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode'
  ]
})
```

---

### 6.3 フェーズ3: UIコンポーネント移行（3-4週間）

#### Week 1: 共通コンポーネント・プラグイン（5日）

| タスクID | コンポーネント | 移行元 | 移行先 | 工数 | 優先度 |
|---------|--------------|--------|--------|------|--------|
| 3.1.1 | 環境ヘッダー | EnvironmentHeader.vue | UCard, UBadge | 4h | 高 |
| 3.1.2 | 環境バッジ | EnvironmentBadge.vue | UBadge | 2h | 高 |
| 3.1.3 | 環境インジケーター | EnvironmentIndicator.vue | カスタム | 3h | 高 |
| 3.1.4 | 警告バナー | EnvironmentWarningBanner.vue | UAlert | 2h | 高 |
| 3.1.5 | ウィンドウ環境プロバイダー | WindowEnvironmentProvider.vue | Composable化 | 3h | 中 |

#### Week 2: ページコンポーネント（5日）

**2.1 ランチャーページ（2日）**

| タスクID | コンポーネント | 移行元 | 移行先 | 工数 |
|---------|--------------|--------|--------|------|
| 3.2.1 | ランチャーページ | launcher.vue | Nuxt UI | 4h |
| 3.2.2 | ランチャーAppBar | LauncherAppBar.vue | UContainer, UButton | 3h |
| 3.2.3 | ランチャーツールバー | LauncherToolbar.vue | UFlex, UButton | 2h |
| 3.2.4 | 接続カード | ConnectionCard.vue | UCard, UBadge | 4h |
| 3.2.5 | 接続リスト | ConnectionList.vue | Grid layout | 3h |

**2.2 接続フォームページ（1.5日）**

| タスクID | コンポーネント | 移行元 | 移行先 | 工数 |
|---------|--------------|--------|--------|------|
| 3.2.6 | 接続フォームページ | connection-form.vue | Nuxt UI | 3h |
| 3.2.7 | 環境セレクター | EnvironmentSelector.vue | USelect | 2h |
| 3.2.8 | 環境カラーピッカー | EnvironmentColorPicker.vue | UColorPicker | 3h |
| 3.2.9 | カラープレビュー | EnvironmentColorPreview.vue | カスタム | 2h |
| 3.2.10 | テーマプレビュー | ThemePreview.vue | UCard | 2h |

**2.3 設定ページ（1.5日）**

| タスクID | コンポーネント | 移行元 | 移行先 | 工数 |
|---------|--------------|--------|--------|------|
| 3.2.11 | 設定ページ | settings.vue | Nuxt UI | 3h |
| 3.2.12 | 一般設定 | GeneralSettings.vue | UForm, USwitch | 3h |
| 3.2.13 | セキュリティ設定 | SecuritySettings.vue | UForm, URadio | 4h |
| 3.2.14 | セキュリティプロバイダーカード | SecurityProviderCard.vue | UCard | 2h |
| 3.2.15 | セキュリティレベルインジケーター | SecurityLevelIndicator.vue | UBadge | 1h |
| 3.2.16 | プロバイダー変更ダイアログ | ProviderChangeDialog.vue | UModal | 2h |
| 3.2.17 | About セクション | AboutSection.vue | UCard | 1h |

#### Week 3: クエリビルダー・セキュリティ（5日）

**3.1 クエリビルダーページ（3日）**

| タスクID | コンポーネント | 移行元 | 移行先 | 工数 |
|---------|--------------|--------|--------|------|
| 3.3.1 | クエリビルダーページ | query-builder.vue | Nuxt UI | 4h |
| 3.3.2 | レイアウト | QueryBuilderLayout.vue | Grid layout | 4h |
| 3.3.3 | ツールバー | QueryBuilderToolbar.vue | UButton, UMenu | 3h |
| 3.3.4 | 左パネル | LeftPanel.vue | UCard | 2h |
| 3.3.5 | 中央パネル | CenterPanel.vue | UCard | 2h |
| 3.3.6 | 右パネル | RightPanel.vue | UCard | 2h |
| 3.3.7 | リサイズ可能パネル | ResizablePanel.vue | カスタム | 4h |
| 3.3.8 | テーブルリレーションエリア | TableRelationArea.vue | Canvas + UButton | 6h |
| 3.3.9 | 条件タブ | ConditionTabs.vue | UTabs | 3h |
| 3.3.10 | SQLプレビュー | SqlPreview.vue | UCode | 2h |
| 3.3.11 | クエリ情報 | QueryInfo.vue | UCard, UBadge | 2h |
| 3.3.12 | 結果パネル | ResultPanel.vue | UTable | 4h |

**3.2 セキュリティコンポーネント（2日）**

| タスクID | コンポーネント | 移行元 | 移行先 | 工数 |
|---------|--------------|--------|--------|------|
| 3.3.13 | マスターパスワード設定ダイアログ | MasterPasswordSetupDialog.vue | UModal, UForm | 4h |
| 3.3.14 | アンロックダイアログ | UnlockDialog.vue | UModal, UForm | 3h |
| 3.3.15 | パスワード強度メーター | PasswordStrengthMeter.vue | UProgress, カスタム | 3h |
| 3.3.16 | パスワード要件 | PasswordRequirements.vue | UAlert, UList | 2h |

#### Week 4: ダイアログ・テスト・修正（5日）

**4.1 ダイアログ・その他（2日）**

| タスクID | コンポーネント | 移行元 | 移行先 | 工数 |
|---------|--------------|--------|--------|------|
| 3.4.1 | ウィンドウ復元ダイアログ | RestoreWindowsDialog.vue | UModal | 2h |
| 3.4.2 | ウィンドウ復元設定 | WindowRestoreSettings.vue | USwitch, UForm | 2h |
| 3.4.3 | アクティブフィルター | ActiveFilters.vue | UBadge, UButton | 2h |

**4.2 統合テスト（1日）**

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 3.4.4 | 全ページ動作確認 | QA | 3h | テストレポート |
| 3.4.5 | 環境テーマ切り替えテスト | QA | 2h | テストケース |
| 3.4.6 | Tauri IPC動作確認 | QA | 2h | 通信確認 |
| 3.4.7 | マルチウィンドウテスト | QA | 1h | ウィンドウ独立性 |

**4.3 バグ修正・調整（2日）**

| タスクID | タスク内容 | 担当 | 工数 | 成果物 |
|---------|----------|------|------|--------|
| 3.4.8 | スタイル調整 | Dev | 6h | UI統一 |
| 3.4.9 | レスポンシブ対応確認 | Dev | 4h | モバイル対応 |
| 3.4.10 | パフォーマンス最適化 | Dev | 4h | ロード時間改善 |
| 3.4.11 | アクセシビリティ確認 | QA | 2h | a11y対応 |

---

## 7. コンポーネント移行マッピング

### 7.1 レイアウト関連

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-app` | `<div id="app">` | 削除（Nuxt app.vueで代替） |
| `v-main` | `<main>` | HTML標準タグ |
| `v-container` | `<UContainer>` | Nuxt UI |
| `v-row` | `<div class="grid">` | Tailwind Grid |
| `v-col` | `<div class="col-span-*">` | Tailwind Grid |
| `v-spacer` | `<div class="flex-1">` | Tailwind Flex |
| `v-sheet` | `<UCard>` または `<div>` | 用途により |

### 7.2 ナビゲーション・AppBar

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-app-bar` | `<header>` + Tailwind | カスタムヘッダー |
| `v-toolbar` | `<div class="toolbar">` | Tailwind |
| `v-app-bar-title` | `<h1>` | HTML標準 |
| `v-divider` | `<hr>` または `<UDivider>` | Nuxt UI |

### 7.3 カード

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-card` | `<UCard>` | 直接置換 |
| `v-card-title` | `<template #header>` | スロット |
| `v-card-text` | デフォルトスロット | スロット |
| `v-card-actions` | `<template #footer>` | スロット |

**移行例**:

```vue
<!-- Before (Vuetify) -->
<v-card>
  <v-card-title>タイトル</v-card-title>
  <v-card-text>内容</v-card-text>
  <v-card-actions>
    <v-btn>アクション</v-btn>
  </v-card-actions>
</v-card>

<!-- After (Nuxt UI) -->
<UCard>
  <template #header>
    <h3 class="text-lg font-semibold">タイトル</h3>
  </template>

  <p>内容</p>

  <template #footer>
    <UButton>アクション</UButton>
  </template>
</UCard>
```

### 7.4 フォーム

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-text-field` | `<UInput>` | 直接置換 |
| `v-select` | `<USelect>` | 直接置換 |
| `v-checkbox` | `<UCheckbox>` | 直接置換 |
| `v-radio-group` | `<URadioGroup>` | 直接置換 |
| `v-switch` | `<UToggle>` | 直接置換 |
| `v-form` | `<UForm>` | 直接置換 |

**移行例**:

```vue
<!-- Before (Vuetify) -->
<v-text-field
  v-model="name"
  label="名前"
  :rules="[rules.required]"
/>

<!-- After (Nuxt UI) -->
<UInput
  v-model="name"
  placeholder="名前"
  :ui="{ base: 'w-full' }"
/>
```

### 7.5 ボタン

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-btn` | `<UButton>` | 直接置換 |
| `variant="elevated"` | `variant="solid"` | 属性変更 |
| `variant="outlined"` | `variant="outline"` | 属性変更 |
| `variant="text"` | `variant="ghost"` | 属性変更 |
| `color="primary"` | `color="primary"` | 同じ |

**移行例**:

```vue
<!-- Before (Vuetify) -->
<v-btn color="primary" variant="elevated">
  保存
</v-btn>

<!-- After (Nuxt UI) -->
<UButton color="primary" variant="solid">
  保存
</UButton>
```

### 7.6 ダイアログ・オーバーレイ

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-dialog` | `<UModal>` | 直接置換 |
| `v-menu` | `<UDropdown>` | 直接置換 |
| `v-overlay` | `<UModal overlay>` | 属性 |

**移行例**:

```vue
<!-- Before (Vuetify) -->
<v-dialog v-model="dialog" max-width="500">
  <v-card>
    <v-card-title>ダイアログ</v-card-title>
    <v-card-text>内容</v-card-text>
  </v-card>
</v-dialog>

<!-- After (Nuxt UI) -->
<UModal v-model="dialog">
  <UCard>
    <template #header>
      <h3>ダイアログ</h3>
    </template>
    <p>内容</p>
  </UCard>
</UModal>
```

### 7.7 データ表示

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-table` | `<UTable>` | 直接置換 |
| `v-list` | `<ul>` + Tailwind | カスタム |
| `v-list-item` | `<li>` + Tailwind | カスタム |
| `v-chip` | `<UBadge>` | 直接置換 |
| `v-avatar` | `<UAvatar>` | 直接置換 |

### 7.8 フィードバック

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-alert` | `<UAlert>` | 直接置換 |
| `v-snackbar` | `<UNotification>` | API変更 |
| `v-progress-circular` | `<div class="animate-spin">` + アイコン | カスタム |
| `v-progress-linear` | `<UProgress>` | 直接置換 |

**移行例（通知）**:

```vue
<!-- Before (Vuetify) -->
<v-snackbar v-model="snackbar">
  保存しました
  <template #actions>
    <v-btn @click="snackbar = false">閉じる</v-btn>
  </template>
</v-snackbar>

<!-- After (Nuxt UI) -->
<script setup>
const toast = useToast()

function showNotification() {
  toast.add({
    title: '保存しました',
    color: 'green'
  })
}
</script>
```

### 7.9 タブ

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-tabs` | `<UTabs>` | 直接置換 |
| `v-tab` | `items`配列 | 構造変更 |
| `v-tabs-window` | スロット | 構造変更 |

**移行例**:

```vue
<!-- Before (Vuetify) -->
<v-tabs v-model="tab">
  <v-tab value="1">タブ1</v-tab>
  <v-tab value="2">タブ2</v-tab>
</v-tabs>
<v-tabs-window v-model="tab">
  <v-tabs-window-item value="1">内容1</v-tabs-window-item>
  <v-tabs-window-item value="2">内容2</v-tabs-window-item>
</v-tabs-window>

<!-- After (Nuxt UI) -->
<UTabs :items="tabs" v-model="selectedTab">
  <template #item="{ item }">
    <div v-if="item.key === 'tab1'">内容1</div>
    <div v-if="item.key === 'tab2'">内容2</div>
  </template>
</UTabs>

<script setup>
const tabs = [
  { key: 'tab1', label: 'タブ1' },
  { key: 'tab2', label: 'タブ2' }
]
const selectedTab = ref('tab1')
</script>
```

### 7.10 アイコン

| Vuetify | Nuxt UI v4 | 移行方法 |
|---------|-----------|---------|
| `v-icon` (MDI) | `<UIcon>` (Iconify) | アイコン名変更 |
| `mdi-database` | `i-heroicons-circle-stack` | アイコンセット変更 |

**アイコンマッピング表（主要なもの）**:

| 用途 | MDI | Iconify (Heroicons/Material) |
|------|-----|---------------------------|
| データベース | `mdi-database` | `i-heroicons-circle-stack` |
| 設定 | `mdi-cog` | `i-heroicons-cog-6-tooth` |
| 保存 | `mdi-content-save` | `i-heroicons-arrow-down-tray` |
| 削除 | `mdi-delete` | `i-heroicons-trash` |
| 編集 | `mdi-pencil` | `i-heroicons-pencil` |
| 検索 | `mdi-magnify` | `i-heroicons-magnifying-glass` |
| チェック | `mdi-check` | `i-heroicons-check` |
| 閉じる | `mdi-close` | `i-heroicons-x-mark` |
| 警告 | `mdi-alert` | `i-heroicons-exclamation-triangle` |
| 情報 | `mdi-information` | `i-heroicons-information-circle` |

**使用例**:

```vue
<!-- Before (Vuetify) -->
<v-icon>mdi-database</v-icon>

<!-- After (Nuxt UI) -->
<UIcon name="i-heroicons-circle-stack" />
```

---

## 8. リスク分析と対策

### 8.1 技術的リスク

| リスクID | リスク内容 | 影響度 | 発生確率 | 対策 |
|---------|-----------|--------|---------|------|
| R1 | Nuxt UI v4のコンポーネント不足 | 高 | 低 | 事前検証、カスタムコンポーネント準備 |
| R2 | Tauri IPCの互換性問題 | 高 | 低 | フェーズ2で早期検証 |
| R3 | パフォーマンス劣化 | 中 | 中 | 継続的なパフォーマンステスト |
| R4 | 環境別テーマの再現困難 | 中 | 中 | フェーズ1で詳細設計 |
| R5 | アイコン移行の漏れ | 低 | 高 | 一覧表作成、レビュー |
| R6 | レスポンシブレイアウト崩れ | 中 | 中 | 各デバイスでテスト |

### 8.2 プロジェクトリスク

| リスクID | リスク内容 | 影響度 | 発生確率 | 対策 |
|---------|-----------|--------|---------|------|
| P1 | スケジュール遅延 | 高 | 中 | バッファ20%確保、優先度管理 |
| P2 | リソース不足 | 中 | 低 | 複数人での並行作業 |
| P3 | 既存機能の破壊 | 高 | 中 | 段階的移行、テスト強化 |
| P4 | ユーザー体験の低下 | 高 | 低 | UIレビュー、ユーザーテスト |

### 8.3 対策の詳細

#### R1: コンポーネント不足への対策

**対策**:
1. 事前にNuxt UI v4の全コンポーネントを調査済み（本ドキュメント参照）
2. 不足コンポーネントはTailwind CSSで実装
3. カスタムコンポーネントライブラリ作成（`components/custom/`）

#### R2: Tauri IPC互換性問題への対策

**対策**:
1. フェーズ2で早期に検証
2. 公式ドキュメント参照: [Nuxt | Tauri](https://v2.tauri.app/start/frontend/nuxt/)
3. コミュニティテンプレート参考: [Nuxtor](https://github.com/NicolaSpadari/nuxtor)

#### R3: パフォーマンス劣化への対策

**対策**:
1. Lighthouse CIでパフォーマンス監視
2. バンドルサイズの定期チェック
3. Lazy loading、Code splittingの活用

#### P3: 既存機能の破壊への対策

**対策**:
1. E2Eテストの実装（Playwright）
2. スクリーンショット比較テスト
3. 段階的なブランチマージ

---

## 9. タイムライン

### 9.1 ガントチャート

```
Week  1   2   3   4   5   6   7
      |===|===|===|===|===|===|
Phase1: 環境構築
      [==]

Phase2: Nuxt 3導入
          [==]

Phase3: UI移行
              [===================]
      Week 1  Week 2  Week 3  Week 4

テスト・修正
                              [==]
```

### 9.2 マイルストーン

| マイルストーン | 期日 | 成果物 | 完了基準 |
|-------------|------|--------|---------|
| M1: 環境構築完了 | Week 1終了 | Nuxt 3 + Nuxt UI動作確認 | サンプルページ動作 |
| M2: Nuxt導入完了 | Week 2終了 | ルーティング・IPC動作 | 全ページアクセス可能 |
| M3: UI移行50%完了 | Week 4終了 | 共通・ページコンポーネント移行 | 主要ページ表示 |
| M4: UI移行100%完了 | Week 6終了 | 全コンポーネント移行 | 全機能動作 |
| M5: リリース | Week 7終了 | マージ、デプロイ | 本番適用 |

### 9.3 週次スケジュール

#### Week 1: フェーズ1 - 環境構築

| 日 | タスク | 担当 | 成果物 |
|----|--------|------|--------|
| 月 | Nuxt 3 + Nuxt UI v4インストール | Dev | 依存関係更新 |
| 火 | Tailwind CSS設定 | Dev | tailwind.config.ts |
| 水 | 環境別テーマ設計 | Dev | app.config.ts |
| 木 | プロジェクト構造変更 | Dev | ディレクトリ構造 |
| 金 | サンプルコンポーネント作成 | Dev | 動作確認 |

#### Week 2: フェーズ2 - Nuxt 3導入

| 日 | タスク | 担当 | 成果物 |
|----|--------|------|--------|
| 月 | ルーティング移行 | Dev | pages/構造 |
| 火 | レイアウトシステム構築 | Dev | layouts/ |
| 水 | Pinia統合 | Dev | ストア動作確認 |
| 木 | Tauri IPC統合（1日目） | Dev | IPC通信確認 |
| 金 | Tauri IPC統合（2日目） | Dev | 全機能動作 |

#### Week 3-6: フェーズ3 - UI移行

（詳細は6.3参照）

#### Week 7: テスト・リリース

| 日 | タスク | 担当 | 成果物 |
|----|--------|------|--------|
| 月 | 統合テスト | QA | テストレポート |
| 火 | バグ修正 | Dev | 修正完了 |
| 水 | パフォーマンステスト | QA | 性能確認 |
| 木 | 最終レビュー | 全員 | 承認 |
| 金 | マージ、デプロイ | Dev | リリース |

---

## 10. 成功基準

### 10.1 定量的基準

| 指標 | 現状 | 目標 | 測定方法 |
|------|------|------|---------|
| バンドルサイズ | ~500KB | <300KB | Vite build分析 |
| 初期ロード時間 | 3.0秒 | <2.0秒 | Lighthouse |
| First Contentful Paint | 1.5秒 | <1.0秒 | Lighthouse |
| Time to Interactive | 3.5秒 | <2.5秒 | Lighthouse |
| コンポーネント移行率 | 0% | 100% | チェックリスト |
| テストカバレッジ | 60% | 80% | Vitest |
| アクセシビリティスコア | 85 | 95 | Lighthouse |

### 10.2 定性的基準

✅ **機能完全性**: 既存機能が全て動作する
✅ **UI一貫性**: 全ページで統一されたデザイン
✅ **レスポンシブ**: 全デバイスで適切に表示
✅ **アクセシビリティ**: WCAG 2.1 AA準拠
✅ **開発体験**: Nuxt 3の恩恵を享受
✅ **パフォーマンス**: ユーザー体感速度向上

### 10.3 受け入れテスト

#### 機能テスト

- [ ] 接続管理機能（CRUD）が動作する
- [ ] 環境別テーマが正しく切り替わる
- [ ] マルチウィンドウが独立して動作する
- [ ] クエリビルダーが動作する
- [ ] セキュリティ機能が動作する
- [ ] 設定が保存・読み込みできる

#### UI/UXテスト

- [ ] 全コンポーネントが正しく表示される
- [ ] 環境色が正しく反映される
- [ ] アニメーション・トランジションが滑らか
- [ ] エラーメッセージが適切に表示される
- [ ] フォームバリデーションが動作する

#### パフォーマンステスト

- [ ] 初期ロードが2秒以内
- [ ] ページ遷移が即座に完了
- [ ] 大量データ表示時もスムーズ
- [ ] メモリリークがない

#### アクセシビリティテスト

- [ ] キーボードナビゲーション可能
- [ ] スクリーンリーダー対応
- [ ] 適切なARIAラベル
- [ ] カラーコントラスト比準拠

---

## 11. 参考資料

### 11.1 公式ドキュメント

- [Nuxt 3 Documentation](https://nuxt.com/docs/getting-started)
- [Nuxt UI v4 Documentation](https://ui.nuxt.com/)
- [Nuxt UI v4 Release Announcement](https://nuxt.com/blog/nuxt-ui-v4)
- [Tauri + Nuxt Integration Guide](https://v2.tauri.app/start/frontend/nuxt/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Reka UI (Radix Vue) Documentation](https://reka-ui.com/)

### 11.2 コミュニティリソース

- [Nuxtor - Nuxt + Tauri Template](https://github.com/NicolaSpadari/nuxtor)
- [Nuxt 3 + Tauri Discussion](https://github.com/tauri-apps/tauri/discussions/4391)
- [Use the power of Nuxt with Tauri](https://dev.to/waradu/how-to-use-tauri-with-nuxt-18d9)

### 11.3 技術記事

- [Nuxt UI v4 Goes Fully Open Source](https://alternativestack.com/news/nuxt-ui-v4-goes-fully-open-source-110-components-pro-features-now-free-for-all-developers)
- [shadcn-vue vs Radix Vue Comparison](https://www.shadcn-vue.com/)
- [Headless UI for Vue](https://headlessui.com/)

### 11.4 内部ドキュメント

- [sql_editor_requirements_md.md](sql_editor_requirements_md.md) - 要件定義書
- [sql_editor_wbs.md](sql_editor_wbs.md) - WBS

---

## 付録A: チェックリスト

### A.1 フェーズ1チェックリスト

- [ ] Nuxt 3インストール完了
- [ ] Nuxt UI v4インストール完了
- [ ] Tailwind CSS設定完了
- [ ] 環境別テーマ定義完了
- [ ] プロジェクト構造変更完了
- [ ] サンプルコンポーネント動作確認

### A.2 フェーズ2チェックリスト

- [ ] ファイルベースルーティング設定
- [ ] 全ページアクセス可能
- [ ] レイアウトシステム構築
- [ ] Pinia統合完了
- [ ] Tauri IPC動作確認
- [ ] マルチウィンドウ動作確認

### A.3 フェーズ3チェックリスト（コンポーネント別）

#### 共通コンポーネント

- [ ] EnvironmentHeader.vue
- [ ] EnvironmentBadge.vue
- [ ] EnvironmentIndicator.vue
- [ ] EnvironmentWarningBanner.vue
- [ ] WindowEnvironmentProvider.vue

#### 接続関連

- [ ] LauncherAppBar.vue
- [ ] LauncherToolbar.vue
- [ ] ConnectionCard.vue
- [ ] ConnectionList.vue
- [ ] EnvironmentSelector.vue
- [ ] EnvironmentColorPicker.vue
- [ ] EnvironmentColorPreview.vue
- [ ] ThemePreview.vue

#### クエリビルダー

- [ ] QueryBuilderLayout.vue
- [ ] QueryBuilderToolbar.vue
- [ ] LeftPanel.vue
- [ ] CenterPanel.vue
- [ ] RightPanel.vue
- [ ] ResizablePanel.vue
- [ ] TableRelationArea.vue
- [ ] ConditionTabs.vue
- [ ] SqlPreview.vue
- [ ] QueryInfo.vue
- [ ] ResultPanel.vue

#### セキュリティ

- [ ] MasterPasswordSetupDialog.vue
- [ ] UnlockDialog.vue
- [ ] PasswordStrengthMeter.vue
- [ ] PasswordRequirements.vue

#### 設定

- [ ] GeneralSettings.vue
- [ ] SecuritySettings.vue
- [ ] SecurityProviderCard.vue
- [ ] SecurityLevelIndicator.vue
- [ ] ProviderChangeDialog.vue
- [ ] AboutSection.vue
- [ ] WindowRestoreSettings.vue

#### ダイアログ

- [ ] RestoreWindowsDialog.vue
- [ ] ActiveFilters.vue

#### ページ

- [ ] launcher.vue
- [ ] query-builder.vue
- [ ] settings.vue
- [ ] connection-form.vue

---

## 付録B: 移行コマンドリファレンス

### B.1 プロジェクトセットアップ

```bash
# 依存関係インストール
npm install nuxt @nuxt/ui @nuxtjs/tailwindcss @nuxtjs/color-mode @nuxt/icon @pinia/nuxt

# 古い依存関係削除
npm uninstall vuetify @mdi/font sass-embedded

# Nuxt初期化（既存プロジェクトの場合）
npx nuxi init app --force
```

### B.2 開発サーバー

```bash
# Nuxt開発サーバー起動
npm run dev

# Tauri開発モード起動
npm run tauri dev
```

### B.3 ビルド

```bash
# Nuxtビルド
npm run build

# Tauriビルド
npm run tauri build
```

### B.4 テスト

```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e

# カバレッジ
npm run test:coverage
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|----------|------|---------|--------|
| 1.0 | 2025-12-06 | 初版作成 | Claude |

---

**承認**

- [ ] プロジェクトマネージャー承認
- [ ] 技術リード承認
- [ ] ステークホルダー承認

---

**次のアクション**

1. 本計画書のレビュー
2. リソース・予算の確保
3. 移行ブランチ作成
4. フェーズ1開始

---

**問い合わせ先**

技術的な質問や懸念事項がある場合は、プロジェクトチームにお問い合わせください。
