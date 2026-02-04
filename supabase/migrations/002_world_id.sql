-- World ID 인증 정보 저장
CREATE TABLE IF NOT EXISTS world_id_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT UNIQUE NOT NULL,  -- 1인 1계정 보장 핵심
  user_id UUID REFERENCES users(id),
  verification_level TEXT NOT NULL,     -- 'orb' or 'device'
  merkle_root TEXT NOT NULL,
  action TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nullifier_hash, action)
);

-- users 테이블 확장
ALTER TABLE users ADD COLUMN IF NOT EXISTS nullifier_hash TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS world_id_verified_at TIMESTAMPTZ;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_world_id_proofs_nullifier ON world_id_proofs(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_world_id_proofs_user ON world_id_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_nullifier ON users(nullifier_hash);
