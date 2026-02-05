-- WLD Claim System Migration
-- Enables users to claim WLD tokens via smart contract

-- Add WLD claim tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wld_claimable DECIMAL(18, 8) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wld_claimed DECIMAL(18, 8) DEFAULT 0;

-- Create index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address) WHERE wallet_address IS NOT NULL;

-- Claim signatures log (for tracking and debugging)
CREATE TABLE IF NOT EXISTS wld_claim_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nullifier_hash TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  total_claimable DECIMAL(18, 8) NOT NULL,
  signature TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- On-chain claim records (updated via webhook or polling)
CREATE TABLE IF NOT EXISTS wld_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nullifier_hash TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wld_claim_signatures_user ON wld_claim_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_wld_claim_signatures_nullifier ON wld_claim_signatures(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_wld_claims_user ON wld_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_wld_claims_tx ON wld_claims(tx_hash);

-- Contract configuration
INSERT INTO credit_config (key, value, description) VALUES
  ('wld_claim_contract', '{"address": "", "chain_id": 480}', 'WLD claim contract address on World Chain'),
  ('wld_claim_signer', '{"address": ""}', 'Backend signer address for claim signatures')
ON CONFLICT (key) DO NOTHING;
