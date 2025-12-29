# タスクリスト: クエリ種別検出

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.1 クエリ種別検出

---

## タスク一覧

| タスクID | タスク名 | 依存 | 状態 | 備考 |
|---------|---------|------|------|------|
| 3.1.1 | QueryAnalyzer実装（Rust） | - | 📝 未着手 | メインタスク |
| 3.1.2 | analyze_queryコマンド | 3.1.1 | 📝 未着手 | Tauriコマンド |
| 3.1.3 | 危険度レベル定義 | 3.1.1 | 📝 未着手 | Safe/Warning/Danger |
| 3.1.4 | フロントエンドAPI追加 | 3.1.2 | 📝 未着手 | queryApi.ts更新 |
| 3.1.5 | ユニットテスト作成 | 3.1.1-3 | 📝 未着手 | Rustテスト |

---

## 詳細タスク

### 3.1.1 QueryAnalyzer実装（Rust）

**概要**: SQLクエリを解析し、種別と危険度を判定するサービス

**作業内容**:

1. [ ] `src-tauri/Cargo.toml`に`sqlparser`クレート追加
2. [ ] `src-tauri/src/models/query_analysis.rs`作成
   - [ ] `QueryType` enum定義
   - [ ] `RiskLevel` enum定義
   - [ ] `RiskFactor` struct定義
   - [ ] `QueryAnalysisResult` struct定義
3. [ ] `src-tauri/src/services/query_analyzer.rs`作成
   - [ ] `QueryAnalyzer` struct定義
   - [ ] `analyze()` メソッド実装
   - [ ] SELECT文の解析
   - [ ] INSERT文の解析
   - [ ] UPDATE文の解析（WHERE句チェック含む）
   - [ ] DELETE文の解析（WHERE句チェック含む）
   - [ ] DROP文の解析
   - [ ] TRUNCATE文の解析
   - [ ] ALTER文の解析
   - [ ] CREATE文の解析
4. [ ] `src-tauri/src/models/mod.rs`更新
5. [ ] `src-tauri/src/services/mod.rs`更新

**完了条件**:
- `cargo check`が成功すること
- 各SQL文の種別が正しく判定されること
- WHERE句の有無で危険度が変わること

---

### 3.1.2 analyze_queryコマンド

**概要**: フロントエンドからクエリ解析を呼び出すTauriコマンド

**作業内容**:

1. [ ] `src-tauri/src/commands/query_analyzer.rs`作成
   - [ ] `analyze_query`関数定義
2. [ ] `src-tauri/src/commands/mod.rs`更新
3. [ ] `src-tauri/src/lib.rs`更新（コマンド登録）

**完了条件**:
- `invoke("analyze_query", { sql, dialect })`で呼び出し可能

---

### 3.1.3 危険度レベル定義

**概要**: 各SQL文の危険度を適切に分類

**作業内容**:

1. [ ] 危険度マッピングの実装
   - [ ] SELECT → Safe
   - [ ] INSERT → Warning
   - [ ] UPDATE（WHERE有）→ Warning
   - [ ] UPDATE（WHERE無）→ Danger
   - [ ] DELETE（WHERE有）→ Warning
   - [ ] DELETE（WHERE無）→ Danger
   - [ ] DROP → Danger
   - [ ] TRUNCATE → Danger
   - [ ] ALTER → Warning
   - [ ] CREATE → Safe
2. [ ] リスクファクターメッセージの日本語化

**完了条件**:
- 各SQL文が正しい危険度で判定されること

---

### 3.1.4 フロントエンドAPI追加

**概要**: TypeScript側からクエリ解析を呼び出す関数

**作業内容**:

1. [ ] `app/types/query-analysis.ts`作成
   - [ ] `QueryType`型定義
   - [ ] `RiskLevel`型定義
   - [ ] `RiskFactor`型定義
   - [ ] `QueryAnalysisResult`型定義
2. [ ] `app/api/queryApi.ts`更新
   - [ ] `analyzeQuery()`関数追加

**完了条件**:
- TypeScript型エラーがないこと
- `analyzeQuery()`が正しい型を返すこと

---

### 3.1.5 ユニットテスト作成

**概要**: QueryAnalyzerのユニットテスト

**作業内容**:

1. [ ] `src-tauri/src/services/query_analyzer_test.rs`作成
   - [ ] SELECT文テスト
   - [ ] INSERT文テスト
   - [ ] UPDATE文テスト（WHERE有無）
   - [ ] DELETE文テスト（WHERE有無）
   - [ ] DROP文テスト
   - [ ] TRUNCATE文テスト
   - [ ] ALTER文テスト
   - [ ] CREATE文テスト
   - [ ] 不正SQL文テスト
2. [ ] `src-tauri/src/services/mod.rs`にテストモジュール追加

**完了条件**:
- `cargo test`で全テストがパスすること

---

## 進捗状況

| 日付 | 完了タスク | 備考 |
|------|-----------|------|
| - | - | - |
