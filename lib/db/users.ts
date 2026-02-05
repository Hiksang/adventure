import { query, transaction } from './index';

// ===========================================
// User Types
// ===========================================

export interface User {
  id: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
  wallet_address: string | null;
  username: string | null;
  credits: number;
  total_xp: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserParams {
  nullifierHash: string;
  verificationLevel: 'orb' | 'device';
  walletAddress?: string;
}

// ===========================================
// User Operations
// ===========================================

export async function findUserByNullifier(nullifierHash: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE nullifier_hash = $1',
    [nullifierHash]
  );
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser(params: CreateUserParams): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (nullifier_hash, verification_level, wallet_address)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.nullifierHash, params.verificationLevel, params.walletAddress || null]
  );
  return result.rows[0];
}

export async function updateUserWallet(
  nullifierHash: string,
  walletAddress: string
): Promise<User | null> {
  const result = await query<User>(
    `UPDATE users SET wallet_address = $2 WHERE nullifier_hash = $1 RETURNING *`,
    [nullifierHash, walletAddress]
  );
  return result.rows[0] || null;
}

export async function updateUserCredits(
  nullifierHash: string,
  credits: number
): Promise<User | null> {
  const result = await query<User>(
    `UPDATE users SET credits = $2 WHERE nullifier_hash = $1 RETURNING *`,
    [nullifierHash, credits]
  );
  return result.rows[0] || null;
}

export async function addCredits(
  nullifierHash: string,
  amount: number
): Promise<User | null> {
  const result = await query<User>(
    `UPDATE users SET credits = credits + $2 WHERE nullifier_hash = $1 RETURNING *`,
    [nullifierHash, amount]
  );
  return result.rows[0] || null;
}

export async function deductCredits(
  nullifierHash: string,
  amount: number
): Promise<User | null> {
  const result = await query<User>(
    `UPDATE users
     SET credits = credits - $2
     WHERE nullifier_hash = $1 AND credits >= $2
     RETURNING *`,
    [nullifierHash, amount]
  );
  return result.rows[0] || null;
}

// ===========================================
// User with Transaction
// ===========================================

export async function getOrCreateUser(params: CreateUserParams): Promise<{ user: User; isNew: boolean }> {
  const existing = await findUserByNullifier(params.nullifierHash);

  if (existing) {
    return { user: existing, isNew: false };
  }

  const newUser = await createUser(params);
  return { user: newUser, isNew: true };
}
