# 1.5b.2 コア機能実装 - タスク分割インデックス

このディレクトリには、[1.5b.2_core_functionality.md](../1.5b.2_core_functionality.md)を3.1.1レベル（タスクレベル）で分割したファイルが格納されています。

---

## 📋 タスク一覧

### サブフェーズ2.1: Composables・型定義（1日 / 8時間）

| タスクID | ファイル | 内容 | 工数 |
|---------|---------|------|------|
| 1.5b.2.1.1 | [2.1.1_useEnvironment.md](2.1.1_useEnvironment.md) | useEnvironment composable作成 | 2h |
| 1.5b.2.1.2 | [2.1.2_useTauri.md](2.1.2_useTauri.md) | useTauri composable作成 | 2h |
| 1.5b.2.1.3 | [2.1.3_types.md](2.1.3_types.md) | 型定義ファイル作成 | 1.5h |
| 1.5b.2.1.4 | [2.1.4_useTheme.md](2.1.4_useTheme.md) | useTheme composable作成 | 2.5h |

**合計**: 8時間

---

### サブフェーズ2.2: Piniaストア移行（1日 / 9.5時間）

| タスクID | ファイル | 内容 | 工数 |
|---------|---------|------|------|
| 1.5b.2.2.1 | [2.2.1_connectionStore.md](2.2.1_connectionStore.md) | connectionストア移行 | 3h |
| 1.5b.2.2.2 | [2.2.2_themeStore.md](2.2.2_themeStore.md) | themeストア移行 | 1.5h |
| 1.5b.2.2.3 | [2.2.3_windowStore.md](2.2.3_windowStore.md) | windowストア移行 | 1.5h |
| 1.5b.2.2.4 | [2.2.4_settingsStore.md](2.2.4_settingsStore.md) | settingsストア移行 | 1.5h |
| 1.5b.2.2.5 | [2.2.5_securityStore.md](2.2.5_securityStore.md) | securityストア移行 | 2h |

**合計**: 9.5時間

---

### サブフェーズ2.3: 共通コンポーネント（1.5日 / 12時間）

| タスクID | ファイル | 内容 | 工数 |
|---------|---------|------|------|
| 1.5b.2.3.1 | [2.3.1_EnvironmentHeader.md](2.3.1_EnvironmentHeader.md) | EnvironmentHeader.vue作成 | 3h |
| 1.5b.2.3.2 | [2.3.2_EnvironmentBadge.md](2.3.2_EnvironmentBadge.md) | EnvironmentBadge.vue作成 | 1.5h |
| 1.5b.2.3.3 | [2.3.3_EnvironmentIndicator.md](2.3.3_EnvironmentIndicator.md) | EnvironmentIndicator.vue作成 | 1.5h |
| 1.5b.2.3.4 | [2.3.4_EnvironmentWarningBanner.md](2.3.4_EnvironmentWarningBanner.md) | EnvironmentWarningBanner.vue作成 | 2h |

**合計**: 8時間（実装）+ 4時間（テスト・調整）= 12時間

---

### サブフェーズ2.4: ランチャーページ（2.5日 / 15.5時間）

| タスクID | ファイル | 内容 | 工数 |
|---------|---------|------|------|
| 1.5b.2.4.1 | [2.4.1_launcherPage.md](2.4.1_launcherPage.md) | pages/index.vue作成 | 4h |
| 1.5b.2.4.2 | [2.4.2_ConnectionCard.md](2.4.2_ConnectionCard.md) | ConnectionCard.vue作成 | 3h |
| 1.5b.2.4.3 | [2.4.3_ConnectionList.md](2.4.3_ConnectionList.md) | ConnectionList.vue作成 | 2h |
| 1.5b.2.4.4 | [2.4.4_LauncherToolbar.md](2.4.4_LauncherToolbar.md) | LauncherToolbar.vue作成 | 2h |
| 1.5b.2.4.5 | [2.4.5_SearchFilter.md](2.4.5_SearchFilter.md) | SearchFilter.vue作成 | 2.5h |
| 1.5b.2.4.6 | [2.4.6_EmptyState.md](2.4.6_EmptyState.md) | EmptyState.vue作成 | 1.5h |

**合計**: 15時間（実装）+ 5時間（統合・テスト）= 20時間

---

### サブフェーズ2.5: 接続フォームページ（2日 / 10時間）

