# 接続管理機能 詳細仕様

**バージョン**: 1.0
**作成日**: 2025年12月29日
**状態**: ✅ 完了（Phase 1.3）

---

## 1. 機能概要

データベース接続情報の登録・編集・削除・起動を行う機能。

---

## 2. データモデル

### 2.1 Connection（接続情報）

```typescript
interface Connection {
  id: string                    // UUID
  name: string                  // 接続名（表示用）
  type: DatabaseType            // DB種別
  environment: Environment      // 環境タイプ
  host: string                  // ホスト名/IPアドレス
  port: number                  // ポート番号
  username: string              // ユーザー名
  database: string              // データベース名
  password?: string             // パスワード（暗号化保存）
  customColor?: {               // カスタム環境色
    primary: string
    background: string
  }
  createdAt: string             // 作成日時
  updatedAt: string             // 更新日時
}
```

### 2.2 型定義

```typescript
type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'sqlserver' | 'oracle'
type Environment = 'development' | 'test' | 'staging' | 'production'
```

---

## 3. 画面仕様

### 3.1 接続一覧（ランチャー）

**パス**: `/` (`app/pages/index.vue`)

#### 画面構成
- ツールバー: 新規作成ボタン、設定ボタン
- 検索・フィルター: 名前検索、環境フィルター
- 接続カードグリッド: 登録済み接続の表示

#### 接続カードの表示内容
- 環境色バー（左端または上部）
- 接続名
- DB種別アイコン
- ホスト名
- 環境バッジ
- アクションボタン（接続、編集、削除）

### 3.2 接続設定画面

**パス**: `/connection-form` (`app/pages/connection-form.vue`)

#### 入力フィールド
| フィールド | 必須 | 説明 | バリデーション |
|-----------|------|------|---------------|
| 接続名 | ○ | 表示用の名前 | 1-100文字 |
| DB種別 | ○ | データベースタイプ | 選択式 |
| 環境 | ○ | 環境タイプ | 選択式 |
| ホスト | ○ | 接続先ホスト | 非空 |
| ポート | ○ | ポート番号 | 1-65535 |
| ユーザー名 | ○ | DB認証ユーザー | 非空 |
| パスワード | △ | DB認証パスワード | 任意 |
| データベース名 | ○ | 接続先DB名 | 非空 |
| カスタム色 | × | 環境色のオーバーライド | 任意 |

#### アクション
- 接続テスト: 入力情報でDB接続を試行
- 保存: 接続情報を保存
- キャンセル: ランチャーに戻る

---

## 4. API仕様

### 4.1 Tauri Commands

#### create_connection
新規接続を作成する。

```rust
#[tauri::command]
async fn create_connection(connection: ConnectionInput) -> Result<Connection, ConnectionError>
```

#### update_connection
既存接続を更新する。

```rust
#[tauri::command]
async fn update_connection(id: String, connection: ConnectionInput) -> Result<Connection, ConnectionError>
```

#### delete_connection
接続を削除する。

```rust
#[tauri::command]
async fn delete_connection(id: String) -> Result<(), ConnectionError>
```

#### get_connections
全接続を取得する。

```rust
#[tauri::command]
async fn get_connections() -> Result<Vec<Connection>, ConnectionError>
```

#### test_connection
接続をテストする。

```rust
#[tauri::command]
async fn test_connection(connection: ConnectionInput) -> Result<ConnectionTestResult, ConnectionError>
```

---

## 5. 関連コンポーネント

### 5.1 フロントエンド

| コンポーネント | パス | 説明 |
|--------------|------|------|
| ConnectionCard | `app/components/connection/ConnectionCard.vue` | 接続カードの表示 |
| ConnectionList | `app/components/connection/ConnectionList.vue` | 接続カード一覧 |
| ThemePreview | `app/components/connection/ThemePreview.vue` | 環境色プレビュー |
| EnvironmentSelector | `app/components/connection/EnvironmentSelector.vue` | 環境選択UI |
| EnvironmentColorPicker | `app/components/connection/EnvironmentColorPicker.vue` | 環境色選択UI |
| SearchFilter | `app/components/launcher/SearchFilter.vue` | 検索・フィルター |

### 5.2 バックエンド

| モジュール | パス | 説明 |
|-----------|------|------|
| connection/commands.rs | `src-tauri/src/connection/commands.rs` | Tauriコマンド |
| connection/service.rs | `src-tauri/src/connection/service.rs` | ビジネスロジック |
| connection/storage.rs | `src-tauri/src/connection/storage.rs` | データ永続化 |
| connection/types.rs | `src-tauri/src/connection/types.rs` | 型定義 |

### 5.3 ストア

| ストア | パス | 説明 |
|--------|------|------|
| connectionStore | `app/stores/connection.ts` | 接続情報の状態管理 |

---

## 6. エラーハンドリング

| エラーコード | 説明 | ユーザーメッセージ |
|-------------|------|------------------|
| CONNECTION_NOT_FOUND | 接続IDが存在しない | 接続が見つかりません |
| DUPLICATE_NAME | 接続名が重複 | この名前の接続は既に存在します |
| INVALID_PORT | ポート番号が不正 | ポート番号は1-65535の範囲で指定してください |
| CONNECTION_FAILED | 接続テスト失敗 | データベースに接続できません: {詳細} |
| ENCRYPTION_ERROR | 暗号化エラー | 認証情報の保存に失敗しました |

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-12-29 | 1.0 | 初版作成 |
