-- 各種データ型の動作確認用テーブル（Phase 1〜2 対応確認）
-- Phase 1: 日付・時刻型、文字列型、バイナリ型、JSON、BIT
-- Phase 2: DECIMAL/NUMERIC

USE benchmark_small;

CREATE TABLE IF NOT EXISTS type_test (
    id          INT PRIMARY KEY AUTO_INCREMENT,

    -- 日付・時刻型 (Phase 1: T-01)
    ts_val      TIMESTAMP,
    dt_val      DATETIME,
    d_val       DATE,
    t_val       TIME,
    yr_val      YEAR,

    -- 数値型 (Phase 2: T-10)
    dec_val     DECIMAL(10, 4),
    num_val     NUMERIC(15, 2),

    -- 文字列型 (Phase 1: T-02)
    tinytext_val    TINYTEXT,
    mediumtext_val  MEDIUMTEXT,
    enum_val        ENUM('apple', 'banana', 'cherry'),
    set_val         SET('red', 'green', 'blue'),

    -- バイナリ型 (Phase 1: T-03)
    tinyblob_val    TINYBLOB,
    mediumblob_val  MEDIUMBLOB,

    -- JSON 型 (Phase 1: T-04)
    json_val    JSON,

    -- BIT 型 (Phase 1: T-05)
    bit_val     BIT(8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='各種データ型の動作確認';

INSERT INTO type_test (
    ts_val, dt_val, d_val, t_val, yr_val,
    dec_val, num_val,
    tinytext_val, mediumtext_val, enum_val, set_val,
    tinyblob_val, mediumblob_val,
    json_val, bit_val
) VALUES
    -- 通常値
    (
        '2026-03-15 10:00:00',
        '2026-03-15 10:00:00',
        '2026-03-15',
        '10:00:00',
        2026,
        1234.5678,
        123456789.99,
        'tinytext value',
        'mediumtext value',
        'banana',
        'red,blue',
        'binary data',
        'medium binary data',
        '{"key": "value", "num": 42}',
        b'10101010'
    ),
    -- 精度確認用
    (
        '2000-01-01 00:00:01',
        '2000-01-01 00:00:01',
        '2000-01-01',
        '00:00:01',
        2000,
        0.0001,
        0.01,
        'a',
        'b',
        'cherry',
        'green',
        '',
        '',
        '{"arr": [1, 2, 3]}',
        b'00000001'
    ),
    -- NULL 値確認
    (
        NULL, NULL, NULL, NULL, NULL,
        NULL, NULL,
        NULL, NULL, NULL, NULL,
        NULL, NULL,
        NULL, NULL
    );
