import { NextRequest, NextResponse } from 'next/server';
import { getGiftcardCatalog } from '@/lib/credits/service';

/**
 * GET /api/giftcards
 * Get gift card catalog with categories and products
 */
export async function GET(request: NextRequest) {
  try {
    const categories = await getGiftcardCatalog();
    const categoryFilter = request.nextUrl.searchParams.get('category');

    // Filter by category if specified
    let filteredCategories = categories;
    if (categoryFilter && categoryFilter !== 'all') {
      filteredCategories = categories.filter(
        (c) => c.name.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    return NextResponse.json({
      categories: filteredCategories,
    });
  } catch (error) {
    console.error('Get giftcards error:', error);
    return NextResponse.json({ error: 'Failed to get gift cards' }, { status: 500 });
  }
}
