// Credit transaction types
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
  reference_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Gift card types
export interface GiftcardCategory {
  id: string;
  name: string;
  name_ko?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
}

export interface GiftcardProduct {
  id: string;
  category_id: string;
  category?: GiftcardCategory;
  name: string;
  name_ko?: string;
  description?: string;
  brand: string;
  image_url?: string;
  credit_cost: number;
  face_value: number;  // In KRW
  stock: number;  // -1 means unlimited
  is_active: boolean;
  sort_order: number;
}

// Redemption types
export type RedemptionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RedemptionType = 'wld' | 'giftcard';

export interface RedemptionRequest {
  id: string;
  user_id: string;
  nullifier_hash: string;
  type: RedemptionType;
  status: RedemptionStatus;
  credits_spent: number;

  // WLD specific
  wld_amount?: number;
  wallet_address?: string;
  tx_hash?: string;

  // Gift card specific
  giftcard_product_id?: string;
  giftcard_product?: GiftcardProduct;
  giftcard_code?: string;
  giftcard_pin?: string;

  processed_at?: string;
  failure_reason?: string;

  created_at: string;
  updated_at: string;
}

// Credit configuration
export interface CreditConfig {
  credits_per_ad_view: number;
  credits_per_quiz_correct: number;
  wld_redemption_rate: number;  // Credits per 1 WLD
  min_wld_redemption_credits: number;
  min_wld_redemption_wld: number;
  referral_bonus_referrer: number;
  referral_bonus_referee: number;
}

// API request/response types
export interface EarnCreditsRequest {
  nullifier_hash: string;
  type: 'ad_view' | 'quiz' | 'bonus' | 'referral';
  reference_id?: string;
  amount?: number;  // Override default amount
}

export interface EarnCreditsResponse {
  success: boolean;
  credits_earned: number;
  new_balance: number;
  transaction_id: string;
}

export interface RedeemWLDRequest {
  nullifier_hash: string;
  credits: number;
  wallet_address?: string;
}

export interface RedeemWLDResponse {
  success: boolean;
  wld_amount: number;
  new_claimable: number;
  error?: string;
}

// WLD Claim types (on-chain claiming)
export interface WLDClaimInfo {
  claimable_wld: number;
  claimed_wld: number;
  wallet_address: string | null;
  nonce: number;
  min_claim_amount: number;
  contract: {
    address: string;
    chain_id: number;
  };
}

export interface WLDClaimSignatureRequest {
  nullifier_hash: string;
  wallet_address: string;
}

export interface WLDClaimSignatureResponse {
  success: boolean;
  claimable_wld: number;
  total_earned_wld: number;
  total_earned_wei: string;
  nonce: number;
  expiry: number;
  expires_at: string;
  signature: string;
  contract: {
    address: string;
    chain_id: number;
  };
  error?: string;
}

export interface WLDClaim {
  id: string;
  user_id: string;
  nullifier_hash: string;
  wallet_address: string;
  amount: number;
  tx_hash: string;
  block_number?: number;
  claimed_at: string;
  created_at: string;
}

export interface RedeemGiftcardRequest {
  nullifier_hash: string;
  product_id: string;
}

export interface RedeemGiftcardResponse {
  success: boolean;
  redemption_id: string;
  product: GiftcardProduct;
  status: RedemptionStatus;
  // Code only shown when status is 'completed'
  giftcard_code?: string;
  giftcard_pin?: string;
  error?: string;
}

export interface CreditBalanceResponse {
  credits: number;
  pending_redemptions: number;
  total_earned: number;
  total_redeemed: number;
}

export interface GiftcardCatalogResponse {
  categories: (GiftcardCategory & { products: GiftcardProduct[] })[];
}

export interface TransactionHistoryResponse {
  transactions: CreditTransaction[];
  has_more: boolean;
  next_cursor?: string;
}

export interface RedemptionHistoryResponse {
  redemptions: RedemptionRequest[];
  has_more: boolean;
  next_cursor?: string;
}
