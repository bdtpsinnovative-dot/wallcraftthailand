"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// --- Static Data ---
const FALLBACK_TEXTURE = "https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=800&auto=format&fit=crop";

const CATEGORIES = [
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2042@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2043@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2044@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2045@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2046@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2047@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2048@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2049@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2050@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2051@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2052@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2053@3x.webp" },
    { img: "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2054@3x.webp" }
];

const SERIES_DATA = [
    {
        id: '01',
        title: 'Craft Stone Series',
        desc: 'ผลิตจากกลุ่มแร่ธรรมชาติ (Eco Clay Composite) มอบคุณสมบัติเด่น น้ำหนักเบา ยืดหยุ่น แข็งแรง และเป็นมิตรต่อสิ่งแวดล้อม เหมาะสำหรับติดตั้งทั้งภายในและภายนอก',
        link: '/series/craft-stone',
        images: [
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2056@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2063@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2058@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2057@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2059@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2062@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2060@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/craft_stone/Asset%2061@3x.webp"
        ],
        reverse: false
    },
    {
        id: '02',
        title: 'Luxe Series',
        desc: 'ผนังตกแต่งระดับพรีเมียมที่ออกแบบมาเพื่อยกระดับทุกพื้นที่ให้มีทั้งความงามและความทนทาน โครงสร้างหลักใช้ แผ่น HPVC หนา 5 มิลลิเมตร แข็งแรง กันน้ำ และคงรูปได้ดี',
        link: '/series/luxe',
        images: [
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2068@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2067@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2066@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2071@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2070@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2073@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2074@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2064@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2065@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2072@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/luxe_series/Asset%2069@3x.webp"
        ],
        reverse: true
    },
    {
        id: '03',
        title: 'Essential Series',
        desc: 'ผนังดีไซน์ใหม่ที่มอบทางเลือกการติดตั้งและการจบงานที่สมบูรณ์แบบ ครอบคลุมทั้ง Flat, 3D Wall และ LED ช่วยลดปัญหาหน้างานเพื่อความสวยที่สมบูรณ์แบบ',
        link: '/series/essential',
        images: [
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2075@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2076@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2077@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2078@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2079@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2080@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2081@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2082@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2083@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2084@3x.webp",
            "https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Essential%20Series/Essential%20Series/Asset%2085@3x.webp"
        ],
        reverse: false
    }
];

