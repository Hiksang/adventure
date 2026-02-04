-- Ad Targeting with ZKP Credentials
-- Privacy-preserving targeting: only yes/no verification, no actual data stored

-- Add targeting columns to ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_min_age INTEGER;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_max_age INTEGER;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_age_ranges TEXT[];  -- ['18-24', '25-34', ...]
ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_nationalities TEXT[];  -- ['KR', 'JP', 'US', ...]
ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_verification_level TEXT;  -- 'orb', 'device', 'passport', 'any'
ALTER TABLE ads ADD COLUMN IF NOT EXISTS targeting_premium DECIMAL(3,2) DEFAULT 1.0;  -- XP multiplier for targeted ads

-- User credentials (ZKP verified, not actual data)
CREATE TABLE IF NOT EXISTS user_credentials (
  nullifier_hash TEXT PRIMARY KEY,
  verification_level TEXT NOT NULL,  -- 'orb', 'device', 'passport'

  -- Age verification (ZKP: only knows if in range, not actual age)
  age_verified BOOLEAN DEFAULT FALSE,
  age_range TEXT,  -- '18-24', '25-34', etc.
  age_verified_at TIMESTAMPTZ,

  -- Nationality verification (ZKP: only knows country, not passport details)
  nationality_verified BOOLEAN DEFAULT FALSE,
  nationality TEXT,  -- 'KR', 'US', etc.
  nationality_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credential verification history (for audit)
CREATE TABLE IF NOT EXISTS credential_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL,
  credential_type TEXT NOT NULL,  -- 'age', 'nationality'
  credential_value TEXT NOT NULL,  -- '25-34', 'KR', etc.
  action TEXT NOT NULL,  -- World ID action used
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  -- No actual data stored, only verification status
  UNIQUE(nullifier_hash, credential_type)
);