| タスクID | ファイル | 内容 | 工数 |
|---------|---------|------|------|
| 1.5b.2.5.1 | [2.5.1_connectionFormPage.md](2.5.1_connectionFormPage.md) | pages/connection-form.vue作成 | 4h |
| 1.5b.2.5.2 | [2.5.2_EnvironmentSelector.md](2.5.2_EnvironmentSelector.md) | EnvironmentSelector.vue作成 | 2h |
| 1.5b.2.5.3 | [2.5.3_EnvironmentColorPicker.md](2.5.3_EnvironmentColorPicker.md) | EnvironmentColorPicker.vue作成 | 2.5h |
| 1.5b.2.5.4 | [2.5.4_ThemePreview.md](2.5.4_ThemePreview.md) | ThemePreview.vue作成 | 1.5h |

**合計**: 10時間（実装）+ 6時間（統合・テスト）= 16時間

---

## 📊 総合工数サマリー

| サブフェーズ | 工数 | 期間 |
|------------|------|------|
| 2.1 Composables・型定義 | 8時間 | 1日 |
| 2.2 Piniaストア移行 | 9.5時間 | 1日 |
| 2.3 共通コンポーネント | 12時間 | 1.5日 |
| 2.4 ランチャーページ | 20時間 | 2.5日 |
| 2.5 接続フォームページ | 16時間 | 2日 |

**総工数**: 約65.5時間（約8日間）

---

## 🔗 依存関係図

```
2.1 Composables・型定義
  ├─ 2.1.1 useEnvironment
  ├─ 2.1.2 useTauri
  ├─ 2.1.3 型定義
  └─ 2.1.4 useTheme (depends on 2.1.1, 2.1.3)
       ↓
2.2 Piniaストア移行
  ├─ 2.2.1 connectionストア (depends on 2.1.2, 2.1.3)
  ├─ 2.2.2 themeストア (depends on 2.1.3)
  ├─ 2.2.3 windowストア (depends on 2.1.3)
  ├─ 2.2.4 settingsストア (depends on 2.1.3)
  └─ 2.2.5 securityストア (depends on 2.1.3)
       ↓
2.3 共通コンポーネント
  ├─ 2.3.1 EnvironmentHeader (depends on 2.1.1, 2.1.4)
  ├─ 2.3.2 EnvironmentBadge (depends on 2.1.1, 2.1.3)
  ├─ 2.3.3 EnvironmentIndicator (depends on 2.1.1, 2.1.3)
  └─ 2.3.4 EnvironmentWarningBanner (depends on 2.1.1, 2.1.3)
       ↓
2.4 ランチャーページ
  ├─ 2.4.1 index.vue (depends on 2.2.1, 2.3.1, 2.4.2)
  ├─ 2.4.2 ConnectionCard (depends on 2.1.3, 2.3.2, 2.3.3)
  ├─ 2.4.3 ConnectionList (depends on 2.1.3, 2.4.2)
  ├─ 2.4.4 LauncherToolbar
  ├─ 2.4.5 SearchFilter (depends on 2.1.3)
  └─ 2.4.6 EmptyState
       ↓
2.5 接続フォームページ
  ├─ 2.5.1 connection-form.vue (depends on 2.2.1, 2.3.1, 2.5.2)
  ├─ 2.5.2 EnvironmentSelector (depends on 2.1.1, 2.1.3)
  ├─ 2.5.3 EnvironmentColorPicker (depends on 2.1.3)
  └─ 2.5.4 ThemePreview (depends on 2.1.1, 2.1.3)
```

---

## 📝 使い方

1. 各タスクは独立したマークダウンファイルとして作成されています
2. 依存関係を確認しながら、順番に実装してください
3. 各ファイルには以下の情報が含まれています：
   - タスクの目的
   - 実装内容（コード例）
   - 確認事項（チェックリスト）
   - 成果物
   - 次のタスクへのリンク

---

## ✅ 進捗管理

各タスクファイル内の「確認事項」チェックリストを使用して進捗を管理してください。

---

## 📚 参照

- [元の設計書: 1.5b.2_core_functionality.md](../1.5b.2_core_functionality.md)
- [プロジェクト全体設計: 1.5b.1_fresh_start_plan.md](../1.5b.1_fresh_start_plan.md)

---

**作成日**: 2025-12-13
**バージョン**: 1.0
**作成者**: Claude Code