export default function Page() {
    const sliderRef = useRef<HTMLDivElement>(null);
    const collageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout[] }>({});
    const [windowWidth, setWindowWidth] = useState(0);

    // --- Window Resize Listener to Trigger Re-calculations ---
    useEffect(() => {
        setWindowWidth(window.innerWidth);
        let resizeTimer: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                setWindowWidth(window.innerWidth);
            }, 300);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Intersection Observer for Floating Collage with Auto-Centering ---
    useEffect(() => {
        if (windowWidth === 0) return; // Wait for client render

        const observer = new IntersectionObserver((entries) => {
            const screenWidth = window.innerWidth;
            
            // Responsive scaling matching HTML exactly
            let responsiveScale = 1;
            if (screenWidth < 640) responsiveScale = 0.6;
            else if (screenWidth < 1024) responsiveScale = 0.75;

            const CS = 1.05 * responsiveScale;
            const SF = 1.2 * responsiveScale;

            const POS_MAP: { [key: string]: any[] } = {
                '01': [
                    { x: -120 * CS, y: -150 * CS, r: 0, w: 195 * SF, h: 240 * SF, z: 30 },
                    { x: -250 * CS, y: -100 * CS, r: 0, w: 180 * SF, h: 240 * SF, z: 10 },
                    { x: 30 * CS, y: -120 * CS, r: 0, w: 180 * SF, h: 240 * SF, z: 20 },
                    { x: 140 * CS, y: -60 * CS, r: 0, w: 165 * SF, h: 225 * SF, z: 60 },
                    { x: -120 * CS, y: 20 * CS, r: 0, w: 160 * SF, h: 180 * SF, z: 15 },
                    { x: -200 * CS, y: 120 * CS, r: 0, w: 150 * SF, h: 210 * SF, z: 10 },
                    { x: -40 * CS, y: 140 * CS, r: 0, w: 150 * SF, h: 210 * SF, z: 10 },
                    { x: 100 * CS, y: 110 * CS, r: 0, w: 155 * SF, h: 215 * SF, z: 60 }
                ],
                '02': [
                    { x: 120 * CS, y: -290 * CS, r: 0, w: 165 * SF, h: 120 * SF, z: 20 },
                    { x: 120 * CS, y: -200 * CS, r: 0, w: 165 * SF, h: 195 * SF, z: 20 },
                    { x: 120 * CS, y: -110 * CS, r: 0, w: 165 * SF, h: 120 * SF, z: 20 },
                    { x: -100 * CS, y: -220 * CS, r: 0, w: 180 * SF, h: 270 * SF, z: 25 },
                    { x: -160 * CS, y: -50 * CS, r: 0, w: 150 * SF, h: 210 * SF, z: 30 },
                    { x: -120 * CS, y: 120 * CS, r: 0, w: 180 * SF, h: 150 * SF, z: 15 },
                    { x: 0 * CS, y: -30 * CS, r: 0, w: 255 * SF, h: 285 * SF, z: 10 },
                    { x: -80 * CS, y: 200 * CS, r: 0, w: 135 * SF, h: 165 * SF, z: 20 },
                    { x: 250 * CS, y: -60 * CS, r: 0, w: 150 * SF, h: 225 * SF, z: 25 },
                    { x: 150 * CS, y: 100 * CS, r: 0, w: 165 * SF, h: 180 * SF, z: 20 },
                    { x: 280 * CS, y: 110 * CS, r: 0, w: 135 * SF, h: 180 * SF, z: 24 }
                ],
                '03': [
                    { x: -220 * CS, y: -40 * CS, r: 0, w: 165 * SF, h: 225 * SF, z: 30 },
                    { x: -200 * CS, y: 140 * CS, r: 0, w: 210 * SF, h: 210 * SF, z: 35 },
                    { x: 80 * CS, y: 140 * CS, r: 0, w: 210 * SF, h: 210 * SF, z: 35 },
                    { x: 40 * CS, y: 30 * CS, r: 0, w: 195 * SF, h: 180 * SF, z: 15 },
                    { x: 180 * CS, y: -220 * CS, r: 0, w: 135 * SF, h: 185 * SF, z: 15 },
                    { x: -50 * CS, y: -120 * CS, r: 0, w: 135 * SF, h: 185 * SF, z: 10 },
                    { x: -80 * CS, y: 190 * CS, r: 0, w: 200 * SF, h: 210 * SF, z: 30 },
                    { x: -280 * CS, y: -30 * CS, r: 0, w: 330 * SF, h: 360 * SF, z: 10 },
                    { x: -40 * CS, y: 0 * CS, r: 0, w: 285 * SF, h: 360 * SF, z: 5 },
                    { x: 80 * CS, y: -90 * CS, r: 0, w: 270 * SF, h: 270 * SF, z: 2 },
                    { x: -60 * CS, y: -220 * CS, r: 0, w: 195 * SF, h: 270 * SF, z: 1 }
                ]
            };

            entries.forEach(entry => {
                const container = entry.target as HTMLElement;
                const seriesId = container.getAttribute('data-series-id') || '01';
                const cards = container.querySelectorAll<HTMLElement>('.collage-card');
                const basePos = POS_MAP[seriesId] || POS_MAP['01'];

                // Dynamic Auto-Centering (Mirrors HTML logic)
                let offsetX = 0;
                let offsetY = 0;

                if (screenWidth < 1024) {
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    basePos.forEach(p => {
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.y > maxY) maxY = p.y;
                    });
                    offsetX = -((minX + maxX) / 2);
                    offsetY = -((minY + maxY) / 2);
                }

                // Clear any existing timeouts for this specific container
                if (timeoutRefs.current[seriesId]) {
                    timeoutRefs.current[seriesId].forEach(t => clearTimeout(t));
                }
                timeoutRefs.current[seriesId] = [];

                if (entry.isIntersecting) {
                    cards.forEach((card, i) => {
                        const p = basePos[i % basePos.length];
                        if (!p) return;

                        const finalX = p.x + offsetX;
                        const finalY = p.y + offsetY;

                        card.setAttribute('data-tx', String(finalX));
                        card.setAttribute('data-ty', String(finalY));
                        card.setAttribute('data-tr', String(p.r));

                        const t1 = setTimeout(() => {
                            card.setAttribute('data-active', 'true');
                            card.style.opacity = "1";
                            card.style.width = `${p.w}px`;
                            card.style.height = `${p.h}px`;
                            card.style.zIndex = String(p.z || 10);
                            card.style.setProperty('--target-x', `${finalX}px`);
                            card.style.setProperty('--target-y', `${finalY}px`);
                            card.style.setProperty('--base-rotation', `${p.r}deg`);
                            card.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${p.r}deg) scale(1)`;

                            const t2 = setTimeout(() => {
                                if (card.getAttribute('data-active') === 'true') {
                                    card.style.setProperty('--float-delay', `${i * 0.15}s`);
                                    card.classList.add('active-float');
                                }
                            }, 900);
                            timeoutRefs.current[seriesId].push(t2);

                        }, i * 70);
                        timeoutRefs.current[seriesId].push(t1);
                    });
                } else {
                    cards.forEach((card) => {
                        card.classList.remove('active-float');
                        card.setAttribute('data-active', 'false');
                        card.style.opacity = "0";

                        const currentX = parseFloat(card.getAttribute('data-tx') || '0');
                        const currentY = parseFloat(card.getAttribute('data-ty') || '0') + 40;
                        card.style.transform = `translate(${currentX}px, ${currentY}px) scale(0.95) rotate(0deg)`;
                    });
                }
            });
        }, { threshold: 0.15 }); // Using 0.15 to match HTML threshold exactly

        Object.values(collageRefs.current).forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [windowWidth]);

    // --- Material Slider Drag Handling ---
    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

        let isDown = false;
        let startX: number;
        let scrollLeft: number;

        const handleMouseDown = (e: MouseEvent) => {
            isDown = true;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        };
        const handleEnd = () => {
            isDown = false;
            slider.classList.remove('active');
        };
        const handleMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        };

        slider.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleEnd);
        slider.addEventListener('mouseleave', handleEnd);
        slider.addEventListener('mousemove', handleMove);

        return () => {
            slider.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleEnd);
            slider.removeEventListener('mouseleave', handleEnd);
            slider.removeEventListener('mousemove', handleMove);
        };
    }, []);

    return (
        <div className="series-textured font-light selection:bg-brand-gold/30 w-full overflow-x-hidden">
            <header className="relative min-h-[85vh] lg:min-h-screen flex flex-col items-center overflow-hidden px-6 pt-10">
                <div 
                    className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none" 
                    style={{ 
                        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', 
                        maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' 
                    }}
                >
                    <img 
                        src="https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2055@3x.webp" 
                        className="w-full h-full object-cover lg:object-contain lg:object-top opacity-100 transition-opacity duration-1000 lg:transform lg:scale-95"
                        alt="Main Texture" 
                    />
                    <div className="absolute inset-0 bg-black/60 lg:bg-black/40 transition-opacity duration-1000"></div>
                </div>

                <div className="relative z-10 text-center max-w-[1800px] w-full px-4 mt-20 md:mt-24 lg:mt-32">
                    <h1 
                        className="text-2xl md:text-4xl lg:text-6xl font-bold tracking-tighter uppercase leading-tight text-[#B08038] animate-reveal drop-shadow-2xl font-['Prompt']" 
                        style={{ animationDelay: '0.2s' }}
                    >
                        ตัวตนของผนังที่สะท้อนสไตล์
                    </h1>
                    <div className="mt-8 animate-reveal" style={{ animationDelay: '0.4s' }}>
                        <p className="text-sm md:text-base lg:text-lg font-light leading-relaxed max-w-[1250px] mx-auto drop-shadow-sm text-[#c2bfb6] font-['Prompt']">
                            เรามองว่าผนังไม่ใช่เพียงฉากหลัง แต่คือองค์ประกอบหลักที่ กำหนดอารมณ์ สร้างบรรยากาศ และบอกเล่ารสนิยมของพื้นที่ได้ อย่างชัดเจน ทุกเส้นสายและผิวสัมผัสถูกออกแบบมาให้เป็นเหมือน แฟชั่นไอเท็มที่เสริมความโดดเด่นให้กับงานดีไซน์ที่นักออกแบบ สามารถใช้ Wallcraft เพื่อสร้าง Statement ของงานออกแบบได้ อย่างมีเอกลักษณ์ เราคือ...โซลูชันผนังโมดูลาร์สำหรับงานดีไซน์ ติดตั้งและบำรุงรักษาง่าย ยืดหยุ่น กับทุกคอนเซปต์ เลือกเท็กซ์เจอร์ สี ดีเทลได้ครบ-จบงานง่ายและเรียบสวย.
                        </p>
                    </div>
                </div>
            </header>

            <div className="relative z-20 -mt-10 lg:-mt-60">
                {/* Material Slider Section */}
                <section className="pb-12 overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="absolute top-0 right-6 md:right-16 z-30 flex space-x-3 -translate-y-full mb-8">
                            <button 
                                onClick={() => sliderRef.current?.scrollBy({ left: -400, behavior: 'smooth' })} 
                                className="w-8 h-8 md:w-10 md:h-10 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition text-white bg-black/40 backdrop-blur-lg"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button 
                                onClick={() => sliderRef.current?.scrollBy({ left: 400, behavior: 'smooth' })} 
                                className="w-8 h-8 md:w-10 md:h-10 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition text-white bg-black/40 backdrop-blur-lg"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        </div>

                        <div ref={sliderRef} className="flex overflow-x-auto space-x-4 md:space-x-6 no-scrollbar px-6 md:px-16 max-w-[1800px] mx-auto pt-4 pb-4 select-none" style={{ cursor: 'grab' }}>
                            {CATEGORIES.map((cat, idx) => (
                                <div key={idx} className="flex-none w-[60vw] sm:w-[280px] snap-center group cursor-pointer">
                                    <div className="relative aspect-square overflow-hidden bg-zinc-900/50 border border-white/5 transition-all duration-700 hover:border-[#B08038]/40 shadow-xl">
                                        <img 
                                            src={cat.img} 
                                            onError={(e) => (e.currentTarget.src = FALLBACK_TEXTURE)} 
                                            className="w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-105 pointer-events-none" 
                                            alt="Material" 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Editorial Content Area */}
                <div id="series-content" className="relative z-10 font-['Prompt'] text-[#808080]">
                    {SERIES_DATA.map((series) => (
                        <section key={series.id} className="py-16 md:py-32 border-t border-white/5 overflow-hidden">
                            <div className={`relative z-10 max-w-[1800px] mx-auto px-6 md:px-16 flex flex-col ${series.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 md:gap-20 items-center`}>
                                <div className="w-full lg:w-2/5 space-y-4 md:space-y-6 relative z-20 text-center lg:text-left">
                                    <div className="space-y-2 md:space-y-4">
                                        <h2 className="text-3xl md:text-5xl lg:text-6xl tracking-tighter text-[#B08038] uppercase leading-tight drop-shadow-md font-normal">{series.title}</h2>
                                    </div>
                                    <p className="text-zinc-300 text-xs md:text-base font-light leading-relaxed max-w-sm mx-auto lg:mx-0 opacity-80">{series.desc}</p>
                                    <div className="pt-4">
                                        <Link href={series.link} prefetch={false} className="group inline-flex items-center px-6 py-3 md:px-8 md:py-4 bg-zinc-900/50 text-[#c2bfb6] font-bold border border-white/10 hover:border-[#B08038]/50 transition-all uppercase text-[10px] tracking-[0.3em]">
                                            Read More 
                                            <svg className="ml-3 transition-transform group-hover:translate-x-1" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                        </Link>
                                    </div>
                                </div>

                                {/* Collage Container */}
                                <div 
                                    ref={(el) => { collageRefs.current[series.id] = el }} 
                                    data-series-id={series.id} 
                                    className="w-full lg:w-3/5 collage-container mt-6 lg:mt-0"
                                >
                                    {series.images.map((img, idx) => (
                                        <div key={idx} className="collage-card" style={{ opacity: 0 }}>
                                            <img src={img} onError={(e) => (e.currentTarget.src = FALLBACK_TEXTURE)} alt="Wallcraft Material" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                :root {
                    --brand-gold: #B08038;
                }
                
                @keyframes reveal {
                    0% { transform: translateY(80px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .animate-reveal { 
                    animation: reveal 1.2s cubic-bezier(0.77, 0, 0.175, 1) forwards; 
                }
                
                .collage-container {
                    position: relative;
                    width: 100%;
                    height: 400px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    perspective: 2000px;
                }
                @media (min-width: 768px) { .collage-container { height: 500px; } }
                @media (min-width: 1024px) { .collage-container { height: 700px; } }

                .collage-card {
                    position: absolute;
                    background: transparent;
                    transition: opacity 0.8s ease, transform 0.9s cubic-bezier(0.165, 0.84, 0.44, 1), width 0.9s ease, height 0.9s ease;
                    pointer-events: auto;
                    cursor: pointer;
                    will-change: transform, opacity;
                }
                .collage-card img {
                    width: 100%; height: 100%; object-fit: contain;
                    background: transparent;
                    filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.65));
                    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                .collage-card:hover {
                    z-index: 999 !important;
                    transform: translate(var(--target-x), var(--target-y)) scale(1.1) !important;
                    animation-play-state: paused !important;
                }
                
                .collage-card:hover img {
                    transform: scale(1.05);
                }

                @keyframes clutter-float {
                    0%, 100% { transform: translate(var(--target-x), var(--target-y)) rotate(var(--base-rotation)); }
                    50% { transform: translate(var(--target-x), calc(var(--target-y) - 12px)) rotate(calc(var(--base-rotation) + 0.5deg)); }
                }
                .active-float {
                    animation: clutter-float 10s ease-in-out infinite;
                    animation-delay: var(--float-delay);
                }

                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .series-textured {
                    background-image: linear-gradient(rgba(8, 8, 8, 0.85), rgba(8, 8, 8, 0.85)), url('https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2091@3x.webp');
                    background-size: cover;
                    background-position: center;
                    background-attachment: fixed;
                }
            `}</style>
        </div>
    );
}
