-- Privacy-by-Design: 개별 광고 시청 기록 대신 일일 집계만 저장
CREATE TABLE IF NOT EXISTS daily_view_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL,
  date DATE NOT NULL,
  view_count INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  commitment_hash TEXT,  -- 클라이언트 생성 해시 (검증용)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nullifier_hash, date)
);

-- 암호화된 시청 기록 (서버는 내용 모름)
CREATE TABLE IF NOT EXISTS encrypted_ad_history (
  nullifier_hash TEXT PRIMARY KEY,
  encrypted_data TEXT NOT NULL,  -- 클라이언트만 복호화 가능
  iv TEXT NOT NULL,              -- Initialization vector for AES
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_view_stats_nullifier ON daily_view_stats(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_daily_view_stats_date ON daily_view_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_view_stats_nullifier_date ON daily_view_stats(nullifier_hash, date);

-- Function to increment daily view stats
CREATE OR REPLACE FUNCTION increment_daily_view(
  p_nullifier_hash TEXT,
  p_xp_amount INTEGER,
  p_commitment_hash TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_view_stats (nullifier_hash, date, view_count, xp_earned, commitment_hash)
  VALUES (p_nullifier_hash, CURRENT_DATE, 1, p_xp_amount, p_commitment_hash)
  ON CONFLICT (nullifier_hash, date)
  DO UPDATE SET
    view_count = daily_view_stats.view_count + 1,
    xp_earned = daily_view_stats.xp_earned + p_xp_amount,
    commitment_hash = COALESCE(p_commitment_hash, daily_view_stats.commitment_hash),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
