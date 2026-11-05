'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { 
  FaRandom, 
  FaLock, 
  FaUnlock, 
  FaExternalLinkAlt, 
  FaLayerGroup, 
  FaRegLightbulb,
  FaArrowRight
} from 'react-icons/fa';

// Interface สำหรับข้อมูลสินค้า
interface ProductItem {
  id: number | string;
  name: string;
  collection: string;
  image_url: string;
}

// 3 Series Definition
type SeriesKey = 'craft-stone' | 'luxe' | 'essential';

interface SeriesMeta {
  key: SeriesKey;
  code: string;
  title: string;
  tagline: string;
  description: string;
  route: string;
  themeColor: string;
  accentBorder: string;
}

const SERIES_CONFIG: Record<SeriesKey, SeriesMeta> = {
  'craft-stone': {
    key: 'craft-stone',
    code: '01',
    title: 'Craft Stone Series',
    tagline: 'Natural Stone & Mineral Composite',
    description: 'แผ่นหินและแร่ธรรมชาติ สัมผัสความดิบแท้ ยืดหยุ่น ดัดโค้ง น้ำหนักเบา',
    route: '/series/craft-stone',
    themeColor: '#c6a87c',
    accentBorder: 'border-[#c6a87c]/30 hover:border-[#c6a87c]'
  },
  'luxe': {
    key: 'luxe',
    code: '02',
    title: 'Luxe Series',
    tagline: 'Fabric, Leather, Wood & Metallic',
    description: 'มิติผิวสัมผัสระดับไฮเอนด์ ลายผ้า หนัง โลหะ และไม้ธรรมชาติ สร้างความอบอุ่นหรูหรา',
    route: '/series/luxe',
    themeColor: '#d4af37',
    accentBorder: 'border-[#d4af37]/30 hover:border-[#d4af37]'
  },
  'essential': {
    key: 'essential',
    code: '03',
    title: 'Essential Series',
    tagline: 'Solid Panel & Architectural Accents',
    description: 'แผงผนังระแนง แผ่นโซลิด และอุปกรณ์จบงาน โครงสร้างหลักที่สมบูรณ์แบบ',
    route: '/series/essential',
    themeColor: '#9e9e9e',
    accentBorder: 'border-white/20 hover:border-white/60'
  }
};

// จำแนกสินค้าว่าสังกัด Series ไหน
function classifySeries(collection: string | null): SeriesKey | null {
  if (!collection) return null;
  const col = collection.toLowerCase();
  
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
    return 'craft-stone';
  }
  
  if (
    col.includes('fabric') || 
    col.includes('leather') || 
    col.includes('metal') || 
    col.includes('velvet') || 
    col.includes('wood') || 
    col.includes('signature') || 
    col.includes('outdoor')
  ) {
    return 'luxe';
  }
  
  if (
    col.includes('panel') || 
    col.includes('solid') || 
    col.includes('hollow') || 
    col.includes('decor') || 
    col.includes('accessor') || 
    col.includes('profile')
  ) {
    return 'essential';
  }
  
  return null;
}

// ข้อมูลสำรองเริ่มต้น (Default Fallbacks) เผื่อเครือข่ายโหลดช้า ไม่ให้หน้ากระพริบว่าง
const DEFAULT_CRAFT_STONE: ProductItem = {
  id: 7931,
  name: 'Travertine Stone',
  collection: 'Tarra Stone',
  image_url: 'https://exspotdensjbmwzvifpk.supabase.co/storage/v1/object/public/product-gallery/1770714134470-869.webp'
};

const DEFAULT_LUXE: ProductItem = {
  id: 6428,
  name: 'L.Meadow Warm Texture',
  collection: 'Fabric Collection',
  image_url: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/master_assets/1773376443057-602.webp?v=1773376443768'
};

const DEFAULT_ESSENTIAL: ProductItem = {
  id: 6368,
  name: 'Solid Panorama Panel',
  collection: 'Solid Panel',
  image_url: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/master_assets/1773311878262-392.webp?v=1773311879901'
};

