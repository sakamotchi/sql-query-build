# 設計書 - Phase 3: 各種データ型対応（PostgreSQL 配列型）

- **作成日**: 2026-03-15
- **ステータス**: 計画中

---

## アーキテクチャ

### 影響範囲

- **フロントエンド**: なし（`QueryValue::String` として受け取るため変更不要）
- **バックエンド**: `postgresql_executor.rs` の `convert_row()` に配列型ハンドリングを追加

---

## 実装方針

### アプローチの検討

PostgreSQL 配列型の sqlx でのデコードには複数の方法がある。

#### アプローチ A: `try_get::<Vec<T>, _>()` を型ごとに試みる

```rust
name if name.starts_with('_') => {
    let element_type = &name[1..]; // "_INT4" → "INT4"
    match element_type {
        "INT2" => row.try_get::<Vec<i16>, _>(i)
            .ok()
            .map(|v| QueryValue::String(format!("[{}]", v.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(", "))))
            .unwrap_or(QueryValue::Null),
        "INT4" => row.try_get::<Vec<i32>, _>(i)
            .ok()
            .map(|v| QueryValue::String(format!("[{}]", v.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(", "))))
            .unwrap_or(QueryValue::Null),
        // ...
    }
}
```

**メリット**: 正確な型変換が可能
**デメリット**: 型ごとに match アームが必要、コード量が多い、NULL 要素を含む配列（`Option<T>`）は別対応が必要

#### アプローチ B: raw bytes から PostgreSQL 配列バイナリフォーマットをパース

PostgreSQL の配列バイナリフォーマット:
```
[4バイト] 次元数 (ndim)
[4バイト] ハフラグ (has_null flag)
[4バイト] 要素の OID
[次元ごとに]
  [4バイト] 要素数 (dim)
  [4バイト] 下限インデックス (lb)
[要素ごとに]
  [4バイト] 要素サイズ (-1 = NULL)
  [Nバイト] 要素データ
```

**メリット**: 汎用的（全配列型に対応可能）
**デメリット**: 実装が複雑、要素の型に応じたデコードが別途必要

#### アプローチ C: JSON キャストを活用（テキストプロトコル経由）

`try_get::<serde_json::Value, _>()` を試みる（sqlx が内部でテキスト変換する場合）。

**メリット**: シンプル
**デメリット**: sqlx が配列型の `serde_json::Value` デコードをサポートしていない可能性が高い

#### 採用方針

**アプローチ A（主）+ プレースホルダーフォールバック** を採用する。

- 使用頻度の高い型（INT2/INT4/INT8/FLOAT4/FLOAT8/TEXT/VARCHAR/BOOL）を `Vec<T>` でデコード
- NULL 要素を含む配列は `Vec<Option<T>>` で対応
- 未対応の型は `"[array]"` プレースホルダーを返す（NULL にしない）

---

## T-12: PostgreSQL 配列型の対応

**ファイル**: `src-tauri/src/database/postgresql_executor.rs`

`convert_row()` の match 文に以下を追加（`"POINT" | ...` アームの後、`_` フォールバックの前）：

```rust
name if name.starts_with('_') => {
    // PostgreSQL 配列型: 型名がアンダースコアプレフィックス
    let element_type = &name[1..];
    match element_type {
        "INT2" => row
            .try_get::<Vec<Option<i16>>, _>(i)
            .ok()
            .map(|v| {
                let s = v.iter()
                    .map(|x| x.map_or("null".to_string(), |n| n.to_string()))
                    .collect::<Vec<_>>()
                    .join(", ");
                QueryValue::String(format!("[{}]", s))
            })
            .unwrap_or(QueryValue::Null),
        "INT4" => row
            .try_get::<Vec<Option<i32>>, _>(i)
            .ok()
            .map(|v| {
                let s = v.iter()
                    .map(|x| x.map_or("null".to_string(), |n| n.to_string()))
                    .collect::<Vec<_>>()
                    .join(", ");
                QueryValue::String(format!("[{}]", s))
            })
            .unwrap_or(QueryValue::Null),
        "INT8" => row
            .try_get::<Vec<Option<i64>>, _>(i)
            .ok()
            .map(|v| {
                let s = v.iter()
                    .map(|x| x.map_or("null".to_string(), |n| n.to_string()))
                    .collect::<Vec<_>>()
                    .join(", ");
                QueryValue::String(format!("[{}]", s))
            })
            .unwrap_or(QueryValue::Null),
        "FLOAT4" | "FLOAT8" => row
            .try_get::<Vec<Option<f64>>, _>(i)
            .ok()
            .map(|v| {
                let s = v.iter()
                    .map(|x| x.map_or("null".to_string(), |n| n.to_string()))
                    .collect::<Vec<_>>()
                    .join(", ");
                QueryValue::String(format!("[{}]", s))
            })
            .unwrap_or(QueryValue::Null),
        "TEXT" | "VARCHAR" | "BPCHAR" | "NAME" => row
            .try_get::<Vec<Option<String>>, _>(i)
            .ok()
            .map(|v| {
                let s = v.iter()
                    .map(|x| x.as_deref().map_or("null".to_string(), |s| format!("\"{}\"", s)))
                    .collect::<Vec<_>>()
                    .join(", ");
                QueryValue::String(format!("[{}]", s))
            })
            .unwrap_or(QueryValue::Null),
        "BOOL" => row
            .try_get::<Vec<Option<bool>>, _>(i)
            .ok()
            .map(|v| {
                let s = v.iter()
                    .map(|x| x.map_or("null".to_string(), |b| b.to_string()))
                    .collect::<Vec<_>>()
                    .join(", ");
                QueryValue::String(format!("[{}]", s))
            })
            .unwrap_or(QueryValue::Null),
        _ => {
            // 未対応の配列要素型はプレースホルダーで表示（NULL にしない）
            QueryValue::String(format!("[array<{}>]", element_type.to_lowercase()))
        }
    }
}
```

**注意事項**:
- `Vec<Option<T>>` を使用することで NULL 要素を含む配列に対応する
- `Vec<T>` は NULL 要素があるとデコード失敗するため `Option<T>` が必要
- `NUMERIC[]` は `bigdecimal::BigDecimal` の `Vec<Option<bigdecimal::BigDecimal>>` で対応可能だが初期実装では除外
- sqlx が `Vec<Option<T>>` のデコードをサポートしているかビルドで確認すること

---

## 設計上の決定事項

| 決定事項 | 理由 | 代替案 |
|---------|------|--------|
| `Vec<Option<T>>` を使用 | NULL 要素を含む配列でデコード失敗を防ぐ | `Vec<T>` → NULL 要素で失敗する |
| 未対応型は `"[array<xxx>]"` | NULL より「配列だが非対応」と明示できる | `"[array]"` 固定 → 型情報が失われる |
| 文字列要素は `"値"` でクォート | 数値と文字列の区別がつく | クォートなし → 型が分かりにくい |
| 多次元配列は非対応 | 使用頻度が低く実装が複雑 | 再帰的パース → 複雑すぎる |

## 未解決事項

- [ ] sqlx 0.8 で `Vec<Option<T>>` の PostgreSQL 配列デコードが動作するか確認
- [ ] `TIMESTAMP[]` / `DATE[]` 等の日時配列型の対応方針（`Vec<Option<NaiveDateTime>>` vs プレースホルダー）
- [ ] `NUMERIC[]` の対応（`Vec<Option<BigDecimal>>`）
