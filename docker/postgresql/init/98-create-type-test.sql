-- 各種データ型の動作確認用テーブル（Phase 1〜3 対応確認）
-- Phase 1: ネットワーク型、JSON/JSONB、幾何型、INTERVAL 等
-- Phase 2: NUMERIC/MONEY
-- Phase 3: 配列型

\c benchmark_small;

CREATE TABLE IF NOT EXISTS type_test (
    id              SERIAL PRIMARY KEY,

    -- 数値型 (Phase 2: T-11)
    numeric_val     NUMERIC(10, 4),
    money_val       MONEY,

    -- JSON 型 (Phase 1: T-07)
    json_val        JSON,
    jsonb_val       JSONB,

    -- ネットワーク型 (Phase 1: T-06)
    inet_val        INET,
    cidr_val        CIDR,
    macaddr_val     MACADDR,

    -- INTERVAL (Phase 1: T-06)
    interval_val    INTERVAL,

    -- 配列型 (Phase 3: T-12)
    int_arr         INTEGER[],
    text_arr        TEXT[],
    bool_arr        BOOLEAN[],
    float_arr       FLOAT8[],

    -- 幾何型 (Phase 1: T-08)
    point_val       POINT
);

COMMENT ON TABLE type_test IS '各種データ型の動作確認';

INSERT INTO type_test (
    numeric_val, money_val,
    json_val, jsonb_val,
    inet_val, cidr_val, macaddr_val,
    interval_val,
    int_arr, text_arr, bool_arr, float_arr,
    point_val
) VALUES
    -- 通常値
    (
        1234.5678,
        1234.56,
        '{"key": "value", "num": 42}',
        '{"key": "value", "num": 42}',
        '192.168.1.1',
        '192.168.0.0/24',
        '08:00:2b:01:02:03',
        '1 year 2 months 3 days',
        ARRAY[1, 2, 3],
        ARRAY['hello', 'world'],
        ARRAY[true, false, true],
        ARRAY[1.1, 2.2, 3.3],
        '(1,2)'
    ),
    -- NULL 要素を含む配列
    (
        0.0001,
        0.01,
        '{"arr": [1, null, 3]}',
        '[]',
        '::1',
        '::1/128',
        'ff:ff:ff:ff:ff:ff',
        '30 minutes',
        ARRAY[10, NULL, 30],
        ARRAY['a', NULL, 'c'],
        ARRAY[false, NULL, true],
        ARRAY[0.5, NULL, 1.5],
        '(0,0)'
    ),
    -- 空の配列・NULL 値
    (
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '{}',
        '{}',
        '{}',
        '{}',
        NULL
    );
