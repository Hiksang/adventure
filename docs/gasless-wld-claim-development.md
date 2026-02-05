# World Chain 가스리스(Gasless) WLD 클레임 시스템 개발 문서

## 개요

이 문서는 웹 브라우저 사용자를 위한 가스리스 WLD 토큰 클레임 시스템 구현에 대한 기술 문서입니다. World App(MiniKit) 없이도 일반 웹 브라우저에서 가스비 없이 WLD 보상을 청구할 수 있는 기능을 구현했습니다.

## 해결한 문제

### 기존 문제점
- World App 내부에서만 가스리스 트랜잭션 가능
- 웹 브라우저 사용자는 ETH 가스비를 직접 지불해야 함
- 기존 컨트랙트의 `claim()` 함수는 `msg.sender`에게만 토큰 전송

### 해결 방법
- **릴레이어 패턴**: 서버 측 지갑이 사용자 대신 가스비 지불
- **V2 컨트랙트**: `claimFor()` 함수로 제3자가 사용자를 대신해 클레임 실행
- **서명 기반 인증**: 백엔드에서 생성한 서명으로 클레임 권한 검증

## 기술 스택

- **프론트엔드**: Next.js 14, React, TypeScript
- **블록체인**: World Chain Sepolia (Chain ID: 4801)
- **스마트 컨트랙트**: Solidity 0.8.20, OpenZeppelin
- **라이브러리**: viem 2.45.1, permissionless 0.3.4
- **표준**: ERC-4337 Account Abstraction, EIP-191 서명

## 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Browser   │────▶│   Backend API   │────▶│  WLD Contract   │
│   (사용자)       │     │   (릴레이어)     │     │     (V2)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 1. 클레임 요청         │                       │
        │──────────────────────▶│                       │
        │                       │ 2. 서명 생성           │
        │                       │──────────────────────▶│
        │                       │                       │
        │                       │ 3. claimFor() 호출    │
        │                       │──────────────────────▶│
        │                       │                       │
        │ 4. TX 완료 알림        │◀──────────────────────│
        │◀──────────────────────│   WLD → 사용자 지갑    │
```

## 구현 내용

### 1. WLDRewardClaimV2 스마트 컨트랙트

**주요 기능:**
- `claimFor()`: 릴레이어가 사용자 대신 클레임 실행
- `setRelayer()`: 릴레이어 주소 권한 관리
- 서명에 사용자 주소 포함 (msg.sender가 아닌 실제 수령인)

**보안 기능:**
- ReentrancyGuard: 재진입 공격 방지
- Pausable: 긴급 상황 시 일시 정지
- 사용자별/전역 일일 한도
- 48시간 타임락 긴급 출금

**배포 정보:**
- 주소: `0xF8D87A2FCdad32e775a08bBdf0218Ca56e1e04C3`
- 네트워크: World Chain Sepolia
- 릴레이어: `0xef0Dc0662d2718c778d4c2676F3AbCE5E6177eDD`

### 2. API 엔드포인트

#### POST /api/credits/claim-signature
- 사용자의 클레임 서명 생성
- DB에서 누적 크레딧 조회
- EIP-191 표준 서명 반환

#### POST /api/credits/claim-sponsored
- 릴레이어를 통한 가스리스 트랜잭션 제출
- `claimFor()` 호출 데이터 인코딩
- 트랜잭션 해시 즉시 반환

#### GET /api/credits/claim-status
- 트랜잭션/UserOperation 상태 확인
- 폴링 방식으로 완료 확인

### 3. React Hook (useWLDClaimWithPaymaster)

```typescript
const {
  claim,           // 클레임 실행 함수
  connectWallet,   // 지갑 연결
  status,          // idle | connecting | signing | submitting | confirming | success | error
  txHash,          // 트랜잭션 해시
  error,           // 에러 메시지
} = useWLDClaimWithPaymaster({ onSuccess, onError });
```

## 테스트 결과

### 성공한 테스트 트랜잭션
- **TX Hash**: `0xc00fbd38cff6b11f45ca4d5bb176038e407ec026c4591ef62b4bba6109c4d8d2`
- **클레임 금액**: 1 WLD (1e18 wei)
- **가스비**: 릴레이어가 지불
- **결과**: 사용자 지갑으로 WLD 정상 전송

### 테스트 플로우
```
1. 클레임 서명 요청 ✅
2. 스폰서드 클레임 제출 ✅
3. 트랜잭션 상태: success ✅
4. 사용자 nonce: 0 → 1 ✅
```

## 해결한 기술적 이슈

### 1. viem 체인 이름 문제
```typescript
// 잘못된 import
import { worldChainSepolia } from 'viem/chains';

