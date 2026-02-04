export type GiftCardCategory = 'cafe' | 'food' | 'convenience' | 'movie' | 'game' | 'other';

export interface GiftCardPrice {
  amount: number;      // Korean won amount
  wld_price: number;   // WLD price
}

export interface GiftCard {
  id: string;
  brand: string;
  name: string;
  category: GiftCardCategory;
  image_url: string;
  prices: GiftCardPrice[];
  description?: string;
}

export interface GiftCardPurchase {
  id: string;
  user_id: string;
  giftcard_id: string;
  giftcard_name: string;
  giftcard_brand: string;
  price_paid: number;  // WLD amount paid
  barcode?: string;
  pin?: string;
  purchased_at: string;
  expires_at?: string;
}

export interface GiftCardPurchaseRequest {
  giftcard_id: string;
  price_index: number;  // Index into prices array
}

export interface GiftCardPurchaseResponse {
  success: boolean;
  purchase?: GiftCardPurchase;
  error?: string;
}
