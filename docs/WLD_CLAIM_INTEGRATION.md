# WLD Claim System - Integration Guide

> World Chain Sepolia Testnet Integration Documentation

## Table of Contents

1. [Overview](#overview)
2. [Contract Information](#contract-information)
3. [Architecture](#architecture)
4. [API Reference](#api-reference)
5. [Frontend Integration](#frontend-integration)
6. [Security Features](#security-features)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

---

## Overview

### System Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │   Backend   │     │  Smart      │     │   User      │
│   Watches   │────▶│   Credits   │────▶│  Contract   │────▶│   Receives  │
│   Ads       │     │   System    │     │   Claim     │     │   WLD       │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │  1. Earn Credits  │                   │                   │
      │  (offchain)       │                   │                   │
      │                   │                   │                   │
      │  2. Redeem for WLD│                   │                   │
      │  (offchain)       │                   │                   │
      │                   │                   │                   │
      │  3. Request Sig   │                   │                   │
      │  ─────────────────▶                   │                   │
      │                   │                   │                   │
      │  4. Return Sig    │                   │                   │
      │  ◀─────────────────                   │                   │
      │                   │                   │                   │
      │  5. Send TX (claim)                   │                   │
      │  ─────────────────────────────────────▶                   │
      │                   │                   │                   │
      │  6. WLD Transferred                   │                   │
      │  ◀─────────────────────────────────────────────────────────
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Credits** | Offchain currency earned by watching ads |
| **WLD Claimable** | Offchain WLD balance (credits converted to WLD) |
| **WLD Claimed** | Onchain claimed WLD amount |
| **Signature** | Backend-signed authorization for onchain claim |
| **Nonce** | Per-user counter preventing signature replay |

---

## Contract Information

### Deployed Contracts (World Chain Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| **MockWLD Token** | `0xBe342539E1B83718680cc6BEf37c82df93c1b65C` | [View](https://sepolia.worldscan.org/address/0xBe342539E1B83718680cc6BEf37c82df93c1b65C) |
| **WLDRewardClaim** | `0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB` | [View](https://sepolia.worldscan.org/address/0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB) |

### Network Configuration

```typescript
const WORLD_CHAIN_SEPOLIA = {
  chainId: 4801,
  chainIdHex: '0x12c1',
  name: 'World Chain Sepolia',
  rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
  explorerUrl: 'https://sepolia.worldscan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
};
```

### Contract Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `claimInterval` | 24 hours | Minimum time between claims |
| `maxClaimPerTx` | 100 WLD | Maximum claim per transaction |
| `dailyClaimLimit` | 10,000 WLD | Global daily limit |
| `USER_DAILY_CAP` | 10 WLD | Per-user daily limit |
| `MIN_CLAIM_AMOUNT` | 0.01 WLD | Minimum claim amount |
| `EMERGENCY_TIMELOCK` | 48 hours | Admin withdrawal delay |

### Authorized Signer

| Role | Address |
|------|---------|
| Signer | `0xef0Dc0662d2718c778d4c2676F3AbCE5E6177eDD` |

---

## Architecture

### Database Schema

```sql
-- Users table (relevant fields)
users {
  id: UUID
  nullifier_hash: TEXT (World ID)
  wallet_address: TEXT
  credits: INTEGER
  wld_claimable: DECIMAL
  wld_claimed: DECIMAL
  verification_level: TEXT ('orb' | 'device')
}

-- Signature log table
wld_claim_signatures {
  id: UUID
  user_id: UUID
  nullifier_hash: TEXT
  wallet_address: TEXT
  total_claimable: DECIMAL
  nonce: INTEGER
  signature: TEXT
  expires_at: TIMESTAMP
  created_at: TIMESTAMP
}

-- Claim history table
wld_claims {
  id: UUID
  user_id: UUID
  nullifier_hash: TEXT
  wallet_address: TEXT
  amount: DECIMAL
  tx_hash: TEXT
  block_number: INTEGER
  claimed_at: TIMESTAMP
}
```

### Environment Variables

```env
# World Chain Network
NEXT_PUBLIC_WORLD_CHAIN_NETWORK=sepolia
NEXT_PUBLIC_WLD_CHAIN_ID=4801

# Contract Addresses
NEXT_PUBLIC_WLD_TOKEN_ADDRESS=0xBe342539E1B83718680cc6BEf37c82df93c1b65C
NEXT_PUBLIC_WLD_CLAIM_CONTRACT=0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB

# Signer (KEEP SECRET - Server only)
WLD_SIGNER_PRIVATE_KEY=0x...
```

---

## API Reference

### 1. Get Claim Info

Get user's claimable WLD and claim status.

```http
GET /api/credits/claim-signature?nullifier={nullifier_hash}&wallet={wallet_address}
```

**Response:**
```json
{
  "claimable_wld": 0.5234,
  "claimed_wld": 1.2000,
  "wallet_address": "0x...",
  "nonce": 2,
  "min_claim_amount": 0.01,
  "contract": {
    "address": "0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB",
    "chain_id": 4801
  }
}
```

### 2. Generate Claim Signature

Generate a signature for onchain claim.

```http
POST /api/credits/claim-signature
Content-Type: application/json

{
  "nullifier_hash": "0x1234...abcd",
  "wallet_address": "0xef0D...eDD"
}
```

**Response:**
```json
{
  "success": true,
  "claimable_wld": 0.5234,
  "total_earned_wld": 1.7234,
  "total_earned_wei": "1723400000000000000",
  "nonce": 2,
  "expiry": 1707138000,
  "expires_at": "2025-02-05T15:00:00.000Z",
  "signature": "0x1234...abcd",
  "contract": {
    "address": "0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB",
    "chain_id": 4801
  }
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing nullifier_hash` | nullifier_hash not provided |
| 400 | `Invalid wallet address format` | wallet_address format invalid |
| 400 | `Minimum claim amount is 0.01 WLD` | Below minimum |
| 404 | `User not found` | nullifier_hash not in DB |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `Failed to get user nonce` | Contract call failed |
| 503 | `Failed to sync blockchain state` | Sync failed |

### 3. Record Claim Complete

Record successful onchain claim (called after TX confirms).

```http
POST /api/credits/claim-complete
Content-Type: application/json

{
  "nullifier_hash": "0x1234...abcd",
  "wallet_address": "0xef0D...eDD",
  "amount_claimed": 0.5234,
  "tx_hash": "0xabcd...1234",
  "block_number": 12345678
}
```

**Response:**
```json
{
  "success": true,
  "new_claimable": 0,
  "total_claimed": 1.7234
}
```

---

## Frontend Integration

### Using MiniKit (World App)

```typescript
import { MiniKit } from '@worldcoin/minikit-js';

// Contract ABI (minimal)
const WLD_CLAIM_ABI = [
  {
    inputs: [
      { name: 'totalEarned', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

async function claimWLD(nullifierHash: string, walletAddress: string) {
  // 1. Get signature from backend
  const sigResponse = await fetch('/api/credits/claim-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nullifier_hash: nullifierHash,
      wallet_address: walletAddress,
    }),
  });

  const sigData = await sigResponse.json();

  if (!sigData.success) {
    throw new Error(sigData.error);
  }

  // 2. Send transaction via MiniKit
  const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
    transaction: [
      {
        address: sigData.contract.address,
        abi: WLD_CLAIM_ABI,
        functionName: 'claim',
        args: [
          BigInt(sigData.total_earned_wei),
          BigInt(sigData.expiry),
          sigData.signature,
        ],
      },
    ],
  });

  if (finalPayload.status === 'error') {
    throw new Error(finalPayload.error_code || 'Transaction failed');
  }

  const txId = finalPayload.transaction_id;

  // 3. Record claim complete (fire and forget)
  fetch('/api/credits/claim-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nullifier_hash: nullifierHash,
      wallet_address: walletAddress,
      amount_claimed: sigData.claimable_wld,
      tx_hash: txId,
    }),
  });

  return { success: true, txId, amount: sigData.claimable_wld };
}
```

### Using ethers.js (Direct)

```typescript
import { ethers } from 'ethers';

const WLD_CLAIM_ABI = [
  'function claim(uint256 totalEarned, uint256 expiry, bytes signature)',
  'function getClaimInfo(address user, uint256 totalEarned) view returns (uint256, uint256, bool, uint256)',
  'function nonces(address) view returns (uint256)',
  'function claimed(address) view returns (uint256)',
];

async function claimWLD(
  signer: ethers.Signer,
  nullifierHash: string,
  walletAddress: string
) {
  // 1. Get signature from backend
  const sigResponse = await fetch('/api/credits/claim-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nullifier_hash: nullifierHash,
      wallet_address: walletAddress,
    }),
  });

  const sigData = await sigResponse.json();

  // 2. Create contract instance
  const contract = new ethers.Contract(
    sigData.contract.address,
    WLD_CLAIM_ABI,
    signer
  );

  // 3. Send claim transaction
  const tx = await contract.claim(
    sigData.total_earned_wei,
    sigData.expiry,
    sigData.signature
  );

  // 4. Wait for confirmation
  const receipt = await tx.wait();

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}
```

### React Hook Example

```typescript
// hooks/useWLDClaim.tsx
import { useState, useCallback } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

export type ClaimStatus =
  | 'idle'
  | 'getting-signature'
  | 'awaiting-confirmation'
  | 'confirming'
  | 'success'
  | 'error';

export function useWLDClaim() {
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const claim = useCallback(async (
    nullifierHash: string,
    walletAddress: string
  ) => {
    setError(null);

    try {
      setStatus('getting-signature');

      // Get signature
      const res = await fetch('/api/credits/claim-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash: nullifierHash,
          wallet_address: walletAddress,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setStatus('awaiting-confirmation');

      // Send TX
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: data.contract.address,
          abi: WLD_CLAIM_ABI,
          functionName: 'claim',
          args: [
            BigInt(data.total_earned_wei),
            BigInt(data.expiry),
            data.signature,
          ],
        }],
      });

      if (finalPayload.status === 'error') {
        throw new Error('Transaction rejected');
      }

      setStatus('confirming');
      setTxHash(finalPayload.transaction_id);
      setStatus('success');

      return { success: true, txHash: finalPayload.transaction_id };

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      setError(msg);
      setStatus('error');
      return { success: false, error: msg };
    }
  }, []);

  return { claim, status, error, txHash };
}
```

---

## Security Features

### Signature Structure

```
Message Hash = keccak256(abi.encodePacked(
  chainId,           // 4801 - Cross-chain replay protection
  contractAddress,   // Contract address - Cross-contract replay protection
  userAddress,       // msg.sender binding
  totalEarned,       // Cumulative earned amount (wei)
  nonce,             // Per-user nonce - Signature replay protection
  expiry             // Unix timestamp - Time-bound validity
))

Signature = sign(keccak256("\x19Ethereum Signed Message:\n32" + messageHash), privateKey)
```

### Protection Layers

| Layer | Protection | Description |
|-------|------------|-------------|
| **Chain ID** | Cross-chain replay | Signature only valid on World Chain |
| **Contract Address** | Cross-contract replay | Signature only valid for this contract |
| **User Address** | Identity binding | Signature tied to msg.sender |
| **Nonce** | Signature replay | Each signature can only be used once |
| **Expiry** | Time-bound | Signature expires after 15 minutes |
| **usedSignatures** | Double-claim | Contract tracks used signature hashes |
| **Daily Limits** | Griefing prevention | Per-user (10 WLD) and global (10K WLD) |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/credits/claim-signature` | 5 requests | 1 minute (per user) |
| `/api/credits/claim-signature` | 10 requests | 1 minute (per IP) |

---

## Error Handling

### Contract Errors

```solidity
error InvalidSignature();           // Signer not authorized
error SignatureExpired();           // block.timestamp >= expiry
error SignatureAlreadyUsed();       // Signature hash already used
error ClaimTooSoon(uint256);        // Within 24h of last claim
error NothingToClaim();             // totalEarned <= claimed
error BelowMinimumClaim(uint256);   // < 0.01 WLD
error ExceedsMaxPerTx(uint256);     // > 100 WLD per tx
error ExceedsDailyLimit(uint256);   // Global daily limit reached
error ExceedsUserDailyLimit(uint256); // User daily limit reached
error InsufficientBalance();        // Contract has insufficient WLD
error ChainIdMismatch();            // Wrong chain
```

### Error Handling Example

```typescript
try {
  const result = await claimWLD(nullifierHash, walletAddress);
} catch (error) {
  if (error.message.includes('ClaimTooSoon')) {
    // Extract next claim time from error
    showError('Please wait 24 hours between claims');
  } else if (error.message.includes('BelowMinimumClaim')) {
    showError('Minimum claim is 0.01 WLD');
  } else if (error.message.includes('ExceedsUserDailyLimit')) {
    showError('Daily limit of 10 WLD reached');
  } else if (error.message.includes('InsufficientBalance')) {
    showError('Contract has insufficient funds');
  } else {
    showError('Claim failed. Please try again.');
  }
}
```

---

## Testing

### Test Script

```bash
# Run signature generation test
node -e "
const { ethers } = require('ethers');

const CONFIG = {
  chainId: 4801,
  claimContract: '0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB',
  rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
  signerPrivateKey: process.env.WLD_SIGNER_PRIVATE_KEY,
};

async function test() {
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(CONFIG.signerPrivateKey);

  console.log('Signer:', wallet.address);

  const contract = new ethers.Contract(
    CONFIG.claimContract,
    ['function signers(address) view returns (bool)'],
    provider
  );

  const isAuthorized = await contract.signers(wallet.address);
  console.log('Authorized:', isAuthorized);
}

test();
"
```

### Verify Contract State

```bash
# Check contract balance
cast call 0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB \
  "availableBalance()" \
  --rpc-url https://worldchain-sepolia.g.alchemy.com/public

# Check user nonce
cast call 0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB \
  "nonces(address)" \
  0xYOUR_WALLET_ADDRESS \
  --rpc-url https://worldchain-sepolia.g.alchemy.com/public

# Check daily limits
cast call 0xfbe37AB11dd1E2F5867096d96F078F7B4DcBF6eB \
  "remainingDailyLimit()" \
  --rpc-url https://worldchain-sepolia.g.alchemy.com/public
```

### Manual Claim Test

```typescript
// Test claim with ethers.js
const { ethers } = require('ethers');

async function testClaim() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // 1. Get signature from API
  const sigRes = await fetch('http://localhost:3000/api/credits/claim-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nullifier_hash: '0x...',
      wallet_address: wallet.address,
    }),
  });
  const sigData = await sigRes.json();

  // 2. Call contract
  const contract = new ethers.Contract(
    sigData.contract.address,
    ['function claim(uint256,uint256,bytes)'],
    wallet
  );

  const tx = await contract.claim(
    sigData.total_earned_wei,
    sigData.expiry,
    sigData.signature
  );

  console.log('TX:', tx.hash);
  await tx.wait();
  console.log('Confirmed!');
}
```

---

## Appendix

### Full Contract ABI

```json
[
  {
    "inputs": [
      {"name": "totalEarned", "type": "uint256"},
      {"name": "expiry", "type": "uint256"},
      {"name": "signature", "type": "bytes"}
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "totalEarned", "type": "uint256"}
    ],
    "name": "getClaimInfo",
    "outputs": [
      {"name": "claimable", "type": "uint256"},
      {"name": "nextClaimTime", "type": "uint256"},
      {"name": "canClaimNow", "type": "bool"},
      {"name": "userNonce", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "nonces",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "claimed",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "availableBalance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "remainingDailyLimit",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "remainingUserDailyLimit",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]
```

### Useful Links

- **World Chain Sepolia Explorer**: https://sepolia.worldscan.org
- **World Chain Docs**: https://docs.world.org/world-chain
- **MiniKit Docs**: https://docs.world.org/mini-apps
- **Contract Source**: `/contracts/WLDRewardClaim.sol`

---

*Last Updated: February 2025*
*Network: World Chain Sepolia (Chain ID: 4801)*
