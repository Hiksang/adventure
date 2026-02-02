-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE,
  username TEXT NOT NULL DEFAULT 'User',
  world_id_verified BOOLEAN DEFAULT FALSE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ads
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'video')),
  content_url TEXT,
  content_text TEXT,
  thumbnail_url TEXT,
  xp_reward INTEGER DEFAULT 0,
  wld_reward DECIMAL(18,8) DEFAULT 0,
  duration_seconds INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad Views
CREATE TABLE IF NOT EXISTS ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  ad_id UUID REFERENCES ads(id),
  completed BOOLEAN DEFAULT FALSE,
  watch_percentage INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('code_entry', 'knowledge_quiz')),
  code TEXT,
  questions JSONB,
  xp_reward INTEGER DEFAULT 0,
  wld_reward DECIMAL(18,8) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Completions
CREATE TABLE IF NOT EXISTS activity_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  activity_id UUID REFERENCES activities(id),
  completed BOOLEAN DEFAULT FALSE,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('xp', 'wld')),
  amount DECIMAL(18,8) DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('ad_view', 'activity_completion')),
  source_id UUID,
  claimed BOOLEAN DEFAULT FALSE,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP History
CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add XP function
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_amount INTEGER, p_source TEXT, p_source_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET xp = xp + p_amount, level = (xp + p_amount) / 100 + 1, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO xp_history (user_id, amount, source, source_id) VALUES (p_user_id, p_amount, p_source, p_source_id);
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_views_user ON ad_views(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_completions_user ON activity_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(user_id);
