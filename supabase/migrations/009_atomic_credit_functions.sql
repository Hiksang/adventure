-- Atomic Credit Operations
-- These functions prevent race conditions and double-spend vulnerabilities

-- ============================================
-- atomic_add_credits: Add credits atomically
-- ============================================
CREATE OR REPLACE FUNCTION atomic_add_credits(
  p_nullifier_hash TEXT,
  p_amount INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Get user and lock row for update
  SELECT id INTO v_user_id
  FROM users
  WHERE nullifier_hash = p_nullifier_hash
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Atomic update: add credits
  UPDATE users
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE id = v_user_id
  RETURNING credits INTO v_new_balance;

  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    nullifier_hash,
    type,
    amount,
    balance_after,
    reference_id,
    description
  ) VALUES (
    v_user_id,
    p_nullifier_hash,
    'earn_ad_view',
    p_amount,
    v_new_balance,
    p_reference_id,
    p_description
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- atomic_deduct_credits: Deduct credits atomically
-- Fails if insufficient balance
-- ============================================
CREATE OR REPLACE FUNCTION atomic_deduct_credits(
  p_nullifier_hash TEXT,
  p_amount INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get user and lock row for update
  SELECT id, COALESCE(credits, 0) INTO v_user_id, v_current_balance
  FROM users
  WHERE nullifier_hash = p_nullifier_hash
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'current_balance', v_current_balance,
      'requested', p_amount
    );
  END IF;

  -- Atomic update: deduct credits
  UPDATE users
  SET credits = credits - p_amount
  WHERE id = v_user_id
  RETURNING credits INTO v_new_balance;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- atomic_redeem_wld: Redeem credits for WLD atomically
-- Deducts credits and adds to wld_claimable in one transaction
-- ============================================
CREATE OR REPLACE FUNCTION atomic_redeem_wld(
  p_nullifier_hash TEXT,
  p_credits INTEGER,
  p_wld_amount DECIMAL,
  p_wallet_address TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_redemption_id UUID;
BEGIN
  -- Get user and lock row for update
  SELECT id, COALESCE(credits, 0) INTO v_user_id, v_current_balance
  FROM users
  WHERE nullifier_hash = p_nullifier_hash
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_credits THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'current_balance', v_current_balance,
      'requested', p_credits
    );
  END IF;

  -- Atomic update: deduct credits, add WLD claimable
  UPDATE users
  SET
    credits = credits - p_credits,
    wld_claimable = COALESCE(wld_claimable, 0) + p_wld_amount,
    wallet_address = COALESCE(p_wallet_address, wallet_address)
  WHERE id = v_user_id
  RETURNING credits INTO v_new_balance;

  -- Create redemption record
  INSERT INTO redemption_requests (
    user_id,
    nullifier_hash,
    type,
    status,
    credits_spent,
    wld_amount,
    wallet_address
  ) VALUES (
    v_user_id,
    p_nullifier_hash,
    'wld',
    'completed',
    p_credits,
    p_wld_amount,
    p_wallet_address
  ) RETURNING id INTO v_redemption_id;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    nullifier_hash,
    type,
    amount,
    balance_after,
    reference_id
  ) VALUES (
    v_user_id,
    p_nullifier_hash,
    'redeem_wld',
    -p_credits,
    v_new_balance,
    v_redemption_id::TEXT
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'wld_amount', p_wld_amount,
    'redemption_id', v_redemption_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- atomic_redeem_giftcard: Redeem credits for gift card atomically
-- Deducts credits, decrements stock, creates redemption record
-- ============================================
CREATE OR REPLACE FUNCTION atomic_redeem_giftcard(
  p_nullifier_hash TEXT,
  p_product_id UUID,
  p_credit_cost INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_product_stock INTEGER;
  v_redemption_id UUID;
BEGIN
  -- Get user and lock row for update
  SELECT id, COALESCE(credits, 0) INTO v_user_id, v_current_balance
  FROM users
  WHERE nullifier_hash = p_nullifier_hash
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_credit_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'current_balance', v_current_balance,
      'required', p_credit_cost
    );
  END IF;

  -- Check and decrement stock atomically
  UPDATE giftcard_products
  SET stock = CASE WHEN stock = -1 THEN -1 ELSE stock - 1 END
  WHERE id = p_product_id
    AND is_active = true
    AND (stock > 0 OR stock = -1)
  RETURNING stock INTO v_product_stock;

  IF v_product_stock IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not available or out of stock');
  END IF;

  -- Deduct credits
  UPDATE users
  SET credits = credits - p_credit_cost
  WHERE id = v_user_id
  RETURNING credits INTO v_new_balance;

  -- Create redemption record
  INSERT INTO redemption_requests (
    user_id,
    nullifier_hash,
    type,
    status,
    credits_spent,
    giftcard_product_id
  ) VALUES (
    v_user_id,
    p_nullifier_hash,
    'giftcard',
    'pending',
    p_credit_cost,
    p_product_id
  ) RETURNING id INTO v_redemption_id;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id,
    nullifier_hash,
    type,
    amount,
    balance_after,
    reference_id
  ) VALUES (
    v_user_id,
    p_nullifier_hash,
    'redeem_giftcard',
    -p_credit_cost,
    v_new_balance,
    v_redemption_id::TEXT
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'redemption_id', v_redemption_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION atomic_add_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION atomic_deduct_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION atomic_redeem_wld TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION atomic_redeem_giftcard TO authenticated, service_role;
