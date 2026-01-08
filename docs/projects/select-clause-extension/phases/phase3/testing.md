# Phase 3 テスト手順書: サブクエリビルダーUI

**テスト対象**: サブクエリビルダーUI、相関サブクエリ、集計サブクエリ

**前提条件**:
- Phase 3の実装が完了している
- Phase 2のテストが全て合格している
- テストデータベースに関連テーブルがある（users, orders等）

---

## 1. サブクエリビルダーUIのテスト

### 1.1 サブクエリビルダーの起動

**手順**:
1. アプリを起動してクエリビルダーを開く
2. usersテーブルを選択
3. SELECTタブで「サブクエリを追加」ボタンをクリック

**期待結果**:
- サブクエリビルダーダイアログが表示される
- ミニクエリビルダーUIが表示される

---

### 1.2 基本的なサブクエリの構築

**手順**:
1. サブクエリビルダーでテーブル「orders」を選択
2. SELECT句で「COUNT(*)」を選択
3. WHERE句で「user_id = ?」（外部カラム参照）を設定
4. エイリアス「order_count」を入力
5. 「追加」ボタンをクリック

**期待されるサブクエリプレビュー**:
```sql
(SELECT COUNT(*) FROM orders WHERE user_id = u.id)
```

**期待結果**:
- 選択済みリストに追加される
- SQLプレビューに正しいサブクエリが表示される

---

## 2. 相関サブクエリのテスト

### 2.1 外部カラムの参照

**手順**:
1. メインクエリ: usersテーブル（エイリアス「u」）
2. サブクエリビルダーを開く
3. サブクエリ: ordersテーブル（エイリアス「o」）
4. WHERE句で「o.user_id = 外部クエリ.u.id」を設定

**期待結果**:
- 外部カラム選択UIが表示される
- メインクエリのテーブル「u」のカラムが選択可能
- WHERE条件が正しく設定される

---

### 2.2 相関サブクエリのSQL生成

**手順**:
1. 上記の相関サブクエリを完成させる
2. SQLプレビューを確認

**期待されるSQL**:
```sql
SELECT
  u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u
```

**期待結果**:
- 外部カラム参照が正しく生成される
- エイリアスが正しく付与される

---

## 3. 集計サブクエリのテスト

### 3.1 COUNT を使用したサブクエリ

**手順**:
1. サブクエリビルダーで ordersテーブル を選択
2. SELECT句で COUNT(*) を選択
3. WHERE句で o.user_id = u.id を設定
4. エイリアス order_count を入力

**期待されるSQL**:
```sql
(SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
```

---

### 3.2 MAX を使用したサブクエリ

**手順**:
1. サブクエリビルダーで ordersテーブル を選択
2. SELECT句で MAX(total) を選択
3. WHERE句で o.user_id = u.id を設定
4. エイリアス max_order を入力

**期待されるSQL**:
```sql
(SELECT MAX(o.total) FROM orders o WHERE o.user_id = u.id) AS max_order
```

---

### 3.3 複数の集計サブクエリ

