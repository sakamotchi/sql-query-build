# テスト手順書: クエリ種別検出

**作成日**: 2025年12月29日
**WBS参照**: Phase 3.1 クエリ種別検出

---

## 1. 自動テスト

### 1.1 Rustユニットテスト

```bash
# src-tauriディレクトリで実行
cd src-tauri
cargo test query_analyzer
```

**期待結果**: 全テストがパス

### 1.2 テストケース一覧

| テストケース | 入力SQL | 期待されるqueryType | 期待されるriskLevel |
|-------------|---------|---------------------|---------------------|
| SELECT文 | `SELECT * FROM users` | select | safe |
| INSERT文 | `INSERT INTO users (name) VALUES ('test')` | insert | warning |
| UPDATE（WHERE有） | `UPDATE users SET active = false WHERE id = 1` | update | warning |
| UPDATE（WHERE無） | `UPDATE users SET active = false` | update | danger |
| DELETE（WHERE有） | `DELETE FROM users WHERE id = 1` | delete | warning |
| DELETE（WHERE無） | `DELETE FROM users` | delete | danger |
| DROP TABLE | `DROP TABLE users` | drop | danger |
| TRUNCATE | `TRUNCATE TABLE users` | truncate | danger |
| ALTER TABLE | `ALTER TABLE users ADD COLUMN email VARCHAR(255)` | alter | warning |
| CREATE TABLE | `CREATE TABLE users (id INT)` | create | safe |
| 不正SQL | `NOT A VALID SQL` | unknown | safe |

---

## 2. 手動テスト

### 2.1 事前準備

1. アプリをデベロッパーモードで起動
   ```bash
   npm run tauri:dev
   ```

2. 任意のデータベース接続を作成・接続

### 2.2 テスト手順

#### テスト1: SELECT文の解析

1. クエリビルダーでSELECT文を作成
2. SQLプレビューに表示されるSQLを確認
3. **確認項目**: 危険度表示が「Safe（緑）」であること

#### テスト2: UPDATE文（WHERE無）の解析

1. ブラウザのDevToolsを開く
2. コンソールで以下を実行:
   ```javascript
   await window.__TAURI__.core.invoke('analyze_query', {
     sql: 'UPDATE users SET active = false',
     dialect: 'postgresql'
   })
   ```
3. **確認項目**:
   - `queryType: "update"`
   - `riskLevel: "danger"`
   - `hasWhereClause: false`
   - `riskFactors`に"no_where_clause"が含まれる

#### テスト3: UPDATE文（WHERE有）の解析

1. コンソールで以下を実行:
   ```javascript
   await window.__TAURI__.core.invoke('analyze_query', {
     sql: 'UPDATE users SET active = false WHERE id = 1',
     dialect: 'postgresql'
   })
   ```
3. **確認項目**:
   - `queryType: "update"`
   - `riskLevel: "warning"`
   - `hasWhereClause: true`

#### テスト4: DROP TABLE文の解析

1. コンソールで以下を実行:
   ```javascript
   await window.__TAURI__.core.invoke('analyze_query', {
     sql: 'DROP TABLE users',
     dialect: 'postgresql'
   })
   ```
3. **確認項目**:
   - `queryType: "drop"`
   - `riskLevel: "danger"`

#### テスト5: 各DB方言での動作確認

1. PostgreSQL方言:
   ```javascript
   await window.__TAURI__.core.invoke('analyze_query', {
     sql: 'SELECT * FROM users',
     dialect: 'postgresql'
   })
   ```

2. MySQL方言:
   ```javascript
   await window.__TAURI__.core.invoke('analyze_query', {
     sql: 'SELECT * FROM users',
     dialect: 'mysql'
   })
   ```

3. SQLite方言:
   ```javascript
   await window.__TAURI__.core.invoke('analyze_query', {
     sql: 'SELECT * FROM users',
     dialect: 'sqlite'
   })
   ```

4. **確認項目**: 各方言で正しく解析されること

---

## 3. 境界値テスト

### 3.1 空のSQL

```javascript
await window.__TAURI__.core.invoke('analyze_query', {
  sql: '',
  dialect: 'postgresql'
})
```

**期待結果**: `queryType: "unknown"`

### 3.2 複数文（セミコロン区切り）

```javascript
await window.__TAURI__.core.invoke('analyze_query', {
  sql: 'SELECT * FROM users; DELETE FROM users',
  dialect: 'postgresql'
})
```

**期待結果**: 最初の文（SELECT）のみ解析され、`queryType: "select"`

### 3.3 コメント付きSQL

```javascript
await window.__TAURI__.core.invoke('analyze_query', {
  sql: '-- This is a comment\nSELECT * FROM users',
  dialect: 'postgresql'
})
```

**期待結果**: `queryType: "select"`

### 3.4 大文字小文字混在

```javascript
await window.__TAURI__.core.invoke('analyze_query', {
  sql: 'sElEcT * FrOm users',
  dialect: 'postgresql'
})
```

**期待結果**: `queryType: "select"`

---

## 4. パフォーマンステスト

### 4.1 大きなSQL文の解析

1. 100行以上のJOINを含むSQLを生成
2. `analyze_query`を実行
3. **確認項目**: 100ms以内に結果が返ること

---

## 5. テスト結果記録

| テスト | 実行日 | 結果 | 備考 |
|--------|--------|------|------|
| Rustユニットテスト | - | - | - |
| 手動テスト1（SELECT） | - | - | - |
| 手動テスト2（UPDATE WHERE無） | - | - | - |
| 手動テスト3（UPDATE WHERE有） | - | - | - |
| 手動テスト4（DROP） | - | - | - |
| 手動テスト5（方言） | - | - | - |
| 境界値テスト | - | - | - |
| パフォーマンステスト | - | - | - |
