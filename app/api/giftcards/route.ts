import { NextResponse } from 'next/server';
import type { GiftCard } from '@/types';

const MOCK_GIFTCARDS: GiftCard[] = [
  {
    id: 'gc-starbucks',
    brand: 'Starbucks',
    name: 'Americano',
    category: 'cafe',
    image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
    description: 'Tall size Americano',
    prices: [
      { amount: 4500, wld_price: 0.5 },
      { amount: 5500, wld_price: 0.6 },
    ],
  },
  {
    id: 'gc-mcdonalds',
    brand: 'McDonalds',
    name: 'Big Mac Set',
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    description: 'Big Mac + French Fries + Drink',
    prices: [
      { amount: 7500, wld_price: 0.8 },
    ],
  },
  {
    id: 'gc-cu',
    brand: 'CU',
    name: '5,000 Won Voucher',
    category: 'convenience',
    image_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
    description: 'CU convenience store voucher',
    prices: [
      { amount: 5000, wld_price: 0.4 },
      { amount: 10000, wld_price: 0.8 },
    ],
  },
  {
    id: 'gc-cgv',
    brand: 'CGV',
    name: 'Movie Ticket',
    category: 'movie',
    image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    description: 'Regular movie ticket',
    prices: [
      { amount: 12000, wld_price: 1.2 },
    ],
  },
  {
    id: 'gc-nexon',
    brand: 'Nexon',
    name: 'Nexon Cash',
    category: 'game',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400',
    description: 'Nexon game cash',
    prices: [
      { amount: 10000, wld_price: 0.9 },
      { amount: 30000, wld_price: 2.5 },
    ],
  },
  {
    id: 'gc-baemin',
    brand: 'Baemin',
    name: 'Delivery Voucher',
    category: 'food',
    image_url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
    description: 'Baemin delivery voucher',
    prices: [
      { amount: 10000, wld_price: 0.9 },
      { amount: 20000, wld_price: 1.7 },
    ],
  },
  {
    id: 'gc-kakao',
    brand: 'Kakao',
    name: 'Emoticons',
    category: 'other',
    image_url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400',
    description: 'Kakao emoticon pack',
    prices: [
      { amount: 2500, wld_price: 0.15 },
    ],
  },
  {
    id: 'gc-gs25',
    brand: 'GS25',
    name: '5,000 Won Voucher',
    category: 'convenience',
    image_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
    description: 'GS25 convenience store voucher',
    prices: [
      { amount: 5000, wld_price: 0.4 },
      { amount: 10000, wld_price: 0.8 },
    ],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let giftcards = MOCK_GIFTCARDS;

  if (category && category !== 'all') {
    giftcards = MOCK_GIFTCARDS.filter(gc => gc.category === category);
  }

  return NextResponse.json({ giftcards });
}
