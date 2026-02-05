import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  CreditTransaction,
  CreditConfig,
  GiftcardProduct,
  GiftcardCategory,
  RedemptionRequest,
  CreditBalanceResponse,
} from '@/types/credits';

// Default configuration (fallback if DB config not available)
const DEFAULT_CONFIG: CreditConfig = {
  credits_per_ad_view: 10,
  credits_per_quiz_correct: 20,
  wld_redemption_rate: 1000,  // 1000 credits = 1 WLD
  min_wld_redemption_credits: 1000,
  min_wld_redemption_wld: 1,
  referral_bonus_referrer: 100,
  referral_bonus_referee: 50,
};

/**
 * Get credit configuration from database
 */
export async function getCreditConfig(): Promise<CreditConfig> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('credit_config')
    .select('key, value');

  if (!data || data.length === 0) {
    return DEFAULT_CONFIG;
  }

  const config = { ...DEFAULT_CONFIG };

  for (const row of data) {
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

/**
 * Get user's credit balance and stats
 */
export async function getUserCreditBalance(nullifierHash: string): Promise<CreditBalanceResponse> {
  const supabase = await createServerSupabaseClient();

  // Get current balance
  const { data: user } = await supabase
    .from('users')
    .select('credits')
    .eq('nullifier_hash', nullifierHash)
    .single();

  // Get pending redemptions total
  const { data: pendingRedemptions } = await supabase
    .from('redemption_requests')
    .select('credits_spent')
    .eq('nullifier_hash', nullifierHash)
    .in('status', ['pending', 'processing']);

  // Get total earned and redeemed
  const { data: earnedTx } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('nullifier_hash', nullifierHash)
    .gt('amount', 0);

  const { data: redeemedTx } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('nullifier_hash', nullifierHash)
    .lt('amount', 0);

  const pendingCredits = pendingRedemptions?.reduce((sum, r) => sum + r.credits_spent, 0) || 0;
  const totalEarned = earnedTx?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalRedeemed = Math.abs(redeemedTx?.reduce((sum, t) => sum + t.amount, 0) || 0);

  return {
    credits: user?.credits || 0,
    pending_redemptions: pendingCredits,
    total_earned: totalEarned,
    total_redeemed: totalRedeemed,
  };
}

/**
 * Earn credits for a user
 */
export async function earnCredits(params: {
  nullifierHash: string;
  userId: string;
  type: 'ad_view' | 'quiz' | 'bonus' | 'referral';
  referenceId?: string;
  amount?: number;
  description?: string;
}): Promise<{ success: boolean; creditsEarned: number; newBalance: number; transactionId: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const config = await getCreditConfig();

  // Determine amount based on type
  let amount = params.amount;
  if (!amount) {
    switch (params.type) {
      case 'ad_view':
        amount = config.credits_per_ad_view;
        break;
      case 'quiz':
        amount = config.credits_per_quiz_correct;
        break;
      case 'referral':
        amount = config.referral_bonus_referee;
        break;
      case 'bonus':
        amount = 10; // Default bonus
        break;
    }
  }

  // Get current balance
  const { data: user } = await supabase
    .from('users')
    .select('credits')
    .eq('nullifier_hash', params.nullifierHash)
    .single();

  if (!user) {
    return { success: false, creditsEarned: 0, newBalance: 0, transactionId: '', error: 'User not found' };
  }

  const newBalance = (user.credits || 0) + amount;

  // Update balance
  const { error: updateError } = await supabase
    .from('users')
    .update({ credits: newBalance })
    .eq('nullifier_hash', params.nullifierHash);

  if (updateError) {
    return { success: false, creditsEarned: 0, newBalance: 0, transactionId: '', error: updateError.message };
  }

  // Create transaction record
  const txType = `earn_${params.type}` as const;
  const { data: tx, error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: params.userId,
      nullifier_hash: params.nullifierHash,
      type: txType,
      amount: amount,
      balance_after: newBalance,
      reference_id: params.referenceId,
      description: params.description || `Earned ${amount} credits from ${params.type}`,
    })
    .select('id')
    .single();

  if (txError) {
    console.error('Failed to create transaction record:', txError);
  }

  return {
    success: true,
    creditsEarned: amount,
    newBalance,
    transactionId: tx?.id || '',
  };
}