// ธีมแรงบันดาลใจแนะนำ (Curated Inspiration Styles)
const MOOD_STYLES = [
  {
    name: 'Modern Minimalist',
    thaiName: 'โมเดิร์นมินิมอล อบอุ่น เรียบหรู',
    concept: 'ความสมดุลระหว่างพื้นผิวหินธรรมชาติ ผสานกับโทนผ้าและแผงผนังเรียบเนียน',
    space: 'Living Room, Gallery Hallway, Master Bedroom'
  },
  {
    name: 'Wabi-Sabi Natural',
    thaiName: 'วาบิ-ซาบิ สัจจะแห่งธรรมชาติ',
    concept: 'ผิวสัมผัสหินขรุขระที่มีร่องรอย กลิ่นอายลายไม้ และเส้นสายระแนงธรรมชาติ',
    space: 'Tea Room, Lounge Area, Private Villa'
  },
  {
    name: 'Metropolitan Luxury',
    thaiName: 'เมโทรโพลิแทน ลักชัวรี่ ทันสมัย',
    concept: 'การจับคู่หินคราฟท์โทนเข้ม แผ่นโลหะสะท้อนแสง และเส้นสายคิ้วอลูมิเนียม',
    space: 'Executive Office, Penthouse, Dining Room'
  },
  {
    name: 'Nordic Contemporary',
    thaiName: 'นอร์ดิกคอนเทมโพรารี โปร่งสบาย',
    concept: 'หินทรายโทนสว่าง ผ้าสัมผัสนุ่ม และแผงผนังสีคลีน ช่วยให้ห้องกว้างและสงบ',
    space: 'Bedroom, Studio, Minimal Cafe'
  }
];

