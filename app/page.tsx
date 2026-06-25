'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRight, FaLayerGroup } from 'react-icons/fa6';

// --- Constants: Image URLs ---
const ALL_IMAGES = [
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/078 copy.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/20250814_1557_remix_01k2kwmvr5exwbsc8fhg59c9xr.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/20250815_1044__remix_01k2nx4b0qftka3qef1be5jx2g.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/20250821_1552__remix_01k35x41xvfc0bfnda599xax37.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/31f60903460cd3e7eb32d2dbcc9e6940.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/assets_task_01k1z469h8fsgbgy0g1cnj95rj_1754465170_img_1.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/assets_task_01k21afxfcfddb42ghs5307qc9_1754538883_img_2.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/assets_task_01k38mkyq4f89ab8n6ex09za9b_1755858019_img_3.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/assets_task_01k3g5e97bf87rh72cd7hfp81c_1756110561_img_2.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/assets_task_01k3jxyp8vffk9x738066mczkm_1756203377_img_3.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/assets_task_01k35mtfpsf8gt42ajqvsp0r25_1755757625_img_0.webp',
];

export default function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [currentImages, setCurrentImages] = useState([
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/078 copy.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/20250814_1557_remix_01k2kwmvr5exwbsc8fhg59c9xr.webp',
            'https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/LandPage_Images/LandPage_Images/20250815_1044__remix_01k2nx4b0qftka3qef1be5jx2g.webp',
  ]);
  
  // State to track which card is currently updating (for the scale/fade effect)
  const [fadingIndices, setFadingIndices] = useState<number[]>([]);

  // --- Image Rotation Logic ---
  useEffect(() => {
    // Trigger initial entry animation
    const loadTimer = setTimeout(() => setLoaded(true), 300);

    let batchIdx = 0;
    
    const interval = setInterval(() => {
      // Calculate next batch of images
      batchIdx = (batchIdx + 1) % Math.floor(ALL_IMAGES.length / 3);
      const startIdx = batchIdx * 3;
      
      const newBatch = [
        ALL_IMAGES[(startIdx + 0) % ALL_IMAGES.length],
        ALL_IMAGES[(startIdx + 1) % ALL_IMAGES.length],
        ALL_IMAGES[(startIdx + 2) % ALL_IMAGES.length]
      ];

      // Helper to update a single card with animation
      const updateCard = (cardIndex: number, delay: number) => {
        setTimeout(() => {
          // 1. Start Fade Out (Scale Down)
          setFadingIndices(prev => [...prev, cardIndex]);

          setTimeout(() => {
            // 2. Change Image Source
            setCurrentImages(prev => {
              const next = [...prev];
              next[cardIndex] = newBatch[cardIndex];
              return next;
            });
            
            // 3. Fade In (Simulate load complete)
            setTimeout(() => {
               setFadingIndices(prev => prev.filter(i => i !== cardIndex));
            }, 100); 
            
          }, 500); // Wait 500ms for fade out animation to finish
        }, delay);
      };

      // Stagger the updates: 0ms, 600ms, 1200ms
      updateCard(0, 0);
      updateCard(1, 600);
      updateCard(2, 1200);

    }, 6000); // Run cycle every 6 seconds

    return () => {
      clearTimeout(loadTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      className="bg-black min-h-screen text-[#808080] antialiased selection:bg-[#B08038] selection:text-white overflow-x-hidden relative font-['Prompt']"
      style={{ fontFamily: "'Prompt', sans-serif" }}
    >
      
      <main className="relative min-h-screen flex flex-col lg:flex-row items-center justify-between pt-32 pb-12 px-6 md:px-16 max-w-[1900px] mx-auto overflow-hidden z-10">
        
        {/* Left Content */}
        <div className="relative z-10 w-full lg:w-[40%] flex flex-col items-start text-left mb-16 lg:mb-0 animate-reveal" style={{ animationDelay: '0.2s' }}>
            {/* Decorative Lines */}
            <div className="flex gap-1 h-1.5 w-28 mb-8">
                <div className="bg-[#6A6C5F] w-1/3"></div>
                <div className="bg-[#7B2715] w-1/3"></div>
                <div className="bg-[#B08038] w-1/3"></div>
            </div>

            {/* ✅ 1. เพิ่มคีย์เวิร์ดใน H1 ตรงนี้ครับ */}
            <h1 className="text-4xl md:text-5xl xl:text-7xl font-bold mb-8 tracking-tighter uppercase leading-[1.1] text-[#B08038]">
                Wallcraft ผนังตกแต่งบ้าน<br/>ที่สะท้อนสไตล์คุณ
            </h1>

            {/* ✅ 2. เพิ่มคีย์เวิร์ดใน Description ย่อหน้าแรก */}
            <div className="space-y-6 max-w-xl">
                <p className="text-gray-400 text-lg md:text-xl leading-relaxed font-light" style={{ color: '#c2bfb6' }}>
                    ศูนย์รวมสินค้าผนังและระแนงไม้พรีเมียม เรามองว่าผนังไม่ใช่เพียงฉากหลัง แต่คือองค์ประกอบหลักที่กำหนดอารมณ์ สร้างบรรยากาศ และบอกเล่ารสนิยมของพื้นที่ได้อย่างชัดเจน
                </p>
            </div>

            {/* ✅ 3. เพิ่ม aria-label ใน Link ให้ Google อ่านออก */}
            <div className="flex flex-wrap gap-4 mt-12">
                <Link href="/introduction" aria-label="เรียนรู้เพิ่มเติมเกี่ยวกับผนังตกแต่งบ้าน Wallcraft" className="group flex items-center px-8 py-4 bg-zinc-800 text-[#c2bfb6] font-bold rounded-full hover:bg-zinc-700 transition-all uppercase text-[11px] tracking-widest">
                    Learn More <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1 text-[#c2bfb6]" />
                </Link>
                <Link href="/series" aria-label="ดูคอลเลกชันสินค้าผนังทั้งหมด" className="group flex items-center px-8 py-4 bg-transparent border border-zinc-600 text-[#c2bfb6] font-bold rounded-full hover:bg-white/5 transition-all uppercase text-[11px] tracking-widest">
                    <FaLayerGroup className="mr-2 text-[10px]" /> View Series
                </Link>
            </div>

            {/* Stats */}
            <div className="pt-12 mt-12 grid grid-cols-2 gap-8 border-t border-white/10 w-full">
                <div>
                    <p className="text-3xl font-bold text-[#c2bfb6] tracking-tight">20+</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] mt-2 text-[#c2bfb6]">Material Collections</p>
                </div>
                <div>
                    <p className="text-3xl font-bold text-[#c2bfb6] tracking-tight">Eco-friendly</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] mt-2 text-[#c2bfb6]">Sustainable Clay</p>
                </div>
            </div>
        </div>

        {/* Right Floating Display */}
        <div className="w-full lg:w-[55%] flex items-center justify-center relative min-h-[500px] lg:min-h-[600px]">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[500px] bg-[#B08038]/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Cards Container */}
            <div className={`display-container ${loaded ? 'loaded' : ''}`}>
                {currentImages.map((src, index) => (
                  <div 
                    key={index} 
                    className={`float-card card-${index} ${fadingIndices.includes(index) ? 'card-updating' : ''}`}
                  >
                      {/* ✅ 4. ใช้ Next.js Image เพื่อแก้ปัญหา Properly Size Images, Format และ Lazy Loading แบบ 100% */}
                      <Image 
                        src={src} 
                        fill
                        sizes="(max-width: 1023px) 150px, 320px"
                        className="object-cover" 
                        alt={`ไอเดียผนังตกแต่งบ้าน ระแนงไม้พรีเมียม Wallcraft แบบที่ ${index + 1}`} 
                        priority={true} // บังคับโหลดด่วนเพื่อแก้ปัญหา LCP (Largest Contentful Paint)
                      />
                  </div>
                ))}
            </div>
        </div>

      </main>

      {/* --- Page Specific Styles --- */}
      <style jsx global>{`
        /* Import Prompt Font from Google Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;700&display=swap');

        /* Fade In Reveal */
        @keyframes reveal {
            0% { transform: translateY(40px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }
        .animate-reveal { animation: reveal 1.2s cubic-bezier(0.77, 0, 0.175, 1) forwards; }

        /* Card Container */
        .display-container {
            position: relative;
            width: 100%;
            height: 600px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: visible;
        }

        /* Base Card Styling */
        .float-card {
            position: absolute;
            overflow: hidden;
            box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: #1a1a1a;
            opacity: 0;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0.2);
            transition: all 1.5s cubic-bezier(0.22, 1, 0.36, 1);
            z-index: 10;
            border-radius: 0;
        }
        
        /* Updating State (Scale Down Effect) */
        .card-updating {
            transform: translate(-50%, -50%) scale(0.9) !important;
            opacity: 0.5 !important;
            transition: all 0.5s ease;
        }

        /* Desktop Positioning & Floating Animation */
        @media (min-width: 1024px) {
            .float-card.card-0 { width: 320px; height: 540px; }
            .float-card.card-1 { width: 240px; height: 300px; }
            .float-card.card-2 { width: 240px; height: 240px; }

            /* Final Positions (Applied when 'loaded' class is present) */
            .display-container.loaded .card-0 {
                left: 30%; top: 50%;
                transform: translate(-50%, -50%) scale(1);
                opacity: 1; z-index: 15;
                animation: floatAnim0 5s ease-in-out infinite 1.5s;
            }
            .display-container.loaded .card-1 {
                left: 80%; top: 27%;
                transform: translate(-50%, -50%) scale(1);
                opacity: 1; z-index: 20;
                animation: floatAnim1 5s ease-in-out infinite 1.8s;
            }
            .display-container.loaded .card-2 {
                left: 80%; top: 80%;
                transform: translate(-50%, -50%) scale(1);
                opacity: 1; z-index: 15;
                animation: floatAnim2 5s ease-in-out infinite 2.1s;
            }
        }

        /* Mobile Layout */
        @media (max-width: 1023px) {
            .display-container {
                height: auto;
                flex-wrap: wrap;
                padding: 40px 0;
                gap: 2rem;
            }
            .float-card {
                position: relative;
                width: 150px; height: 220px;
                left: auto !important; top: auto !important;
                transform: none !important;
                opacity: 1;
            }
        }

        /* Floating Keyframes */
        @keyframes floatAnim0 {
            0%, 100% { transform: translate(-50%, -50%) translateY(0); }
            50% { transform: translate(-50%, -50%) translateY(-15px); }
        }
        @keyframes floatAnim1 {
            0%, 100% { transform: translate(-50%, -50%) translateY(0); }
            50% { transform: translate(-50%, -50%) translateY(-20px); }
        }
        @keyframes floatAnim2 {
            0%, 100% { transform: translate(-50%, -50%) translateY(0); }
            50% { transform: translate(-50%, -50%) translateY(-18px); }
        }
      `}</style>
    </div>
  );
}