-- Ad view stats by targeting (aggregated, privacy-preserving)
CREATE TABLE IF NOT EXISTS targeted_ad_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id),
  date DATE NOT NULL,
  -- Aggregated counts only (no individual user data)
  total_views INTEGER DEFAULT 0,
  orb_verified_views INTEGER DEFAULT 0,
  device_verified_views INTEGER DEFAULT 0,
  passport_verified_views INTEGER DEFAULT 0,
  -- Age range breakdown (count only, not individual users)
  age_18_24_views INTEGER DEFAULT 0,
  age_25_34_views INTEGER DEFAULT 0,
  age_35_44_views INTEGER DEFAULT 0,
  age_45_54_views INTEGER DEFAULT 0,
  age_55_plus_views INTEGER DEFAULT 0,
  -- Nationality breakdown (count only)
  nationality_breakdown JSONB DEFAULT '{}',  -- {"KR": 100, "JP": 50, ...}
  UNIQUE(ad_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_credentials_nullifier ON user_credentials(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_user_credentials_age ON user_credentials(age_range) WHERE age_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_credentials_nationality ON user_credentials(nationality) WHERE nationality_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_ads_targeting ON ads(target_age_ranges, target_nationalities);
CREATE INDEX IF NOT EXISTS idx_targeted_ad_stats_ad ON targeted_ad_stats(ad_id);
CREATE INDEX IF NOT EXISTS idx_targeted_ad_stats_date ON targeted_ad_stats(date);

-- Function to check if user matches ad targeting
CREATE OR REPLACE FUNCTION matches_ad_targeting(
  p_nullifier_hash TEXT,
  p_ad_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_ad RECORD;
  v_user RECORD;
BEGIN
  -- Get ad targeting criteria
  SELECT target_age_ranges, target_nationalities, target_verification_level
  INTO v_ad
  FROM ads WHERE id = p_ad_id;

  -- No targeting = matches everyone
  IF v_ad.target_age_ranges IS NULL
     AND v_ad.target_nationalities IS NULL
     AND (v_ad.target_verification_level IS NULL OR v_ad.target_verification_level = 'any') THEN
    RETURN TRUE;
  END IF;

  -- Get user credentials
  SELECT * INTO v_user FROM user_credentials WHERE nullifier_hash = p_nullifier_hash;

  -- No credentials = doesn't match targeted ads
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check verification level
  IF v_ad.target_verification_level IS NOT NULL AND v_ad.target_verification_level != 'any' THEN
    IF v_ad.target_verification_level = 'passport' AND v_user.verification_level != 'passport' THEN
      RETURN FALSE;
    ELSIF v_ad.target_verification_level = 'orb' AND v_user.verification_level NOT IN ('orb', 'passport') THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check age range
  IF v_ad.target_age_ranges IS NOT NULL AND array_length(v_ad.target_age_ranges, 1) > 0 THEN
    IF NOT v_user.age_verified OR v_user.age_range IS NULL THEN
      RETURN FALSE;
    END IF;
    IF NOT (v_user.age_range = ANY(v_ad.target_age_ranges)) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check nationality
  IF v_ad.target_nationalities IS NOT NULL AND array_length(v_ad.target_nationalities, 1) > 0 THEN
    IF NOT v_user.nationality_verified OR v_user.nationality IS NULL THEN
      RETURN FALSE;
    END IF;
    IF NOT (v_user.nationality = ANY(v_ad.target_nationalities)) THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to increment targeted ad stats
CREATE OR REPLACE FUNCTION increment_targeted_ad_stats(
  p_ad_id UUID,
  p_nullifier_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_age_column TEXT;
BEGIN
  -- Get user credentials
  SELECT * INTO v_user FROM user_credentials WHERE nullifier_hash = p_nullifier_hash;

  -- Determine age column
  IF v_user.age_range = '18-24' THEN v_age_column := 'age_18_24_views';
  ELSIF v_user.age_range = '25-34' THEN v_age_column := 'age_25_34_views';
  ELSIF v_user.age_range = '35-44' THEN v_age_column := 'age_35_44_views';
  ELSIF v_user.age_range = '45-54' THEN v_age_column := 'age_45_54_views';
  ELSIF v_user.age_range = '55+' THEN v_age_column := 'age_55_plus_views';
  ELSE v_age_column := NULL;
  END IF;

  -- Upsert stats
  INSERT INTO targeted_ad_stats (ad_id, date, total_views)
  VALUES (p_ad_id, CURRENT_DATE, 1)
  ON CONFLICT (ad_id, date)
  DO UPDATE SET
    total_views = targeted_ad_stats.total_views + 1,
    orb_verified_views = targeted_ad_stats.orb_verified_views +
      CASE WHEN v_user.verification_level = 'orb' THEN 1 ELSE 0 END,
    device_verified_views = targeted_ad_stats.device_verified_views +
      CASE WHEN v_user.verification_level = 'device' THEN 1 ELSE 0 END,
    passport_verified_views = targeted_ad_stats.passport_verified_views +
      CASE WHEN v_user.verification_level = 'passport' THEN 1 ELSE 0 END;

  -- Update nationality breakdown
  IF v_user.nationality IS NOT NULL THEN
    UPDATE targeted_ad_stats
    SET nationality_breakdown = jsonb_set(
      COALESCE(nationality_breakdown, '{}'),
      ARRAY[v_user.nationality],
      (COALESCE((nationality_breakdown->>v_user.nationality)::int, 0) + 1)::text::jsonb
    )
    WHERE ad_id = p_ad_id AND date = CURRENT_DATE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Sample targeted ads for testing
INSERT INTO ads (title, description, type, content_text, xp_reward, target_age_ranges, target_nationalities, targeting_premium)
VALUES
  ('한국 20대를 위한 특별 광고', '20대 한국 사용자 전용 광고입니다', 'text', '젊은 한국인을 위한 프리미엄 콘텐츠', 25, ARRAY['18-24', '25-34'], ARRAY['KR'], 1.5),
  ('글로벌 프리미엄 광고', 'Orb 인증 사용자 전용', 'text', '검증된 인간만을 위한 프리미엄 광고', 30, NULL, NULL, 1.3)
ON CONFLICT DO NOTHING;
