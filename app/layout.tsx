// app/layout.tsx
import type { Metadata } from "next";
import { Prompt, Noto_Sans_Thai } from "next/font/google";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import NextTopLoader from 'nextjs-toploader'; 
import "./globals.css";

import ConditionalNavbar from "./components/Navbar";
import ConditionalFooter from "./components/ConditionalFooter";

config.autoAddCss = false;

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-prompt",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["300", "400", "700"],
  variable: "--font-noto",
  display: "swap",
});

// ✅ อัปเดต Metadata จัดเต็มคีย์เวิร์ด "ผนังตกแต่งบ้าน" และ "สินค้าผนัง"
export const metadata: Metadata = {
  // ✅ 1. เพิ่มบรรทัดนี้ เพื่อตั้งค่า Domain หลักของเว็บ (ใส่โดเมนจริงของนายลงไป)
  metadataBase: new URL('https://wallcraftthailand.com'), 
  
  // ✅ 2. เพิ่ม alternates และ canonical เพื่อบอก Google ว่านี่คือหน้าหลัก (Master Copy)
  alternates: {
    canonical: '/', 
  },
  
  title: {
    default: "Wallcraft Thailand | ผนังตกแต่งบ้าน สินค้าผนัง ระแนงไม้พรีเมียม", 
    template: "%s | Wallcraft ผนังตกแต่งบ้าน", 
  },
  description: "Wallcraft (วอลล์คราฟท์) ศูนย์รวมสินค้าผนัง ผนังตกแต่งบ้าน และระแนงไม้คุณภาพสูง ดีไซน์ทันสมัย เปลี่ยนบ้านและห้องของคุณให้สวยหรูตรงใจ",
  
  // ✅ 3. เพิ่ม Keywords เน้นๆ ให้ Google หาเจอแน่นอน
  keywords: ["wallcraft", "wallcraftthailand", "วอลล์คราฟท์", "ผนังตกแต่งบ้าน", "ระแนงไม้", "สินค้าผนัง", "ตกแต่งภายใน", "วัสดุตกแต่ง", "ระแนงไม้พรีเมียม"],
  
  // ✅ 3. ตั้งค่าไอคอนสำหรับ Browser แท็บ และ iPhone (Apple Touch Icon)
  icons: {
    icon: '/favicon.png', 
    shortcut: '/favicon.png',
    apple: '/apple-icon.png', 
  },
  
  // ✅ 4. ตั้งค่า OpenGraph ให้แสดงภาพและข้อมูลเวลาแชร์ลง LINE, Facebook เป๊ะๆ
  openGraph: {
    title: "Wallcraft Thailand | ผนังตกแต่งบ้าน สินค้าผนัง ระแนงไม้พรีเมียม",
    description: "Wallcraft (วอลล์คราฟท์) ศูนย์รวมสินค้าผนัง ผนังตกแต่งบ้าน และระแนงไม้คุณภาพสูง ดีไซน์ทันสมัย เปลี่ยนบ้านและห้องของคุณให้สวยหรูตรงใจ",
    url: 'https://wallcraftthailand.com',
    siteName: 'Wallcraft Thailand',
    images: [
      {
        url: '/og-image.png', 
        width: 600,
        height: 600,
        alt: 'Wallcraft Thailand Logo',
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${notoSansThai.variable}`}>
      <body className={`antialiased noise font-sans text-[#808080]`}>
        <NextTopLoader 
          color="#c6a87c"          
          initialPosition={0.08}   
          crawlSpeed={200}
          height={3}               
          crawl={true}
          showSpinner={false}      
          easing="ease"
          speed={200}
        />
        <ConditionalNavbar />
        {children}
        <ConditionalFooter />
      </body>
    </html>
  );
}