# セキュリティプロバイダーの変更ダイアログ実装方法再設計

## 概要
このディレクトリには、`ProviderChangeDialog.vue`の複雑性を解消し、保守性と拡張性を向上させるための再設計ドキュメントが含まれています。

**初期実装スコープ:** Simple ⇄ Master Password の2つの移行パターンのみ
**将来実装予定:** Keychainサポート

## 背景
現在の`ProviderChangeDialog.vue`は、単一コンポーネントで全てのプロバイダー移行フローを処理しているため、以下の問題が発生しています:

- フロー制御ロジックが複雑化(特に`nextPhase`関数)
- from/toの組み合わせによる条件分岐が多い
- テストケースが増大
- 保守とデバッグが困難
- 新規プロバイダー追加時の影響範囲が大きい

## 再設計の方針

**単一責任の原則**に基づき、各ダイアログコンポーネントは**1つの移行フロー**のみを担当するように分割します。

### 新しいアーキテクチャ

```
app/
├── components/
│   └── security/
│       └── provider-change/
│           ├── ProviderCard.vue              # プロバイダー情報表示(共通)
│           ├── FromSimpleDialog.vue          # Simpleからの移行専用
│           └── FromMasterPasswordDialog.vue  # Master Passwordからの移行専用
└── composables/
    ├── useProviderSwitch.ts          # プロバイダー切り替えロジック(共通)
    └── useProviderChangeDialog.ts    # ダイアログ管理ロジック(親コンポーネント用)
```

## ドキュメント一覧

### 1. [現状の問題分析](./01-現状の問題分析.md)
現在の実装における具体的な問題点を詳細に分析。

**主な内容:**
- `nextPhase`関数の複雑性
- テンプレートの条件分岐の問題
- 保守性と拡張性の課題

### 2. [新しいアーキテクチャ設計](./02-新しいアーキテクチャ設計.md)
再設計後のコンポーネント構成と設計方針。

**主な内容:**
- コンポーネント分割戦略
- 責務の明確化
- 段階的移行計画
- 現在との比較表
- **初期実装スコープ:** Simple ⇄ Master Password のみ

### 3. [FromSimpleDialog詳細設計](./03-FromSimpleDialog詳細設計.md)
Simple → Master Password への移行専用ダイアログの詳細設計。

**主な内容:**
- Props、State、Methods
- フロー図
- バリデーションルール
- テストケース
- **初期実装:** Master Passwordへの移行のみ
- **将来拡張:** Keychain対応時の変更点

### 4. [FromMasterPasswordDialog詳細設計](./04-FromMasterPasswordDialog詳細設計.md)
Master Password → Simple への移行専用ダイアログの詳細設計。

**主な内容:**
- Props、State、Methods
- 認証フロー
- バリデーションルール
- テストケース
- FromSimpleDialogとの違い
- **初期実装:** Simpleへの移行のみ
- **将来拡張:** Keychain対応時の変更点

### 5. [共通コンポーネント詳細設計](./05-共通コンポーネント詳細設計.md)
共通で使用されるコンポーネントとComposableの詳細設計。

**主な内容:**
- `ProviderCard.vue` の設計
- `useProviderSwitch.ts` Composableの設計
- 再利用性とメンテナンス性
- **初期実装:** Simple ⇄ Master Password のみ
- **将来拡張:** Keychain対応時の変更点

### 6. [親コンポーネントでの使用方法](./06-親コンポーネントでの使用方法.md)
設定ページから新しいダイアログを使用する方法。

**主な内容:**
- 3つの実装方法の比較
- `useProviderChangeDialog.ts` Composableの設計
- 推奨アプローチ
- 移行チェックリスト
- **初期実装:** Simple ⇄ Master Password のみサポート

### 7. [実装計画と優先順位](./07-実装計画と優先順位.md)
具体的な実装計画と優先順位。

**主な内容:**
- 4つのPhaseに分けた実装計画
- 各Phaseのタスクと成果物
- テスト戦略
- リスクと対策
- マイルストーン

## 主な改善点

### コードの可読性
- **変更前:** 複雑な条件分岐と三項演算子のネスト
- **変更後:** シンプルで直線的なフロー (初期実装では条件分岐なし)

### 保守性
- **変更前:** 1コンポーネントを変更すると全フローに影響
- **変更後:** フローごとに独立して変更可能

### テスタビリティ
- **変更前:** 全組み合わせのテストケースが必要
- **変更後:** フローごとに独立したテストが可能 (初期実装は2パターンのみ)

### 拡張性
- **変更前:** 新規プロバイダー追加時、既存の複雑な条件分岐を拡張
- **変更後:** 新しいダイアログコンポーネントを追加するだけ
- **Keychain対応時:** 各ファイルに明示的な拡張ポイントを記載

## クイックスタート

実装を開始する場合は、以下の順序でドキュメントを読むことを推奨します:

1. [現状の問題分析](./01-現状の問題分析.md) - 現状を理解
2. [新しいアーキテクチャ設計](./02-新しいアーキテクチャ設計.md) - 全体像を把握
3. [実装計画と優先順位](./07-実装計画と優先順位.md) - 実装計画を確認
4. 各詳細設計ドキュメント - 必要に応じて参照

## 実装ステータス

- [ ] Phase 1: 共通コンポーネントの作成
- [ ] Phase 2: 新しいダイアログコンポーネントの作成
- [ ] Phase 3: 親コンポーネントでの統合
- [ ] Phase 4: 旧コンポーネントの削除とクリーンアップ

## 関連ファイル

### 変更対象
- `app/components/security/ProviderChangeDialog.vue` (削除予定)
- 設定ページのセキュリティタブコンポーネント

### 新規作成
- `app/components/security/provider-change/ProviderCard.vue`
- `app/components/security/provider-change/FromSimpleDialog.vue`
- `app/components/security/provider-change/FromMasterPasswordDialog.vue`
- `app/composables/useProviderSwitch.ts`
- `app/composables/useProviderChangeDialog.ts`

## 参考情報

### 技術スタック
- Vue 3 Composition API
- TypeScript (strict mode)
- Nuxt UI v4
- Pinia (状態管理)

### コーディング規約
- Single File Components (`<script setup>`)
- Composable関数はプレフィックス`use`
- Props/Emitsは明示的に型定義

## 質問・フィードバック

このドキュメントに関する質問や改善提案がある場合は、プロジェクトのIssueで議論してください。

---

**作成日:** 2025-12-21
**最終更新:** 2025-12-21
**ステータス:** 設計完了、実装待ち
