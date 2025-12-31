-- ベンチマーク用小規模データベース（10テーブル）
CREATE DATABASE benchmark_small;

\c benchmark_small;

-- 10テーブルを生成（各10カラム、2インデックス）
DO $$
BEGIN
  FOR i IN 1..10 LOOP
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
        col_10 VARCHAR(100)
      );

      CREATE INDEX idx_%s_1 ON table_%s(col_1);
      CREATE INDEX idx_%s_2 ON table_%s(col_2);

      COMMENT ON TABLE table_%s IS ''Benchmark table %s (small)'';
    ', i, i, i, i, i, i, i);
  END LOOP;
END $$;
