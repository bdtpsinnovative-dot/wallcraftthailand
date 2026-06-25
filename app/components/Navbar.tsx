'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaBarsStaggered, FaXmark, FaChevronDown, FaMagnifyingGlass, FaUser } from 'react-icons/fa6';
import { supabase } from '../lib/supabase';

// ✅ 1. Import SearchBar ที่เราเพิ่งสร้างเข้ามา
import SearchBar from './SearchBar';

export default function Navbar() {
  const router = useRouter();
  
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState(""); 
  
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Handle Scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Auth State
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setAuthLoading(false);
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu(openSubMenu === name ? "" : name);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setOpenSubMenu("");
  };

  return (
    <>
      {/* 🌟 Mobile Top Bar - z-[100] */}
      <nav className={`fixed top-0 w-full z-[100] px-6 flex justify-between items-center md:hidden transition-all duration-500 bg-black/95 backdrop-blur-md border-b border-white/5 ${scrolled ? 'py-4' : 'py-5'}`}>
        <Link href="/">
          <img src="https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Logo_Images/wallcraft%20logo%20grey%20color.webp" alt="Logo" className="h-6 w-auto" />
        </Link>
        <div className="flex items-center space-x-5">
          {/* บนมือถือใช้แว่นขยายกดไปหน้าค้นหาตรงๆ ดีที่สุดครับ */}
          <Link href="/search">
            <FaMagnifyingGlass className="text-white/60 text-sm" />
          </Link>
          <button className="text-white/80 text-xl" onClick={() => setIsMobileMenuOpen(true)}>
            <FaBarsStaggered />
          </button>
        </div>
      </nav>

      {/* Mobile Overlay - z-[110] */}
      <div className={`fixed inset-0 z-[110] bg-black transition-all duration-500 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <button className="absolute top-6 right-8 text-white/70 text-3xl" onClick={closeMobileMenu}>
          <FaXmark />
        </button>

        <div className="flex flex-col items-center justify-center h-full space-y-8 w-full overflow-y-auto py-10">
          <Link href="/introduction" onClick={closeMobileMenu} className="text-[11px] uppercase tracking-[0.4em] text-white">Introduction</Link>
          
          <div className="w-full flex flex-col items-center">
            <button 
              onClick={() => toggleSubMenu('series')}
              className="text-[11px] uppercase tracking-[0.4em] text-white flex items-center"
            >
              Series 
              <FaChevronDown className={`ml-3 text-[8px] transition-transform ${openSubMenu === 'series' ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`flex flex-col items-center space-y-5 overflow-hidden transition-all duration-500 ${openSubMenu === 'series' ? 'max-h-[300px] mt-8 opacity-100' : 'max-h-0 opacity-0'}`}>
              <Link href="/series/craft-stone" onClick={closeMobileMenu} className="text-[10px] uppercase tracking-[0.3em] text-[#c2bfb6]">Craft Stone</Link>
              <Link href="/series/luxe" onClick={closeMobileMenu} className="text-[10px] uppercase tracking-[0.3em] text-[#c2bfb6]">Luxe Series</Link>
              <Link href="/series/essential" onClick={closeMobileMenu} className="text-[10px] uppercase tracking-[0.3em] text-[#c2bfb6]">Essential Series</Link>
            </div>
          </div>

          <div className="w-full flex flex-col items-center">
            <button 
              onClick={() => toggleSubMenu('art')}
              className="text-[11px] uppercase tracking-[0.4em] text-white flex items-center"
            >
              Art & Gallery 
              <FaChevronDown className={`ml-3 text-[8px] transition-transform ${openSubMenu === 'art' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`flex flex-col items-center space-y-5 overflow-hidden transition-all duration-500 ${openSubMenu === 'art' ? 'max-h-[200px] mt-8 opacity-100' : 'max-h-0 opacity-0'}`}>
              <Link href="/art-gallery/visual-showcase" onClick={closeMobileMenu} className="text-[10px] uppercase tracking-[0.3em] text-[#c2bfb6]">Visual Showcase</Link>
              <Link href="/art-gallery/project-showcase" onClick={closeMobileMenu} className="text-[10px] uppercase tracking-[0.3em] text-[#c2bfb6]">Project Showcase</Link>
            </div>
          </div>

          <Link href="/match-inspiration" onClick={closeMobileMenu} className="text-[11px] uppercase tracking-[0.4em] text-white">Match Inspiration</Link>
          
          <hr className="w-12 border-white/20 my-4" />

          {!authLoading && (
            user ? (
              <Link href="/profile" onClick={closeMobileMenu} className="text-[11px] uppercase tracking-[0.4em] text-[#B08038] flex items-center gap-3 border border-[#B08038]/30 px-6 py-3 rounded-sm">
                <FaUser /> My Profile
              </Link>
            ) : (
              <div className="flex flex-col items-center space-y-5 pt-2">
                <Link href="/login" onClick={closeMobileMenu} className="text-[10px] uppercase tracking-[0.3em] text-[#c2bfb6] hover:text-white transition-colors">Log In</Link>
                <Link href="/register" onClick={closeMobileMenu} className="text-[10px] uppercase tracking-[0.3em] text-black bg-white px-8 py-3 rounded-sm hover:bg-[#B08038] hover:text-white transition-colors">Register</Link>
              </div>
            )
          )}
        </div>
      </div>

      {/* 🌟 Desktop Navigation - z-[100] */}
      <nav className={`fixed top-0 w-full z-[100] px-8 hidden md:block transition-all duration-400 bg-black/95 backdrop-blur-md border-b border-white/5 ${scrolled ? 'py-3' : 'py-6'}`}>
        <div className="max-w-[1800px] mx-auto flex justify-between items-center w-full gap-4">
          
          <div className="flex-1 flex items-center justify-start">
            <Link href="/">
              <img src="https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Logo_Images/wallcraft%20logo%20grey%20color.webp" alt="Wallcraft Logo" className="h-5 lg:h-6 opacity-90" />
            </Link>
          </div>

          <div className="flex items-center justify-center space-x-6 lg:space-x-10 flex-shrink-0">
            <Link href="/introduction" className="text-[10px] uppercase tracking-[0.4em] text-[#c2bfb6] hover:text-[#B08038] transition-colors whitespace-nowrap">Band Introduction</Link>
            
            {/* --- Series Dropdown --- */}
            <div className="relative py-2 flex items-center group cursor-pointer">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#c2bfb6] hover:text-[#B08038] transition-colors whitespace-nowrap">Series</span>
              <div className="ml-2 p-1 group-hover:rotate-180 transition-transform duration-300">
                <FaChevronDown className="text-[8px] opacity-40 group-hover:text-[#B08038] group-hover:opacity-100" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                <div className="bg-zinc-900/95 backdrop-blur-2xl border border-white/5 p-6 space-y-4 shadow-2xl rounded-sm">
                  <Link href="/series/craft-stone" className="block text-[9px] uppercase tracking-[0.3em] text-[#c2bfb6] hover:text-[#B08038]">Craft Stone Series</Link>
                  <Link href="/series/luxe" className="block text-[9px] uppercase tracking-[0.3em] text-[#c2bfb6] hover:text-[#B08038]">Luxe Series</Link>
                  <Link href="/series/essential" className="block text-[9px] uppercase tracking-[0.3em] text-[#c2bfb6] hover:text-[#B08038]">Essential Series</Link>
                </div>
              </div>
            </div>
            
            {/* --- Art & Gallery Dropdown --- */}
            <div className="relative py-2 flex items-center group cursor-pointer">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#c2bfb6] hover:text-[#B08038] transition-colors whitespace-nowrap">Art & Gallery</span>
              <div className="ml-2 p-1 group-hover:rotate-180 transition-transform duration-300">
                <FaChevronDown className="text-[8px] opacity-40 group-hover:text-[#B08038] group-hover:opacity-100" />
              </div>
               <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                <div className="bg-zinc-900/95 backdrop-blur-2xl border border-white/5 p-6 space-y-4 shadow-2xl rounded-sm">
                  <Link href="/art-gallery/visual-showcase" className="block text-[9px] uppercase tracking-[0.3em] text-[#c2bfb6] hover:text-[#B08038]">Visual Showcase</Link>
                  <Link href="/art-gallery/project-showcase" className="block text-[9px] uppercase tracking-[0.3em] text-[#c2bfb6] hover:text-[#B08038]">Project Showcase</Link>
                </div>
              </div>
            </div>

            <Link href="/match-inspiration" className="text-[10px] uppercase tracking-[0.4em] text-[#c2bfb6] hover:text-[#B08038] transition-colors whitespace-nowrap">Match Inspiration</Link>
            <Link href="/support/studio-qa" className="text-[10px] uppercase tracking-[0.4em] text-[#c2bfb6] hover:text-[#B08038] transition-colors whitespace-nowrap">Studio Q&A</Link>
          </div>

          <div className="flex-1 flex items-center justify-end space-x-4 lg:space-x-6">
            
            {/* ✅ 2. แทนที่ปุ่ม Search เดิมด้วย <SearchBar /> ตรงนี้เลยครับ */}
            <SearchBar />
            
            <div className="w-px h-4 bg-white/20 hidden lg:block"></div>

            {!authLoading && (
              user ? (
                <Link href="/profile" className="text-[#B08038] hover:text-white transition text-[9px] tracking-widest uppercase flex items-center gap-2 whitespace-nowrap">
                  <FaUser className="text-xs" /> Profile
                </Link>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/login" className="text-[#c2bfb6] hover:text-white transition text-[9px] tracking-widest uppercase whitespace-nowrap">
                    Log In
                  </Link>
                  <Link href="/register" className="text-black bg-white hover:bg-[#B08038] hover:text-white transition-colors text-[9px] tracking-widest uppercase px-4 py-2 rounded-sm font-bold whitespace-nowrap">
                    Register
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </nav>
    </>
  );
}