export default function MatchInspirationPage() {
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  // สินค้าปัจจุบันที่ถูกสุ่มเลือกใน 3 Series
  const [craftStone, setCraftStone] = useState<ProductItem>(DEFAULT_CRAFT_STONE);
  const [luxe, setLuxe] = useState<ProductItem>(DEFAULT_LUXE);
  const [essential, setEssential] = useState<ProductItem>(DEFAULT_ESSENTIAL);

  // สถานะการล็อค (Pin) เพื่อให้ผู้ใช้สามารถล็อคแผ่นที่ชอบแล้วสุ่มแค่ส่วนที่เหลือได้
  const [lockedCraft, setLockedCraft] = useState<boolean>(false);
  const [lockedLuxe, setLockedLuxe] = useState<boolean>(false);
  const [lockedEssential, setLockedEssential] = useState<boolean>(false);

  // ธีมปัจจุบัน
  const [moodIndex, setMoodIndex] = useState<number>(0);

  // แยกกลุ่มสินค้าตามซีรีส์
  const { craftList, luxeList, essentialList } = useMemo(() => {
    const craft: ProductItem[] = [];
    const lux: ProductItem[] = [];
    const ess: ProductItem[] = [];

    for (const p of allProducts) {
      const s = classifySeries(p.collection);
      if (s === 'craft-stone') craft.push(p);
      else if (s === 'luxe') lux.push(p);
      else if (s === 'essential') ess.push(p);
    }

    return { craftList: craft, luxeList: lux, essentialList: ess };
  }, [allProducts]);

  // ฟังก์ชันสุ่มสินค้า 1 ชิ้นจากลิสต์
  const pickRandom = (arr: ProductItem[], currentId?: number | string): ProductItem => {
    if (!arr || arr.length === 0) return DEFAULT_CRAFT_STONE;
    if (arr.length === 1) return arr[0];
    const filtered = currentId ? arr.filter((x) => x.id !== currentId) : arr;
    const pool = filtered.length > 0 ? filtered : arr;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  };

  // ดึงข้อมูลสินค้าทั้งหมดที่มีรูปภาพจาก Supabase ครั้งแรก
  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, collection, image_url')
          .not('image_url', 'is', null)
          .order('id', { ascending: false });

        if (error) {
          console.error('Error fetching products for inspiration:', error);
          setLoading(false);
          return;
        }

        const valid = (data || []).filter(
          (p) => p.image_url && p.image_url.trim().startsWith('http')
        );

        if (isMounted) {
          setAllProducts(valid);
          setLoading(false);

          // สุ่มชุดแรกทันทีเมื่อโหลดข้อมูลเสร็จ
          const craft: ProductItem[] = [];
          const lux: ProductItem[] = [];
          const ess: ProductItem[] = [];

          for (const p of valid) {
            const s = classifySeries(p.collection);
            if (s === 'craft-stone') craft.push(p);
            else if (s === 'luxe') lux.push(p);
            else if (s === 'essential') ess.push(p);
          }

          if (craft.length > 0) setCraftStone(craft[Math.floor(Math.random() * craft.length)]);
          if (lux.length > 0) setLuxe(lux[Math.floor(Math.random() * lux.length)]);
          if (ess.length > 0) setEssential(ess[Math.floor(Math.random() * ess.length)]);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
        if (isMounted) setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // ฟังก์ชันสุ่มจับคู่ใหม่ (Shuffle All Unlocked)
  const handleShuffle = useCallback(() => {
    setIsShuffling(true);

    setTimeout(() => {
      if (!lockedCraft && craftList.length > 0) {
        setCraftStone(pickRandom(craftList, craftStone.id));
      }
      if (!lockedLuxe && luxeList.length > 0) {
        setLuxe(pickRandom(luxeList, luxe.id));
      }
      if (!lockedEssential && essentialList.length > 0) {
        setEssential(pickRandom(essentialList, essential.id));
      }

      setMoodIndex((prev) => (prev + 1) % MOOD_STYLES.length);
      setIsShuffling(false);
    }, 250);
  }, [lockedCraft, lockedLuxe, lockedEssential, craftList, luxeList, essentialList, craftStone.id, luxe.id, essential.id]);

  const currentMood = MOOD_STYLES[moodIndex];

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="max-w-[1300px] mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c6a87c]/30 bg-[#c6a87c]/5 text-[#c6a87c] text-xs uppercase tracking-[0.25em] mb-4">
          <FaRegLightbulb className="text-xs" />
          <span>Interactive Material Matcher</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-['Playfair_Display'] text-[#c6a87c] uppercase tracking-widest mb-4">
          Match Inspiration
        </h1>
        <p className="text-zinc-400 tracking-[0.2em] uppercase text-xs sm:text-sm max-w-2xl mx-auto mb-2">
          Discover the perfect harmony of textures and spaces
        </p>
        <p className="text-zinc-500 text-xs max-w-xl mx-auto">
          สุ่มผสมผสาน 3 ซีรีส์หลัก (Craft Stone, Luxe Series, Essential Series) เพื่อค้นหาพาเลตต์วัสดุตกแต่งผนังที่ลงตัวสำหรับบ้านของคุณ
        </p>

        {/* Action Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleShuffle}
            disabled={isShuffling}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#b08038] to-[#c6a87c] text-black font-semibold text-xs uppercase tracking-[0.25em] rounded-full shadow-lg shadow-[#b08038]/20 hover:shadow-[#b08038]/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50"
          >
            <FaRandom className={`text-sm transition-transform duration-500 ${isShuffling ? 'rotate-180' : 'group-hover:rotate-45'}`} />
            <span>สุ่มจับคู่แรงบันดาลใจใหม่ (Shuffle Match)</span>
          </button>
        </div>

        {/* Current Mood Concept Pill */}
        <div className="mt-6 inline-flex flex-col sm:flex-row items-center gap-2 px-6 py-2.5 rounded-2xl bg-zinc-900/60 border border-white/10 text-xs">
          <span className="text-[#c6a87c] font-medium tracking-wider uppercase">
            {currentMood.name}:
          </span>
          <span className="text-zinc-300 font-light">
            {currentMood.thaiName}
          </span>
          <span className="hidden sm:inline text-zinc-600">•</span>
          <span className="text-zinc-400 text-[11px]">
            {currentMood.concept}
          </span>
        </div>
      </div>

      {/* Main 3 Series Match Cards */}
      <div className="max-w-[1300px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* =========================================
              CARD 1: CRAFT STONE SERIES
             ========================================= */}
          <div 
            className={`group flex flex-col bg-zinc-900/40 border rounded-xl overflow-hidden transition-all duration-500 ${SERIES_CONFIG['craft-stone'].accentBorder} ${isShuffling && !lockedCraft ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}
          >
            {/* Card Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#c6a87c] font-bold px-2 py-0.5 rounded bg-[#c6a87c]/10 border border-[#c6a87c]/20">
                  {SERIES_CONFIG['craft-stone'].code}
                </span>
                <div>
                  <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
                    {SERIES_CONFIG['craft-stone'].title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    {craftStone.collection || 'Craft Stone'}
                  </p>
                </div>
              </div>

              {/* Pin / Lock Button */}
              <button
                onClick={() => setLockedCraft(!lockedCraft)}
                title={lockedCraft ? 'ปลดล็อคเพื่อสุ่มใหม่' : 'ล็อคแผ่นนี้ไว้เวลาสุ่ม'}
                className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  lockedCraft
                    ? 'bg-[#c6a87c] text-black border-[#c6a87c]'
                    : 'bg-zinc-800/80 text-zinc-400 border-white/10 hover:text-white hover:border-white/30'
                }`}
              >
                {lockedCraft ? <FaLock className="text-xs" /> : <FaUnlock className="text-xs" />}
              </button>
            </div>

            {/* Product Image Frame */}
            <div className="relative aspect-square bg-zinc-950 overflow-hidden">
              <img
                src={craftStone.image_url}
                alt={craftStone.name}
                loading="lazy"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
              
              {/* Floating Badge */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium bg-black/70 backdrop-blur-md text-[#c6a87c] border border-white/10">
                  {craftStone.collection}
                </span>
              </div>
            </div>

            {/* Card Content & Details */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-medium text-white mb-1 tracking-wide group-hover:text-[#c6a87c] transition-colors">
                  {craftStone.name}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {SERIES_CONFIG['craft-stone'].description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 text-xs">
                <Link
                  href={`/product/${craftStone.id}`}
                  prefetch={false}
                  className="flex items-center gap-1.5 text-[#c6a87c] hover:text-white uppercase tracking-wider font-medium text-[11px] transition-colors"
                >
                  <span>ดูสเปกแผ่นนี้</span>
                  <FaExternalLinkAlt className="text-[10px]" />
                </Link>
                <Link
                  href={SERIES_CONFIG['craft-stone'].route}
                  prefetch={false}
                  className="text-zinc-500 hover:text-zinc-300 uppercase tracking-wider text-[10px] transition-colors"
                >
                  ดูทั้งซีรีส์ →
                </Link>
              </div>
            </div>
          </div>

          {/* =========================================
              CARD 2: LUXE SERIES
             ========================================= */}
          <div 
            className={`group flex flex-col bg-zinc-900/40 border rounded-xl overflow-hidden transition-all duration-500 ${SERIES_CONFIG['luxe'].accentBorder} ${isShuffling && !lockedLuxe ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}
          >
            {/* Card Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#d4af37] font-bold px-2 py-0.5 rounded bg-[#d4af37]/10 border border-[#d4af37]/20">
                  {SERIES_CONFIG['luxe'].code}
                </span>
                <div>
                  <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
                    {SERIES_CONFIG['luxe'].title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    {luxe.collection || 'Luxe Series'}
                  </p>
                </div>
              </div>

              {/* Pin / Lock Button */}
              <button
                onClick={() => setLockedLuxe(!lockedLuxe)}
                title={lockedLuxe ? 'ปลดล็อคเพื่อสุ่มใหม่' : 'ล็อคแผ่นนี้ไว้เวลาสุ่ม'}
                className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  lockedLuxe
                    ? 'bg-[#d4af37] text-black border-[#d4af37]'
                    : 'bg-zinc-800/80 text-zinc-400 border-white/10 hover:text-white hover:border-white/30'
                }`}
              >
                {lockedLuxe ? <FaLock className="text-xs" /> : <FaUnlock className="text-xs" />}
              </button>
            </div>

            {/* Product Image Frame */}
            <div className="relative aspect-square bg-zinc-950 overflow-hidden">
              <img
                src={luxe.image_url}
                alt={luxe.name}
                loading="lazy"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
              
              {/* Floating Badge */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium bg-black/70 backdrop-blur-md text-[#d4af37] border border-white/10">
                  {luxe.collection}
                </span>
              </div>
            </div>

            {/* Card Content & Details */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-medium text-white mb-1 tracking-wide group-hover:text-[#d4af37] transition-colors">
                  {luxe.name}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {SERIES_CONFIG['luxe'].description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 text-xs">
                <Link
                  href={`/product/${luxe.id}`}
                  prefetch={false}
                  className="flex items-center gap-1.5 text-[#d4af37] hover:text-white uppercase tracking-wider font-medium text-[11px] transition-colors"
                >
                  <span>ดูสเปกแผ่นนี้</span>
                  <FaExternalLinkAlt className="text-[10px]" />
                </Link>
                <Link
                  href={SERIES_CONFIG['luxe'].route}
                  prefetch={false}
                  className="text-zinc-500 hover:text-zinc-300 uppercase tracking-wider text-[10px] transition-colors"
                >
                  ดูทั้งซีรีส์ →
                </Link>
              </div>
            </div>
          </div>

          {/* =========================================
              CARD 3: ESSENTIAL SERIES
             ========================================= */}
          <div 
            className={`group flex flex-col bg-zinc-900/40 border rounded-xl overflow-hidden transition-all duration-500 ${SERIES_CONFIG['essential'].accentBorder} ${isShuffling && !lockedEssential ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}
          >
            {/* Card Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-300 font-bold px-2 py-0.5 rounded bg-zinc-700/50 border border-white/20">
                  {SERIES_CONFIG['essential'].code}
                </span>
                <div>
                  <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
                    {SERIES_CONFIG['essential'].title}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    {essential.collection || 'Essential Series'}
                  </p>
                </div>
              </div>

              {/* Pin / Lock Button */}
              <button
                onClick={() => setLockedEssential(!lockedEssential)}
                title={lockedEssential ? 'ปลดล็อคเพื่อสุ่มใหม่' : 'ล็อคแผ่นนี้ไว้เวลาสุ่ม'}
                className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  lockedEssential
                    ? 'bg-zinc-200 text-black border-white'
                    : 'bg-zinc-800/80 text-zinc-400 border-white/10 hover:text-white hover:border-white/30'
                }`}
              >
                {lockedEssential ? <FaLock className="text-xs" /> : <FaUnlock className="text-xs" />}
              </button>
            </div>

            {/* Product Image Frame */}
            <div className="relative aspect-square bg-zinc-950 overflow-hidden">
              <img
                src={essential.image_url}
                alt={essential.name}
                loading="lazy"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
              
              {/* Floating Badge */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium bg-black/70 backdrop-blur-md text-zinc-300 border border-white/10">
                  {essential.collection}
                </span>
              </div>
            </div>

            {/* Card Content & Details */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-medium text-white mb-1 tracking-wide group-hover:text-zinc-200 transition-colors">
                  {essential.name}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {SERIES_CONFIG['essential'].description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 text-xs">
                <Link
                  href={`/product/${essential.id}`}
                  prefetch={false}
                  className="flex items-center gap-1.5 text-zinc-300 hover:text-white uppercase tracking-wider font-medium text-[11px] transition-colors"
                >
                  <span>ดูสเปกแผ่นนี้</span>
                  <FaExternalLinkAlt className="text-[10px]" />
                </Link>
                <Link
                  href={SERIES_CONFIG['essential'].route}
                  prefetch={false}
                  className="text-zinc-500 hover:text-zinc-300 uppercase tracking-wider text-[10px] transition-colors"
                >
                  ดูทั้งซีรีส์ →
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* =========================================
            COMBINATION HARMONY SUMMARY BAR
           ========================================= */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/50 to-zinc-900/90 border border-[#c6a87c]/20 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 text-[#c6a87c] text-xs uppercase tracking-widest mb-2 font-medium">
                <FaLayerGroup className="text-sm" />
                <span>The Curated Trio Palette</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-white tracking-wide mb-2">
                {craftStone.name} <span className="text-zinc-600">+</span> {luxe.name} <span className="text-zinc-600">+</span> {essential.name}
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                การจับคู่ระหว่าง <span className="text-[#c6a87c] font-medium">{craftStone.collection}</span>, <span className="text-[#d4af37] font-medium">{luxe.collection}</span> และ <span className="text-zinc-300 font-medium">{essential.collection}</span> สร้างความลึกและมิติที่ลงตัวสำหรับพื้นที่: <span className="text-white underline decoration-[#c6a87c]/40 underline-offset-4">{currentMood.space}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleShuffle}
                className="px-6 py-3 rounded-full border border-[#c6a87c] bg-[#c6a87c]/10 hover:bg-[#c6a87c] text-[#c6a87c] hover:text-black font-medium text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer"
              >
                สุ่มคู่ถัดไป
              </button>
              <Link
                href="/series"
                prefetch={false}
                className="px-6 py-3 rounded-full border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white text-xs uppercase tracking-wider transition-all duration-300"
              >
                ดูสินค้าทั้งหมด
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================
            PRESET INSPIRATIONS (3 PRE-BUILT LOOKS)
           ========================================= */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-['Playfair_Display'] text-[#c6a87c] uppercase tracking-widest mb-3">
              Curated Style Pairings
            </h2>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">
              แรงบันดาลใจการจับคู่วัสดุที่สถาปนิกและอินทีเรียร์นิยมใช้
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MOOD_STYLES.slice(0, 3).map((item, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-xl bg-zinc-900/30 border border-white/5 hover:border-[#c6a87c]/40 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[#c6a87c] text-xs font-mono font-bold tracking-widest uppercase block mb-2">
                    Concept Look 0{idx + 1}
                  </span>
                  <h3 className="text-lg font-medium text-white mb-1 group-hover:text-[#c6a87c] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#c6a87c]/80 mb-3 font-light">
                    {item.thaiName}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {item.concept}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
                  <span>พื้นที่แนะนำ: {item.space.split(',')[0]}</span>
                  <button 
                    onClick={handleShuffle}
                    className="text-[#c6a87c] hover:underline flex items-center gap-1 text-[11px] uppercase tracking-wider cursor-pointer"
                  >
                    <span>สุ่มคู่นี้</span>
                    <FaArrowRight className="text-[9px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Quote */}
        <div className="mt-24 p-12 border border-white/5 bg-zinc-900/20 text-center rounded-xl">
          <p className="text-zinc-400 italic mb-4 font-serif text-base sm:text-lg">
            "Interior design is a business of trust, harmony, and material perfection."
          </p>
          <div className="flex items-center justify-center gap-6 text-[10px] tracking-[0.3em] uppercase">
            <Link href="/" prefetch={false} className="text-[#c6a87c] hover:underline">
              Back to Home
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/series" prefetch={false} className="text-zinc-400 hover:text-white hover:underline">
              Explore All Collections
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
