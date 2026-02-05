# WLD Reward Claim Contract

Smart contract for claiming WLD rewards earned from watching ads.

## Overview

Users earn credits by watching ads in the app. They can convert credits to claimable WLD, then claim WLD on-chain using a signature from the backend.

## Contract: WLDRewardClaim

### Features

- **Signature-based claims**: Backend signs the total earned amount, users claim on-chain
- **Replay protection**: Each signature can only be used once
- **Expiry**: Signatures expire after 1 hour
- **Safety limits**: Max claim per tx, daily claim limits
- **Emergency controls**: Pause, emergency withdraw

### Functions

```solidity
// Claim WLD with backend signature
function claim(uint256 totalEarned, uint256 expiry, bytes signature) external

// Check claimable amount
function getClaimable(address user, uint256 totalEarned) external view returns (uint256)

// Verify signature without claiming
function verifySignature(address user, uint256 totalEarned, uint256 expiry, bytes signature) external view
```

## Deployment

### Prerequisites

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### Deploy to World Chain Sepolia (Testnet)

```bash
# Set environment variables
export PRIVATE_KEY="your-deployer-private-key"
export SIGNER_ADDRESS="your-backend-signer-address"
export WLD_TOKEN="testnet-wld-token-address"

# Deploy
forge create WLDRewardClaim \
  --rpc-url https://worldchain-sepolia.g.alchemy.com/public \
  --private-key $PRIVATE_KEY \
  --constructor-args $WLD_TOKEN $SIGNER_ADDRESS 100000000000000000000 10000000000000000000000

# Constructor args:
# - WLD token address
# - Initial signer address
# - Max claim per tx: 100 WLD (in wei)
# - Daily claim limit: 10000 WLD (in wei)
```

### Deploy to World Chain Mainnet

```bash
export PRIVATE_KEY="your-deployer-private-key"
export SIGNER_ADDRESS="your-backend-signer-address"
export WLD_TOKEN="0x..." # Mainnet WLD token

forge create WLDRewardClaim \
  --rpc-url https://worldchain-mainnet.g.alchemy.com/public \
  --private-key $PRIVATE_KEY \
  --constructor-args $WLD_TOKEN $SIGNER_ADDRESS 100000000000000000000 10000000000000000000000 \
  --verify
```

### Post-Deployment

1. **Fund the contract** with WLD tokens for distribution
2. **Update backend config** with contract address
3. **Set signer address** in environment variables

## Configuration

After deployment, update these in the backend:

```env
# .env.local
WLD_SIGNER_PRIVATE_KEY=your-signer-private-key
NEXT_PUBLIC_WORLD_CHAIN_NETWORK=sepolia  # or mainnet
```

Update `lib/wld/signer.ts`:
```typescript
export const WLD_CLAIM_CONFIG = {
  sepolia: {
    chainId: 4801,
    wldToken: '0x...', // Testnet WLD
    claimContract: '0x...', // Your deployed contract
    rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
  },
  mainnet: {
    chainId: 480,
    wldToken: '0x...', // Mainnet WLD
    claimContract: '0x...', // Your deployed contract
    rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
  },
};
```

## Security

- Backend signer private key must be kept secure
- Contract has emergency pause and withdraw functions
- Daily limits prevent large-scale exploits
- Signatures expire to prevent accumulation

## Testing

```bash
forge test
```

## License

MIT
