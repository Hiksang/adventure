/**
 * Transaction Status API
 *
 * Checks the status of a submitted transaction or UserOperation.
 *
 * GET /api/credits/claim-status?userOpHash=0x...
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, type Hex } from 'viem';
import { worldchain, worldchainSepolia } from 'viem/chains';
import { entryPoint07Address } from 'viem/account-abstraction';
import { createPimlicoClient } from 'permissionless/clients/pimlico';

// Environment
const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY || process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
const NETWORK = process.env.NEXT_PUBLIC_WORLD_CHAIN_NETWORK || 'sepolia';

// Chain config
const targetChain = NETWORK === 'mainnet' ? worldchain : worldchainSepolia;
const CHAIN_ID = targetChain.id;
const BUNDLER_URL = `https://api.pimlico.io/v2/${CHAIN_ID}/rpc?apikey=${PIMLICO_API_KEY}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userOpHash = searchParams.get('userOpHash');

    if (!userOpHash) {
      return NextResponse.json(
        { success: false, error: 'Missing userOpHash parameter' },
        { status: 400 }
      );
    }

    // Create public client for standard tx receipt
    const publicClient = createPublicClient({
      chain: targetChain,
      transport: http(),
    });

    // First, try to get as a regular transaction
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: userOpHash as Hex,
      });

      if (receipt) {
        const txSuccess = receipt.status === 'success';

        return NextResponse.json({
          success: true,
          status: txSuccess ? 'success' : 'failed',
          transactionHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed.toString(),
          error: txSuccess ? undefined : 'Transaction reverted',
        });
      }
    } catch {
      // Transaction not found as regular tx, try UserOp
    }

    // If Pimlico is configured, try to check as UserOperation
    if (PIMLICO_API_KEY) {
      try {
        const pimlicoClient = createPimlicoClient({
          transport: http(BUNDLER_URL),
          entryPoint: {
            address: entryPoint07Address,
            version: '0.7',
          },
        });

        // Get UserOperation status
        const status = await pimlicoClient.getUserOperationStatus({
          hash: userOpHash as Hex,
        });

        console.log('[claim-status] UserOp status:', { userOpHash, status });

        if (status.status === 'not_found') {
          return NextResponse.json({
            success: true,
            status: 'pending',
            message: 'UserOperation not yet processed',
          });
        }

        if (status.status === 'included') {
          // Get the transaction receipt for more details
          const receipt = await pimlicoClient.getUserOperationReceipt({
            hash: userOpHash as Hex,
          });

          if (receipt) {
            const txSuccess = receipt.success;

            return NextResponse.json({
              success: true,
              status: txSuccess ? 'success' : 'failed',
              transactionHash: receipt.receipt.transactionHash,
              blockNumber: Number(receipt.receipt.blockNumber),
              gasUsed: receipt.actualGasUsed?.toString(),
              error: txSuccess ? undefined : 'Transaction reverted',
            });
          }
        }

        if (status.status === 'rejected') {
          return NextResponse.json({
            success: true,
            status: 'failed',
            error: 'UserOperation rejected by bundler',
          });
        }

        // Submitted but not yet included
        return NextResponse.json({
          success: true,
          status: 'pending',
          message: 'Transaction submitted, waiting for confirmation',
        });

      } catch (userOpError) {
        console.log('[claim-status] UserOp check failed:', userOpError);
      }
    }

    // Not found anywhere
    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Transaction pending',
    });

  } catch (error) {
    console.error('[claim-status] Error:', error);

    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to check status',
      },
      { status: 500 }
    );
  }
}
