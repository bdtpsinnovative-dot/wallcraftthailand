import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {},
  productionBrowserSourceMaps: false,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
    ],
  },
  
  async redirects() {
    return [
      // 1. ดักคนที่พิมพ์ตก s หรือบอทที่เข้าลิงก์เก่า -> โยนไปหน้าใหม่ที่มี s (ตรงตัวเป๊ะ!)
      {
        source: '/collection/:path*',
        destination: '/collections/:path*',
        permanent: true, // รหัส 301 บอก Google ว่า "ย้ายบ้านถาวรแล้ว จำที่ใหม่ไว้นะ"
      },
      // 2. ดักผีสินค้าเก่าพวก Pikachu, รองเท้าเด็ก (ที่โฟลเดอร์มี s) -> โยนกลับหน้าแรก
      {
        source: '/products/:path*',
        destination: '/', 
        permanent: true,
      },
      // 3. ดักพวก URL ขยะจากเว็บเก่า -> โยนกลับหน้าแรก
      {
        source: '/series/:path*/_tree.segment',
        destination: '/',
        permanent: true,
      }
    ];
  },
};

export default nextConfig;