import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTS,
  buildProductShareUrl,
  computeBagTotals,
  filterCatalogProducts,
  filterProductsByCategory,
  formatPrice,
  isProductOnSale,
  makeCartItemId,
  parseProductShareParam,
  validateOrderInput,
} from './catalog';

test('all catalog products satisfy blueprint constraints', () => {
  assert.ok(PRODUCTS.length >= 32);
  const validCategories = new Set(['MEN', 'WOMEN', 'SEASONAL', 'ACCESSORIES']);
  const validSizes = new Set(['XS', 'S', 'M', 'L', 'XL', 'OS']);
  for (const p of PRODUCTS) {
    assert.match(p.id, /^[a-zA-Z0-9_-]+$/);
    assert.ok(p.title.length >= 1 && p.title.length <= 120);
    assert.ok(validCategories.has(p.category));
    assert.ok(p.priceCents >= 100 && p.priceCents <= 500000);
    if (p.msrpCents !== undefined) {
      assert.ok(p.msrpCents >= p.priceCents && p.msrpCents <= 500000);
    }
    assert.ok(p.sizes.length >= 1);
    for (const sz of p.sizes) {
      assert.ok(validSizes.has(sz));
    }
  }
  assert.ok(PRODUCTS.some((p) => p.id === 'hanley-cable-throw-blanket'));
  assert.ok(PRODUCTS.some((p) => p.id === 'cable-half-zip-ivory'));
  assert.ok(PRODUCTS.some((p) => p.id === 'embroidered-cotton-cricket-sweater'));
  assert.ok(PRODUCTS.some((p) => p.id === 'mini-cable-bear-cardigan-pine'));
  assert.ok(PRODUCTS.some((p) => p.id === 'hanley-cable-throw-pillow-red'));
});

test('isProductOnSale detects products priced below original MSRP', () => {
  assert.equal(isProductOnSale({ priceCents: 13099, msrpCents: 18500 }), true);
  assert.equal(isProductOnSale({ priceCents: 7500, msrpCents: 7500 }), false);
  assert.equal(isProductOnSale({ priceCents: 7500, msrpCents: 6500 }), false);
  assert.equal(isProductOnSale({ priceCents: 16800 }), false);

  const saleItems = PRODUCTS.filter(isProductOnSale);
  const fullPriceItems = PRODUCTS.filter((p) => !isProductOnSale(p));
  assert.ok(saleItems.length > 0);
  assert.ok(fullPriceItems.length > 0);
  assert.ok(saleItems.some((p) => p.id === 'embroidered-cotton-cricket-sweater'));
  assert.ok(saleItems.some((p) => p.id === 'hanley-cable-throw-blanket'));
  assert.ok(fullPriceItems.some((p) => p.id === 'plaid-trim-cable-cardigan'));
});

test('makeCartItemId generates safe Firestore document IDs', () => {
  const id = makeCartItemId('orchid-funnel-zip', 'M');
  assert.equal(id, 'orchid-funnel-zip__M');
  assert.match(id, /^[a-zA-Z0-9_-]+$/);
});

test('computeBagTotals calculates item count and subtotal accurately', () => {
  const totals = computeBagTotals([
    {
      itemId: 'orchid-funnel-zip__M',
      productId: 'orchid-funnel-zip',
      title: 'Orchid Ribbed Funnel Full-Zip',
      category: 'MEN',
      colorway: 'Misty Orchid',
      size: 'M',
      priceCents: 16800,
      quantity: 2,
    },
    {
      itemId: 'plum-fingerless-gloves__OS',
      productId: 'plum-fingerless-gloves',
      title: 'Plum Fleece & Fingerless Gloves',
      category: 'ACCESSORIES',
      colorway: 'Deep Plum / Lilac',
      size: 'OS',
      priceCents: 5400,
      quantity: 1,
    },
  ]);

  assert.equal(totals.itemsCount, 3);
  assert.equal(totals.subtotalCents, 39000);
  assert.equal(totals.formattedSubtotal, '$390');
  assert.equal(formatPrice(5450), '$54.50');
});

test('filterProductsByCategory filters correctly', () => {
  assert.equal(filterProductsByCategory('ALL').length, PRODUCTS.length);
  const accessories = filterProductsByCategory('ACCESSORIES');
  assert.ok(accessories.some((p) => p.id === 'plum-fingerless-gloves'));
  assert.ok(accessories.every((p) => p.tags.includes('ACCESSORIES')));
});

test('filterCatalogProducts filters by title case-insensitively alongside category', () => {
  assert.equal(filterCatalogProducts('ALL', '   ').length, PRODUCTS.length);
  const orchidMatches = filterCatalogProducts('ALL', '  orchid ');
  assert.equal(orchidMatches.length, 4);
  assert.ok(orchidMatches.every((p) => p.title.toLowerCase().includes('orchid')));

  const menFunnel = filterCatalogProducts('MEN', 'funnel');
  assert.equal(menFunnel.length, 2);

  const womenFunnel = filterCatalogProducts('WOMEN', 'funnel');
  assert.equal(womenFunnel.length, 0);

  const missing = filterCatalogProducts('ALL', 'nonexistent-garment');
  assert.equal(missing.length, 0);
});

test('validateOrderInput enforces address bounds and non-empty items', () => {
  const emptyRes = validateOrderInput({ shippingAddress: '123 Orchid Way, London', items: [] });
  assert.equal(emptyRes.ok, false);

  const shortAddr = validateOrderInput({
    shippingAddress: '123',
    items: [
      {
        itemId: 'plum-fingerless-gloves__OS',
        productId: 'plum-fingerless-gloves',
        title: 'Plum Gloves',
        category: 'ACCESSORIES',
        colorway: 'Plum',
        size: 'OS',
        priceCents: 5400,
        quantity: 1,
      },
    ],
  });
  assert.equal(shortAddr.ok, false);

  const valid = validateOrderInput({
    shippingAddress: '  221B Baker St, London NW1 6XE  ',
    items: [
      {
        itemId: 'plum-fingerless-gloves__OS',
        productId: 'plum-fingerless-gloves',
        title: 'Plum Gloves',
        category: 'ACCESSORIES',
        colorway: 'Plum',
        size: 'OS',
        priceCents: 5400,
        quantity: 1,
      },
    ],
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.sanitizedAddress, '221B Baker St, London NW1 6XE');
    assert.equal(valid.orderItems.length, 1);
  }
});

test('buildProductShareUrl and parseProductShareParam round-trip product links cleanly', () => {
  const shareUrl = buildProductShareUrl(
    'orchid-funnel-zip',
    'https://flipt.example.com/store?tracking=1&orderId=ord_1#workout'
  );
  assert.equal(shareUrl, 'https://flipt.example.com/store?product=orchid-funnel-zip');

  const parsed = parseProductShareParam(new URL(shareUrl).search);
  assert.equal(parsed?.id, 'orchid-funnel-zip');

  assert.equal(parseProductShareParam(''), undefined);
  assert.equal(parseProductShareParam('?product=unknown-item'), undefined);
});
