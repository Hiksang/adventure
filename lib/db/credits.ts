import { query, transaction, getClient } from './index';

// ===========================================
// Types
// ===========================================

export type CreditTxType =
  | 'earn_ad_view'
  | 'earn_quiz'
  | 'earn_bonus'
  | 'earn_referral'
  | 'redeem_wld'
  | 'redeem_giftcard'
  | 'admin_adjust';

export interface CreditTransaction {
  id: string;
  user_id: string;
  nullifier_hash: string;
  type: CreditTxType;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreditConfig {
  credits_per_ad_view: number;
  credits_per_quiz_correct: number;
  wld_redemption_rate: number;
  min_wld_redemption_credits: number;
  min_wld_redemption_wld: number;
  referral_bonus_referrer: number;
  referral_bonus_referee: number;
}

// ===========================================
// Config
// ===========================================

const DEFAULT_CONFIG: CreditConfig = {
  credits_per_ad_view: 10,
  credits_per_quiz_correct: 20,
  wld_redemption_rate: 1000,
  min_wld_redemption_credits: 1000,
  min_wld_redemption_wld: 1,
  referral_bonus_referrer: 100,
  referral_bonus_referee: 50,
};

export async function getCreditConfig(): Promise<CreditConfig> {
  const result = await query<{ key: string; value: Record<string, number> }>(
    'SELECT key, value FROM credit_config'
  );

  if (!result.rows.length) {
    return DEFAULT_CONFIG;
  }

  const config = { ...DEFAULT_CONFIG };

  for (const row of result.rows) {
    switch (row.key) {
      case 'credits_per_ad_view':
        config.credits_per_ad_view = row.value.amount;
        break;
      case 'credits_per_quiz_correct':
        config.credits_per_quiz_correct = row.value.amount;
        break;
      case 'wld_redemption_rate':
        config.wld_redemption_rate = row.value.credits_per_wld;
        break;
      case 'min_wld_redemption':
        config.min_wld_redemption_credits = row.value.credits;
        config.min_wld_redemption_wld = row.value.wld;
        break;
      case 'referral_bonus':
        config.referral_bonus_referrer = row.value.referrer;
        config.referral_bonus_referee = row.value.referee;
        break;
    }
  }

  return config;
}

// ===========================================
// Credit Operations
// ===========================================

export async function getUserBalance(nullifierHash: string): Promise<{
  credits: number;
  pending_redemptions: number;
  total_earned: number;
  total_redeemed: number;
}> {
  const [userResult, pendingResult, earnedResult, redeemedResult] = await Promise.all([
    query<{ credits: number }>('SELECT credits FROM users WHERE nullifier_hash = $1', [nullifierHash]),
    query<{ sum: string }>(
      `SELECT COALESCE(SUM(credits_spent), 0) as sum
       FROM redemption_requests
       WHERE nullifier_hash = $1 AND status IN ('pending', 'processing')`,
      [nullifierHash]
    ),
    query<{ sum: string }>(
      `SELECT COALESCE(SUM(amount), 0) as sum
       FROM credit_transactions
       WHERE nullifier_hash = $1 AND amount > 0`,
      [nullifierHash]
    ),
    query<{ sum: string }>(
      `SELECT COALESCE(ABS(SUM(amount)), 0) as sum
       FROM credit_transactions
       WHERE nullifier_hash = $1 AND amount < 0`,
      [nullifierHash]
    ),
  ]);

  return {
    credits: userResult.rows[0]?.credits || 0,
    pending_redemptions: parseInt(pendingResult.rows[0]?.sum || '0', 10),
    total_earned: parseInt(earnedResult.rows[0]?.sum || '0', 10),
    total_redeemed: parseInt(redeemedResult.rows[0]?.sum || '0', 10),
  };
}

export async function earnCredits(params: {
  userId: string;
  nullifierHash: string;
  type: 'ad_view' | 'quiz' | 'bonus' | 'referral';
  amount: number;
  referenceId?: string;
  description?: string;
}): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
  return transaction(async (client) => {
    // Update user balance
    const updateResult = await client.query<{ credits: number }>(
      `UPDATE users SET credits = credits + $2 WHERE nullifier_hash = $1 RETURNING credits`,
      [params.nullifierHash, params.amount]
    );

    if (!updateResult.rows[0]) {
      throw new Error('User not found');
    }

    const newBalance = updateResult.rows[0].credits;

    // Create transaction record
    const txResult = await client.query<{ id: string }>(
      `INSERT INTO credit_transactions
       (user_id, nullifier_hash, type, amount, balance_after, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        params.userId,
        params.nullifierHash,
        `earn_${params.type}`,
        params.amount,
        newBalance,
        params.referenceId || null,
        params.description || `Earned ${params.amount} credits from ${params.type}`,
      ]
    );

    return {
      success: true,
      newBalance,
      transactionId: txResult.rows[0].id,
    };
  });
}

export async function getTransactionHistory(
  nullifierHash: string,
  limit: number = 20,
  cursor?: string
): Promise<{ transactions: CreditTransaction[]; hasMore: boolean; nextCursor?: string }> {
  let queryText = `
    SELECT * FROM credit_transactions
    WHERE nullifier_hash = $1
  `;
  const params: unknown[] = [nullifierHash];

  if (cursor) {
    queryText += ` AND created_at < $2`;
    params.push(cursor);
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);

  const result = await query<CreditTransaction>(queryText, params);

  const hasMore = result.rows.length > limit;
  const transactions = result.rows.slice(0, limit);
  const nextCursor = hasMore ? transactions[transactions.length - 1]?.created_at : undefined;

  return { transactions, hasMore, nextCursor };
}
