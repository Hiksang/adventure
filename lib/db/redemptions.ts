import { query, transaction } from './index';

// ===========================================
// Types
// ===========================================

export type RedemptionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type RedemptionType = 'wld' | 'giftcard';

export interface RedemptionRequest {
  id: string;
  user_id: string;
  nullifier_hash: string;
  type: RedemptionType;
  status: RedemptionStatus;
  credits_spent: number;
  wld_amount: number | null;
  wallet_address: string | null;
  tx_hash: string | null;
  giftcard_product_id: string | null;
  giftcard_code: string | null;
  giftcard_pin: string | null;
  processed_at: string | null;
  processed_by: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ===========================================
// WLD Redemption
// ===========================================

export async function createWLDRedemption(params: {
  userId: string;
  nullifierHash: string;
  credits: number;
  wldAmount: number;
  walletAddress: string;
}): Promise<{ success: boolean; redemptionId?: string; error?: string }> {
  return transaction(async (client) => {
    // Check and deduct credits
    const deductResult = await client.query<{ credits: number }>(
      `UPDATE users
       SET credits = credits - $2
       WHERE nullifier_hash = $1 AND credits >= $2
       RETURNING credits`,
      [params.nullifierHash, params.credits]
    );

    if (!deductResult.rows[0]) {
      return { success: false, error: 'Insufficient credits' };
    }

    const newBalance = deductResult.rows[0].credits;

    // Create transaction record
    await client.query(
      `INSERT INTO credit_transactions
       (user_id, nullifier_hash, type, amount, balance_after, description)
       VALUES ($1, $2, 'redeem_wld', $3, $4, $5)`,
      [
        params.userId,
        params.nullifierHash,
        -params.credits,
        newBalance,
        `Redeemed ${params.credits} credits for ${params.wldAmount} WLD`,
      ]
    );

    // Create redemption request
    const redemptionResult = await client.query<{ id: string }>(
      `INSERT INTO redemption_requests
       (user_id, nullifier_hash, type, status, credits_spent, wld_amount, wallet_address)
       VALUES ($1, $2, 'wld', 'pending', $3, $4, $5)
       RETURNING id`,
      [params.userId, params.nullifierHash, params.credits, params.wldAmount, params.walletAddress]
    );

    return {
      success: true,
      redemptionId: redemptionResult.rows[0].id,
    };
  });
}

// ===========================================
// Giftcard Redemption
// ===========================================

export async function createGiftcardRedemption(params: {
  userId: string;
  nullifierHash: string;
  productId: string;
  creditCost: number;
}): Promise<{ success: boolean; redemptionId?: string; error?: string }> {
  return transaction(async (client) => {
    // Check and deduct credits
    const deductResult = await client.query<{ credits: number }>(
      `UPDATE users
       SET credits = credits - $2
       WHERE nullifier_hash = $1 AND credits >= $2
       RETURNING credits`,
      [params.nullifierHash, params.creditCost]
    );

    if (!deductResult.rows[0]) {
      return { success: false, error: 'Insufficient credits' };
    }

    const newBalance = deductResult.rows[0].credits;

    // Create transaction record
    await client.query(
      `INSERT INTO credit_transactions
       (user_id, nullifier_hash, type, amount, balance_after, reference_id, description)
       VALUES ($1, $2, 'redeem_giftcard', $3, $4, $5, $6)`,
      [
        params.userId,
        params.nullifierHash,
        -params.creditCost,
        newBalance,
        params.productId,
        `Redeemed ${params.creditCost} credits for giftcard`,
      ]
    );

    // Create redemption request
    const redemptionResult = await client.query<{ id: string }>(
      `INSERT INTO redemption_requests
       (user_id, nullifier_hash, type, status, credits_spent, giftcard_product_id)
       VALUES ($1, $2, 'giftcard', 'pending', $3, $4)
       RETURNING id`,
      [params.userId, params.nullifierHash, params.creditCost, params.productId]
    );

    return {
      success: true,
      redemptionId: redemptionResult.rows[0].id,
    };
  });
}

// ===========================================
// Admin Operations
// ===========================================

export async function updateRedemptionStatus(
  redemptionId: string,
  status: RedemptionStatus,
  details?: {
    txHash?: string;
    giftcardCode?: string;
    giftcardPin?: string;
    failureReason?: string;
    processedBy?: string;
  }
): Promise<RedemptionRequest | null> {
  const updates: string[] = ['status = $2'];
  const params: unknown[] = [redemptionId, status];
  let paramIndex = 3;

  if (status === 'completed' || status === 'failed') {
    updates.push(`processed_at = NOW()`);
  }

  if (details?.txHash) {
    updates.push(`tx_hash = $${paramIndex++}`);
    params.push(details.txHash);
  }

  if (details?.giftcardCode) {
    updates.push(`giftcard_code = $${paramIndex++}`);
    params.push(details.giftcardCode);
  }

  if (details?.giftcardPin) {
    updates.push(`giftcard_pin = $${paramIndex++}`);
    params.push(details.giftcardPin);
  }

  if (details?.failureReason) {
    updates.push(`failure_reason = $${paramIndex++}`);
    params.push(details.failureReason);
  }

  if (details?.processedBy) {
    updates.push(`processed_by = $${paramIndex++}`);
    params.push(details.processedBy);
  }

  const result = await query<RedemptionRequest>(
    `UPDATE redemption_requests SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  return result.rows[0] || null;
}

// ===========================================
// History
// ===========================================

export async function getRedemptionHistory(
  nullifierHash: string,
  limit: number = 20,
  cursor?: string
): Promise<{ redemptions: RedemptionRequest[]; hasMore: boolean; nextCursor?: string }> {
  let queryText = `
    SELECT r.*, g.name as product_name, g.brand as product_brand
    FROM redemption_requests r
    LEFT JOIN giftcard_products g ON r.giftcard_product_id = g.id
    WHERE r.nullifier_hash = $1
  `;
  const params: unknown[] = [nullifierHash];

  if (cursor) {
    queryText += ` AND r.created_at < $2`;
    params.push(cursor);
  }

  queryText += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);

  const result = await query<RedemptionRequest>(queryText, params);

  const hasMore = result.rows.length > limit;
  const redemptions = result.rows.slice(0, limit);
  const nextCursor = hasMore ? redemptions[redemptions.length - 1]?.created_at : undefined;

  return { redemptions, hasMore, nextCursor };
}

export async function getPendingRedemptions(): Promise<RedemptionRequest[]> {
  const result = await query<RedemptionRequest>(
    `SELECT r.*, u.wallet_address as user_wallet, g.name as product_name
     FROM redemption_requests r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN giftcard_products g ON r.giftcard_product_id = g.id
     WHERE r.status = 'pending'
     ORDER BY r.created_at ASC`
  );
  return result.rows;
}
