import { NextRequest, NextResponse } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';
import { supabaseAdmin } from '@/lib/supabase/server';
import { IS_DEV } from '@/lib/env';
import { AGE_RANGES, SUPPORTED_COUNTRIES, AgeRange, CountryCode } from '@/lib/worldid/credentials';

interface VerifyCredentialRequest {
  type: 'age' | 'nationality';
  value: string;
  payload: ISuccessResult;
  action: string;
  nullifierHash?: string;
}

/**
 * POST /api/credentials/verify
 * Verify age or nationality credential via World ID
 */
export async function POST(req: NextRequest) {
  try {
    const body: VerifyCredentialRequest = await req.json();
    const { type, value, payload, action, nullifierHash } = body;

    if (!type || !value || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate credential type and value
    if (type === 'age' && !Object.keys(AGE_RANGES).includes(value)) {
      return NextResponse.json(
        { error: 'Invalid age range' },
        { status: 400 }
      );
    }

    if (type === 'nationality' && !Object.keys(SUPPORTED_COUNTRIES).includes(value)) {
      return NextResponse.json(
        { error: 'Invalid nationality' },
        { status: 400 }
      );
    }

    // DEV mode bypass
    if (IS_DEV) {
      return NextResponse.json({
        success: true,
        verified: true,
        type,
        value,
        nullifierHash: nullifierHash || 'dev-nullifier',
      });
    }

    // Verify World ID proof
    const app_id = process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`;

    const verifyResponse = (await verifyCloudProof(
      payload,
      app_id,
      action
    )) as IVerifyResponse;

    if (!verifyResponse.success) {
      return NextResponse.json(
        { error: 'World ID verification failed' },
        { status: 400 }
      );
    }

    // Extract nullifier from payload
    const proofNullifier = (payload as { nullifier_hash?: string }).nullifier_hash;

    if (!proofNullifier) {
      return NextResponse.json(
        { error: 'Missing nullifier_hash in proof' },
        { status: 400 }
      );
    }

    // Store credential verification in database
    if (supabaseAdmin) {
      // Upsert user credentials
      const credentialUpdate = type === 'age'
        ? {
            age_verified: true,
            age_range: value,
            age_verified_at: new Date().toISOString(),
          }
        : {
            nationality_verified: true,
            nationality: value,
            nationality_verified_at: new Date().toISOString(),
          };

      await supabaseAdmin
        .from('user_credentials')
        .upsert({
          nullifier_hash: proofNullifier,
          verification_level: 'device',  // Will be updated based on actual verification
          ...credentialUpdate,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'nullifier_hash',
        });

      // Log verification for audit
      await supabaseAdmin
        .from('credential_verifications')
        .upsert({
          nullifier_hash: proofNullifier,
          credential_type: type,
          credential_value: value,
          action,
          verified_at: new Date().toISOString(),
        }, {
          onConflict: 'nullifier_hash,credential_type',
        });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      type,
      value,
      nullifierHash: proofNullifier,
    });
  } catch (error) {
    console.error('[Credentials] Verify error:', error);
    return NextResponse.json(
      { error: 'Credential verification failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/credentials/verify?nullifier=xxx
 * Get user's verified credentials
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nullifierHash = searchParams.get('nullifier');

  if (!nullifierHash) {
    return NextResponse.json(
      { error: 'nullifier parameter required' },
      { status: 400 }
    );
  }

  // DEV mode
  if (IS_DEV) {
    return NextResponse.json({
      nullifierHash,
      verificationLevel: 'device',
      ageVerified: true,
      ageRange: '25-34' as AgeRange,
      nationalityVerified: true,
      nationality: 'KR' as CountryCode,
    });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const { data } = await supabaseAdmin
    .from('user_credentials')
    .select('*')
    .eq('nullifier_hash', nullifierHash)
    .single();

  if (!data) {
    return NextResponse.json({
      nullifierHash,
      verificationLevel: null,
      ageVerified: false,
      nationalityVerified: false,
    });
  }

  return NextResponse.json({
    nullifierHash: data.nullifier_hash,
    verificationLevel: data.verification_level,
    ageVerified: data.age_verified,
    ageRange: data.age_range,
    nationalityVerified: data.nationality_verified,
    nationality: data.nationality,
  });
}
