// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../MockWLD.sol";
import "../WLDRewardClaim.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address signer = vm.envAddress("SIGNER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockWLD (테스트용)
        MockWLD wld = new MockWLD();
        console.log("MockWLD deployed at:", address(wld));

        // 2. Deploy WLDRewardClaim
        WLDRewardClaim claim = new WLDRewardClaim(
            address(wld),           // WLD 토큰
            signer,                 // 서명자 주소
            24 hours,               // 클레임 간격 (24시간)
            100 ether,              // 1회 최대 클레임 (100 WLD)
            10000 ether             // 일일 총 한도 (10,000 WLD)
        );
        console.log("WLDRewardClaim deployed at:", address(claim));

        // 3. Fund the claim contract with WLD
        uint256 fundAmount = 100_000 * 1e18; // 100,000 WLD
        wld.transfer(address(claim), fundAmount);
        console.log("Funded claim contract with:", fundAmount / 1e18, "WLD");

        vm.stopBroadcast();

        // Output for .env
        console.log("\n=== Add to .env.local ===");
        console.log("NEXT_PUBLIC_WLD_TOKEN_ADDRESS=", address(wld));
        console.log("NEXT_PUBLIC_WLD_CLAIM_CONTRACT=", address(claim));
    }
}
