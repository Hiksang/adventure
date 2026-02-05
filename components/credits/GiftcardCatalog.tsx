'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { GiftcardCategory, GiftcardProduct } from '@/types/credits';

interface GiftcardCatalogProps {
  categories: (GiftcardCategory & { products: GiftcardProduct[] })[];
  userCredits: number;
  loading?: boolean;
  onSelectProduct: (product: GiftcardProduct) => void;
}

export function GiftcardCatalog({
  categories,
  userCredits,
  loading = false,
  onSelectProduct,
}: GiftcardCatalogProps) {
  const t = useTranslations('credits');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse h-10 w-24 bg-gray-200 rounded-full flex-shrink-0"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse h-40 bg-gray-200 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  const filteredCategories = selectedCategory
    ? categories.filter((c) => c.id === selectedCategory)
    : categories;

  const allProducts = filteredCategories.flatMap((c) => c.products);

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !selectedCategory
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {t('all')}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedCategory === category.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {category.icon && <span>{category.icon}</span>}
            <span>{category.name_ko || category.name}</span>
          </button>
        ))}
      </div>

      {/* Products grid */}
      {allProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {t('no_products')}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {allProducts.map((product) => (
            <GiftcardProductCard
              key={product.id}
              product={product}
              userCredits={userCredits}
              onSelect={() => onSelectProduct(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GiftcardProductCardProps {
  product: GiftcardProduct;
  userCredits: number;
  onSelect: () => void;
}

function GiftcardProductCard({
  product,
  userCredits,
  onSelect,
}: GiftcardProductCardProps) {
  const t = useTranslations('credits');
  const canAfford = userCredits >= product.credit_cost;
  const outOfStock = product.stock === 0;

  return (
    <button
      onClick={onSelect}
      disabled={outOfStock}
      className={`bg-white rounded-xl border overflow-hidden text-left transition-all ${
        outOfStock
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-md hover:border-primary/30'
      }`}
    >
      {/* Image */}
      <div className="relative aspect-video bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🎁
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-medium">{t('sold_out')}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="text-xs text-gray-500 mb-1">{product.brand}</div>
        <div className="font-medium text-sm line-clamp-2 mb-2">
          {product.name_ko || product.name}
        </div>

        <div className="flex items-center justify-between">
          <div
            className={`font-bold ${
              canAfford ? 'text-primary' : 'text-gray-400'
            }`}
          >
            {product.credit_cost.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            ₩{product.face_value.toLocaleString()}
          </div>
        </div>
      </div>
    </button>
  );
}