// 올바른 import (소문자 'c')
import { worldchainSepolia } from 'viem/chains';
```

### 2. permissionless 라이브러리 호환성
```typescript
// 존재하지 않는 export
import { ENTRYPOINT_ADDRESS_V07 } from 'permissionless';

// 올바른 방법
import { entryPoint07Address } from 'viem/account-abstraction';
```

### 3. 컨트랙트 msg.sender 문제
- **문제**: V1 컨트랙트는 `msg.sender`에게 토큰 전송
- **해결**: V2 컨트랙트에 `claimFor(address user, ...)` 함수 추가

## 환경 변수

```bash
# WLD 컨트랙트 (V2)
NEXT_PUBLIC_WLD_CLAIM_CONTRACT=0xF8D87A2FCdad32e775a08bBdf0218Ca56e1e04C3
NEXT_PUBLIC_WLD_TOKEN_ADDRESS=0xBe342539E1B83718680cc6BEf37c82df93c1b65C
NEXT_PUBLIC_WORLD_CHAIN_NETWORK=sepolia

# 릴레이어 (서버 전용)
WLD_RELAYER_PRIVATE_KEY=0x...

# Pimlico (선택적)
NEXT_PUBLIC_PIMLICO_API_KEY=
PIMLICO_API_KEY=
```

## 핵심 코드

### WLDRewardClaimV2.sol - claimFor 함수

```solidity
/**
 * @notice Claim WLD rewards on behalf of a user (for gasless transactions)
 * @dev Only callable by authorized relayers
 * @param user The recipient of the WLD tokens
 * @param totalEarned Total accumulated rewards for the user
 * @param expiry Signature expiration timestamp
 * @param signature Backend-generated signature (includes user address)
 */
function claimFor(
    address user,
    uint256 totalEarned,
    uint256 expiry,
    bytes calldata signature
) external nonReentrant whenNotPaused {
    if (!relayers[msg.sender]) revert UnauthorizedRelayer();
    if (user == address(0)) revert ZeroAddress();

    _claimInternal(user, totalEarned, expiry, signature, true);
}
```

### claim-sponsored API

```typescript
// Build claimFor calldata (relayer calls on behalf of user)
const calldata = encodeFunctionData({
  abi: WLD_CLAIM_ABI,
  functionName: 'claimFor',
  args: [wallet_address as Address, BigInt(total_earned_wei), BigInt(expiry), signature as Hex],
});

// Create wallet client with relayer
const walletClient = createWalletClient({
  account: relayerAccount,
  chain: targetChain,
  transport: http(),
});

// Send the transaction (relayer pays gas)
const txHash = await walletClient.sendTransaction({
  to: WLD_CLAIM_CONTRACT,
  data: calldata,
  value: BigInt(0),
});
```

## 향후 개선 사항

1. **Pimlico 페이마스터 완전 통합**: 현재는 릴레이어 ETH 사용, 추후 Pimlico 페이마스터로 전환 가능
2. **Rate Limiting**: API 남용 방지
3. **메인넷 배포**: 현재 Sepolia 테스트넷에서 검증 완료
4. **에러 처리 개선**: 사용자 친화적 에러 메시지

## 결론

웹 브라우저 사용자도 가스비 걱정 없이 WLD 보상을 청구할 수 있는 시스템을 성공적으로 구현했습니다. 릴레이어 패턴과 V2 컨트랙트의 `claimFor()` 함수를 통해 진정한 가스리스 경험을 제공합니다.

---

## 참고 링크

- [World Chain Sepolia Explorer](https://sepolia.worldscan.org)
- [V2 Contract](https://sepolia.worldscan.org/address/0xF8D87A2FCdad32e775a08bBdf0218Ca56e1e04C3)
- [Test Transaction](https://sepolia.worldscan.org/tx/0xc00fbd38cff6b11f45ca4d5bb176038e407ec026c4591ef62b4bba6109c4d8d2)
- [Pimlico Documentation](https://docs.pimlico.io)
- [viem Documentation](https://viem.sh)
