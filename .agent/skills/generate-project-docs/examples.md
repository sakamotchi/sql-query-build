# generate-project-docs スキル - 使用例

## 例1: SELECT句拡張プロジェクト

### ユーザーの要求

```
SELECT句で関数とサブクエリを使えるようにしたい。
プロジェクトドキュメントを作成してください。
```

### スキルの実行

1. **プロジェクト名の確認**
   - プロジェクト名: `select-clause-extension`

2. **情報収集**
   - 目的: SELECT句で関数（UPPER, CONCAT等）とサブクエリを使用可能にする
   - 主要機能: 式ツリー構造、関数ビルダーUI、サブクエリビルダーUI
   - 技術的課題: 再帰的なデータ構造、データベース方言対応
   - フェーズ数: 3フェーズ

3. **ディレクトリ作成**
```bash
mkdir -p docs/projects/select-clause-extension/phases/{phase1,phase2,phase3}
```

4. **ドキュメント生成**
   - `project-plan.md`: プロジェクト概要、スコープ、成功基準
   - `requirements.md`: 機能要件、非機能要件、除外事項
   - `design.md`: 全体アーキテクチャ概要（ExpressionNode型の概要、システム構成）
   - `wbs.md`: 3フェーズに分けたタスク分解
   - `implementation-plan.md`: 段階的リリース計画、リスク管理
   - `phases/phase1/design.md`: Phase 1の詳細設計（型定義、SQL生成ロジック）
   - `phases/phase1/tasklist.md`: Phase 1の詳細タスク
   - `phases/phase1/testing.md`: Phase 1のテスト手順
   - `phases/phase2/design.md`: Phase 2の詳細設計（FunctionBuilder UI）
   - `phases/phase3/design.md`: Phase 3の詳細設計（SubqueryBuilder UI）

### 生成されるファイル構造

```
docs/projects/select-clause-extension/
├── project-plan.md
├── requirements.md
├── design.md              # 全体アーキテクチャ概要のみ（簡潔版）
├── wbs.md
├── implementation-plan.md
└── phases/
    ├── phase1/  # 式ツリー基盤
    │   ├── design.md      # Phase 1の詳細設計
    │   ├── tasklist.md
    │   └── testing.md
    ├── phase2/  # 関数ビルダーUI
    │   ├── design.md      # Phase 2の詳細設計
    │   ├── tasklist.md
    │   └── testing.md
    └── phase3/  # サブクエリビルダーUI
        ├── design.md      # Phase 3の詳細設計
        ├── tasklist.md
        └── testing.md
```

## 例2: CTE（WITH句）サポートプロジェクト

### ユーザーの要求

```
CTEを使ったクエリを構築できるようにしたい。
大規模な機能なのでプロジェクトドキュメントを作成してください。
```

### スキルの実行

1. **プロジェクト名の確認**
   - プロジェクト名: `cte-support`

2. **情報収集**
   - 目的: WITH句を使った共通テーブル式（CTE）のサポート
   - 主要機能: CTE定義、再帰CTE、複数CTE、CTE参照
   - 技術的課題: 名前空間管理、再帰クエリの検証
   - フェーズ数: 4フェーズ

3. **ディレクトリ作成**
```bash
mkdir -p docs/projects/cte-support/phases/{phase1,phase2,phase3,phase4}
```

4. **ドキュメント生成**
   - 各ドキュメントをCTEサポートの文脈で生成
   - Phase 1: データモデル拡張
   - Phase 2: 単一CTE対応
   - Phase 3: 複数CTE対応
   - Phase 4: 再帰CTE対応

## 例3: パフォーマンス最適化プロジェクト

### ユーザーの要求

```
クエリビルダーのレンダリングパフォーマンスを改善したい。
大規模テーブル（1000カラム以上）でも快適に動作するようにしたい。
プロジェクトドキュメントを作成してください。
```

### スキルの実行

1. **プロジェクト名の確認**
   - プロジェクト名: `query-builder-performance-optimization`

2. **情報収集**
   - 目的: 大規模データベースでのクエリビルダー性能向上
   - 主要機能: 仮想スクロール、遅延ロード、メモ化、ワーカースレッド
   - 技術的課題: 既存UIとの互換性、パフォーマンス計測
   - フェーズ数: 3フェーズ

3. **ドキュメント生成**
   - `requirements.md`: 現状の性能問題、目標値（例: 1000カラムで3秒以内）
   - `design.md`: 仮想スクロール設計、メモ化戦略
   - `wbs.md`: 計測→分析→実装→検証のサイクル
   - `implementation-plan.md`: ベンチマーク方法、段階的最適化

## 使い分けのガイドライン

### プロジェクトドキュメント（`generate-project-docs`）を使う場合

- ✅ SELECT句拡張（関数・サブクエリ対応）
- ✅ CTEサポート
- ✅ ウィンドウ関数サポート
- ✅ クエリビルダー全体のパフォーマンス最適化
- ✅ ストアアーキテクチャの再設計
- ✅ マルチデータベース対応の拡張

### 開発作業ドキュメント（`generate-working-docs`）を使う場合

- ✅ GROUP BY機能の追加
- ✅ エクスポート機能の追加
- ✅ クエリ履歴機能の追加
- ✅ 特定のバグ修正
- ✅ 単一コンポーネントのリファクタリング
- ✅ 特定の関数（COALESCE等）の追加

### 判断基準

| 項目 | プロジェクト | 開発作業 |
|-----|------------|---------|
| タスク数 | 10個以上 | 10個未満 |
| 期間 | 数週間〜数ヶ月 | 数日〜1週間 |
| フェーズ数 | 2フェーズ以上 | 1フェーズ |
| 影響範囲 | 複数モジュール横断 | 単一モジュール |
| ドキュメント | WBS、実装計画必要 | タスクリストで十分 |
