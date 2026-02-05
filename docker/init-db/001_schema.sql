-- ===========================================
-- AdWatch Database Schema
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Users Table
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nullifier_hash TEXT UNIQUE NOT NULL,
    verification_level TEXT NOT NULL DEFAULT 'device',
    wallet_address TEXT,
    username TEXT,
    credits INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_nullifier ON users(nullifier_hash);
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- ===========================================
-- World ID Proofs Table
-- ===========================================
CREATE TABLE IF NOT EXISTS world_id_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nullifier_hash TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    merkle_root TEXT NOT NULL,
    proof TEXT NOT NULL,
    verification_level TEXT NOT NULL,
    action TEXT NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nullifier_hash, action)
);

CREATE INDEX idx_proofs_nullifier ON world_id_proofs(nullifier_hash);

-- ===========================================
-- Credit Transactions
-- ===========================================
CREATE TYPE credit_tx_type AS ENUM (
    'earn_ad_view',
    'earn_quiz',
    'earn_bonus',
    'earn_referral',
    'redeem_wld',
    'redeem_giftcard',
    'admin_adjust'
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nullifier_hash TEXT NOT NULL,
    type credit_tx_type NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_nullifier ON credit_transactions(nullifier_hash);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at DESC);

-- ===========================================
-- Redemption Requests
-- ===========================================
CREATE TYPE redemption_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE redemption_type AS ENUM (
    'wld',
    'giftcard'
);

CREATE TABLE IF NOT EXISTS redemption_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nullifier_hash TEXT NOT NULL,
    type redemption_type NOT NULL,
    status redemption_status DEFAULT 'pending',
    credits_spent INTEGER NOT NULL,

    -- WLD redemptions
    wld_amount DECIMAL(18, 8),
    wallet_address TEXT,
    tx_hash TEXT,

    -- Giftcard redemptions
    giftcard_product_id UUID,
    giftcard_code TEXT,
    giftcard_pin TEXT,

    -- Processing
    processed_at TIMESTAMPTZ,
    processed_by TEXT,
    failure_reason TEXT,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_redemption_user ON redemption_requests(user_id);
CREATE INDEX idx_redemption_nullifier ON redemption_requests(nullifier_hash);
CREATE INDEX idx_redemption_status ON redemption_requests(status);

-- ===========================================
-- Giftcard Categories
-- ===========================================
CREATE TABLE IF NOT EXISTS giftcard_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ko TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Giftcard Products
-- ===========================================
CREATE TABLE IF NOT EXISTS giftcard_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES giftcard_categories(id),
    name TEXT NOT NULL,
    name_ko TEXT,
    description TEXT,
    brand TEXT NOT NULL,
    image_url TEXT,
    credit_cost INTEGER NOT NULL,
    face_value INTEGER NOT NULL,
    stock INTEGER DEFAULT -1,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_giftcard_category ON giftcard_products(category_id);
CREATE INDEX idx_giftcard_active ON giftcard_products(is_active) WHERE is_active = true;

-- ===========================================
-- Credit Configuration
-- ===========================================
CREATE TABLE IF NOT EXISTS credit_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Daily View Stats (Privacy-preserving aggregates)
-- ===========================================
CREATE TABLE IF NOT EXISTS daily_view_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nullifier_hash TEXT NOT NULL,
    date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nullifier_hash, date)
);

CREATE INDEX idx_daily_stats_nullifier ON daily_view_stats(nullifier_hash);
CREATE INDEX idx_daily_stats_date ON daily_view_stats(date);

-- ===========================================
-- User Streaks
-- ===========================================
CREATE TABLE IF NOT EXISTS user_streaks (
    nullifier_hash TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- User Badges
-- ===========================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nullifier_hash TEXT NOT NULL,
    badge_type TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nullifier_hash, badge_type)
);

CREATE INDEX idx_badges_nullifier ON user_badges(nullifier_hash);

-- ===========================================
-- Weekly Leaderboard
-- ===========================================
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nullifier_hash TEXT NOT NULL,
    week_start DATE NOT NULL,
    weekly_xp INTEGER DEFAULT 0,
    UNIQUE(nullifier_hash, week_start)
);

CREATE INDEX idx_leaderboard_week ON weekly_leaderboard(week_start);
CREATE INDEX idx_leaderboard_xp ON weekly_leaderboard(weekly_xp DESC);

-- ===========================================
-- Sessions (JWT 토큰 관리)
-- ===========================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nullifier_hash TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ===========================================
-- Functions
-- ===========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_redemption_updated_at
    BEFORE UPDATE ON redemption_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_giftcard_updated_at
    BEFORE UPDATE ON giftcard_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment daily view stats
CREATE OR REPLACE FUNCTION increment_daily_view(
    p_nullifier_hash TEXT,
    p_xp_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_view_stats (nullifier_hash, date, view_count, xp_earned)
    VALUES (p_nullifier_hash, CURRENT_DATE, 1, p_xp_amount)
    ON CONFLICT (nullifier_hash, date)
    DO UPDATE SET
        view_count = daily_view_stats.view_count + 1,
        xp_earned = daily_view_stats.xp_earned + p_xp_amount;
END;
$$ LANGUAGE plpgsql;
