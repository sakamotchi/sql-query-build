-- ベンチマーク用大規模データベース（500テーブル）
-- 注意: このスクリプトは実行に数分かかる場合があります
CREATE DATABASE IF NOT EXISTS benchmark_large;
USE benchmark_large;

-- 500テーブルを生成（各30カラム、5インデックス）
DELIMITER $$

DROP PROCEDURE IF EXISTS create_benchmark_large$$
CREATE PROCEDURE create_benchmark_large()
BEGIN
  DECLARE i INT DEFAULT 1;

  WHILE i <= 500 DO
    SET @table_name = CONCAT('table_', i);
    SET @sql = CONCAT('
      CREATE TABLE ', @table_name, ' (
        id INT AUTO_INCREMENT PRIMARY KEY,
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=''Benchmark table ', i, ' (large)'';
    ');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    -- インデックス作成
    SET @sql = CONCAT('CREATE INDEX idx_', i, '_1 ON ', @table_name, '(col_1)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @sql = CONCAT('CREATE INDEX idx_', i, '_2 ON ', @table_name, '(col_2)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @sql = CONCAT('CREATE INDEX idx_', i, '_3 ON ', @table_name, '(col_3)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @sql = CONCAT('CREATE INDEX idx_', i, '_4 ON ', @table_name, '(col_4)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @sql = CONCAT('CREATE INDEX idx_', i, '_5 ON ', @table_name, '(col_5)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET i = i + 1;
  END WHILE;
END$$

DELIMITER ;

CALL create_benchmark_large();
DROP PROCEDURE create_benchmark_large;
