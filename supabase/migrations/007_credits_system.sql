-- Credits System Migration
-- Users earn credits from watching ads and can redeem for WLD or gift cards

-- Add credits column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Credit transaction types
CREATE TYPE credit_tx_type AS ENUM (
  'earn_ad_view',      -- Earned from watching ad
  'earn_quiz',         -- Earned from quiz correct answer
  'earn_bonus',        -- Bonus credits (streaks, achievements, etc.)
  'earn_referral',     -- Earned from referral
  'redeem_wld',        -- Redeemed for WLD
  'redeem_giftcard',   -- Redeemed for gift card
  'admin_adjust'       -- Admin adjustment
);

-- Credit transactions history
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nullifier_hash TEXT NOT NULL,
  type credit_tx_type NOT NULL,
  amount INTEGER NOT NULL,  -- Positive for earn, negative for redeem
  balance_after INTEGER NOT NULL,  -- Balance after this transaction
  reference_id TEXT,  -- Ad ID, gift card ID, etc.
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift card categories
CREATE TABLE IF NOT EXISTS giftcard_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ko TEXT,
  icon TEXT,  -- Emoji or icon URL
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift card products
CREATE TABLE IF NOT EXISTS giftcard_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES giftcard_categories(id),
  name TEXT NOT NULL,
  name_ko TEXT,
  description TEXT,
  brand TEXT NOT NULL,  -- e.g., "Starbucks", "CU", "GS25"
  image_url TEXT,
  credit_cost INTEGER NOT NULL,  -- Cost in credits
  face_value INTEGER NOT NULL,  -- Face value in KRW
  stock INTEGER DEFAULT -1,  -- -1 means unlimited
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redemption requests
CREATE TYPE redemption_status AS ENUM (
  'pending',      -- Waiting for processing
  'processing',   -- Being processed
  'completed',    -- Successfully completed
  'failed',       -- Failed
  'cancelled'     -- Cancelled by user or admin
);

CREATE TYPE redemption_type AS ENUM (
  'wld',
  'giftcard'
);

CREATE TABLE IF NOT EXISTS redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nullifier_hash TEXT NOT NULL,
  type redemption_type NOT NULL,
  status redemption_status DEFAULT 'pending',
  credits_spent INTEGER NOT NULL,

  -- For WLD redemptions
  wld_amount DECIMAL(18, 8),
  wallet_address TEXT,
  tx_hash TEXT,

  -- For gift card redemptions
  giftcard_product_id UUID REFERENCES giftcard_products(id),
  giftcard_code TEXT,  -- The actual gift card code (encrypted)
  giftcard_pin TEXT,   -- PIN if applicable (encrypted)

  -- Processing info
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  failure_reason TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit configuration
CREATE TABLE IF NOT EXISTS credit_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO credit_config (key, value, description) VALUES
  ('credits_per_ad_view', '{"amount": 10}', 'Credits earned per ad view'),
  ('credits_per_quiz_correct', '{"amount": 20}', 'Bonus credits for quiz correct answer'),
  ('wld_redemption_rate', '{"credits_per_wld": 1000}', '1000 credits = 1 WLD'),
  ('min_wld_redemption', '{"credits": 1000, "wld": 1}', 'Minimum WLD redemption (1 WLD)'),
  ('referral_bonus', '{"referrer": 100, "referee": 50}', 'Credits for referral')
ON CONFLICT (key) DO NOTHING;

-- Insert default gift card categories
INSERT INTO giftcard_categories (name, name_ko, icon, sort_order) VALUES
  ('Coffee', '커피', '☕', 1),
  ('Convenience Store', '편의점', '🏪', 2),
  ('Food & Delivery', '음식/배달', '🍔', 3),
  ('Entertainment', '엔터테인먼트', '🎮', 4),
  ('Shopping', '쇼핑', '🛍️', 5)
ON CONFLICT DO NOTHING;

-- Insert sample gift card products (for testing)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_nullifier ON credit_transactions(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_user ON redemption_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_status ON redemption_requests(status);
CREATE INDEX IF NOT EXISTS idx_giftcard_products_category ON giftcard_products(category_id);
CREATE INDEX IF NOT EXISTS idx_giftcard_products_active ON giftcard_products(is_active) WHERE is_active = true;
