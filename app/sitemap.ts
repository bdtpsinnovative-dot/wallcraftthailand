import { MetadataRoute } from 'next';
import { getCachedSitemapProducts } from '@/app/lib/public-cache';

// Cache sitemap for 1 year; purged on-demand via POST /api/revalidate when products change.
export const revalidate = 31536000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.wallcraftthailand.com';

  // 1. หน้าหลักและหน้าใหม่ที่เพิ่งสร้าง (Static Routes)
  const staticPaths = [
    '',
    '/login',
    '/register',
    '/introduction',
    '/search',
    '/art-gallery/visual-showcase', // ✅ เพิ่มหน้าใหม่
    '/art-gallery/project-showcase', // ✅ เพิ่มหน้าใหม่
    '/match-inspiration',           // ✅ เพิ่มหน้าใหม่
    '/studio-qa',                    // ✅ เพิ่มหน้าใหม่
  ];

  const routes = staticPaths.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // 2. ดึงข้อมูลจาก Supabase (ผ่าน Cache 1 ปี)
  const products = await getCachedSitemapProducts();
  if (!products || products.length === 0) {
    return routes;
  }

  // --- ทำแผนที่สำหรับหน้า Collections ---
  const uniqueCollections = Array.from(
    new Set(products.map((p: { collection?: string | null }) => p.collection).filter(Boolean))
  );

  const collectionRoutes = uniqueCollections.map((col) => {
    // แปลงชื่อ Collection เป็น slug (ตัวเล็กหมด, เว้นวรรคเป็นขีดกลาง)
    let slug = (col as string).toLowerCase().replace(/\s+/g, '-');

    // 🚨 จุดสำคัญ: ถ้าใน DB คือ "terra" แต่ลิงก์นายจะใช้ "tarra" ต้องแก้ตรงนี้ครับ
    if (slug === 'terra-stone') slug = 'tarra-stone';

    return {
      url: `${baseUrl}/collections/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  // --- ทำแผนที่สำหรับหน้า Product รายชิ้น ---
  const productRoutes = products.map((p: { id: string | number }) => ({
    url: `${baseUrl}/product/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...routes, ...collectionRoutes, ...productRoutes];
}