**手順**:
1. usersテーブルを選択
2. 以下のサブクエリを追加:
   - (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
   - (SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id) AS total_spent
   - (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) AS last_order_date

**期待されるSQL**:
```sql
SELECT
  u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
  (SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id) AS total_spent,
  (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) AS last_order_date
FROM users u
```

---

## 4. バリデーションのテスト

### 4.1 スカラー値チェック

**手順**:
1. サブクエリビルダーで複数カラムを選択しようとする

**期待結果**:
- エラーメッセージが表示される
- または単一カラム選択のみ許可される

---

### 4.2 循環参照の検出

**手順**:
1. メインクエリ: usersテーブル
2. サブクエリ: usersテーブル（同じテーブル）
3. WHERE句で u2.id = u.id を設定（自己参照）

**期待結果**:
- 許可される（自己結合は有効なケース）
- または警告が表示される

---

### 4.3 サブクエリの深さ制限

**手順**:
1. サブクエリ内でさらにサブクエリを作成しようとする（3レベル超）

**期待結果**:
- エラーメッセージが表示される
- 深さ制限を超えたサブクエリは作成できない

---

## 5. E2Eテスト（実際のクエリ実行）

### 5.1 基本的なスカラーサブクエリの実行

**手順**:
1. PostgreSQLに接続
2. usersテーブルを選択
3. 通常のカラム「name」を選択
4. サブクエリを追加:
   - (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
5. クエリを実行

**期待されるSQL**:
```sql
SELECT
  u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u
```

**期待結果**:
- クエリが正常に実行される
- 各ユーザーの注文数が表示される

---

### 5.2 複数の集計サブクエリの実行

**手順**:
1. usersテーブルを選択
2. 以下を追加:
   - name カラム
   - (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
   - (SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id) AS total_spent
   - (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) AS last_order
3. クエリを実行

**期待結果**:
- すべてのサブクエリが正しく実行される
- 結果テーブルに4つのカラムが表示される

---

### 5.3 COALESCE とサブクエリの組み合わせ

**手順**:
1. 関数ビルダーでCOALESCEを選択
2. 引数1: サブクエリ (SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id)
3. 引数2: リテラル値 0
4. エイリアス total_or_zero を設定
5. クエリを実行

**期待されるSQL**:
```sql
SELECT
  u.name,
  COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id), 0) AS total_or_zero
FROM users u
```

**期待結果**:
- 注文のないユーザーは0が表示される

---

### 5.4 データベース間での動作確認

**手順**:
1. PostgreSQL、MySQL、SQLiteそれぞれで同じサブクエリを実行

**期待結果**:
- すべてのデータベースで正しく動作する
- 結果が一貫している

---

## 6. WHERE句との組み合わせテスト

### 6.1 サブクエリ結果に基づくフィルタリング

**手順**:
1. usersテーブルを選択
2. サブクエリ (SELECT COUNT(*) FROM orders ...) を追加
3. WHERE句でサブクエリの結果を使用（例: order_count > 5）は不可
   - 代わりにHAVING句が必要（対象外）

**期待結果**:
- WHERE句ではサブクエリの結果は使用できない（エイリアスは未定義）
- これは正常な動作

---

## 7. パフォーマンステスト

### 7.1 複雑なサブクエリのプレビュー生成時間

**手順**:
1. 5つのサブクエリを含むクエリを構築
2. プレビュー更新時間を測定

**期待結果**:
- 1秒以内にプレビューが更新される

---

### 7.2 大量データでのクエリ実行

**手順**:
1. 10万件のusersと100万件のordersがあるテーブルで実行
2. サブクエリを含むクエリを実行

**期待結果**:
- クエリが実行される（時間はかかるが、エラーにならない）
- タイムアウト設定が適切に動作

---

## 8. リグレッションテスト

### 8.1 Phase 1, 2の機能

**手順**:
1. Phase 1の式入力
2. Phase 2の関数ビルダー
3. Phase 3のサブクエリビルダー
4. これらすべてを組み合わせたクエリを実行

**期待されるSQL例**:
```sql
SELECT
  UPPER(u.name) AS upper_name,
  CONCAT(u.first_name, ' ', u.last_name) AS full_name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u
WHERE u.id > 10
ORDER BY u.name ASC
```

**期待結果**:
- すべての機能が正しく組み合わされる
- クエリが正常に実行される

---

## 9. エラーハンドリングのテスト

### 9.1 存在しないテーブルの参照

**手順**:
1. サブクエリで存在しないテーブル名を入力

**期待結果**:
- クエリ実行時にエラーが表示される
- エラーメッセージがわかりやすい

---

### 9.2 型の不一致

**手順**:
1. サブクエリで文字列型のカラムを返す
2. これを数値として扱う（例: WHERE order_count > 'text'）

**期待結果**:
- クエリ実行時にエラーが表示される

---

## テスト完了チェックリスト

- [ ] サブクエリビルダーUIが正しく動作
- [ ] 相関サブクエリが正しく構築・実行される
- [ ] 集計サブクエリが正しく構築・実行される
- [ ] バリデーションが適切に動作
- [ ] 関数とサブクエリの組み合わせが動作
- [ ] E2Eテストが全て合格
- [ ] パフォーマンステストが合格
- [ ] リグレッションテストが全て合格
- [ ] 3つのデータベースで動作確認完了
- [ ] エラーハンドリングが適切に動作

---

## プロジェクト全体のテスト完了条件

### Phase 1 〜 Phase 3 の統合テスト

- [ ] すべてのPhaseの機能が組み合わせて動作
- [ ] 10種類以上の複雑なクエリパターンで動作確認
- [ ] パフォーマンス要件を満たしている
- [ ] ドキュメントが完全に更新されている
- [ ] すべてのテストが合格している

---

## 最終受け入れテスト

### 実用的なクエリの構築と実行

**テストケース1: ユーザー別の注文統計**
```sql
SELECT
  u.name,
  u.email,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
  (SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id) AS total_spent,
  (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id) AS last_order_date,
  COALESCE((SELECT AVG(o.total) FROM orders o WHERE o.user_id = u.id), 0) AS avg_order_value
FROM users u
WHERE u.status = 'active'
ORDER BY total_spent DESC
LIMIT 100
```

**テストケース2: 製品別の売上分析**
```sql
SELECT
  p.name,
  p.category,
  (SELECT COUNT(DISTINCT o.user_id) FROM orders o WHERE o.product_id = p.id) AS unique_customers,
  (SELECT SUM(o.quantity) FROM orders o WHERE o.product_id = p.id) AS total_sold,
  UPPER(SUBSTRING(p.name, 1, 3)) AS short_code
FROM products p
WHERE p.active = true
```

---

## テスト実施記録

| 日付 | テスター | フェーズ | 結果 | 備考 |
|------|---------|---------|------|------|
| | | Phase 1 | | |
| | | Phase 2 | | |
| | | Phase 3 | | |
| | | 統合テスト | | |

---

## プロジェクト完了確認

- [ ] すべてのテストが合格
- [ ] すべてのドキュメントが更新済み
- [ ] コードレビュー完了
- [ ] 受け入れテスト完了
- [ ] プロジェクト完了レポート作成
- [ ] ステークホルダーへの報告完了

**SELECT句拡張プロジェクト完了！**
