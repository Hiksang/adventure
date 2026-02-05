-- ===========================================
-- Seed Data
-- ===========================================

-- Credit Configuration
INSERT INTO credit_config (key, value, description) VALUES
    ('credits_per_ad_view', '{"amount": 10}', 'Credits earned per ad view'),
    ('credits_per_quiz_correct', '{"amount": 20}', 'Bonus credits for quiz correct answer'),
    ('wld_redemption_rate', '{"credits_per_wld": 1000}', '1000 credits = 1 WLD'),
    ('min_wld_redemption', '{"credits": 1000, "wld": 1}', 'Minimum WLD redemption (1 WLD)'),
    ('referral_bonus', '{"referrer": 100, "referee": 50}', 'Credits for referral')
ON CONFLICT (key) DO NOTHING;

-- Giftcard Categories
INSERT INTO giftcard_categories (name, name_ko, icon, sort_order) VALUES
    ('Coffee', '커피', '☕', 1),
    ('Convenience Store', '편의점', '🏪', 2),
    ('Food & Delivery', '음식/배달', '🍔', 3),
    ('Entertainment', '엔터테인먼트', '🎮', 4),
    ('Shopping', '쇼핑', '🛍️', 5)
ON CONFLICT DO NOTHING;

-- Sample Giftcard Products
INSERT INTO giftcard_products (category_id, name, name_ko, brand, credit_cost, face_value, sort_order)
SELECT
    c.id,
    'Starbucks 5,000 KRW',
    '스타벅스 5,000원',
    'Starbucks',
    500,
    5000,
    1
FROM giftcard_categories c WHERE c.name = 'Coffee'
ON CONFLICT DO NOTHING;

INSERT INTO giftcard_products (category_id, name, name_ko, brand, credit_cost, face_value, sort_order)
SELECT
    c.id,
    'Starbucks 10,000 KRW',
    '스타벅스 10,000원',
    'Starbucks',
    1000,
    10000,
    2
FROM giftcard_categories c WHERE c.name = 'Coffee'
ON CONFLICT DO NOTHING;

INSERT INTO giftcard_products (category_id, name, name_ko, brand, credit_cost, face_value, sort_order)
SELECT
    c.id,
    'CU 5,000 KRW',
    'CU 5,000원',
    'CU',
    500,
    5000,
    1
FROM giftcard_categories c WHERE c.name = 'Convenience Store'
ON CONFLICT DO NOTHING;

INSERT INTO giftcard_products (category_id, name, name_ko, brand, credit_cost, face_value, sort_order)
SELECT
    c.id,
    'GS25 5,000 KRW',
    'GS25 5,000원',
    'GS25',
    500,
    5000,
    2
FROM giftcard_categories c WHERE c.name = 'Convenience Store'
ON CONFLICT DO NOTHING;
