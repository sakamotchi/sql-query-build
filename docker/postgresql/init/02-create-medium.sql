-- ベンチマーク用中規模データベース（100テーブル）
CREATE DATABASE benchmark_medium;

\c benchmark_medium;

-- 100テーブルを生成（各20カラム、3インデックス）
DO $$
BEGIN
  FOR i IN 1..100 LOOP
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
        col_20 VARCHAR(100)
      );

      CREATE INDEX idx_%s_1 ON table_%s(col_1);
      CREATE INDEX idx_%s_2 ON table_%s(col_2);
      CREATE INDEX idx_%s_3 ON table_%s(col_3);

      COMMENT ON TABLE table_%s IS ''Benchmark table %s (medium)'';
    ', i, i, i, i, i, i, i, i, i);
  END LOOP;
END $$;
