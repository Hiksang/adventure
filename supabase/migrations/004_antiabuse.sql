-- Anti-Abuse System Tables

-- Behavior analysis scores
CREATE TABLE IF NOT EXISTS behavior_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL,
  date DATE NOT NULL,
  suspicion_score DECIMAL(5,2) DEFAULT 0,  -- 0-100
  view_time_variance DECIMAL(10,4),         -- Low variance = suspicious
  interval_variance DECIMAL(10,4),          -- Consistent intervals = suspicious
  session_count INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,   -- seconds
  flags JSONB DEFAULT '[]',                 -- ["fast_viewing", "consistent_intervals", etc.]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nullifier_hash, date)
);

-- Re-verification requests
CREATE TABLE IF NOT EXISTS reverification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL,
  action TEXT NOT NULL,                     -- Different action for different nullifier
  reason TEXT NOT NULL,                     -- Why re-verification was requested
  status TEXT DEFAULT 'pending',            -- pending, completed, expired
  original_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(nullifier_hash, action)
);

-- Challenge results history
CREATE TABLE IF NOT EXISTS challenge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL,
  challenge_type TEXT NOT NULL,             -- tap, math, swipe, sequence
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_behavior_scores_nullifier ON behavior_scores(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_behavior_scores_date ON behavior_scores(date);
CREATE INDEX IF NOT EXISTS idx_behavior_scores_suspicion ON behavior_scores(suspicion_score);
CREATE INDEX IF NOT EXISTS idx_reverification_nullifier ON reverification_requests(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_challenge_history_nullifier ON challenge_history(nullifier_hash);

-- Function to update behavior score
CREATE OR REPLACE FUNCTION update_behavior_score(
  p_nullifier_hash TEXT,
  p_view_time_variance DECIMAL,
  p_interval_variance DECIMAL,
  p_flags JSONB DEFAULT '[]'
)
RETURNS DECIMAL AS $$
DECLARE
  v_suspicion_score DECIMAL;
BEGIN
  -- Calculate suspicion score based on patterns
  -- Low variance in viewing time = suspicious (bots are consistent)
  -- Low variance in intervals = suspicious
  v_suspicion_score := 0;

  -- View time variance contribution (0-40 points)
  IF p_view_time_variance IS NOT NULL THEN
    IF p_view_time_variance < 0.1 THEN
      v_suspicion_score := v_suspicion_score + 40;
    ELSIF p_view_time_variance < 0.5 THEN
      v_suspicion_score := v_suspicion_score + 20;
    ELSIF p_view_time_variance < 1.0 THEN
      v_suspicion_score := v_suspicion_score + 10;
    END IF;
  END IF;

  -- Interval variance contribution (0-40 points)
  IF p_interval_variance IS NOT NULL THEN
    IF p_interval_variance < 0.1 THEN
      v_suspicion_score := v_suspicion_score + 40;
    ELSIF p_interval_variance < 0.5 THEN
      v_suspicion_score := v_suspicion_score + 20;
    ELSIF p_interval_variance < 1.0 THEN
      v_suspicion_score := v_suspicion_score + 10;
    END IF;
  END IF;

  -- Flags contribution (0-20 points)
  IF jsonb_array_length(p_flags) > 0 THEN
    v_suspicion_score := v_suspicion_score + LEAST(jsonb_array_length(p_flags) * 5, 20);
  END IF;

  -- Upsert the score
  INSERT INTO behavior_scores (nullifier_hash, date, suspicion_score, view_time_variance, interval_variance, flags)
  VALUES (p_nullifier_hash, CURRENT_DATE, v_suspicion_score, p_view_time_variance, p_interval_variance, p_flags)
  ON CONFLICT (nullifier_hash, date)
  DO UPDATE SET
    suspicion_score = v_suspicion_score,
    view_time_variance = p_view_time_variance,
    interval_variance = p_interval_variance,
    flags = p_flags,
    updated_at = NOW();

  RETURN v_suspicion_score;
END;
$$ LANGUAGE plpgsql;