/**
 * Redeem credits for WLD
 * Credits are deducted and WLD is added to wld_claimable
 * User can then claim WLD on-chain using the claim-signature API
 */
export async function redeemForWLD(params: {
  nullifierHash: string;
  userId: string;
  credits: number;
  walletAddress?: string;
}): Promise<{ success: boolean; wldAmount: number; newClaimable: number; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const config = await getCreditConfig();

  // Validate minimum
  if (params.credits < config.min_wld_redemption_credits) {
    return {
      success: false,
      wldAmount: 0,
      newClaimable: 0,
      error: `Minimum redemption is ${config.min_wld_redemption_credits} credits (${config.min_wld_redemption_wld} WLD)`,
    };
  }

  // Check balance and get current wld_claimable
  const { data: user } = await supabase
    .from('users')
    .select('credits, wld_claimable, wallet_address')
    .eq('nullifier_hash', params.nullifierHash)
    .single();

  if (!user || user.credits < params.credits) {
    return { success: false, wldAmount: 0, newClaimable: 0, error: 'Insufficient credits' };
  }

  const wldAmount = params.credits / config.wld_redemption_rate;
  const newBalance = user.credits - params.credits;
  const currentClaimable = Number(user.wld_claimable) || 0;
  const newClaimable = currentClaimable + wldAmount;

  // Update user: deduct credits, add to wld_claimable, optionally update wallet
  const updateData: Record<string, unknown> = {
    credits: newBalance,
    wld_claimable: newClaimable,
  };

  if (params.walletAddress && params.walletAddress !== user.wallet_address) {
    updateData.wallet_address = params.walletAddress;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('nullifier_hash', params.nullifierHash);

  if (updateError) {
    return { success: false, wldAmount: 0, newClaimable: 0, error: updateError.message };
  }

  // Create transaction record
  await supabase.from('credit_transactions').insert({
    user_id: params.userId,
    nullifier_hash: params.nullifierHash,
    type: 'redeem_wld',
    amount: -params.credits,
    balance_after: newBalance,
    description: `Converted ${params.credits} credits to ${wldAmount} WLD (claimable)`,
    metadata: {
      wld_amount: wldAmount,
      wld_claimable_after: newClaimable,
    },
  });

  return {
    success: true,
    wldAmount,
    newClaimable,
  };
}

/**
 * Record successful on-chain WLD claim
 * Called after user claims WLD on-chain (via webhook or frontend)
 */
export async function recordWLDClaim(params: {
  nullifierHash: string;
  walletAddress: string;
  amountClaimed: number;
  txHash: string;
  blockNumber?: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id, wld_claimable, wld_claimed')
    .eq('nullifier_hash', params.nullifierHash)
    .single();

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const currentClaimable = Number(user.wld_claimable) || 0;
  const currentClaimed = Number(user.wld_claimed) || 0;

  // Validate claimed amount doesn't exceed claimable
  if (params.amountClaimed > currentClaimable) {
    console.warn(`Claimed amount ${params.amountClaimed} exceeds claimable ${currentClaimable}`);
  }

  // Update user: move from claimable to claimed
  const newClaimable = Math.max(0, currentClaimable - params.amountClaimed);
  const newClaimed = currentClaimed + params.amountClaimed;

  const { error: updateError } = await supabase
    .from('users')
    .update({
      wld_claimable: newClaimable,
      wld_claimed: newClaimed,
    })
    .eq('nullifier_hash', params.nullifierHash);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Record the claim
  await supabase.from('wld_claims').insert({
    user_id: user.id,
    nullifier_hash: params.nullifierHash,
    wallet_address: params.walletAddress,
    amount: params.amountClaimed,
    tx_hash: params.txHash,
    block_number: params.blockNumber,
  });

  return { success: true };
}

/**
 * Redeem credits for gift card
 */
export async function redeemForGiftcard(params: {
  nullifierHash: string;
  userId: string;
  productId: string;
}): Promise<{ success: boolean; redemptionId: string; product?: GiftcardProduct; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Get product
  const { data: product } = await supabase
    .from('giftcard_products')
    .select('*')
    .eq('id', params.productId)
    .eq('is_active', true)
    .single();

  if (!product) {
    return { success: false, redemptionId: '', error: 'Product not found or unavailable' };
  }

  // Check stock
  if (product.stock !== -1 && product.stock <= 0) {
    return { success: false, redemptionId: '', error: 'Product out of stock' };
  }

  // Check balance
  const { data: user } = await supabase
    .from('users')
    .select('credits')
    .eq('nullifier_hash', params.nullifierHash)
    .single();

  if (!user || user.credits < product.credit_cost) {
    return { success: false, redemptionId: '', error: 'Insufficient credits' };
  }

  const newBalance = user.credits - product.credit_cost;

  // Deduct credits
  const { error: updateError } = await supabase
    .from('users')
    .update({ credits: newBalance })
    .eq('nullifier_hash', params.nullifierHash);

  if (updateError) {
    return { success: false, redemptionId: '', error: updateError.message };
  }

  // Update stock if limited
  if (product.stock !== -1) {
    await supabase
      .from('giftcard_products')
      .update({ stock: product.stock - 1 })
      .eq('id', params.productId);
  }

  // Create transaction record
  await supabase.from('credit_transactions').insert({
    user_id: params.userId,
    nullifier_hash: params.nullifierHash,
    type: 'redeem_giftcard',
    amount: -product.credit_cost,
    balance_after: newBalance,
    reference_id: params.productId,
    description: `Redeemed ${product.credit_cost} credits for ${product.name}`,
  });

  // Create redemption request
  const { data: redemption, error: redemptionError } = await supabase
    .from('redemption_requests')
    .insert({
      user_id: params.userId,
      nullifier_hash: params.nullifierHash,
      type: 'giftcard',
      status: 'pending',
      credits_spent: product.credit_cost,
      giftcard_product_id: params.productId,
    })
    .select('id')
    .single();

  if (redemptionError) {
    return { success: false, redemptionId: '', error: redemptionError.message };
  }

  return {
    success: true,
    redemptionId: redemption.id,
    product,
  };
}

/**
 * Get gift card catalog
 */
export async function getGiftcardCatalog(): Promise<(GiftcardCategory & { products: GiftcardProduct[] })[]> {
  const supabase = await createServerSupabaseClient();

  const { data: categories } = await supabase
    .from('giftcard_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (!categories) return [];

  const { data: products } = await supabase
    .from('giftcard_products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return categories.map(category => ({
    ...category,
    products: (products || []).filter(p => p.category_id === category.id),
  }));
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(
  nullifierHash: string,
  limit: number = 20,
  cursor?: string
): Promise<{ transactions: CreditTransaction[]; hasMore: boolean; nextCursor?: string }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('credit_transactions')
    .select('*')
    .eq('nullifier_hash', nullifierHash)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data } = await query;

  const hasMore = (data?.length || 0) > limit;
  const transactions = data?.slice(0, limit) || [];
  const nextCursor = hasMore ? transactions[transactions.length - 1]?.created_at : undefined;

  return { transactions, hasMore, nextCursor };
}

/**
 * Get redemption history
 */
export async function getRedemptionHistory(
  nullifierHash: string,
  limit: number = 20,
  cursor?: string
): Promise<{ redemptions: RedemptionRequest[]; hasMore: boolean; nextCursor?: string }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('redemption_requests')
    .select('*, giftcard_products(*)')
    .eq('nullifier_hash', nullifierHash)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data } = await query;

  const hasMore = (data?.length || 0) > limit;
  const redemptions = (data?.slice(0, limit) || []).map(r => ({
    ...r,
    giftcard_product: r.giftcard_products,
  }));
  const nextCursor = hasMore ? redemptions[redemptions.length - 1]?.created_at : undefined;

  return { redemptions, hasMore, nextCursor };
}
