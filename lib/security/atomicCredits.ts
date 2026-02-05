/**
 * Atomic Credit Operations
 *
 * Provides race-condition-safe credit operations using database-level atomicity.
 * These functions should be used instead of the non-atomic versions in lib/credits/service.ts
 */

import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase/server';

// ============ Types ============

export interface AtomicCreditResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

export interface AtomicRedemptionResult {
  success: boolean;
  newBalance?: number;
  wldAmount?: number;
  redemptionId?: string;
  error?: string;
}

// ============ Atomic Operations ============

/**
 * Atomically add credits to a user's balance
 * Uses UPDATE ... SET credits = credits + amount ... RETURNING
 */
export async function atomicAddCredits(
  nullifierHash: string,
  amount: number,
  referenceId?: string,
  description?: string
): Promise<AtomicCreditResult> {
  const supabase = supabaseAdmin || (await createServerSupabaseClient());

  try {
    // Use RPC for atomic operation
    const { data, error } = await supabase.rpc('atomic_add_credits', {
      p_nullifier_hash: nullifierHash,
      p_amount: amount,
      p_reference_id: referenceId || null,
      p_description: description || null,
    });

    if (error) {
      console.error('[AtomicCredits] Add failed:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      newBalance: data?.new_balance || 0,
    };
  } catch (err) {
    console.error('[AtomicCredits] Add exception:', err);
    return { success: false, error: 'Failed to add credits' };
  }
}

/**
 * Atomically deduct credits from a user's balance
 * Fails if insufficient balance (atomic check-and-deduct)
 */
export async function atomicDeductCredits(
  nullifierHash: string,
  amount: number,
  referenceId?: string,
  description?: string
): Promise<AtomicCreditResult> {
  const supabase = supabaseAdmin || (await createServerSupabaseClient());

  try {
    const { data, error } = await supabase.rpc('atomic_deduct_credits', {
      p_nullifier_hash: nullifierHash,
      p_amount: amount,
      p_reference_id: referenceId || null,
      p_description: description || null,
    });

    if (error) {
      console.error('[AtomicCredits] Deduct failed:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Insufficient credits' };
    }

    return {
      success: true,
      newBalance: data.new_balance,
    };
  } catch (err) {
    console.error('[AtomicCredits] Deduct exception:', err);
    return { success: false, error: 'Failed to deduct credits' };
  }
}

/**
 * Atomically redeem credits for WLD
 * - Deducts credits
 * - Adds to wld_claimable
 * - Creates redemption record
 * All in a single transaction
 */
export async function atomicRedeemForWLD(
  nullifierHash: string,
  credits: number,
  wldRate: number,
  walletAddress?: string
): Promise<AtomicRedemptionResult> {
  const supabase = supabaseAdmin || (await createServerSupabaseClient());

  try {
    const wldAmount = credits / wldRate;

    const { data, error } = await supabase.rpc('atomic_redeem_wld', {
      p_nullifier_hash: nullifierHash,
      p_credits: credits,
      p_wld_amount: wldAmount,
      p_wallet_address: walletAddress || null,
    });

    if (error) {
      console.error('[AtomicCredits] WLD redemption failed:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Redemption failed' };
    }

    return {
      success: true,
      newBalance: data.new_balance,
      wldAmount: data.wld_amount,
      redemptionId: data.redemption_id,
    };
  } catch (err) {
    console.error('[AtomicCredits] WLD redemption exception:', err);
    return { success: false, error: 'Failed to redeem WLD' };
  }
}

/**
 * Atomically redeem credits for gift card
 * - Checks stock
 * - Deducts credits
 * - Decrements stock
 * - Creates redemption record
 * All in a single transaction
 */
export async function atomicRedeemForGiftcard(
  nullifierHash: string,
  productId: string,
  creditCost: number
): Promise<AtomicRedemptionResult> {
  const supabase = supabaseAdmin || (await createServerSupabaseClient());

  try {
    const { data, error } = await supabase.rpc('atomic_redeem_giftcard', {
      p_nullifier_hash: nullifierHash,
      p_product_id: productId,
      p_credit_cost: creditCost,
    });

    if (error) {
      console.error('[AtomicCredits] Giftcard redemption failed:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Redemption failed' };
    }

    return {
      success: true,
      newBalance: data.new_balance,
      redemptionId: data.redemption_id,
    };
  } catch (err) {
    console.error('[AtomicCredits] Giftcard redemption exception:', err);
    return { success: false, error: 'Failed to redeem gift card' };
  }
}

// ============ SQL Functions (to be created in Supabase) ============

/**
 * SQL function to create in Supabase for atomic_add_credits:
 *
 * CREATE OR REPLACE FUNCTION atomic_add_credits(
 *   p_nullifier_hash TEXT,
 *   p_amount INTEGER,
 *   p_reference_id TEXT DEFAULT NULL,
 *   p_description TEXT DEFAULT NULL
 * ) RETURNS JSONB AS $$
 * DECLARE
 *   v_user_id UUID;
 *   v_new_balance INTEGER;
 * BEGIN
 *   -- Get user and lock row
 *   SELECT id INTO v_user_id
 *   FROM users
 *   WHERE nullifier_hash = p_nullifier_hash
 *   FOR UPDATE;
 *
 *   IF v_user_id IS NULL THEN
 *     RETURN jsonb_build_object('success', false, 'error', 'User not found');
 *   END IF;
 *
 *   -- Atomic update
 *   UPDATE users
 *   SET credits = credits + p_amount
 *   WHERE id = v_user_id
 *   RETURNING credits INTO v_new_balance;
 *
 *   -- Log transaction
 *   INSERT INTO credit_transactions (user_id, nullifier_hash, type, amount, balance_after, reference_id, description)
 *   VALUES (v_user_id, p_nullifier_hash, 'earn_ad_view', p_amount, v_new_balance, p_reference_id, p_description);
 *
 *   RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
 * END;
 * $$ LANGUAGE plpgsql;
 *
 *
 * CREATE OR REPLACE FUNCTION atomic_deduct_credits(
 *   p_nullifier_hash TEXT,
 *   p_amount INTEGER,
 *   p_reference_id TEXT DEFAULT NULL,
 *   p_description TEXT DEFAULT NULL
 * ) RETURNS JSONB AS $$
 * DECLARE
 *   v_user_id UUID;
 *   v_current_balance INTEGER;
 *   v_new_balance INTEGER;
 * BEGIN
 *   -- Get user and lock row
 *   SELECT id, credits INTO v_user_id, v_current_balance
 *   FROM users
 *   WHERE nullifier_hash = p_nullifier_hash
 *   FOR UPDATE;
 *
 *   IF v_user_id IS NULL THEN
 *     RETURN jsonb_build_object('success', false, 'error', 'User not found');
 *   END IF;
 *
 *   IF v_current_balance < p_amount THEN
 *     RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
 *   END IF;
 *
 *   -- Atomic update
 *   UPDATE users
 *   SET credits = credits - p_amount
 *   WHERE id = v_user_id
 *   RETURNING credits INTO v_new_balance;
 *
 *   RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
 * END;
 * $$ LANGUAGE plpgsql;
 *
 *
 * CREATE OR REPLACE FUNCTION atomic_redeem_wld(
 *   p_nullifier_hash TEXT,
 *   p_credits INTEGER,
 *   p_wld_amount DECIMAL,
 *   p_wallet_address TEXT DEFAULT NULL
 * ) RETURNS JSONB AS $$
 * DECLARE
 *   v_user_id UUID;
 *   v_current_balance INTEGER;
 *   v_new_balance INTEGER;
 *   v_redemption_id UUID;
 * BEGIN
 *   -- Get user and lock row
 *   SELECT id, credits INTO v_user_id, v_current_balance
 *   FROM users
 *   WHERE nullifier_hash = p_nullifier_hash
 *   FOR UPDATE;
 *
 *   IF v_user_id IS NULL THEN
 *     RETURN jsonb_build_object('success', false, 'error', 'User not found');
 *   END IF;
 *
 *   IF v_current_balance < p_credits THEN
 *     RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
 *   END IF;
 *
 *   -- Atomic update: deduct credits, add WLD claimable
 *   UPDATE users
 *   SET
 *     credits = credits - p_credits,
 *     wld_claimable = COALESCE(wld_claimable, 0) + p_wld_amount,
 *     wallet_address = COALESCE(p_wallet_address, wallet_address)
 *   WHERE id = v_user_id
 *   RETURNING credits INTO v_new_balance;
 *
 *   -- Create redemption record
 *   INSERT INTO redemption_requests (user_id, nullifier_hash, type, status, credits_spent, wld_amount, wallet_address)
 *   VALUES (v_user_id, p_nullifier_hash, 'wld', 'completed', p_credits, p_wld_amount, p_wallet_address)
 *   RETURNING id INTO v_redemption_id;
 *
 *   -- Log transaction
 *   INSERT INTO credit_transactions (user_id, nullifier_hash, type, amount, balance_after, reference_id)
 *   VALUES (v_user_id, p_nullifier_hash, 'redeem_wld', -p_credits, v_new_balance, v_redemption_id::TEXT);
 *
 *   RETURN jsonb_build_object(
 *     'success', true,
 *     'new_balance', v_new_balance,
 *     'wld_amount', p_wld_amount,
 *     'redemption_id', v_redemption_id
 *   );
 * END;
 * $$ LANGUAGE plpgsql;
 */
