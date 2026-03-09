-- INT UNSIGNED 型の動作確認用テーブル
-- 修正確認: https://github.com/sakamotchi/sql-query-build

CREATE DATABASE IF NOT EXISTS test_unsigned;
GRANT ALL PRIVILEGES ON test_unsigned.* TO 'benchmark'@'%';
FLUSH PRIVILEGES;
USE test_unsigned;

CREATE TABLE unsigned_types (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'INT UNSIGNED (PK)',
    tiny_u          TINYINT UNSIGNED                        COMMENT 'TINYINT UNSIGNED (0-255)',
    small_u         SMALLINT UNSIGNED                       COMMENT 'SMALLINT UNSIGNED (0-65535)',
    medium_u        MEDIUMINT UNSIGNED                      COMMENT 'MEDIUMINT UNSIGNED (0-16777215)',
    int_u           INT UNSIGNED                            COMMENT 'INT UNSIGNED (0-4294967295)',
    bigint_u        BIGINT UNSIGNED                         COMMENT 'BIGINT UNSIGNED (0-18446744073709551615)',
    -- 比較用: signed 型
    tiny_s          TINYINT                                 COMMENT 'TINYINT (signed)',
    small_s         SMALLINT                                COMMENT 'SMALLINT (signed)',
    int_s           INT                                     COMMENT 'INT (signed)',
    bigint_s        BIGINT                                  COMMENT 'BIGINT (signed)',
    -- NULL 許容カラム
    nullable_int_u  INT UNSIGNED                            COMMENT 'INT UNSIGNED nullable',
    label           VARCHAR(100)                            COMMENT '説明'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='UNSIGNED 型の動作確認';

INSERT INTO unsigned_types
    (tiny_u, small_u, medium_u, int_u, bigint_u, tiny_s, small_s, int_s, bigint_s, nullable_int_u, label)
VALUES
    -- 最小値
    (0, 0, 0, 0, 0,
     -128, -32768, -2147483648, -9223372036854775808,
     NULL, '最小値'),
    -- 通常値
    (100, 1000, 100000, 100000000, 100000000000,
     100, 1000, 100000000, 100000000000,
     42, '通常値'),
    -- signed 型の最大値付近
    (127, 32767, 8388607, 2147483647, 9223372036854775807,
     127, 32767, 2147483647, 9223372036854775807,
     2147483647, 'signed最大値'),
    -- unsigned 型で signed を超える値
    (255, 65535, 16777215, 4294967295, 9223372036854775808,
     -1, -1, -1, -1,
     4294967295, 'unsigned最大値 (signed超過)');
