import React from 'react';
import MatchInspirationClient, { InspirationItem } from './MatchInspirationClient';
import { getCachedInspirationProducts } from '@/app/lib/public-cache';

// Full-page ISR cache for 1 year (31,536,000 seconds).
// Cleared on-demand via POST /api/revalidate whenever products change.
export const revalidate = 31536000;

const FALLBACK_ITEMS: InspirationItem[] = [
  {
    id: 7931,
    name: 'Travertine',
    collection: 'Tarra Stone',
    seriesTitle: 'Craft Stone',
    image_url:
      'https://exspotdensjbmwzvifpk.supabase.co/storage/v1/object/public/product-gallery/1770714134470-869.webp',
  },
  {
    id: 6428,
    name: 'L.Meadow',
    collection: 'Fabric',
    seriesTitle: 'Luxe Series',
    image_url:
      'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/master_assets/1773376443057-602.webp?v=1773376443768',
  },
  {
    id: 6368,
    name: 'Solid Panorama',
    collection: 'Solid Panel',
    seriesTitle: 'Essential Series',
    image_url:
      'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/master_assets/1773311878262-392.webp?v=1773311879901',
  },
];

export default async function MatchInspirationPage() {
  const validProducts = await getCachedInspirationProducts();

  const craftList: InspirationItem[] = [];
  const luxeList: InspirationItem[] = [];
  const essentialList: InspirationItem[] = [];

  for (const p of validProducts) {
    const col = (p.collection || '').toLowerCase();
    const base = {
      id: p.id,
      name: p.name || '',
      collection: p.collection || '',
      image_url: p.image_url || '',
    };

    if (
      col.includes('stone') ||
      col.includes('tarra') ||
      col.includes('terra') ||
      col.includes('panorama') ||
      col.includes('rock') ||
      col.includes('geo') ||
      col.includes('urban') ||
      col.includes('nature') ||
      col.includes('rust') ||
      col.includes('finesse')
    ) {
      craftList.push({ ...base, seriesTitle: 'Craft Stone' });
    } else if (
      col.includes('fabric') ||
      col.includes('leather') ||
      col.includes('metal') ||
      col.includes('velvet') ||
      col.includes('wood') ||
      col.includes('signature') ||
      col.includes('outdoor')
    ) {
      luxeList.push({ ...base, seriesTitle: 'Luxe Series' });
    } else if (
      col.includes('panel') ||
      col.includes('solid') ||
      col.includes('hollow') ||
      col.includes('decor') ||
      col.includes('accessor') ||
      col.includes('profile')
    ) {
      essentialList.push({ ...base, seriesTitle: 'Essential Series' });
    }
  }

  return (
    <MatchInspirationClient
      fallbackItems={FALLBACK_ITEMS}
      craftList={craftList}
      luxeList={luxeList}
      essentialList={essentialList}
    />
  );
}
