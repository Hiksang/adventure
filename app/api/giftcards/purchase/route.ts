import { NextResponse } from 'next/server';
import type { GiftCardPurchase, GiftCardPurchaseResponse } from '@/types';

function generateBarcode(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
}

function generatePin(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, giftcardId, giftcardName, giftcardBrand, wldPrice } = body;

    if (!userId || !giftcardId || !wldPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } as GiftCardPurchaseResponse,
        { status: 400 }
      );
    }

    const purchase: GiftCardPurchase = {
      id: `purchase-${Date.now()}`,
      user_id: userId,
      giftcard_id: giftcardId,
      giftcard_name: giftcardName || 'Unknown',
      giftcard_brand: giftcardBrand || 'Unknown',
      price_paid: wldPrice,
      barcode: generateBarcode(),
      pin: generatePin(),
      purchased_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json({ success: true, purchase } as GiftCardPurchaseResponse);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process purchase' } as GiftCardPurchaseResponse,
      { status: 500 }
    );
  }
}
