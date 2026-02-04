-- Gamification System Tables

-- User Streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  nullifier_hash TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  streak_start_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(nullifier_hash, badge_type)
);

-- Badge Types Reference (for documentation)
-- FIRST_AD: First ad watched
-- STREAK_3, STREAK_7, STREAK_14, STREAK_30: Streak milestones
-- INVITER_BRONZE (3), INVITER_SILVER (5), INVITER_GOLD (10): Referral milestones
-- QUIZ_MASTER: 10 quiz answers correct
-- EARLY_ADOPTER: First 1000 users
-- DAILY_GOAL_7: Achieved daily goal 7 times
-- XP_1000, XP_5000, XP_10000: XP milestones

-- Weekly Leaderboard
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL,
  week_start DATE NOT NULL,  -- Monday of the week
  weekly_xp INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nullifier_hash, week_start)
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_nullifier TEXT NOT NULL,
  invitee_nullifier TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, completed, rewarded
  referrer_reward_xp INTEGER DEFAULT 0,
  invitee_reward_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(invitee_nullifier)
);

-- Notification Subscriptions
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  nullifier_hash TEXT PRIMARY KEY,
  wallet_address TEXT,
  streak_reminders BOOLEAN DEFAULT TRUE,
  goal_achieved BOOLEAN DEFAULT TRUE,
  leaderboard_updates BOOLEAN DEFAULT TRUE,
  new_badges BOOLEAN DEFAULT TRUE,
  referral_updates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_nullifier ON user_badges(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week ON weekly_leaderboard(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_xp ON weekly_leaderboard(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_nullifier);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_nullifier_hash TEXT)
RETURNS TABLE(
  streak_extended BOOLEAN,
  new_streak INTEGER,
  milestone INTEGER
) AS $$
DECLARE
  v_last_active DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_streak_extended BOOLEAN := FALSE;
  v_milestone INTEGER := NULL;
BEGIN
  -- Get current streak data
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM user_streaks
  WHERE nullifier_hash = p_nullifier_hash;

  -- If no record, create one
  IF NOT FOUND THEN
    INSERT INTO user_streaks (nullifier_hash, current_streak, longest_streak, last_active_date, streak_start_date)
    VALUES (p_nullifier_hash, 1, 1, CURRENT_DATE, CURRENT_DATE);

    RETURN QUERY SELECT TRUE, 1, 1;
    RETURN;
  END IF;

  -- Check if already active today
  IF v_last_active = CURRENT_DATE THEN
    RETURN QUERY SELECT FALSE, v_current_streak, NULL::INTEGER;
    RETURN;
  END IF;

  -- Check if streak continues (yesterday) or breaks
  IF v_last_active = CURRENT_DATE - 1 THEN
    -- Streak continues
    v_current_streak := v_current_streak + 1;
    v_streak_extended := TRUE;

    -- Update longest if needed
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;

    -- Check for milestones
    IF v_current_streak IN (3, 7, 14, 30, 60, 90, 365) THEN
      v_milestone := v_current_streak;
    END IF;
  ELSE
    -- Streak breaks, start new one
    v_current_streak := 1;
    v_streak_extended := TRUE;

    UPDATE user_streaks
    SET streak_start_date = CURRENT_DATE
    WHERE nullifier_hash = p_nullifier_hash;
  END IF;

  -- Update the record
  UPDATE user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_active_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE nullifier_hash = p_nullifier_hash;

  RETURN QUERY SELECT v_streak_extended, v_current_streak, v_milestone;
END;
$$ LANGUAGE plpgsql;

-- Function to update weekly leaderboard
CREATE OR REPLACE FUNCTION update_weekly_leaderboard(p_nullifier_hash TEXT, p_xp_amount INTEGER)
RETURNS VOID AS $$
DECLARE
  v_week_start DATE;
BEGIN
  -- Get Monday of current week
  v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;

  INSERT INTO weekly_leaderboard (nullifier_hash, week_start, weekly_xp)
  VALUES (p_nullifier_hash, v_week_start, p_xp_amount)
  ON CONFLICT (nullifier_hash, week_start)
  DO UPDATE SET
    weekly_xp = weekly_leaderboard.weekly_xp + p_xp_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard with ranks
CREATE OR REPLACE FUNCTION get_weekly_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
  rank BIGINT,
  nullifier_hash TEXT,
  weekly_xp INTEGER
) AS $$
DECLARE
  v_week_start DATE;
BEGIN
  v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY wl.weekly_xp DESC) as rank,
    wl.nullifier_hash,
    wl.weekly_xp
  FROM weekly_leaderboard wl
  WHERE wl.week_start = v_week_start
  ORDER BY wl.weekly_xp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to award badge
CREATE OR REPLACE FUNCTION award_badge(p_nullifier_hash TEXT, p_badge_type TEXT, p_metadata JSONB DEFAULT '{}')
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_badges (nullifier_hash, badge_type, metadata)
  VALUES (p_nullifier_hash, p_badge_type, p_metadata)
  ON CONFLICT (nullifier_hash, badge_type) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
