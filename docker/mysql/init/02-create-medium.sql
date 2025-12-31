-- ベンチマーク用中規模データベース（100テーブル）
CREATE DATABASE IF NOT EXISTS benchmark_medium;
USE benchmark_medium;

-- 100テーブルを生成（各20カラム、3インデックス）
DELIMITER $$

DROP PROCEDURE IF EXISTS create_benchmark_medium$$
CREATE PROCEDURE create_benchmark_medium()
BEGIN
  DECLARE i INT DEFAULT 1;

  WHILE i <= 100 DO
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
        col_20 VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=''Benchmark table ', i, ' (medium)'';
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

    SET i = i + 1;
  END WHILE;
END$$

DELIMITER ;

CALL create_benchmark_medium();
DROP PROCEDURE create_benchmark_medium;
