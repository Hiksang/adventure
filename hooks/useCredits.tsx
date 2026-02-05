'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  CreditBalanceResponse,
  CreditConfig,
  CreditTransaction,
  RedemptionRequest,
  GiftcardCategory,
  GiftcardProduct,
  WLDClaimInfo,
  WLDClaimSignatureResponse,
} from '@/types/credits';

interface CreditsState {
  balance: CreditBalanceResponse | null;
  config: Partial<CreditConfig> | null;
  loading: boolean;
  error: string | null;
}

export function useCredits(nullifierHash: string | null) {
  const [state, setState] = useState<CreditsState>({
    balance: null,
    config: null,
    loading: false,
    error: null,
  });

  const fetchBalance = useCallback(async () => {
    if (!nullifierHash) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/credits?nullifier=${nullifierHash}`);
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }
      const data = await response.json();
      setState({
        balance: data.balance,
        config: data.config,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [nullifierHash]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const redeemForWLD = useCallback(
    async (credits: number, walletAddress: string) => {
      if (!nullifierHash) return { success: false, error: 'Not authenticated' };

      try {
        const response = await fetch('/api/credits/redeem/wld', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nullifier_hash: nullifierHash,
            credits,
            wallet_address: walletAddress,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error };
        }

        // Refresh balance
        await fetchBalance();

        return {
          success: true,
          redemptionId: data.redemption_id,
          wldAmount: data.wld_amount,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [nullifierHash, fetchBalance]
  );

  const redeemForGiftcard = useCallback(
    async (productId: string) => {
      if (!nullifierHash) return { success: false, error: 'Not authenticated' };

      try {
        const response = await fetch('/api/credits/redeem/giftcard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nullifier_hash: nullifierHash,
            product_id: productId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error };
        }

        // Refresh balance
        await fetchBalance();

        return {
          success: true,
          redemptionId: data.redemption_id,
          product: data.product,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [nullifierHash, fetchBalance]
  );

  return {
    ...state,
    fetchBalance,
    redeemForWLD,
    redeemForGiftcard,
  };
}

export function useGiftcardCatalog() {
  const [categories, setCategories] = useState<
    (GiftcardCategory & { products: GiftcardProduct[] })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async (category?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = category
        ? `/api/giftcards?category=${category}`
        : '/api/giftcards';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch catalog');
      }

      const data = await response.json();
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { categories, loading, error, fetchCatalog };
}

export function useTransactionHistory(nullifierHash: string | null) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchTransactions = useCallback(
    async (reset = false) => {
      if (!nullifierHash) return;

      setLoading(true);

      try {
        const cursorParam = !reset && cursor ? `&cursor=${cursor}` : '';
        const response = await fetch(
          `/api/credits/history?nullifier=${nullifierHash}&limit=20${cursorParam}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();

        setTransactions((prev) =>
          reset ? data.transactions : [...prev, ...data.transactions]
        );
        setHasMore(data.has_more);
        setCursor(data.next_cursor || null);
      } catch (error) {
        console.error('Fetch transactions error:', error);
      } finally {
        setLoading(false);
      }
    },
    [nullifierHash, cursor]
  );

  useEffect(() => {
    fetchTransactions(true);
  }, [nullifierHash]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchTransactions(false);
    }
  }, [loading, hasMore, fetchTransactions]);

  return { transactions, loading, hasMore, loadMore };
}

export function useRedemptionHistory(nullifierHash: string | null) {
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchRedemptions = useCallback(
    async (reset = false) => {
      if (!nullifierHash) return;

      setLoading(true);

      try {
        const cursorParam = !reset && cursor ? `&cursor=${cursor}` : '';
        const response = await fetch(
          `/api/credits/redemptions?nullifier=${nullifierHash}&limit=20${cursorParam}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch redemptions');
        }

        const data = await response.json();

        setRedemptions((prev) =>
          reset ? data.redemptions : [...prev, ...data.redemptions]
        );
        setHasMore(data.has_more);
        setCursor(data.next_cursor || null);
      } catch (error) {
        console.error('Fetch redemptions error:', error);
      } finally {
        setLoading(false);
      }
    },
    [nullifierHash, cursor]
  );

  useEffect(() => {
    fetchRedemptions(true);
  }, [nullifierHash]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchRedemptions(false);
    }
  }, [loading, hasMore, fetchRedemptions]);

  return { redemptions, loading, hasMore, loadMore };
}

/**
 * Hook to fetch WLD claim info (claimable amount, claimed amount, etc.)
 */
export function useWLDClaimInfo(nullifierHash: string | null, walletAddress?: string | null) {
  const [claimInfo, setClaimInfo] = useState<WLDClaimInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClaimInfo = useCallback(async () => {
    if (!nullifierHash) return;

    setLoading(true);
    setError(null);

    try {
      const walletParam = walletAddress ? `&wallet=${walletAddress}` : '';
      const response = await fetch(
        `/api/credits/claim-signature?nullifier=${nullifierHash}${walletParam}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch claim info');
      }

      const data = await response.json();
      setClaimInfo({
        claimable_wld: data.claimable_wld,
        claimed_wld: data.claimed_wld,
        wallet_address: data.wallet_address,
        nonce: data.nonce,
        min_claim_amount: data.min_claim_amount,
        contract: data.contract,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [nullifierHash, walletAddress]);

  useEffect(() => {
    fetchClaimInfo();
  }, [fetchClaimInfo]);

  return { claimInfo, loading, error, refetch: fetchClaimInfo };
}
