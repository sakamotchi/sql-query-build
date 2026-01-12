-- デモ用データベース（リレーション表示用）
-- ECサイトをモデルにした典型的なスキーマ

CREATE DATABASE demo_ecommerce;

\c demo_ecommerce;

-- ========================================
-- マスタテーブル
-- ========================================

-- カテゴリ（自己参照リレーション）
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES categories(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS '商品カテゴリ';
COMMENT ON COLUMN categories.parent_id IS '親カテゴリID（自己参照）';

-- ブランド
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE brands IS 'ブランド';

-- 商品
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    brand_id INTEGER REFERENCES brands(id),
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS '商品';

-- 商品画像
CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE product_images IS '商品画像';

-- ========================================
-- ユーザー関連
-- ========================================

-- ユーザー
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'ユーザー';

-- 配送先住所
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50),
    postal_code VARCHAR(10),
    prefecture VARCHAR(50),
    city VARCHAR(100),
    street VARCHAR(200),
    building VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE addresses IS '配送先住所';

-- ========================================
-- 注文関連
-- ========================================

-- 注文ステータス
CREATE TABLE order_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

COMMENT ON TABLE order_statuses IS '注文ステータス';

-- 注文
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status_id INTEGER NOT NULL REFERENCES order_statuses(id),
    shipping_address_id INTEGER REFERENCES addresses(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_fee DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

COMMENT ON TABLE orders IS '注文';

-- 注文明細
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
);

COMMENT ON TABLE order_items IS '注文明細';

-- ========================================
-- レビュー
-- ========================================

-- 商品レビュー
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
);

COMMENT ON TABLE reviews IS '商品レビュー';

-- ========================================
-- カート
-- ========================================

-- カート
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE carts IS 'ショッピングカート';

-- カートアイテム
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

COMMENT ON TABLE cart_items IS 'カートアイテム';

-- ========================================
-- お気に入り
-- ========================================

CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

COMMENT ON TABLE favorites IS 'お気に入り商品';

-- ========================================
-- インデックス
-- ========================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- ========================================
-- サンプルデータ
-- ========================================

-- 注文ステータス
INSERT INTO order_statuses (name, description) VALUES
    ('pending', '注文受付'),
    ('confirmed', '注文確定'),
    ('processing', '処理中'),
    ('shipped', '発送済み'),
    ('delivered', '配達完了'),
    ('cancelled', 'キャンセル');

-- カテゴリ
INSERT INTO categories (name, description) VALUES
    ('エレクトロニクス', '電子機器・家電製品'),
    ('ファッション', '衣類・アクセサリー'),
    ('ホーム＆キッチン', '家庭用品・キッチン用品'),
    ('スポーツ', 'スポーツ用品・アウトドア');

INSERT INTO categories (name, parent_id, description) VALUES
    ('スマートフォン', 1, 'スマートフォン・携帯電話'),
    ('パソコン', 1, 'PC・タブレット'),
    ('メンズ', 2, '男性用ファッション'),
    ('レディース', 2, '女性用ファッション');

-- ブランド
INSERT INTO brands (name, website) VALUES
    ('TechBrand', 'https://techbrand.example.com'),
    ('StyleCo', 'https://styleco.example.com'),
    ('HomeLife', 'https://homelife.example.com'),
    ('SportMax', 'https://sportmax.example.com');

-- 商品
INSERT INTO products (name, description, price, category_id, brand_id, stock_quantity) VALUES
    ('スマートフォン Pro', '最新のハイエンドスマートフォン', 129800, 5, 1, 50),
    ('ノートPC Ultra', '軽量・高性能ノートPC', 198000, 6, 1, 30),
    ('ワイヤレスイヤホン', 'ノイズキャンセリング対応', 29800, 1, 1, 100),
    ('メンズジャケット', 'カジュアルジャケット', 15800, 7, 2, 80),
    ('レディースワンピース', 'エレガントなワンピース', 12800, 8, 2, 60),
    ('コーヒーメーカー', '全自動コーヒーメーカー', 35000, 3, 3, 40),
    ('ランニングシューズ', '軽量ランニングシューズ', 12000, 4, 4, 120);

-- ユーザー
INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES
    ('tanaka@example.com', 'hash_dummy_1', '太郎', '田中', '090-1234-5678'),
    ('yamada@example.com', 'hash_dummy_2', '花子', '山田', '090-2345-6789'),
    ('suzuki@example.com', 'hash_dummy_3', '一郎', '鈴木', '090-3456-7890');

-- 住所
INSERT INTO addresses (user_id, label, postal_code, prefecture, city, street, is_default) VALUES
    (1, '自宅', '100-0001', '東京都', '千代田区', '丸の内1-1-1', TRUE),
    (1, '会社', '150-0001', '東京都', '渋谷区', '渋谷2-2-2', FALSE),
    (2, '自宅', '530-0001', '大阪府', '大阪市北区', '梅田3-3-3', TRUE);

-- 注文
INSERT INTO orders (user_id, status_id, shipping_address_id, total_amount, shipping_fee) VALUES
    (1, 5, 1, 129800, 0),
    (1, 4, 1, 29800, 500),
    (2, 2, 3, 47800, 0);

-- 注文明細
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
    (1, 1, 1, 129800, 129800),
    (2, 3, 1, 29800, 29800),
    (3, 6, 1, 35000, 35000),
    (3, 4, 1, 12800, 12800);

-- レビュー
INSERT INTO reviews (product_id, user_id, rating, title, content) VALUES
    (1, 1, 5, '素晴らしい製品', 'とても満足しています。動作も快適です。'),
    (1, 2, 4, '概ね満足', 'バッテリー持ちが少し気になりますが、全体的に良いです。'),
    (3, 1, 5, '音質が最高', 'ノイズキャンセリングが効いて集中できます。');

-- カート
INSERT INTO carts (user_id) VALUES (3);
INSERT INTO cart_items (cart_id, product_id, quantity) VALUES
    (1, 2, 1),
    (1, 7, 2);

-- お気に入り
INSERT INTO favorites (user_id, product_id) VALUES
    (1, 2),
    (1, 6),
    (2, 1),
    (2, 5);
