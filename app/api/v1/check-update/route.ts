import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const updateData = {
      // เอาไว้สำหรับแอปเวอร์ชันเก่าที่ยังไม่ได้อัปเดตโค้ดใหม่ จะได้ไม่พัง
      latest_version: "2.0.0", 
      // แยก Version ของ Android และ iOS (สำหรับแอปเวอร์ชันใหม่)
      latest_version_android: "2.0.0",
      latest_version_ios: "2.0.0",
      // แยก Link ของ Android (APK) และ iOS (TestFlight)
      download_url_android: "https://app.wallcraftthailand.com/base%20(4).apk", 
      download_url_ios:  "https://testflight.apple.com/join/BXMvdwVM", 
      release_date: "2026-05-12",
      change_log: "เพิ่มระบบตรวจสอบการอัปเดตอัตโนมัติ และปรับปรุงประสิทธิภาพแอป เพิ่มระบบสอตกสินค้าและติดตามสินค้า"
    };

    return NextResponse.json(updateData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch update data" }, 
      { status: 500 }
    );
  }
}