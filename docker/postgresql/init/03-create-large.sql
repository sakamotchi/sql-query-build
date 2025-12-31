-- ベンチマーク用大規模データベース（500テーブル）
CREATE DATABASE benchmark_large;

\c benchmark_large;

-- 500テーブルを生成（各30カラム、5インデックス）
-- 注意: このスクリプトは実行に数分かかる場合があります
DO $$
BEGIN
  FOR i IN 1..500 LOOP
    EXECUTE format('
      CREATE TABLE table_%s (
        id SERIAL PRIMARY KEY,
        col_1 VARCHAR(100),
        col_2 VARCHAR(100),
        col_3 VARCHAR(100),
        col_4 VARCHAR(100),
        col_5 VARCHAR(100),
        col_6 VARCHAR(100),
        col_7 VARCHAR(100),
        col_8 VARCHAR(100),
        col_9 VARCHAR(100),
        col_10 VARCHAR(100),
        col_11 VARCHAR(100),
        col_12 VARCHAR(100),
        col_13 VARCHAR(100),
        col_14 VARCHAR(100),
        col_15 VARCHAR(100),
        col_16 VARCHAR(100),
        col_17 VARCHAR(100),
        col_18 VARCHAR(100),
        col_19 VARCHAR(100),
        col_20 VARCHAR(100),
        col_21 VARCHAR(100),
        col_22 VARCHAR(100),
        col_23 VARCHAR(100),
        col_24 VARCHAR(100),
        col_25 VARCHAR(100),
        col_26 VARCHAR(100),
        col_27 VARCHAR(100),
        col_28 VARCHAR(100),
        col_29 VARCHAR(100),
        col_30 VARCHAR(100)
      );

      CREATE INDEX idx_%s_1 ON table_%s(col_1);
      CREATE INDEX idx_%s_2 ON table_%s(col_2);
      CREATE INDEX idx_%s_3 ON table_%s(col_3);
      CREATE INDEX idx_%s_4 ON table_%s(col_4);
      CREATE INDEX idx_%s_5 ON table_%s(col_5);

      COMMENT ON TABLE table_%s IS ''Benchmark table %s (large)'';
    ', i, i, i, i, i, i, i, i, i, i, i, i, i);
  END LOOP;
END $$;
