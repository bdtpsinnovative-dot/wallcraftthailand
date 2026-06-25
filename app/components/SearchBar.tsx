'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FaMagnifyingGlass } from 'react-icons/fa6'; 

export default function SearchBar() {
  const router = useRouter();

  const handleSearchClick = () => {
    // พอกดปุ่มปุ๊บ ให้วิ่งไปที่หน้า /search ทันทีโดยไม่ต้องรอพิมพ์ครับนาย
    router.push('/search');
  };

  return (
    <button
      type="button"
      onClick={handleSearchClick}
      className="p-2 text-[#b0b0b0] hover:text-[#c6a87c] transition-all duration-300 hover:scale-110 cursor-pointer flex items-center justify-center"
      aria-label="Open Search Gallery"
      title="ค้นหารูปภาพสินค้า"
    >
      {/* โชว์เฉพาะไอคอนแว่นขยายสวยๆ สไตล์มินิมอลและพรีเมียม */}
      <FaMagnifyingGlass size={18} />
    </button>
  );
}