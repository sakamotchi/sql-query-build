# タスクリスト - Phase 3: 各種データ型対応（PostgreSQL 配列型）

- **作成日**: 2026-03-15

---

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| 完了 | 1 |
| 進行中 | 0 |
| 未着手 | 0 |

---

## タスク一覧

### T-12: PostgreSQL 配列型の対応 🟢 LOW

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

- [x] sqlx 0.8 で `Vec<Option<T>>` の PostgreSQL 配列デコードが動作するか確認（ビルドで検証）
- [x] `convert_row()` の match 文に `name if name.starts_with('_')` アームを追加
  - `_INT2` → `Vec<Option<i16>>` → `"[1, 2, null]"` 形式
  - `_INT4` → `Vec<Option<i32>>`
  - `_INT8` → `Vec<Option<i64>>`
  - `_FLOAT4` / `_FLOAT8` → `Vec<Option<f64>>`
  - `_TEXT` / `_VARCHAR` / `_BPCHAR` / `_NAME` → `Vec<Option<String>>`（要素は `"値"` でクォート）
  - `_BOOL` → `Vec<Option<bool>>`
  - その他の `_XXX` → `"[array<xxx>]"` プレースホルダー
- [x] `_` フォールバックより前の位置に配置されていることを確認
- [x] ビルド確認（`cargo build`）
- [ ] 動作確認（`SELECT ARRAY[1,2,3]` で `[1, 2, 3]` が表示されること）
- [ ] 動作確認（`SELECT ARRAY['a','b','c']::TEXT[]` で `["a", "b", "c"]` が表示されること）
- [ ] 動作確認（`SELECT ARRAY[1, NULL, 3]::INTEGER[]` で `[1, null, 3]` が表示されること）
- [ ] 動作確認（`SELECT '{}'::INTEGER[]` で `[]` が表示されること）

---

## 完了条件

- [ ] T-12 のすべての実装項目が完了
- [ ] `cargo build` が通ること
- [ ] PostgreSQL の `INTEGER[]`、`TEXT[]`、`BOOL[]` カラムの値が `[...]` 形式で表示されること
- [ ] NULL 要素を含む配列が `[1, null, 3]` のように表示されること
- [ ] 未対応の配列型が `[array<xxx>]` のように表示されること（NULL にならないこと）
- [ ] Phase 1〜2 で対応した型変換ロジックが引き続き正常に動作すること
