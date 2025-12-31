#!/bin/bash

# SQLiteベンチマークデータベース生成スクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Creating SQLite benchmark databases..."

# 小規模DB（10テーブル）
echo "Creating benchmark-small.db (10 tables)..."
rm -f benchmark-small.db
sqlite3 benchmark-small.db << 'EOF'
-- 10テーブルを生成（各10カラム、2インデックス）
BEGIN TRANSACTION;

CREATE TABLE table_1 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_1_1 ON table_1(col_1);
CREATE INDEX idx_1_2 ON table_1(col_2);

CREATE TABLE table_2 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_2_1 ON table_2(col_1);
CREATE INDEX idx_2_2 ON table_2(col_2);

CREATE TABLE table_3 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_3_1 ON table_3(col_1);
CREATE INDEX idx_3_2 ON table_3(col_2);

CREATE TABLE table_4 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_4_1 ON table_4(col_1);
CREATE INDEX idx_4_2 ON table_4(col_2);

CREATE TABLE table_5 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_5_1 ON table_5(col_1);
CREATE INDEX idx_5_2 ON table_5(col_2);

CREATE TABLE table_6 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_6_1 ON table_6(col_1);
CREATE INDEX idx_6_2 ON table_6(col_2);

CREATE TABLE table_7 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_7_1 ON table_7(col_1);
CREATE INDEX idx_7_2 ON table_7(col_2);

CREATE TABLE table_8 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_8_1 ON table_8(col_1);
CREATE INDEX idx_8_2 ON table_8(col_2);

CREATE TABLE table_9 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_9_1 ON table_9(col_1);
CREATE INDEX idx_9_2 ON table_9(col_2);

CREATE TABLE table_10 (id INTEGER PRIMARY KEY AUTOINCREMENT, col_1 TEXT, col_2 TEXT, col_3 TEXT, col_4 TEXT, col_5 TEXT, col_6 TEXT, col_7 TEXT, col_8 TEXT, col_9 TEXT, col_10 TEXT);
CREATE INDEX idx_10_1 ON table_10(col_1);
CREATE INDEX idx_10_2 ON table_10(col_2);

COMMIT;
EOF

echo "✓ benchmark-small.db created (10 tables)"

# 中規模・大規模DBは手動生成（時間がかかるため）
echo ""
echo "Note: For medium (100 tables) and large (500 tables) databases,"
echo "please use the Python script to generate them:"
echo "  python3 generate_sqlite_benchmark.py medium"
echo "  python3 generate_sqlite_benchmark.py large"
echo ""
echo "Or manually create them as needed."
